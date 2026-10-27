import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

/** One throwaway cert and one "deployed" copy of out/ for the whole run. */
export default function globalSetup() {
  if (!fs.existsSync('out/sw.js')) throw new Error('Run `npm run build` first (out/sw.js missing).');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'bj-home-e2e-'));
  execFileSync('openssl', [
    'req', '-x509', '-newkey', 'rsa:2048', '-nodes', '-days', '1', '-subj', '/CN=localhost',
    '-addext', 'subjectAltName=DNS:localhost,IP:127.0.0.1',
    '-keyout', path.join(root, 'key.pem'), '-out', path.join(root, 'cert.pem'),
  ], { stdio: 'ignore' });
  fs.cpSync('out', path.join(root, 'site'), { recursive: true });
  process.env.BJ_E2E_ROOT = root;
  return () => fs.rmSync(root, { recursive: true, force: true });
}
