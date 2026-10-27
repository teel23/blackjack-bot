import fs from 'node:fs';
import { expect, test } from '@playwright/test';
import { stackedSave, withSave } from '../e2e/helpers';
import { STORAGE_KEY } from '../../lib/storage/persist';
import { type Home, homeServer, playAnyHand, syncStatus, waitForPrecache } from './helpers';

let home: Home;

test.beforeEach(async ({}, info) => {
  const port = 8600 + info.parallelIndex * 10 + (info.retry % 10);
  home = homeServer(info.project.name.replace(/\W/g, ''), port);
  await home.start();
});
test.afterEach(async () => home.stop());

const handsOnMac = () => home.save()?.data.stats.handsPlayed ?? -1;
const handsLocal = (page: import('@playwright/test').Page) =>
  page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null')?.stats.handsPlayed ?? -1, STORAGE_KEY);

test('a played hand reaches save.json on the Mac', async ({ page }) => {
  await withSave(page, stackedSave([10, 9], 6, 10, [8]));
  await page.goto(`${home.base}/play/`);
  await page.getByRole('button', { name: /^Deal/ }).click();
  await page.getByRole('button', { name: 'Stand', exact: true }).click();
  await expect(page.getByText(/You win \$25/)).toBeVisible();
  await expect.poll(handsOnMac, { timeout: 20_000 }).toBe(1);
  expect(home.save()!.data.bankroll).toBeTruthy();
  await expect(await syncStatus(page, home.base)).toHaveText(/^Copied to Mac/);
  await expect(page.getByText(/save\.json$/)).toBeVisible();
});

test('Mac goes away: keep playing offline from the service worker, then it catches up', async ({ page }) => {
  await withSave(page, stackedSave([10, 9], 6, 10, [8]));
  await page.goto(`${home.base}/play/`);
  await waitForPrecache(page);
  await playAnyHand(page);
  await expect.poll(handsOnMac, { timeout: 20_000 }).toBe(1);

  await home.stop();
  await page.goto(`${home.base}/play/`);
  await playAnyHand(page);
  await playAnyHand(page);
  for (const p of ['/chart/', '/learn/', '/stats/']) {
    await page.goto(`${home.base}${p}`);
    await expect(page.locator('main').first()).toBeVisible();
  }
  const status = await syncStatus(page, home.base);
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(status).toHaveText('Mac not reachable — progress is safe on this phone');
  expect(await handsLocal(page)).toBe(3);
  expect(handsOnMac()).toBe(1);

  await home.start();
  await page.getByRole('button', { name: 'Sync now' }).click();
  await expect(status).toHaveText(/^Copied to Mac/);
  await expect.poll(handsOnMac).toBe(3);
});

test('a fresh install (empty storage) adopts the Mac copy', async ({ page, browser }, info) => {
  await withSave(page, stackedSave([10, 9], 6, 10, [8]));
  await page.goto(`${home.base}/play/`);
  await playAnyHand(page);
  await expect.poll(handsOnMac, { timeout: 20_000 }).toBe(1);
  const balance = home.save()!.data.bankroll.balance;

  const ctx = await browser.newContext({ ...info.project.use, ignoreHTTPSErrors: true, serviceWorkers: 'allow' });
  const fresh = await ctx.newPage();
  await fresh.goto(`${home.base}/`);
  await expect.poll(() => handsLocal(fresh)).toBe(1);
  expect(await fresh.evaluate((k) => JSON.parse(localStorage.getItem(k)!).bankroll.balance, STORAGE_KEY)).toBe(balance);
  await expect(await syncStatus(fresh, home.base)).toHaveText(/^Copied to Mac/);
  await ctx.close();
});

test('both sides changed: banner, and the copy not kept lands in conflicts/', async ({ page }) => {
  await withSave(page, stackedSave([10, 9], 6, 10, [8]));
  await page.goto(`${home.base}/play/`);
  await playAnyHand(page);
  await expect.poll(handsOnMac, { timeout: 20_000 }).toBe(1);

  // Another device moves the Mac on…
  const mac = home.save()!;
  const other = structuredClone(mac.data);
  other.stats.handsPlayed = 40;
  expect(await home.put({ baseRevision: mac.revision, updatedAt: Date.now(), deviceId: 'ipad', data: other })).toBe(200);
  // …while this phone plays on.
  await playAnyHand(page);

  const banner = page.getByRole('alert').filter({ hasText: 'Your Mac has different progress' });
  await expect(banner).toBeVisible({ timeout: 20_000 });
  expect(await handsLocal(page)).toBe(2); // still playing on the local copy
  expect(handsOnMac()).toBe(40);

  await banner.getByRole('button', { name: "Keep this phone's" }).click();
  await expect(banner).toBeHidden();
  await expect.poll(() => home.conflicts().length).toBe(1);
  await expect.poll(handsOnMac).toBe(2);
  const archived = JSON.parse(fs.readFileSync(`${home.dataDir}/conflicts/${home.conflicts()[0]}`, 'utf8'));
  expect(archived.side).toBe('mac');
  expect(archived.data.stats.handsPlayed).toBe(40);
});

test("conflict → Use the Mac's archives this phone's copy and loads the Mac's", async ({ page }) => {
  await withSave(page, stackedSave([10, 9], 6, 10, [8]));
  await page.goto(`${home.base}/play/`);
  await playAnyHand(page);
  await expect.poll(handsOnMac, { timeout: 20_000 }).toBe(1);
  const mac = home.save()!;
  const other = structuredClone(mac.data);
  other.stats.handsPlayed = 40;
  await home.put({ baseRevision: mac.revision, updatedAt: Date.now(), deviceId: 'ipad', data: other });
  await playAnyHand(page);
  const banner = page.getByRole('alert').filter({ hasText: 'Your Mac has different progress' });
  await expect(banner).toBeVisible({ timeout: 20_000 });
  await banner.getByRole('button', { name: "Use the Mac's" }).click();
  await expect(banner).toBeHidden();
  await expect.poll(() => handsLocal(page)).toBe(40);
  const archived = JSON.parse(fs.readFileSync(`${home.dataDir}/conflicts/${home.conflicts()[0]}`, 'utf8'));
  expect(archived).toMatchObject({ side: 'phone' });
  expect(archived.data.stats.handsPlayed).toBe(2);
});

test('/api/save is never served from the service worker cache', async ({ page }) => {
  await withSave(page, stackedSave([10, 9], 6, 10, [8]));
  await page.goto(`${home.base}/`);
  await waitForPrecache(page);
  await page.reload();
  expect(await page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  const first = await page.evaluate(async () => (await fetch('/api/save')).status);
  expect([200, 404]).toContain(first);
  const cached = await page.evaluate(async () => {
    const out: string[] = [];
    for (const k of await caches.keys()) for (const r of await (await caches.open(k)).keys()) out.push(new URL(r.url).pathname);
    return out.filter((p) => p.startsWith('/api/'));
  });
  expect(cached).toEqual([]);

  await home.stop();
  const offline = await page.evaluate(async () => {
    try {
      const r = await fetch('/api/save');
      return `status ${r.status}`;
    } catch {
      return 'network error';
    }
  });
  expect(offline).toBe('network error');
  // The app shell itself still comes from the cache.
  await page.goto(`${home.base}/chart/`);
  await expect(page.getByRole('heading', { name: 'Strategy chart' })).toBeVisible();
});
