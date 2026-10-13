import type { Lesson, Unit } from './types';
import { unit1 } from './unit-01-basics';
import { unit2 } from './unit-02-flow';
import { unit3 } from './unit-03-hard';
import { unit4 } from './unit-04-doubling';

export const UNIT_TITLES: Record<number, string> = {
  1: 'The basics',
  2: 'Table flow',
  3: 'Hard totals',
  4: 'Doubling',
  5: 'Soft hands',
  6: 'Pairs & splits',
  7: 'Surrender & insurance',
  8: 'Rule variations',
  9: 'Bankroll & variance',
  10: 'Intro to card counting',
};

/** The lesson path, in order. Add lessons by appending to a unit file. */
export const LESSONS: Lesson[] = [...unit1, ...unit2, ...unit3, ...unit4];

export const UNITS: Unit[] = Object.entries(UNIT_TITLES)
  .map(([n, title]) => ({ number: Number(n), title, lessons: LESSONS.filter((l) => l.unit === Number(n)) }))
  .filter((u) => u.lessons.length > 0);

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function lessonIndex(id: string): number {
  return LESSONS.findIndex((l) => l.id === id);
}
