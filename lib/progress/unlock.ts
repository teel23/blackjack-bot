import type { LessonMeta } from '@/content/lessons/meta';
import type { LessonProgress } from '../storage/schema';

export type LessonState = 'passed' | 'available' | 'locked';

export interface PathState {
  states: Record<string, LessonState>;
  /** The lesson to do next (first available, not yet passed). */
  next: LessonMeta | null;
  /** A lesson that will open tomorrow because its predecessor was passed today. */
  unlocksTomorrow: LessonMeta | null;
}

/**
 * One new lesson per day: lesson n+1 opens on a later calendar day than the one lesson n was
 * passed on. Lessons you've started or passed stay open. `unlockAll` skips the pacing.
 */
export function lessonPath(
  lessons: LessonMeta[],
  progress: Record<string, LessonProgress>,
  today: string,
  unlockAll = false,
): PathState {
  const states: Record<string, LessonState> = {};
  let next: LessonMeta | null = null;
  let unlocksTomorrow: LessonMeta | null = null;
  lessons.forEach((lesson, i) => {
    const p = progress[lesson.id];
    let state: LessonState;
    if (p?.passedOn) state = 'passed';
    else if (i === 0 || unlockAll || (p && p.attempts > 0)) state = 'available';
    else {
      const prev = progress[lessons[i - 1].id];
      if (prev?.passedOn && prev.passedOn < today) state = 'available';
      else {
        state = 'locked';
        if (prev?.passedOn === today && !unlocksTomorrow) unlocksTomorrow = lesson;
      }
    }
    states[lesson.id] = state;
    if (state === 'available' && !next) next = lesson;
  });
  return { states, next, unlocksTomorrow };
}
