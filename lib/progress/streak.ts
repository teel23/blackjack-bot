import type { Streak } from '../storage/schema';
import { addDays, daysBetween } from './dates';

export const MAX_FREEZES = 2;

/**
 * Bring a streak up to date for `today`: missed days are covered by freezes if there are
 * enough of them; otherwise the streak resets to 0.
 */
export function reconcileStreak(streak: Streak, today: string): Streak {
  if (!streak.lastGoalDate) return streak;
  const gap = daysBetween(streak.lastGoalDate, today);
  if (gap <= 1) return streak;
  const missed = gap - 1;
  if (streak.current > 0 && streak.freezes >= missed) {
    const used = Array.from({ length: missed }, (_, i) => addDays(streak.lastGoalDate as string, i + 1));
    return {
      ...streak,
      freezes: streak.freezes - missed,
      freezesUsed: [...streak.freezesUsed, ...used].slice(-100),
      lastGoalDate: addDays(today, -1),
    };
  }
  return { ...streak, current: 0 };
}

/** Today's daily goal was met. */
export function completeGoal(streak: Streak, today: string, perfect = false): Streak {
  const s = reconcileStreak(streak, today);
  let next = s;
  if (s.lastGoalDate !== today) {
    const continues = s.lastGoalDate !== null && daysBetween(s.lastGoalDate, today) === 1 && s.current > 0;
    const current = continues ? s.current + 1 : 1;
    next = { ...s, current, best: Math.max(s.best, current), lastGoalDate: today };
  }
  if (perfect) next = { ...next, freezes: Math.min(MAX_FREEZES, next.freezes + 1) };
  return next;
}

export function goalDoneToday(streak: Streak, today: string): boolean {
  return streak.lastGoalDate === today;
}
