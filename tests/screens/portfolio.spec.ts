import { test } from '@playwright/test';
import { stackedSave, withSave } from '../e2e/helpers';

test.use({ viewport: { width: 440, height: 956 }, deviceScaleFactor: 3 });

test('portfolio screenshot', async ({ page }, info) => {
  test.skip(info.project.name !== 'iPhone 15 Pro Max');
  await withSave(page, stackedSave([6, 5], 5, 10, [10, 9], (d) => (d.table.quickStack = 1250)));
  await page.goto('/play/');
  await page.getByRole('button', { name: /^Deal/ }).click();
  await page.waitForTimeout(900);
  await page.getByRole('button', { name: 'Double', exact: true }).click();
  await page.waitForTimeout(3000);
  await page.screenshot({ path: '.screens/portfolio-blackjack.png' });
});
