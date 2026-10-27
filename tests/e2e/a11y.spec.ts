import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { defaultData } from '../../lib/storage/schema';
import type { Page } from '@playwright/test';
import { stackedSave, withSave } from './helpers';

// Legacy mode runs axe in the page itself. The default mode opens a helper page to merge frame results,
// and WebKit's newPage() sometimes never returns under a full 3-worker run. The app has no iframes.
const axe = (page: Page) => new AxeBuilder({ page }).setLegacyMode(true);

const PAGES = ['/', '/learn/', '/drills/', '/play/', '/chart/', '/stats/', '/sessions/', '/settings/', '/about/', '/lesson/u1-values/', '/count/'];

test('no serious accessibility violations on main screens', async ({ page }, info) => {
  test.skip(info.project.name !== 'iPhone 15', 'one device is enough for the audit');
  test.setTimeout(120_000);
  const d = defaultData();
  d.settings.installTipDismissed = false;
  await withSave(page, d);
  const problems: string[] = [];
  for (const path of PAGES) {
    await page.goto(path);
    await page.waitForTimeout(300);
    const r = await axe(page).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
    for (const v of r.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical')) {
      problems.push(`${path} [${v.impact}] ${v.id}: ${v.help} — ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
    }
  }
  expect(problems, problems.join('\n')).toEqual([]);
});

test('table in play has no serious violations', async ({ page }, info) => {
  test.skip(info.project.name !== 'iPhone 15', 'one device is enough for the audit');
  await withSave(page, stackedSave([10, 6], 'K', 7, [9]));
  await page.goto('/play/');
  await page.getByRole('button', { name: /^Deal/ }).click();
  await page.waitForTimeout(500);
  const r = await axe(page).withTags(['wcag2a', 'wcag2aa']).analyze();
  const bad = r.violations.filter((x) => x.impact === 'serious' || x.impact === 'critical').map((v) => `${v.id}: ${v.nodes.slice(0, 3).map((n) => n.target.join(' ')).join(' | ')}`);
  expect(bad, bad.join('\n')).toEqual([]);
});
