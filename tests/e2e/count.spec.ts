import { expect, test } from '@playwright/test';
import { defaultData } from '../../lib/storage/schema';
import { readSave, withSave } from './helpers';

test('counting drill: cards flash, enter the running count with the ± pad', async ({ page }) => {
  await withSave(page, defaultData());
  await page.goto('/count/');
  await page.getByRole('radio', { name: '10' }).click();
  await page.getByRole('radio', { name: 'Fast' }).click();
  await page.getByRole('button', { name: 'Start' }).click();
  await expect(page.getByText(/Card \d+ of 10/)).toBeVisible();
  await expect(page.getByRole('heading', { name: /running count/ })).toBeVisible({ timeout: 15_000 });
  const answer = (await readSave(page)).progress.activeDrill!.count!.answer;
  const button = answer >= 0 ? 'Plus one' : 'Minus one';
  for (let i = 0; i < Math.abs(answer); i++) await page.getByRole('button', { name: button }).click();
  await page.getByRole('button', { name: 'Check' }).click();
  await expect(page.getByText('Exactly right')).toBeVisible();
  const save = await readSave(page);
  expect(save.progress.countBest['10-fast']).toBe(1);
});
