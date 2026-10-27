import { expect, test } from '@playwright/test';
import { stackedSave, withSave } from './helpers';

// The static build (Netlify, `npm start`) has no /api/ping: Mac sync stays hidden and inactive.
test('web version: no Mac sync card, no sync requests after the first ping', async ({ page }) => {
  const api: string[] = [];
  page.on('request', (r) => {
    const p = new URL(r.url()).pathname;
    if (p.startsWith('/api/')) api.push(`${r.method()} ${p}`);
  });
  await withSave(page, stackedSave([10, 9], 6, 10, [8]));
  await page.goto('/play/');
  await page.getByRole('button', { name: /^Deal/ }).click();
  await page.getByRole('button', { name: 'Stand', exact: true }).click();
  await expect(page.getByText(/You win \$25/)).toBeVisible();
  await page.goto('/settings/');
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Export backup' })).toBeVisible();
  await expect(page.getByText('Mac sync')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Sync now' })).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem('bjbot:sync'))).toBeNull();
  expect(api.every((r) => r === 'GET /api/ping')).toBe(true);
});
