import { type ChildProcess, spawn } from 'node:child_process';
import { expect, test } from '@playwright/test';
import { defaultData } from '../../lib/storage/schema';
import { withSave } from './helpers';

test.use({ serviceWorkers: 'allow' });

function serve(port: number): Promise<ChildProcess> {
  return new Promise((resolve) => {
    const p = spawn(process.execPath, ['scripts/serve-out.mjs'], { env: { ...process.env, PORT: String(port) } });
    p.stdout?.on('data', () => resolve(p));
  });
}

test('works offline after the first visit (server gone, service worker serves everything)', async ({ page }, info) => {
  test.setTimeout(120_000);
  const port = 4300 + info.parallelIndex + info.repeatEachIndex * 10;
  const base = `http://localhost:${port}`;
  const server = await serve(port);
  try {
    await withSave(page, defaultData());
    await page.goto(`${base}/`);
    await page.evaluate(async () => !!(await navigator.serviceWorker.ready).active);
    // Precache is done when the cache holds the lesson pages too.
    await expect
      .poll(
        async () =>
          page.evaluate(async () => {
            const keys = await caches.keys();
            const c = keys.find((k) => k.startsWith('bjbot-'));
            if (!c) return 0;
            return (await (await caches.open(c)).keys()).length;
          }),
        { timeout: 60_000 },
      )
      .toBeGreaterThan(200);

    server.kill();
    await new Promise((r) => setTimeout(r, 300));

    for (const path of ['/chart/', '/learn/', '/play/', '/lesson/u1-values/', '/stats/', '/drills/']) {
      await page.goto(`${base}${path}`);
      await expect(page.locator('main').first()).toBeVisible();
    }
    await page.goto(`${base}/`);
    await page.getByRole('link', { name: 'Chart' }).click();
    await expect(page.getByRole('heading', { name: 'Strategy chart' })).toBeVisible();
    await expect(page.getByRole('button', { name: /^Hard 16 vs 10:/ })).toBeVisible();
  } finally {
    server.kill();
  }
});
