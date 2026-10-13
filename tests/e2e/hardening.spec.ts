import { expect, test } from '@playwright/test';
import { STORAGE_KEY } from '../../lib/storage/persist';
import { defaultData } from '../../lib/storage/schema';
import { drillHand } from '../../lib/state/drills';
import { cardSpoken } from '../../lib/engine/cards';
import { readSave, stackedSave, withSave } from './helpers';

test('app killed mid-hand: a brand-new launch restores the exact hand', async ({ browser, page }, info) => {
  await withSave(page, stackedSave([5, 4], 'K', 7, [2, 10]));
  await page.goto('/play/');
  await page.getByRole('button', { name: /^Deal/ }).click();
  await page.getByRole('button', { name: 'Hit', exact: true }).click();
  await expect(page.getByRole('group', { name: 'Your hand: 11' })).toBeVisible();
  const state = await page.context().storageState();
  await page.context().close();

  const relaunch = await browser.newContext({ ...info.project.use, storageState: state, serviceWorkers: 'block' });
  const p2 = await relaunch.newPage();
  await p2.goto('/play/');
  await expect(p2.getByRole('group', { name: 'Your hand: 11' })).toBeVisible();
  await expect(p2.getByRole('button', { name: 'Hit', exact: true })).toBeEnabled();
  await relaunch.close();
});

test('daily drill resumes on the same question with the same cards', async ({ page }) => {
  await withSave(page, defaultData());
  await page.goto('/');
  await page.getByRole('button', { name: 'Start drill' }).click();
  for (let i = 0; i < 3; i++) {
    await expect(page.getByText(new RegExp(`Daily drill · ${i + 1} / 20`))).toBeVisible();
    // Any answer; wrong ones need a Next tap.
    await page.getByRole('button', { name: 'Stand', exact: true }).click();
    const next = page.getByRole('button', { name: /^Next$/ });
    if (await next.isVisible().catch(() => false)) await next.click();
    else await expect(page.getByText(new RegExp(`Daily drill · ${i + 2} / 20`))).toBeVisible();
  }
  const before = (await readSave(page)).progress.activeDrill!;
  const hand = drillHand(before)!;
  await page.reload();
  await expect(page.getByText('Daily drill · 4 / 20')).toBeVisible();
  await expect(page.getByRole('group', { name: `Your cards: ${hand.cards.map(cardSpoken).join(', ')}` })).toBeVisible();
});

test('reload during the dealer reveal shows the settled result (no replay, no double pay)', async ({ page }) => {
  await withSave(page, stackedSave([10, 9], 6, 10, [8]));
  await page.goto('/play/');
  await page.getByRole('button', { name: /^Deal/ }).click();
  await page.getByRole('button', { name: 'Stand', exact: true }).click();
  await page.reload();
  await expect(page.getByText(/You win \$25/)).toBeVisible();
  expect((await readSave(page)).table.quickStack).toBe(1025);
  await page.reload();
  expect((await readSave(page)).table.quickStack).toBe(1025);
});

test('corrupt saved data: starts fresh, keeps a copy, explains', async ({ page }) => {
  await page.addInitScript((key) => {
    if (!sessionStorage.getItem('__seeded')) {
      localStorage.setItem(key, '{"version":1,"settings":{'); // truncated JSON
      sessionStorage.setItem('__seeded', '1');
    }
  }, STORAGE_KEY);
  await page.goto('/');
  await expect(page.getByRole('alert').filter({ hasText: 'damaged' })).toBeVisible();
  await page.getByRole('button', { name: 'OK' }).click();
  const keys = await page.evaluate(() => Object.keys(localStorage));
  expect(keys.some((k) => k.startsWith('bjbot:corrupt:'))).toBe(true);
  expect((await readSave(page)).bankroll.balance).toBe(1000);
});

test('a broken hand is dropped but the bankroll survives', async ({ page }) => {
  const d = defaultData() as unknown as Record<string, Record<string, unknown>>;
  d.bankroll.balance = 640;
  d.table.mode = 'quick';
  d.table.round = { phase: 'player', hands: [{ cards: 'garbage' }] };
  await withSave(page, d as never);
  await page.goto('/play/');
  await expect(page.getByRole('alert').filter({ hasText: 'the hand in progress' })).toBeVisible();
  expect((await readSave(page)).bankroll.balance).toBe(640);
  await expect(page.getByRole('button', { name: /^Deal/ })).toBeVisible();
});

test('safe areas: nothing under the notch or home indicator', async ({ page }) => {
  await page.addInitScript(() => {
    const s = document.createElement('style');
    s.textContent = ':root{--safe-top:47px !important;--safe-bottom:34px !important}';
    document.addEventListener('DOMContentLoaded', () => document.head.appendChild(s));
  });
  await withSave(page, stackedSave([10, 6], 'K', 7, [9]));
  await page.goto('/play/');
  await page.getByRole('button', { name: /^Deal/ }).click();
  const vh = page.viewportSize()!.height;
  const top = await page.getByRole('link', { name: 'Home' }).boundingBox();
  expect(top!.y).toBeGreaterThanOrEqual(47);
  const hit = await page.getByRole('button', { name: 'Hit', exact: true }).boundingBox();
  expect(hit!.y + hit!.height).toBeLessThanOrEqual(vh - 34);
  await page.goto('/');
  const tab = await page.getByRole('link', { name: 'Stats' }).boundingBox();
  expect(tab!.y + tab!.height).toBeLessThanOrEqual(vh - 34 + 1);
  const h1 = await page.getByRole('heading', { name: 'Today', exact: true }).boundingBox();
  expect(h1!.y).toBeGreaterThanOrEqual(47);
});

test('double-tapping Hit only draws one card; no zoom, no overscroll', async ({ page }) => {
  await withSave(page, stackedSave([5, 3], 'K', 7, [2, 2, 2]));
  await page.goto('/play/');
  await page.getByRole('button', { name: /^Deal/ }).click();
  await page.getByRole('button', { name: 'Hit', exact: true }).dblclick();
  await expect(page.getByRole('group', { name: 'Your hand: 10' })).toBeVisible();
  const styles = await page.evaluate(() => ({
    overscroll: getComputedStyle(document.documentElement).overscrollBehaviorY,
    touch: getComputedStyle(document.querySelector('button')!).touchAction,
  }));
  expect(styles.overscroll).toBe('none');
  expect(styles.touch).toBe('manipulation');
});

test('asks the browser to persist storage', async ({ page }) => {
  await page.addInitScript(() => {
    (window as unknown as { __persistCalls: number }).__persistCalls = 0;
    if (typeof StorageManager !== 'undefined') {
      Object.defineProperty(StorageManager.prototype, 'persist', {
        configurable: true,
        value: async () => {
          (window as unknown as { __persistCalls: number }).__persistCalls++;
          return true;
        },
      });
      Object.defineProperty(StorageManager.prototype, 'persisted', { configurable: true, value: async () => false });
    }
  });
  await withSave(page, defaultData());
  await page.goto('/settings/');
  await expect.poll(() => page.evaluate(() => (window as unknown as { __persistCalls: number }).__persistCalls)).toBeGreaterThan(0);
  await expect(page.getByText(/agreed to keep/)).toBeVisible();
});
