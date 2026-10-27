// Home server: runs on Carson's Mac, serves the deployed static app over HTTPS and keeps the
// progress save in a file. Plain Node, no dependencies. Run by the LaunchAgent that
// `npm run home:setup` installs; `createHomeServer()` is also used by the tests.
//
// Data dir (default ~/blackjack-bot-data, outside the repo and outside iCloud):
//   save.json  { revision, updatedAt, deviceId, savedAt, data }
//   history/   hourly snapshots, newest 200 kept
//   conflicts/ the copy that lost a conflict (never auto-deleted)
//   site/      deployed static build (symlink swapped by `home:deploy`)
//   certs/     mkcert cert + key for <LocalHostName>.local
//   logs/      LaunchAgent stdout/stderr
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import https from 'node:https';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export const DEFAULT_DATA_DIR = path.join(os.homedir(), 'blackjack-bot-data');
export const DEFAULT_MIRROR = path.join(
  os.homedir(),
  'Library/Mobile Documents/com~apple~CloudDocs/COMPUTER/AI/Projects/BlackJack Bot/data/save.json',
);
export const MAX_BODY = 5 * 1024 * 1024;
export const HISTORY_LIMIT = 200;
export const HISTORY_EVERY_MS = 60 * 60 * 1000;

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.woff2': 'font/woff2',
};

// Same headers as netlify.toml.
const SECURITY_HEADERS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

function staticHeaders(urlPath, file) {
  const h = { ...SECURITY_HEADERS, 'Content-Type': TYPES[path.extname(file)] ?? 'application/octet-stream' };
  if (urlPath === '/sw.js') Object.assign(h, { 'Cache-Control': 'no-cache', 'Service-Worker-Allowed': '/' });
  else if (urlPath.startsWith('/_next/static/')) h['Cache-Control'] = 'public, max-age=31536000, immutable';
  else if (urlPath === '/manifest.webmanifest') Object.assign(h, { 'Content-Type': 'application/manifest+json', 'Cache-Control': 'no-cache' });
  return h;
}

// ── Who may talk to us ───────────────────────────────────────────────────────

function v4ToInt(ip) {
  return ip.split('.').reduce((n, part) => (n << 8) + Number(part), 0) >>> 0;
}

function v4InCidr(ip, base, bits) {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (v4ToInt(ip) & mask) === (v4ToInt(base) & mask);
}

function v6ToBigInt(ip) {
  let [head, tail = ''] = ip.split('%')[0].split('::');
  if (!ip.includes('::')) tail = null;
  const h = head ? head.split(':') : [];
  const t = tail ? tail.split(':') : [];
  const parts = tail === null ? h : [...h, ...Array(8 - h.length - t.length).fill('0'), ...t];
  return parts.reduce((n, p) => (n << 16n) + BigInt(parseInt(p || '0', 16)), 0n);
}

function v6InPrefix(ip, base, bits) {
  const shift = BigInt(128 - bits);
  return v6ToBigInt(ip) >> shift === v6ToBigInt(base) >> shift;
}

function maskBits(mask) {
  if (net.isIPv4(mask)) return v4ToInt(mask).toString(2).replace(/0/g, '').length;
  return v6ToBigInt(mask).toString(2).replace(/0/g, '').length;
}

/** Subnets of this Mac's own network interfaces (covers IPv6 global addresses on the home LAN). */
function localSubnets() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) {
    for (const a of list ?? []) out.push({ address: a.address, bits: maskBits(a.netmask), v4: a.family === 'IPv4' || a.family === 4 });
  }
  return out;
}

/** Loopback, private ranges, link-local, or on the same subnet as one of this Mac's interfaces. */
export function isAllowedAddress(raw, subnets = localSubnets()) {
  if (!raw) return false;
  let ip = String(raw);
  if (ip.toLowerCase().startsWith('::ffff:') && net.isIPv4(ip.slice(7))) ip = ip.slice(7);
  if (net.isIPv4(ip)) {
    const ranges = [['127.0.0.0', 8], ['10.0.0.0', 8], ['172.16.0.0', 12], ['192.168.0.0', 16], ['169.254.0.0', 16]];
    if (ranges.some(([b, n]) => v4InCidr(ip, b, n))) return true;
    return subnets.some((s) => s.v4 && s.bits > 0 && v4InCidr(ip, s.address, s.bits));
  }
  if (net.isIPv6(ip)) {
    if (ip === '::1') return true;
    if (v6InPrefix(ip, 'fc00::', 7) || v6InPrefix(ip, 'fe80::', 10)) return true;
    return subnets.some((s) => !s.v4 && s.bits > 0 && v6InPrefix(ip, s.address, s.bits));
  }
  return false;
}

/** Browser requests must come from this same site. Writes must say so; reads may omit Origin (curl). */
export function originOk(req) {
  const origin = req.headers.origin;
  const site = req.headers['sec-fetch-site'];
  if (site && site !== 'same-origin' && site !== 'none') return false;
  if (!origin) return req.method === 'GET' || req.method === 'HEAD';
  return origin === `https://${req.headers.host}`;
}

// ── Files ────────────────────────────────────────────────────────────────────

/** Write to a temp file, fsync it, rename over the target, fsync the directory. */
export async function writeFileAtomic(file, contents) {
  const dir = path.dirname(file);
  const tmp = path.join(dir, `.${path.basename(file)}.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2)}.tmp`);
  const fh = await fsp.open(tmp, 'w', 0o600);
  try {
    await fh.writeFile(contents);
    await fh.sync();
  } finally {
    await fh.close();
  }
  try {
    await fsp.rename(tmp, file);
  } catch (e) {
    await fsp.rm(tmp, { force: true });
    throw e;
  }
  try {
    const d = await fsp.open(dir, 'r');
    await d.sync().catch(() => {});
    await d.close();
  } catch {
    /* directory fsync is best effort */
  }
}

function stamp(t) {
  return new Date(t).toISOString().replace(/[:.]/g, '-');
}

function safeName(s) {
  return String(s ?? 'unknown').replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 40) || 'unknown';
}

function isSaveData(d) {
  return !!d && typeof d === 'object' && !Array.isArray(d) && typeof d.version === 'number' && Number.isFinite(d.version);
}

// ── Server ───────────────────────────────────────────────────────────────────

/**
 * @param {object} opts
 * @param {string} [opts.dataDir]   where save.json/history/conflicts live
 * @param {string} [opts.siteDir]   static site root (default dataDir/site)
 * @param {string|null} [opts.mirror] best-effort copy of save.json (null = off)
 * @param {string|Buffer} opts.cert @param {string|Buffer} opts.key  TLS
 * @param {() => number} [opts.now]
 * @param {number} [opts.historyLimit]
 * @param {(msg: string) => void} [opts.log]
 * @param {(addr: string) => boolean} [opts.allowAddress]
 */
export function createHomeServer(opts) {
  const dataDir = opts.dataDir ?? DEFAULT_DATA_DIR;
  const siteDir = opts.siteDir ?? path.join(dataDir, 'site');
  const mirror = opts.mirror === undefined ? DEFAULT_MIRROR : opts.mirror;
  const now = opts.now ?? Date.now;
  const historyLimit = opts.historyLimit ?? HISTORY_LIMIT;
  const log = opts.log ?? ((m) => console.log(`${new Date().toISOString()} ${m}`));
  const allowAddress = opts.allowAddress ?? ((a) => isAllowedAddress(a));
  const savePath = path.join(dataDir, 'save.json');
  const historyDir = path.join(dataDir, 'history');
  const conflictsDir = path.join(dataDir, 'conflicts');
  for (const d of [dataDir, historyDir, conflictsDir]) fs.mkdirSync(d, { recursive: true });

  // Every write goes through this chain so two PUTs can never interleave.
  let chain = Promise.resolve();
  const serial = (fn) => {
    const run = chain.then(fn, fn);
    chain = run.catch(() => {});
    return run;
  };

  async function readSave() {
    try {
      return JSON.parse(await fsp.readFile(savePath, 'utf8'));
    } catch (e) {
      if (e.code === 'ENOENT') return null;
      throw e; // unreadable save: refuse to overwrite it
    }
  }

  async function snapshot(record) {
    const files = (await fsp.readdir(historyDir)).filter((f) => f.endsWith('.json')).sort();
    const newest = files.at(-1);
    const last = newest ? Number(newest.split('_')[0]) : 0;
    if (!newest || now() - last >= HISTORY_EVERY_MS) {
      const name = `${String(now()).padStart(15, '0')}_${stamp(now())}_r${record.revision}.json`;
      await writeFileAtomic(path.join(historyDir, name), JSON.stringify(record));
      files.push(name);
    }
    for (const old of files.slice(0, Math.max(0, files.length - historyLimit))) {
      await fsp.rm(path.join(historyDir, old), { force: true });
    }
  }

  async function mirrorSave(json) {
    if (!mirror) return;
    try {
      await fsp.mkdir(path.dirname(mirror), { recursive: true });
      await writeFileAtomic(mirror, json);
    } catch (e) {
      log(`mirror failed (save is safe): ${e.code ?? ''} ${e.message}`);
    }
  }

  function send(res, status, body, extra = {}) {
    const json = JSON.stringify(body);
    res.writeHead(status, { ...SECURITY_HEADERS, 'Content-Type': 'application/json', 'Cache-Control': 'no-store', ...extra });
    res.end(json);
  }

  function readBody(req) {
    return new Promise((resolve, reject) => {
      const len = Number(req.headers['content-length'] ?? 0);
      if (len > MAX_BODY) return reject(Object.assign(new Error('too large'), { status: 413 }));
      const chunks = [];
      let size = 0;
      req.on('data', (c) => {
        size += c.length;
        if (size > MAX_BODY) {
          reject(Object.assign(new Error('too large'), { status: 413 }));
          req.destroy();
        } else chunks.push(c);
      });
      req.on('end', () => {
        try {
          resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        } catch {
          reject(Object.assign(new Error('invalid JSON'), { status: 400 }));
        }
      });
      req.on('error', reject);
    });
  }

  async function api(req, res, pathname) {
    if (pathname === '/api/ping' && req.method === 'GET') {
      return send(res, 200, { ok: true, app: 'blackjack-bot', serverTime: now(), savePath });
    }
    if (pathname === '/api/save' && req.method === 'GET') {
      const cur = await readSave();
      if (!cur) return send(res, 404, { error: 'no save yet' });
      return send(res, 200, { revision: cur.revision, updatedAt: cur.updatedAt, deviceId: cur.deviceId, data: cur.data });
    }
    if (pathname === '/api/save' && req.method === 'PUT') {
      const body = await readBody(req);
      if (!body || typeof body !== 'object' || !isSaveData(body.data) || typeof body.baseRevision !== 'number') {
        return send(res, 400, { error: 'expected { baseRevision, updatedAt, deviceId, data: { version, … } }' });
      }
      return serial(async () => {
        const cur = await readSave();
        const revision = cur?.revision ?? 0;
        if (body.baseRevision !== revision) {
          log(`409 save from ${safeName(body.deviceId)}: base r${body.baseRevision}, current r${revision}`);
          return send(res, 409, { error: 'revision mismatch', current: cur && { revision: cur.revision, updatedAt: cur.updatedAt, deviceId: cur.deviceId, data: cur.data } });
        }
        const record = {
          revision: revision + 1,
          updatedAt: typeof body.updatedAt === 'number' ? body.updatedAt : now(),
          deviceId: safeName(body.deviceId),
          savedAt: now(),
          data: body.data,
        };
        const json = JSON.stringify(record);
        await writeFileAtomic(savePath, json);
        log(`saved r${record.revision} from ${record.deviceId} (${json.length} bytes)`);
        try {
          await snapshot(record);
        } catch (e) {
          log(`history snapshot failed: ${e.message}`);
        }
        await mirrorSave(json);
        return send(res, 200, { revision: record.revision, updatedAt: record.updatedAt });
      });
    }
    if (pathname === '/api/conflict' && req.method === 'POST') {
      const body = await readBody(req);
      if (!body || typeof body !== 'object' || !isSaveData(body.data)) return send(res, 400, { error: 'expected { data: { version, … } }' });
      const name = `${stamp(now())}_${safeName(body.deviceId)}_${safeName(body.side)}.json`;
      await writeFileAtomic(path.join(conflictsDir, name), JSON.stringify({ ...body, archivedAt: now() }));
      log(`conflict copy archived: conflicts/${name}`);
      return send(res, 200, { ok: true, file: name });
    }
    return send(res, 404, { error: 'not found' });
  }

  function serveStatic(req, res, url) {
    if (req.method !== 'GET' && req.method !== 'HEAD') return res.writeHead(405, SECURITY_HEADERS).end();
    let pathname;
    try {
      pathname = decodeURIComponent(url.pathname);
    } catch {
      return res.writeHead(400, SECURITY_HEADERS).end();
    }
    let file = path.join(siteDir, pathname);
    if (file !== siteDir && !file.startsWith(siteDir + path.sep)) return res.writeHead(403, SECURITY_HEADERS).end();
    if (fs.existsSync(file) && fs.statSync(file).isDirectory()) {
      if (!url.pathname.endsWith('/')) return res.writeHead(308, { ...SECURITY_HEADERS, Location: url.pathname + '/' + url.search }).end();
      file = path.join(file, 'index.html');
    }
    if (!fs.existsSync(file)) {
      const notFound = path.join(siteDir, '404.html');
      res.writeHead(404, { ...SECURITY_HEADERS, 'Content-Type': TYPES['.html'] });
      if (req.method === 'HEAD' || !fs.existsSync(notFound)) return res.end();
      return fs.createReadStream(notFound).pipe(res);
    }
    res.writeHead(200, staticHeaders(url.pathname, file));
    if (req.method === 'HEAD') return res.end();
    fs.createReadStream(file).pipe(res);
  }

  const server = https.createServer({ cert: opts.cert, key: opts.key }, (req, res) => {
    const url = new URL(req.url ?? '/', 'https://x');
    const isApi = url.pathname.startsWith('/api/');
    if (!allowAddress(req.socket.remoteAddress)) {
      log(`refused ${req.socket.remoteAddress} ${req.method} ${url.pathname}`);
      return isApi ? send(res, 403, { error: 'LAN only' }) : res.writeHead(403, SECURITY_HEADERS).end();
    }
    if (!isApi) return serveStatic(req, res, url);
    if (!originOk(req)) return send(res, 403, { error: 'cross-origin request refused' });
    api(req, res, url.pathname).catch((e) => {
      log(`error ${req.method} ${url.pathname}: ${e.message}`);
      if (!res.headersSent) send(res, e.status ?? 500, { error: e.status ? e.message : 'server error' });
    });
  });
  server.paths = { dataDir, siteDir, savePath, historyDir, conflictsDir, mirror };
  return server;
}

// ── Run directly (LaunchAgent / `node scripts/home-server.mjs`) ──────────────

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dataDir = process.env.BJ_DATA_DIR ?? DEFAULT_DATA_DIR;
  const certDir = path.join(dataDir, 'certs');
  const port = Number(process.env.BJ_PORT ?? 8443);
  const host = process.env.BJ_HOST ?? '::';
  const mirror = process.env.BJ_MIRROR === undefined ? DEFAULT_MIRROR : process.env.BJ_MIRROR || null;
  const server = createHomeServer({
    dataDir,
    siteDir: process.env.BJ_SITE_DIR,
    mirror,
    cert: fs.readFileSync(process.env.BJ_CERT ?? path.join(certDir, 'cert.pem')),
    key: fs.readFileSync(process.env.BJ_KEY ?? path.join(certDir, 'key.pem')),
  });
  server.listen(port, host, () => console.log(`${new Date().toISOString()} Blackjack Bot home server on https://[${host}]:${port} (data ${dataDir})`));
  const stop = () => server.close(() => process.exit(0));
  process.on('SIGTERM', stop);
  process.on('SIGINT', stop);
}
