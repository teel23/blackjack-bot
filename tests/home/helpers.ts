import { type ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs';
import https from 'node:https';
import path from 'node:path';
import { type Page, expect } from '@playwright/test';

const root = () => {
  const r = process.env.BJ_E2E_ROOT;
  if (!r) throw new Error('global setup did not run');
  return r;
};

export interface Home {
  port: number;
  base: string;
  dataDir: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  save(): { revision: number; data: { stats: { handsPlayed: number }; bankroll: { balance: number } } } | null;
  conflicts(): string[];
  /** Write to the Mac as if another device did. */
  put(body: unknown): Promise<number>;
}

/** A home server on its own port and temp data dir (the iCloud mirror is off). */
export function homeServer(id: string, port: number): Home {
  const dataDir = path.join(root(), `data-${id}-${port}`);
  fs.rmSync(dataDir, { recursive: true, force: true });
  let proc: ChildProcess | null = null;
  const base = `https://localhost:${port}`;
  const savePath = path.join(dataDir, 'save.json');
  const home: Home = {
    port,
    base,
    dataDir,
    start: () =>
      new Promise((resolve, reject) => {
        proc = spawn(process.execPath, ['scripts/home-server.mjs'], {
          env: {
            ...process.env,
            BJ_DATA_DIR: dataDir,
            BJ_SITE_DIR: path.join(root(), 'site'),
            BJ_CERT: path.join(root(), 'cert.pem'),
            BJ_KEY: path.join(root(), 'key.pem'),
            BJ_PORT: String(port),
            BJ_HOST: '127.0.0.1',
            BJ_MIRROR: '',
          },
        });
        proc.stdout?.on('data', (b: Buffer) => b.toString().includes('home server on') && resolve());
        proc.stderr?.on('data', (b: Buffer) => process.stderr.write(b));
        proc.on('exit', (code) => code && reject(new Error(`home server exited ${code}`)));
      }),
    stop: () =>
      new Promise((resolve) => {
        if (!proc || proc.exitCode !== null) return resolve();
        proc.once('exit', () => resolve());
        proc.kill();
      }),
    save: () => (fs.existsSync(savePath) ? JSON.parse(fs.readFileSync(savePath, 'utf8')) : null),
    conflicts: () => (fs.existsSync(path.join(dataDir, 'conflicts')) ? fs.readdirSync(path.join(dataDir, 'conflicts')) : []),
    put: (body) =>
      new Promise((resolve, reject) => {
        const text = JSON.stringify(body);
        const req = https.request(
          { host: '127.0.0.1', port, path: '/api/save', method: 'PUT', rejectUnauthorized: false, headers: { host: `localhost:${port}`, origin: base, 'content-type': 'application/json' } },
          (res) => {
            res.resume();
            res.on('end', () => resolve(res.statusCode ?? 0));
          },
        );
        req.on('error', reject);
        req.end(text);
      }),
  };
  return home;
}

const hands = (page: Page) =>
  page.evaluate(() => JSON.parse(localStorage.getItem('bjbot:data') ?? 'null')?.stats.handsPlayed ?? 0);

/** Deal and play out whatever comes (stand, decline insurance, skip the reveal) until the hand is counted. */
export async function playAnyHand(page: Page) {
  const before = await hands(page);
  const deal = page.getByRole('button', { name: /^Deal/ });
  await deal.click({ timeout: 10_000 });
  for (let i = 0; i < 60; i++) {
    const dealVisible = await deal.isVisible().catch(() => false);
    if ((await hands(page)) > before && dealVisible) return;
    // A tap that landed while the last hand's reveal was finishing doesn't deal — tap again.
    if (dealVisible && i % 5 === 4) await deal.click({ timeout: 1000 }).catch(() => {});
    for (const name of ['No insurance', 'Keep blackjack']) {
      const b = page.getByRole('button', { name, exact: true });
      if (await b.isVisible().catch(() => false)) await b.click({ timeout: 1000 }).catch(() => {});
    }
    const stand = page.getByRole('button', { name: 'Stand', exact: true });
    if ((await stand.isVisible().catch(() => false)) && (await stand.isEnabled().catch(() => false))) await stand.click({ timeout: 1000 }).catch(() => {});
    const skip = page.getByText(/tap to skip/);
    if (await skip.isVisible().catch(() => false)) await skip.click({ timeout: 1000 }).catch(() => {});
    await page.waitForTimeout(150);
  }
  throw new Error(`hand did not finish (hands before ${before}, now ${await hands(page)})`);
}

export async function waitForPrecache(page: Page) {
  await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
  await expect
    .poll(
      async () =>
        page.evaluate(async () => {
          const c = (await caches.keys()).find((k) => k.startsWith('bjbot-'));
          return c ? (await (await caches.open(c)).keys()).length : 0;
        }),
      { timeout: 60_000 },
    )
    .toBeGreaterThan(200);
}

export async function syncStatus(page: Page, base: string) {
  await page.goto(`${base}/settings/`);
  return page.getByTestId('sync-status');
}
