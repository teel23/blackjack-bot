import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import { HISTORY_LIMIT, MAX_BODY, createHomeServer, isAllowedAddress, writeFileAtomic } from '../../scripts/home-server.mjs';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Json = any;

let tmp: string;
let cert: Buffer;
let key: Buffer;

beforeAll(() => {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'bj-home-'));
  // Throwaway self-signed cert, valid for a day.
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
    '-keyout', path.join(tmp, 'key.pem'), '-out', path.join(tmp, 'cert.pem'),
  ], { stdio: 'ignore' });
  cert = fs.readFileSync(path.join(tmp, 'cert.pem'));
  key = fs.readFileSync(path.join(tmp, 'key.pem'));
});
afterAll(() => fs.rmSync(tmp, { recursive: true, force: true }));

const running: https.Server[] = [];
afterEach(async () => {
  await Promise.all(running.splice(0).map((s) => new Promise((r) => s.close(r))));
});

let n = 0;
async function start(opts: Record<string, unknown> = {}) {
  const dataDir = path.join(tmp, `data-${n++}`);
  const siteDir = path.join(dataDir, 'site');
  fs.mkdirSync(path.join(siteDir, '_next/static'), { recursive: true });
  fs.writeFileSync(path.join(siteDir, 'index.html'), '<h1>home</h1>');
  fs.writeFileSync(path.join(siteDir, '404.html'), 'not here');
  fs.writeFileSync(path.join(siteDir, 'sw.js'), '// sw');
  fs.writeFileSync(path.join(siteDir, '_next/static/a.js'), '1');
  const logs: string[] = [];
  const server = createHomeServer({ dataDir, siteDir, mirror: null, cert, key, log: (m: string) => logs.push(m), ...opts });
  await new Promise<void>((r) => server.listen(0, '127.0.0.1', r));
  running.push(server);
  const port = (server.address() as { port: number }).port;
  const origin = `https://localhost:${port}`;

  function call(method: string, p: string, body?: unknown, headers: Record<string, string> = {}) {
    return new Promise<{ status: number; headers: Record<string, string | string[] | undefined>; body: Json; text: string }>((resolve, reject) => {
      const text = body === undefined ? undefined : typeof body === 'string' ? body : JSON.stringify(body);
      const req = https.request(
        { host: '127.0.0.1', port, path: p, method, ca: cert, servername: 'localhost', headers: { host: `localhost:${port}`, ...(text ? { 'content-type': 'application/json' } : {}), ...headers } },
        (res) => {
          const chunks: Buffer[] = [];
          res.on('data', (c) => chunks.push(c));
          res.on('end', () => {
            const t = Buffer.concat(chunks).toString();
            let parsed: unknown = null;
            try {
              parsed = JSON.parse(t);
            } catch {
              /* not json */
            }
            resolve({ status: res.statusCode!, headers: res.headers, body: parsed, text: t });
          });
        },
      );
      req.on('error', (e: NodeJS.ErrnoException) => (e.code === 'ECONNRESET' || e.code === 'EPIPE' ? resolve({ status: 413, headers: {}, body: null, text: '' }) : reject(e)));
      if (text) req.write(text);
      req.end();
    });
  }
  const put = (base: number, data: unknown = { version: 2, n: base }, headers: Record<string, string> = { origin }) =>
    call('PUT', '/api/save', { baseRevision: base, updatedAt: 1234, deviceId: 'phone-1', data }, headers);
  return { server, call, put, origin, logs, dataDir, paths: (server as unknown as { paths: Record<string, string> }).paths };
}

describe('home server API', () => {
  it('ping identifies the app', async () => {
    const { call } = await start();
    const r = await call('GET', '/api/ping');
    expect(r.status).toBe(200);
    expect(r.body).toMatchObject({ ok: true, app: 'blackjack-bot' });
    expect(typeof r.body.serverTime).toBe('number');
    expect(r.headers['cache-control']).toBe('no-store');
  });

  it('PUT then GET; stale baseRevision gets 409 with the current copy', async () => {
    const { call, put, paths } = await start();
    expect((await call('GET', '/api/save')).status).toBe(404);
    const a = await put(0, { version: 2, bankroll: 1050 });
    expect(a.status).toBe(200);
    expect(a.body.revision).toBe(1);
    const g = await call('GET', '/api/save');
    expect(g.body).toEqual({ revision: 1, updatedAt: 1234, deviceId: 'phone-1', data: { version: 2, bankroll: 1050 } });
    expect((await put(1, { version: 2, bankroll: 1100 })).body.revision).toBe(2);

    const stale = await put(1, { version: 2, bankroll: 900 });
    expect(stale.status).toBe(409);
    expect(stale.body.current).toMatchObject({ revision: 2, data: { bankroll: 1100 } });
    expect(JSON.parse(fs.readFileSync(paths.savePath, 'utf8')).data.bankroll).toBe(1100);
  });

  it('writes are atomic and serialized: concurrent PUTs on one base → exactly one wins, no temp files', async () => {
    const { put, paths } = await start();
    await put(0);
    const results = await Promise.all(Array.from({ length: 12 }, (_, i) => put(1, { version: 2, i })));
    expect(results.filter((r) => r.status === 200)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(11);
    const saved = JSON.parse(fs.readFileSync(paths.savePath, 'utf8'));
    expect(saved.revision).toBe(2);
    expect(fs.readdirSync(paths.dataDir).filter((f) => f.endsWith('.tmp'))).toEqual([]);
  });

  it('writeFileAtomic replaces the whole file or nothing', async () => {
    const f = path.join(tmp, 'atomic.json');
    fs.writeFileSync(f, 'old');
    await writeFileAtomic(f, 'x'.repeat(100_000));
    expect(fs.readFileSync(f, 'utf8')).toHaveLength(100_000);
    // Rename into a missing directory fails → target untouched, temp file cleaned up.
    await expect(writeFileAtomic(path.join(tmp, 'missing-dir', 'a.json'), 'new')).rejects.toThrow();
    expect(fs.readdirSync(tmp).filter((x) => x.endsWith('.tmp'))).toEqual([]);
  });

  it('history: at most one snapshot per hour, newest N kept', async () => {
    let clock = Date.UTC(2026, 9, 27, 8);
    const { put, paths } = await start({ now: () => clock, historyLimit: 5 });
    await put(0);
    await put(1); // same hour → no new snapshot
    expect(fs.readdirSync(paths.historyDir)).toHaveLength(1);
    for (let rev = 2; rev < 10; rev++) {
      clock += 60 * 60 * 1000;
      await put(rev);
    }
    const files = fs.readdirSync(paths.historyDir).sort();
    expect(files).toHaveLength(5);
    expect(files.at(-1)).toMatch(/_r10\.json$/);
    expect(JSON.parse(fs.readFileSync(path.join(paths.historyDir, files.at(-1)!), 'utf8')).revision).toBe(10);
    expect(HISTORY_LIMIT).toBe(200);
  });

  it('rejects oversize and invalid bodies', async () => {
    const { call, put, origin } = await start();
    const big = await call('PUT', '/api/save', { baseRevision: 0, data: { version: 2, pad: 'x'.repeat(MAX_BODY) } }, { origin });
    expect(big.status).toBe(413);
    expect((await put(0, { noVersion: true })).status).toBe(400);
    expect((await put(0, [1, 2])).status).toBe(400);
    expect((await put(0, { version: '2' })).status).toBe(400);
    expect((await call('PUT', '/api/save', '{not json', { origin })).status).toBe(400);
    expect((await call('PUT', '/api/save', { data: { version: 2 } }, { origin })).status).toBe(400);
    expect((await call('GET', '/api/save')).status).toBe(404); // nothing got written
  });

  it('refuses cross-origin requests and non-LAN addresses', async () => {
    const { call, put } = await start();
    expect((await put(0, undefined, { origin: 'https://evil.example' })).status).toBe(403);
    expect((await put(0, undefined, {})).status).toBe(403); // writes must carry Origin
    expect((await call('GET', '/api/save', undefined, { 'sec-fetch-site': 'cross-site' })).status).toBe(403);

    const remote = await start({ allowAddress: () => false });
    expect((await remote.call('GET', '/api/ping')).status).toBe(403);
    expect((await remote.call('GET', '/')).status).toBe(403);
  });

  it('address filter: loopback, private, link-local and own subnet only', () => {
    for (const ok of ['127.0.0.1', '::1', '::ffff:192.168.1.20', '10.1.2.3', '172.20.0.9', '192.168.0.5', '169.254.3.3', 'fe80::1%en0', 'fd12:3456::7']) {
      expect(isAllowedAddress(ok, []), ok).toBe(true);
    }
    for (const bad of ['8.8.8.8', '172.32.0.1', '100.64.1.1', '2001:db8::1', '::ffff:1.1.1.1', '', undefined]) {
      expect(isAllowedAddress(bad, []), String(bad)).toBe(false);
    }
    // IPv6 global address on the home LAN's /64.
    expect(isAllowedAddress('2600:1700:abcd:10::99', [{ address: '2600:1700:abcd:10::1', bits: 64, v4: false }])).toBe(true);
    expect(isAllowedAddress('2600:1700:abcd:11::99', [{ address: '2600:1700:abcd:10::1', bits: 64, v4: false }])).toBe(false);
  });

  it('iCloud mirror: copied when it works; a failing mirror never fails the save', async () => {
    const good = path.join(tmp, 'mirror-ok', 'data', 'save.json');
    const ok = await start({ mirror: good });
    expect((await ok.put(0)).status).toBe(200);
    expect(JSON.parse(fs.readFileSync(good, 'utf8')).revision).toBe(1);

    const blocker = path.join(tmp, 'a-file');
    fs.writeFileSync(blocker, 'not a dir');
    const bad = await start({ mirror: path.join(blocker, 'data', 'save.json') });
    const r = await bad.put(0);
    expect(r.status).toBe(200);
    expect(JSON.parse(fs.readFileSync(bad.paths.savePath, 'utf8')).revision).toBe(1);
    expect(bad.logs.some((l) => l.startsWith('mirror failed'))).toBe(true);
  });

  it('conflict copies are archived as files', async () => {
    const { call, origin, paths } = await start();
    const r = await call('POST', '/api/conflict', { side: 'mac', deviceId: 'phone-1', revision: 4, data: { version: 2, x: 1 } }, { origin });
    expect(r.status).toBe(200);
    const files = fs.readdirSync(paths.conflictsDir);
    expect(files).toHaveLength(1);
    expect(JSON.parse(fs.readFileSync(path.join(paths.conflictsDir, files[0]), 'utf8'))).toMatchObject({ side: 'mac', revision: 4, data: { x: 1 } });
    expect((await call('POST', '/api/conflict', { data: {} }, { origin })).status).toBe(400);
  });
});

describe('home server static site', () => {
  it('serves the deployed copy with the Netlify headers', async () => {
    const { call } = await start();
    const index = await call('GET', '/');
    expect(index.status).toBe(200);
    expect(index.text).toContain('home');
    expect(index.headers['x-frame-options']).toBe('DENY');
    expect(index.headers['x-content-type-options']).toBe('nosniff');
    const sw = await call('GET', '/sw.js');
    expect(sw.headers['cache-control']).toBe('no-cache');
    expect(sw.headers['service-worker-allowed']).toBe('/');
    expect((await call('GET', '/_next/static/a.js')).headers['cache-control']).toBe('public, max-age=31536000, immutable');
    const missing = await call('GET', '/nope/');
    expect(missing.status).toBe(404);
    expect(missing.text).toBe('not here');
    expect((await call('GET', '/..%2f..%2f..%2fetc%2fpasswd')).status).toBe(403);
    expect((await call('GET', '/api/unknown')).status).toBe(404);
  });
});
