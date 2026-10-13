import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, expectTapTargets, readSave, stackedSave, withSave } from './helpers';

test.describe('practice table', () => {
  test('play a hand: stand on 19 vs 6, coach confirms, dealer busts', async ({ page }) => {
    await withSave(page, stackedSave([10, 9], 6, 10, [8]));
    await page.goto('/play/');
    await page.getByRole('button', { name: /^Deal/ }).click();
    const stand = page.getByRole('button', { name: 'Stand', exact: true });
    await expect(stand).toBeEnabled();
    // Illegal actions are disabled, not hidden.
    await expect(page.getByRole('button', { name: 'Split', exact: true })).toBeDisabled();
    await expectTapTargets(page);
    await stand.click();
    await expect(page.getByText('Stand — correct')).toBeVisible();
    await expect(page.getByText(/You win \$25/)).toBeVisible();
    const save = await readSave(page);
    expect(save.table.quickStack).toBe(1025);
    expect(save.stats.categories.hard).toEqual({ n: 1, correct: 1 });
    await expectNoHorizontalOverflow(page);
  });

  test('wrong play gets corrected and can be taken back', async ({ page }) => {
    await withSave(page, stackedSave([10, 6], 'K', 7, [9, 4]));
    await page.goto('/play/');
    await page.getByRole('button', { name: /^Deal/ }).click();
    await page.getByRole('button', { name: 'Hit', exact: true }).click();
    await expect(page.getByText('16 vs 10 → Surrender')).toBeVisible();
    await page.getByRole('button', { name: /Take back/ }).click();
    await expect(page.getByRole('button', { name: 'Surrender', exact: true })).toBeEnabled();
    await page.getByRole('button', { name: 'Surrender', exact: true }).click();
    await expect(page.getByText('Surrender — correct')).toBeVisible();
    const save = await readSave(page);
    expect(save.table.quickStack).toBe(1000 - 12.5);
    expect(save.stats.mistakes).toHaveLength(1);
  });

  test('split 8s, double the first hand, both hands win', async ({ page }) => {
    await withSave(page, stackedSave([8, 8], 6, 10, [3, 10, 10, 10]));
    await page.goto('/play/');
    await page.getByRole('button', { name: /^Deal/ }).click();
    await page.getByRole('button', { name: 'Split', exact: true }).click();
    await expect(page.getByRole('group', { name: /Hand 1: 11 \(playing\)/ })).toBeVisible();
    await page.getByRole('button', { name: 'Double', exact: true }).click();
    await expect(page.getByRole('group', { name: /Hand 2: 18 \(playing\)/ })).toBeVisible();
    await page.getByRole('button', { name: 'Stand', exact: true }).click();
    await expect(page.getByText(/You win \$75/)).toBeVisible();
    await expectNoHorizontalOverflow(page);
  });

  test('kill and resume mid-hand restores the exact state', async ({ page }) => {
    await withSave(page, stackedSave([5, 4], 'K', 7, [2, 10]));
    await page.goto('/play/');
    await page.getByRole('button', { name: /^Deal/ }).click();
    await page.getByRole('button', { name: 'Hit', exact: true }).click();
    await expect(page.getByRole('group', { name: 'Your hand: 11' })).toBeVisible();
    await page.reload();
    await expect(page.getByRole('group', { name: 'Your hand: 11' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Double', exact: true })).toBeDisabled();
    await page.getByRole('button', { name: 'Hit', exact: true }).click();
    await expect(page.getByText(/You win \$25/)).toBeVisible();
  });

  test('insurance prompt: declining is correct', async ({ page }) => {
    await withSave(page, stackedSave([10, 9], 'A', 7));
    await page.goto('/play/');
    await page.getByRole('button', { name: /^Deal/ }).click();
    await expect(page.getByText(/Dealer shows an ace/)).toBeVisible();
    await page.getByRole('button', { name: 'No insurance' }).click();
    await expect(page.getByText('No insurance — correct')).toBeVisible();
    await page.getByRole('button', { name: 'Stand', exact: true }).click();
    await expect(page.getByText(/You win \$25/)).toBeVisible();
    const save = await readSave(page);
    expect(save.stats.categories.insurance).toEqual({ n: 1, correct: 1 });
  });
});
