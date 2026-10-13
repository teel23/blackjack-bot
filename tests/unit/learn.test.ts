import { describe, expect, it } from 'vitest';
import { LESSONS } from '@/content/lessons';
import { DEFAULT_RULES } from '@/lib/engine/rules';
import { gradeLessonQuestion } from '@/lib/learn';
import { drillCandidates, handForKey, pickDrill } from '@/lib/progress/drillPicker';
import { lessonPath } from '@/lib/progress/unlock';
import { classify } from '@/lib/strategy/chart';

describe('lesson content', () => {
  it('ids are unique', () => {
    expect(new Set(LESSONS.map((l) => l.id)).size).toBe(LESSONS.length);
  });
  for (const lesson of LESSONS) {
    it(`${lesson.id} is well-formed`, () => {
      expect(lesson.cards.length).toBeGreaterThanOrEqual(1);
      expect(lesson.cards.length).toBeLessThanOrEqual(3);
      expect(lesson.questions.length).toBeGreaterThanOrEqual(5);
      expect(lesson.questions.length).toBeLessThanOrEqual(10);
      for (const q of lesson.questions) {
        if (q.type === 'choice') {
          expect(q.answer).toBeGreaterThanOrEqual(0);
          expect(q.answer).toBeLessThan(q.options.length);
          expect(q.explain.length).toBeGreaterThan(5);
        } else {
          const g = gradeLessonQuestion(q);
          expect(g.legal[g.rec.action], `${lesson.id}: answer must be a legal button`).toBe(true);
          if (q.actions) expect(q.actions).toContain(g.rec.action);
        }
      }
    });
  }
});

describe('one lesson per day', () => {
  const ids = LESSONS.slice(0, 3);
  it('starts with only the first lesson open', () => {
    const p = lessonPath(ids, {}, '2026-10-12');
    expect(Object.values(p.states)).toEqual(['available', 'locked', 'locked']);
    expect(p.next?.id).toBe(ids[0].id);
  });
  it('passing today opens the next lesson tomorrow, not today', () => {
    const prog = { [ids[0].id]: { attempts: 1, bestPct: 100, passedOn: '2026-10-12' } };
    const sameDay = lessonPath(ids, prog, '2026-10-12');
    expect(sameDay.states[ids[1].id]).toBe('locked');
    expect(sameDay.unlocksTomorrow?.id).toBe(ids[1].id);
    expect(lessonPath(ids, prog, '2026-10-13').states[ids[1].id]).toBe('available');
    expect(lessonPath(ids, prog, '2026-10-20').states[ids[2].id]).toBe('locked');
  });
  it('unlock-all skips the pacing', () => {
    expect(Object.values(lessonPath(ids, {}, '2026-10-12', true).states)).toEqual(['available', 'available', 'available']);
  });
});

describe('drill picking', () => {
  const keys = drillCandidates(DEFAULT_RULES, 'mixed');
  it('is deterministic for a seed and never repeats within a drill', () => {
    const a = pickDrill(keys, {}, DEFAULT_RULES, 20, 42);
    expect(a).toEqual(pickDrill(keys, {}, DEFAULT_RULES, 20, 42));
    expect(new Set(a).size).toBe(20);
  });
  it('leans toward hands you miss', () => {
    const cells = { H16v10: { n: 10, correct: 2, last: 1, lastWrong: 1 } };
    const hits = Array.from({ length: 200 }, (_, s) => pickDrill(keys, cells, DEFAULT_RULES, 20, s).includes('H16v10')).filter(Boolean).length;
    const base = Array.from({ length: 200 }, (_, s) => pickDrill(keys, {}, DEFAULT_RULES, 20, s).includes('H16v10')).filter(Boolean).length;
    expect(hits).toBeGreaterThan(base);
  });
  it('generates hands that classify back to their key', () => {
    for (const key of keys) {
      const h = handForKey(key, 7)!;
      expect(classify(h.cards, h.up, key.startsWith('P')).key).toBe(key);
    }
  });
  it('surrender drills include every surrender cell', () => {
    const s = drillCandidates(DEFAULT_RULES, 'surrender');
    for (const k of ['H16v9', 'H16v10', 'H16v11', 'H15v10']) expect(s).toContain(k);
  });
});

import { hiLo } from '@/lib/count';
import { freshDecks } from '@/lib/engine/shoe';

describe('Hi-Lo', () => {
  it('a full deck counts to zero', () => {
    expect(freshDecks(1).reduce((s, c) => s + hiLo(c), 0)).toBe(0);
  });
  it('tags cards', () => {
    expect(hiLo({ rank: '2', suit: 'S' })).toBe(1);
    expect(hiLo({ rank: '6', suit: 'S' })).toBe(1);
    expect(hiLo({ rank: '7', suit: 'S' })).toBe(0);
    expect(hiLo({ rank: '9', suit: 'S' })).toBe(0);
    expect(hiLo({ rank: 'K', suit: 'S' })).toBe(-1);
    expect(hiLo({ rank: 'A', suit: 'S' })).toBe(-1);
  });
});

import { LESSON_META } from '@/content/lessons/meta';

describe('generated lesson index', () => {
  it('matches the lesson content (run `npx tsx scripts/gen-lesson-meta.ts` if this fails)', () => {
    expect(LESSON_META).toEqual(LESSONS.map(({ id, unit, title, summary }) => ({ id, unit, title, summary })));
  });
});
