// `npm run home:<setup|deploy|status|uninstall>` — run Blackjack Bot from this Mac.
// See NOTES.md → "Run from my Mac". Never prints or copies the mkcert CA key (rootCA-key.pem).
import { execFileSync, spawnSync } from 'node:child_process';
import crypto from 'node:crypto';
import fs from 'node:fs';
import https from 'node:https';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DATA = process.env.BJ_DATA_DIR ?? path.join(os.homedir(), 'blackjack-bot-data');
const PORT = 8443;
const LABEL = 'com.c2tbuilds.blackjack';
const PLIST = path.join(os.homedir(), 'Library/LaunchAgents', `${LABEL}.plist`);
const DOMAIN = `gui/${process.getuid()}`;
const DIRS = ['history', 'conflicts', 'certs', 'logs', 'bin', 'site-builds'];
const CERT = path.join(DATA, 'certs/cert.pem');
const KEY = path.join(DATA, 'certs/key.pem');
const NAMES = path.join(DATA, 'certs/names.txt');
const SITE = path.join(DATA, 'site');
const BUILDS = path.join(DATA, 'site-builds');
const LOG = path.join(DATA, 'logs/server.log');
const ERR = path.join(DATA, 'logs/server.err.log');

const tilde = (p) => (p.startsWith(os.homedir()) ? '~' + p.slice(os.homedir().length) : p);
const step = (m) => console.log(`\n▸ ${m}`);

function sh(cmd, args, opts = {}) {
  return execFileSync(cmd, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...opts }).trim();
}

function which(name) {
  try {
    return sh('/bin/sh', ['-lc', `command -v ${name}`]) || null;
  } catch {
    return null;
  }
}

function hostName() {
  return `${sh('scutil', ['--get', 'LocalHostName'])}.local`;
}

/** This Mac's private IPv4 addresses (Wi-Fi/Ethernet). The phone can use one when `.local` doesn't resolve. */
function lanAddresses() {
  const priv = /^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.)/;
  return Object.values(os.networkInterfaces())
    .flat()
    .filter((a) => a && a.family === 'IPv4' && !a.internal && priv.test(a.address))
    .map((a) => a.address)
    .sort();
}

const certNames = () => [hostName(), ...lanAddresses(), 'localhost', '127.0.0.1', '::1'];

function agentLoaded() {
  return spawnSync('launchctl', ['print', `${DOMAIN}/${LABEL}`], { stdio: 'ignore' }).status === 0;
}

// ── mkcert ───────────────────────────────────────────────────────────────────

function findMkcert() {
  const candidates = [which('mkcert'), '/opt/homebrew/bin/mkcert', '/usr/local/bin/mkcert', path.join(DATA, 'bin/mkcert')];
  return candidates.find((p) => p && fs.existsSync(p)) ?? null;
}

async function ensureMkcert() {
  let mk = findMkcert();
  if (mk) return mk;
  const brew = [which('brew'), '/opt/homebrew/bin/brew', '/usr/local/bin/brew'].find((p) => p && fs.existsSync(p));
  if (brew) {
    step('Installing mkcert with Homebrew');
    execFileSync(brew, ['install', 'mkcert'], { stdio: 'inherit' });
  } else {
    const arch = process.arch === 'arm64' ? 'arm64' : 'amd64';
    const url = `https://dl.filippo.io/mkcert/latest?for=darwin/${arch}`;
    step(`No Homebrew — downloading mkcert (${arch}) into ${tilde(path.join(DATA, 'bin'))}`);
    const res = await fetch(url);
    if (!res.ok) throw new Error(`mkcert download failed: HTTP ${res.status}`);
    const dest = path.join(DATA, 'bin/mkcert');
    fs.writeFileSync(dest, Buffer.from(await res.arrayBuffer()), { mode: 0o755 });
  }
  mk = findMkcert();
  if (!mk) throw new Error('mkcert still not found after installing it');
  return mk;
}

function caRoot(mk) {
  return sh(mk, ['-CAROOT']);
}

function certNeedsRenewal(names) {
  if (!fs.existsSync(CERT) || !fs.existsSync(KEY) || !fs.existsSync(NAMES)) return 'no cert yet';
  if (fs.readFileSync(NAMES, 'utf8').trim() !== names.join(' ')) return 'hostname or Wi-Fi address changed';
  const cert = new crypto.X509Certificate(fs.readFileSync(CERT));
  if (new Date(cert.validTo).getTime() - Date.now() < 30 * 86_400_000) return 'expires within 30 days';
  return null;
}

function makeCert(mk, names) {
  const why = certNeedsRenewal(names);
  if (!why) {
    console.log(`  cert is current for ${names.join(', ')}`);
    return false;
  }
  step(`Generating HTTPS cert (${why}) for ${names.join(', ')}`);
  execFileSync(mk, ['-cert-file', CERT, '-key-file', KEY, ...names], { stdio: ['ignore', 'ignore', 'inherit'] });
  fs.chmodSync(KEY, 0o600);
  fs.writeFileSync(NAMES, names.join(' ') + '\n');
  return true;
}

// ── deploy ───────────────────────────────────────────────────────────────────

function deploy({ build = true } = {}) {
  if (build) {
    step('Building (npm run build)');
    execFileSync('npm', ['run', 'build'], { cwd: REPO, stdio: 'inherit' });
  }
  const out = path.join(REPO, 'out');
  if (!fs.existsSync(path.join(out, 'sw.js'))) throw new Error('out/sw.js missing — the build did not finish');
  const version = /const VERSION = '([^']+)'/.exec(fs.readFileSync(path.join(out, 'sw.js'), 'utf8'))?.[1] ?? 'unknown';
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const target = path.join(BUILDS, `${stamp}_${version}`);
  step(`Deploying build ${version} → ${tilde(SITE)}`);
  fs.mkdirSync(BUILDS, { recursive: true });
  fs.cpSync(out, target, { recursive: true });

  // A real folder from some older layout: move it aside so the symlink can replace it.
  if (fs.existsSync(SITE) && !fs.lstatSync(SITE).isSymbolicLink()) fs.renameSync(SITE, path.join(BUILDS, `${stamp}_previous`));
  // rename() of a symlink is atomic: requests see the old build or the new one, never half of either.
  const tmp = path.join(DATA, `.site-${stamp}`);
  fs.symlinkSync(target, tmp);
  fs.renameSync(tmp, SITE);

  const keep = new Set([target]);
  const builds = fs.readdirSync(BUILDS).sort().map((n) => path.join(BUILDS, n));
  for (const old of builds.filter((b) => !keep.has(b)).slice(0, -2)) fs.rmSync(old, { recursive: true, force: true });

  if (agentLoaded()) {
    execFileSync('launchctl', ['kickstart', '-k', `${DOMAIN}/${LABEL}`]);
    console.log('  restarted the server');
  }
  return version;
}

// ── LaunchAgent ──────────────────────────────────────────────────────────────

function plist() {
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const node = process.execPath; // absolute: launchd doesn't load the shell PATH (nvm etc.)
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>${esc(node)}</string>
    <string>${esc(path.join(REPO, 'scripts/home-server.mjs'))}</string>
  </array>
  <key>EnvironmentVariables</key>
  <dict>
    <key>BJ_DATA_DIR</key><string>${esc(DATA)}</string>
    <key>BJ_PORT</key><string>${PORT}</string>
  </dict>
  <key>WorkingDirectory</key><string>${esc(DATA)}</string>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ThrottleInterval</key><integer>10</integer>
  <key>StandardOutPath</key><string>${esc(LOG)}</string>
  <key>StandardErrorPath</key><string>${esc(ERR)}</string>
</dict>
</plist>
`;
}

function installAgent() {
  step(`Installing LaunchAgent ${tilde(PLIST)}`);
  fs.mkdirSync(path.dirname(PLIST), { recursive: true });
  fs.writeFileSync(PLIST, plist());
  if (agentLoaded()) spawnSync('launchctl', ['bootout', `${DOMAIN}/${LABEL}`], { stdio: 'ignore' });
  for (let i = 0; i < 20 && agentLoaded(); i++) spawnSync('sleep', ['0.25']);
  execFileSync('launchctl', ['bootstrap', DOMAIN, PLIST], { stdio: 'inherit' });
}

function ping(ca, host = 'localhost', timeout = 3000) {
  return new Promise((resolve) => {
    const req = https.get({ host, port: PORT, path: '/api/ping', ca, servername: host, timeout }, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(null);
        }
      });
    });
    req.on('timeout', () => req.destroy());
    req.on('error', () => resolve(null));
  });
}

async function waitForPing(ca) {
  for (let i = 0; i < 40; i++) {
    const r = await ping(ca);
    if (r?.ok) return r;
    await new Promise((r) => setTimeout(r, 250));
  }
  return null;
}

// ── commands ─────────────────────────────────────────────────────────────────

async function setup() {
  for (const d of DIRS) fs.mkdirSync(path.join(DATA, d), { recursive: true });
  console.log(`Data folder: ${tilde(DATA)}`);
  const mk = await ensureMkcert();
  console.log(`  mkcert: ${mk}`);
  const host = hostName();
  const certChanged = makeCert(mk, certNames());
  const root = caRoot(mk);
  deploy();
  installAgent();
  if (certChanged) execFileSync('launchctl', ['kickstart', '-k', `${DOMAIN}/${LABEL}`]);
  const ca = fs.readFileSync(path.join(root, 'rootCA.pem'));
  const ok = await waitForPing(ca);
  if (!ok) {
    console.error(`\n✗ The server didn't answer on https://localhost:${PORT}. Check ${tilde(ERR)}.`);
    process.exitCode = 1;
    return;
  }
  const url = `https://${host}:${PORT}`;
  const ipUrls = lanAddresses().map((a) => `https://${a}:${PORT}`);
  console.log(`
✓ Blackjack Bot is running from this Mac
  ${url}${ipUrls.length ? `\n  ${ipUrls.join('\n  ')}   ← use this if the phone says "can't find the server"` : ''}

iPhone (once):
  1. AirDrop rootCA.pem (Finder is opening its folder now) to the iPhone.
     Settings → General → VPN & Device Management → install the profile.
     Settings → General → About → Certificate Trust Settings → turn on full trust for it.
     If iOS doesn't recognize the file, rename it to rootCA.crt first.
     (Only send rootCA.pem — never rootCA-key.pem.)
  2. On home Wi-Fi, open ${url} in Safari → Share → Add to Home Screen.
  3. Play a hand in the Home Screen app → Settings → Mac sync says "Copied to Mac".

Optional — make Safari on this Mac trust the cert too (asks for your Mac password):
  ${mk} -install

Status any time: npm run home:status`);
  spawnSync('open', ['-R', path.join(root, 'rootCA.pem')]);
}

async function status() {
  const host = hostName();
  const url = `https://${host}:${PORT}`;
  let state = 'not installed';
  if (fs.existsSync(PLIST)) {
    const r = spawnSync('launchctl', ['print', `${DOMAIN}/${LABEL}`], { encoding: 'utf8' });
    if (r.status !== 0) state = 'installed, not loaded';
    else {
      const s = /\n\s*state = (\S+)/.exec(r.stdout)?.[1] ?? '?';
      const pid = /\n\s*pid = (\d+)/.exec(r.stdout)?.[1];
      const exit = /last exit code = ([^\n]+)/.exec(r.stdout)?.[1];
      state = `${s}${pid ? ` (pid ${pid})` : ''}${exit && s !== 'running' ? `, last exit: ${exit}` : ''}`;
    }
  }
  const mk = findMkcert();
  const ca = mk ? path.join(caRoot(mk), 'rootCA.pem') : null;
  const p = ca && fs.existsSync(ca) ? await ping(fs.readFileSync(ca)) : null;
  console.log(`Blackjack Bot home server
  agent:   ${state}
  answers: ${p?.ok ? `yes (server time ${new Date(p.serverTime).toLocaleString()})` : 'no'}
  URL:     ${url}${lanAddresses().map((a) => `\n           https://${a}:${PORT}`).join('')}`);
  if (fs.existsSync(NAMES) && fs.readFileSync(NAMES, 'utf8').trim() !== certNames().join(' ')) {
    console.log('  ⚠ The Mac\'s name or Wi-Fi address changed since the cert was made: run npm run home:setup');
  }

  const save = path.join(DATA, 'save.json');
  if (fs.existsSync(save)) {
    try {
      const s = JSON.parse(fs.readFileSync(save, 'utf8'));
      console.log(`  save:    revision ${s.revision}, saved ${new Date(s.savedAt ?? s.updatedAt).toLocaleString()} from ${s.deviceId} (${fs.statSync(save).size} bytes)`);
    } catch (e) {
      console.log(`  save:    UNREADABLE (${e.message})`);
    }
  } else console.log('  save:    nothing saved yet');
  const count = (d) => (fs.existsSync(path.join(DATA, d)) ? fs.readdirSync(path.join(DATA, d)).filter((f) => f.endsWith('.json')).length : 0);
  const site = fs.existsSync(SITE) ? path.basename(fs.realpathSync(SITE)) : 'not deployed';
  console.log(`
Files
  save:      ${tilde(save)}
  history:   ${tilde(path.join(DATA, 'history'))} (${count('history')} snapshots)
  conflicts: ${tilde(path.join(DATA, 'conflicts'))} (${count('conflicts')} files)
  site:      ${tilde(SITE)} → ${site}
  certs:     ${tilde(path.join(DATA, 'certs'))}${ca ? `  ·  CA for the iPhone: ${tilde(ca)}` : ''}
  logs:      ${tilde(LOG)}
  agent:     ${tilde(PLIST)}`);
  for (const f of [LOG, ERR]) {
    if (!fs.existsSync(f)) continue;
    const lines = fs.readFileSync(f, 'utf8').trimEnd().split('\n').filter(Boolean).slice(-8);
    if (lines.length) console.log(`\nLast lines of ${path.basename(f)}\n  ${lines.join('\n  ')}`);
  }
}

function uninstall() {
  if (agentLoaded()) spawnSync('launchctl', ['bootout', `${DOMAIN}/${LABEL}`], { stdio: 'inherit' });
  fs.rmSync(PLIST, { force: true });
  console.log(`LaunchAgent removed. Your data is still in ${tilde(DATA)} (save, history, conflicts, certs).
Run npm run home:setup to install it again.`);
}

const cmd = process.argv[2];
const commands = { setup, deploy: () => deploy(), status, uninstall };
if (!commands[cmd]) {
  console.error('usage: node scripts/home.mjs <setup|deploy|status|uninstall>');
  process.exit(2);
}
try {
  await commands[cmd]();
} catch (e) {
  console.error(`\n✗ ${e.message}`);
  process.exit(1);
}
