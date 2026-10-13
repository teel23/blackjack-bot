import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, readSave, stackedSave, withSave } from './helpers';

test('session: buy in, play a hand, cash out, see it in history', async ({ page }) => {
  await withSave(page, stackedSave([10, 9], 6, 10, [8], (d) => (d.table.mode = null)));
  await page.goto('/play/');
  await page.getByRole('radio', { name: '$250' }).click();
  await page.getByRole('button', { name: 'Buy in for $250' }).click();
  await expect(page.getByText('Session stack')).toBeVisible();
  await page.getByRole('button', { name: /^Deal/ }).click();
  await page.getByRole('button', { name: 'Stand', exact: true }).click();
  await expect(page.getByText(/You win \$25/)).toBeVisible();
  await page.getByRole('button', { name: 'Table menu' }).click();
  await page.getByRole('button', { name: /Cash out \$275/ }).click();
  await expect(page.getByRole('heading', { name: 'Start a session' })).toBeVisible();
  await page.getByRole('link', { name: /Sessions & bankroll history/ }).click();
  await expect(page.getByRole('heading', { name: 'History' })).toBeVisible();
  await expect(page.getByText('1 hands · <1 min · buy-in $250')).toBeVisible();
  await expect(page.getByText('+$25').first()).toBeVisible();
  await expectNoHorizontalOverflow(page);
  const save = await readSave(page);
  expect(save.bankroll.balance).toBe(1025);
  await page.getByRole('button', { name: 'Table' }).click();
  await expect(page.getByRole('cell', { name: 'Cashed out' })).toBeVisible();
});

test('reset bankroll is confirmed and logged', async ({ page }) => {
  await withSave(page, stackedSave([10, 9], 6, 10, [], (d) => ((d.table.mode = null), (d.bankroll.balance = 2))));
  await page.goto('/play/');
  await expect(page.getByRole('heading', { name: 'Bankroll empty' })).toBeVisible();
  await page.goto('/sessions/');
  await page.getByRole('button', { name: 'Reset to $1,000' }).click();
  await page.getByRole('button', { name: 'Reset', exact: true }).click();
  await expect(page.getByText('$1,000').first()).toBeVisible();
  const save = await readSave(page);
  expect(save.bankroll.resets).toBe(1);
});
