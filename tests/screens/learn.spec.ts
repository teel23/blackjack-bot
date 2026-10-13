import { test } from '@playwright/test';
import { LESSONS } from '../../content/lessons';
import { defaultData } from '../../lib/storage/schema';
import { withSave } from '../e2e/helpers';

const shot = (name: string, project: string) => `.screens/${project.replace(/\s+/g, '-')}/${name}.png`;

test('today + learn + lesson', async ({ page }, info) => {
  const p = info.project.name;
  await page.clock.setFixedTime(new Date('2026-10-12T10:00:00'));
  const d = defaultData();
  d.settings.installTipDismissed = false;
  d.progress.lessons[LESSONS[0].id] = { attempts: 1, bestPct: 100, passedOn: '2026-10-10' };
  d.progress.lessons[LESSONS[1].id] = { attempts: 1, bestPct: 80, passedOn: '2026-10-12' };
  d.progress.daily['2026-10-10'] = { correct: 20, total: 20, perfect: true };
  d.progress.daily['2026-10-11'] = { correct: 18, total: 20, perfect: false };
  d.progress.streak = { current: 2, best: 5, lastGoalDate: '2026-10-11', freezes: 1, freezesUsed: [] };
  d.stats.categories.hard = { n: 40, correct: 34 };
  await withSave(page, d);
  await page.setExtraHTTPHeaders({});
  await page.goto('/');
  await page.screenshot({ path: shot('20-today', p), fullPage: true });
  await page.goto('/learn/');
  await page.screenshot({ path: shot('21-learn', p), fullPage: true });
  await page.goto(`/lesson/${LESSONS[1].id}/`);
  await page.screenshot({ path: shot('22-lesson-card', p) });
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Start practice' }).click();
  await page.screenshot({ path: shot('23-lesson-choice', p) });
  await page.getByRole('radio').nth(2).click();
  await page.screenshot({ path: shot('24-lesson-feedback', p) });
});

test('decision lesson', async ({ page }, info) => {
  const d = defaultData();
  d.settings.unlockAllLessons = true;
  await withSave(page, d);
  const idx = LESSONS.findIndex((l) => l.id === 'u4-double-hard');
  await page.goto(`/lesson/${LESSONS[idx].id}/`);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Start practice' }).click();
  await page.screenshot({ path: shot('25-decision', info.project.name) });
  await page.getByRole('button', { name: 'Hit', exact: true }).click();
  await page.screenshot({ path: shot('26-decision-wrong', info.project.name) });
});
