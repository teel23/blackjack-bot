import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, localDate } from '@/lib/progress/dates';
import { completeGoal, reconcileStreak } from '@/lib/progress/streak';
import type { Streak } from '@/lib/storage/schema';

const empty: Streak = { current: 0, best: 0, lastGoalDate: null, freezes: 0, freezesUsed: [] };

describe('dates', () => {
  it('counts calendar days across month ends and DST', () => {
    expect(daysBetween('2026-10-31', '2026-11-01')).toBe(1);
    expect(daysBetween('2026-03-07', '2026-03-09')).toBe(2);
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    expect(localDate(new Date(2026, 0, 5))).toBe('2026-01-05');
  });
});

describe('streaks', () => {
  it('grows on consecutive days and ignores repeats on the same day', () => {
    let s = completeGoal(empty, '2026-10-01');
    s = completeGoal(s, '2026-10-01');
    s = completeGoal(s, '2026-10-02');
    expect(s.current).toBe(2);
    expect(s.best).toBe(2);
  });

  it('resets after a missed day without freezes', () => {
    let s = completeGoal(empty, '2026-10-01');
    s = completeGoal(s, '2026-10-02');
    expect(reconcileStreak(s, '2026-10-04').current).toBe(0);
    s = completeGoal(s, '2026-10-04');
    expect(s.current).toBe(1);
    expect(s.best).toBe(2);
  });

  it('perfect drills earn freezes (max 2) that cover missed days', () => {
    let s = completeGoal(empty, '2026-10-01', true);
    s = completeGoal(s, '2026-10-02', true);
    s = completeGoal(s, '2026-10-03', true);
    expect(s.freezes).toBe(2);
    const bridged = reconcileStreak(s, '2026-10-05');
    expect(bridged.current).toBe(3);
    expect(bridged.freezes).toBe(1);
    expect(bridged.freezesUsed).toEqual(['2026-10-04']);
    expect(completeGoal(bridged, '2026-10-05').current).toBe(4);
  });

  it('is not saved by freezes when more days were missed than freezes owned', () => {
    let s = completeGoal(empty, '2026-10-01', true);
    s = reconcileStreak(s, '2026-10-05');
    expect(s.current).toBe(0);
    expect(s.freezes).toBe(1);
  });
});
