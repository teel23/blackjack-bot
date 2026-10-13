import { test } from '@playwright/test';
import { stackedSave, withSave } from '../e2e/helpers';

const shot = (name: string, project: string) => `.screens/${project.replace(/\s+/g, '-')}/${name}.png`;

test('table states', async ({ page }, info) => {
  const p = info.project.name;
  await withSave(page, stackedSave([8, 8], 6, 10, [8, 8, 3, 10, 4, 10, 2, 10, 10]));
  await page.goto('/play/');
  await page.screenshot({ path: shot('01-betting', p) });
  await page.getByRole('button', { name: /^Deal/ }).click();
  await page.waitForTimeout(900);
  await page.screenshot({ path: shot('02-pair', p) });
  await page.getByRole('button', { name: 'Hint: show the correct play' }).click();
  await page.waitForTimeout(300);
  await page.screenshot({ path: shot('03-hint', p) });
  await page.getByRole('button', { name: /Split/ }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Split', exact: true }).click();
  await page.waitForTimeout(600);
  await page.getByRole('button', { name: 'Split', exact: true }).click();
  await page.waitForTimeout(600);
  await page.screenshot({ path: shot('04-four-hands', p) });
  for (let i = 0; i < 4; i++) {
    const stand = page.getByRole('button', { name: 'Stand', exact: true });
    if (await stand.isEnabled()) await stand.click();
    await page.waitForTimeout(400);
  }
  await page.waitForTimeout(2500);
  await page.screenshot({ path: shot('05-result', p) });
});

test('lobby', async ({ page }, info) => {
  await withSave(page, stackedSave([10, 9], 6, 10, [], (d) => (d.table.mode = null)));
  await page.goto('/play/');
  await page.screenshot({ path: shot('00-lobby', info.project.name), fullPage: true });
});
