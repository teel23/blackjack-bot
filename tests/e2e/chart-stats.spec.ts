import { expect, test } from '@playwright/test';
import { defaultData } from '../../lib/storage/schema';
import { expectNoHorizontalOverflow, expectTapTargets, readSave, stackedSave, withSave } from './helpers';

test('strategy chart: tap a cell for the explanation; rules change the chart', async ({ page }) => {
  await withSave(page, defaultData());
  await page.goto('/chart/');
  await expectNoHorizontalOverflow(page);
  const cell = page.getByRole('button', { name: /^Hard 11 vs A: Hit/ });
  await expect(cell).toBeVisible();
  await cell.click();
  await expect(page.getByRole('dialog', { name: 'Hard 11 vs A' })).toBeVisible();
  await expect(page.getByText('Average result per $100 bet')).toBeVisible();
  await page.getByRole('button', { name: 'Close sheet' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);

  await page.goto('/settings/');
  await page.getByRole('radio', { name: 'Hits (H17)' }).click();
  await page.goto('/chart/');
  await expect(page.getByRole('button', { name: /^Hard 11 vs A: Double/ })).toBeVisible();
  await page.getByRole('button', { name: /^Hard 11 vs A: Double/ }).click();
  await expect(page.getByText(/Rule note:/)).toBeVisible();
});

test('chart pairs tab and heat map', async ({ page }) => {
  const d = defaultData();
  d.stats.cells['P8v10'] = { n: 4, correct: 1, last: 1, lastWrong: 1 };
  await withSave(page, d);
  await page.goto('/chart/');
  await page.getByRole('tab', { name: 'Pairs' }).click();
  await expect(page.getByRole('button', { name: /^8,8 vs 10: Split/ })).toBeVisible();
  await page.getByRole('switch', { name: /heat map/ }).check({ force: true });
  await expect(page.getByRole('button', { name: /^8,8 vs 10: Split\. Your accuracy 25%/ })).toHaveText('25');
});

test('stats + review mistakes replays the exact missed hand', async ({ page }) => {
  // Play one wrong hand at the table, then review it.
  await withSave(page, stackedSave([10, 6], 'K', 7, [9, 4]));
  await page.goto('/play/');
  await page.getByRole('button', { name: /^Deal/ }).click();
  await page.getByRole('button', { name: 'Stand', exact: true }).click();
  await page.goto('/stats/');
  await expect(page.getByText('16 vs 10').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await page.getByRole('button', { name: /Review 1 hand/ }).click();
  await expect(page.getByText(/Review mistakes · 1 \/ 1/)).toBeVisible();
  await expect(page.getByRole('group', { name: /Your cards: Ten of hearts, Six of diamonds/ })).toBeVisible();
  await page.getByRole('button', { name: 'Surrender', exact: true }).click();
  await expect(page.getByText('1 / 1')).toBeVisible();
  const save = await readSave(page);
  expect(save.stats.mistakes).toHaveLength(0);
});

test('settings: export and import a backup', async ({ page }) => {
  await page.addInitScript(() => {
    // Force the download path (no share sheet in automation).
    Object.defineProperty(navigator, 'canShare', { value: undefined, configurable: true });
  });
  const d = defaultData();
  d.bankroll.balance = 4321;
  await withSave(page, d);
  await page.goto('/settings/');
  await expectTapTargets(page);
  const [download] = await Promise.all([page.waitForEvent('download'), page.getByRole('button', { name: 'Export backup' }).click()]);
  const path = await download.path();
  expect(download.suggestedFilename()).toMatch(/^blackjack-bot-backup-\d{4}-\d{2}-\d{2}\.json$/);

  // Change data, then restore from the file.
  await page.getByRole('button', { name: 'Reset all data' }).click();
  await page.getByRole('button', { name: 'Erase everything' }).click();
  expect((await readSave(page)).bankroll.balance).toBe(1000);
  await page.getByLabel('Choose a backup file').setInputFiles(path!);
  await expect(page.getByRole('dialog', { name: 'Replace your data?' })).toBeVisible();
  await page.getByRole('button', { name: 'Replace' }).click();
  await expect(page.getByText('Backup restored.')).toBeVisible();
  expect((await readSave(page)).bankroll.balance).toBe(4321);
});

test('every main screen fits without horizontal scroll', async ({ page }) => {
  await withSave(page, defaultData());
  for (const path of ['/', '/learn/', '/drills/', '/play/', '/chart/', '/stats/', '/sessions/', '/settings/', '/about/']) {
    await page.goto(path);
    await expectNoHorizontalOverflow(page);
  }
});
