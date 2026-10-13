import type { Lesson, Unit } from './types';
import { unit1 } from './unit-01-basics';
import { unit2 } from './unit-02-flow';
import { unit3 } from './unit-03-hard';
import { unit4 } from './unit-04-doubling';
import { unit5 } from './unit-05-soft';
import { unit6 } from './unit-06-pairs';
import { unit7 } from './unit-07-surrender';
import { unit8 } from './unit-08-rules';
import { unit9 } from './unit-09-variance';
import { unit10 } from './unit-10-counting';

import { UNIT_TITLES } from './units';

export { UNIT_TITLES };

/** The lesson path, in order. Add lessons by appending to a unit file. */
export const LESSONS: Lesson[] = [...unit1, ...unit2, ...unit3, ...unit4, ...unit5, ...unit6, ...unit7, ...unit8, ...unit9, ...unit10];

export const UNITS: Unit[] = Object.entries(UNIT_TITLES)
  .map(([n, title]) => ({ number: Number(n), title, lessons: LESSONS.filter((l) => l.unit === Number(n)) }))
  .filter((u) => u.lessons.length > 0);

export function getLesson(id: string): Lesson | undefined {
  return LESSONS.find((l) => l.id === id);
}

export function lessonIndex(id: string): number {
  return LESSONS.findIndex((l) => l.id === id);
}
