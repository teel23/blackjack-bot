import { test } from '@playwright/test';
import { defaultData } from '../../lib/storage/schema';
import { withSave } from '../e2e/helpers';

const shot = (name: string, project: string) => `.screens/${project.replace(/\s+/g, '-')}/${name}.png`;

test('chart, detail, stats, settings', async ({ page }, info) => {
  const p = info.project.name;
  const d = defaultData();
  d.stats.cells = {
    H16v10: { n: 9, correct: 4, last: 1, lastWrong: 1 },
    H12v3: { n: 6, correct: 2, last: 1, lastWrong: 1 },
    S18v9: { n: 5, correct: 1, last: 1, lastWrong: 1 },
    H11v11: { n: 4, correct: 4, last: 1, lastWrong: null },
    P9v7: { n: 3, correct: 1, last: 1, lastWrong: 1 },
  };
  d.stats.categories = { hard: { n: 120, correct: 101 }, soft: { n: 40, correct: 29 }, pair: { n: 30, correct: 24 }, surrender: { n: 12, correct: 7 }, insurance: { n: 5, correct: 4 } };
  d.stats.decisions = 207;
  d.stats.handsPlayed = 180;
  await withSave(page, d);
  await page.goto('/chart/');
  await page.screenshot({ path: shot('30-chart-hard', p) });
  await page.getByRole('button', { name: /^Hard 16 vs 10:/ }).click();
  await page.waitForTimeout(400);
  await page.screenshot({ path: shot('31-chart-detail', p) });
  await page.getByRole('button', { name: 'Close sheet' }).click();
  await page.getByRole('tab', { name: 'Soft' }).click();
  await page.screenshot({ path: shot('32-chart-soft', p) });
  await page.getByRole('switch', { name: /heat map/ }).check({ force: true });
  await page.getByRole('tab', { name: 'Hard' }).click();
  await page.screenshot({ path: shot('33-chart-heat', p) });
  await page.goto('/stats/');
  await page.screenshot({ path: shot('34-stats', p), fullPage: true });
  await page.goto('/settings/');
  await page.screenshot({ path: shot('35-settings', p), fullPage: true });
});
