import { test } from '@playwright/test';
import { stackedSave, withSave } from '../e2e/helpers';

const shot = (name: string, project: string) => `.screens/${project.replace(/\s+/g, '-')}/${name}.png`;

test('landscape table + split', async ({ page }, info) => {
  const vp = page.viewportSize()!;
  await page.setViewportSize({ width: vp.height, height: Math.min(vp.width, 360) });
  await withSave(page, stackedSave([8, 8], 6, 10, [8, 3, 10, 10, 10]));
  await page.goto('/play/');
  await page.screenshot({ path: shot('40-landscape-bet', info.project.name) });
  await page.getByRole('button', { name: /^Deal/ }).click();
  await page.getByRole('button', { name: 'Split', exact: true }).click();
  await page.getByRole('button', { name: 'Split', exact: true }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot('41-landscape-split', info.project.name) });
});

test('largest text size (20px root) table + lesson', async ({ page }, info) => {
  await page.addInitScript(() => {
    document.addEventListener('DOMContentLoaded', () => (document.documentElement.style.fontSize = '20px'));
  });
  await withSave(page, stackedSave([10, 6], 'K', 7, [9]));
  await page.goto('/play/');
  await page.evaluate(() => (document.documentElement.style.fontSize = '20px'));
  await page.getByRole('button', { name: /^Deal/ }).click();
  await page.waitForTimeout(800);
  await page.screenshot({ path: shot('42-bigtext-table', info.project.name) });
  await page.goto('/lesson/u1-values/');
  await page.evaluate(() => (document.documentElement.style.fontSize = '20px'));
  await page.screenshot({ path: shot('43-bigtext-lesson', info.project.name) });
});
