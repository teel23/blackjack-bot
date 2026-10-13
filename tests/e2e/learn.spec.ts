import { expect, test, type Page } from '@playwright/test';
import { LESSONS } from '../../content/lessons';
import { ACTION_LABEL } from '../../lib/strategy/chart';
import { gradeLessonQuestion, grade } from '../../lib/learn';
import { drillHand } from '../../lib/state/drills';
import { defaultData } from '../../lib/storage/schema';
import { expectNoHorizontalOverflow, readSave, withSave } from './helpers';

function fresh() {
  const d = defaultData();
  d.settings.installTipDismissed = true;
  return d;
}

async function answerLessonQuestion(page: Page, lessonIdx: number, qi: number, right = true) {
  const q = LESSONS[lessonIdx].questions[qi];
  if (q.type === 'choice') {
    const i = right ? q.answer : (q.answer + 1) % q.options.length;
    await page.getByRole('radio', { name: q.options[i], exact: true }).click();
  } else {
    const g = gradeLessonQuestion(q);
    const action = right ? g.rec.action : (['hit', 'stand'] as const).find((a) => a !== g.rec.action)!;
    await page.getByRole('button', { name: ACTION_LABEL[action], exact: true }).click();
  }
  await page.getByRole('button', { name: /Continue/ }).click();
}

test('finish a lesson; the next one unlocks the following day', async ({ page }) => {
  await page.clock.setFixedTime(new Date('2026-10-12T10:00:00'));
  await withSave(page, fresh());
  await page.goto('/');
  await page.getByRole('link', { name: 'Start lesson' }).click();
  const lesson = LESSONS[0];
  for (let i = 0; i < lesson.cards.length; i++) {
    await page.getByRole('button', { name: i === lesson.cards.length - 1 ? 'Start practice' : 'Next' }).click();
  }
  for (let qi = 0; qi < lesson.questions.length; qi++) await answerLessonQuestion(page, 0, qi);
  await expect(page.getByRole('heading', { name: 'Lesson passed' })).toBeVisible();
  await expect(page.getByText(/unlocks tomorrow/)).toBeVisible();
  await page.goto('/learn/');
  await expect(page.getByText('Unlocks tomorrow')).toBeVisible();
  await expectNoHorizontalOverflow(page);

  await page.clock.setFixedTime(new Date('2026-10-13T09:00:00'));
  await page.reload();
  await expect(page.getByRole('link', { name: new RegExp(LESSONS[1].title) })).toBeVisible();
});

test('kill and resume mid-lesson', async ({ page }) => {
  await withSave(page, fresh());
  await page.goto(`/lesson/${LESSONS[0].id}/`);
  for (let i = 0; i < LESSONS[0].cards.length; i++) {
    await page.getByRole('button', { name: /Next|Start practice/ }).click();
  }
  await answerLessonQuestion(page, 0, 0);
  await answerLessonQuestion(page, 0, 1, false);
  await expect(page.getByText(`Question 3 of ${LESSONS[0].questions.length}`)).toBeVisible();
  await page.reload();
  await expect(page.getByText(`Question 3 of ${LESSONS[0].questions.length}`)).toBeVisible();
  const save = await readSave(page);
  expect(save.progress.activeLesson?.answers).toEqual([true, false]);
});

test('daily drill: 20 decisions completes the goal and starts a streak', async ({ page }) => {
  test.setTimeout(120_000);
  await withSave(page, fresh());
  await page.goto('/');
  await page.getByRole('button', { name: 'Start drill' }).click();
  for (let i = 0; i < 20; i++) {
    await expect(page.getByText(new RegExp(`Daily drill · ${i + 1} / 20`))).toBeVisible();
    const save = await readSave(page);
    const a = save.progress.activeDrill!;
    const hand = drillHand(a)!;
    const g = grade(hand.cards, hand.up, save.settings.rules);
    // Miss one on purpose to see the correction flow.
    if (i === 3) {
      const wrong = (['hit', 'stand'] as const).find((x) => x !== g.rec.action)!;
      await page.getByRole('button', { name: ACTION_LABEL[wrong], exact: true }).click();
      await page.getByRole('button', { name: /^(Next|Finish)$/ }).click();
    } else {
      await page.getByRole('button', { name: ACTION_LABEL[g.rec.action], exact: true }).click();
    }
  }
  await expect(page.getByText('19 / 20')).toBeVisible();
  await expect(page.getByText(/Daily goal done — streak: 1 day/)).toBeVisible();
  const save = await readSave(page);
  expect(save.progress.streak.current).toBe(1);
  expect(save.progress.activeDrill).toBeNull();
  await page.getByRole('link', { name: 'Done' }).click();
  await expect(page.getByText(/Done ✓ — 19\/20 correct/)).toBeVisible();
});
