'use client';

import { getLesson } from '@/content/lessons';
import type { DecisionQuestion } from '@/content/lessons/types';
import { gradeLessonQuestion } from '../learn';
import { randomSeed } from '../engine/rng';
import { localDate } from '../progress/dates';
import type { StatCategory } from '../storage/schema';
import { recordDecision } from './stats';
import { update } from './store';

export function lessonPassPct(id: string): number {
  return getLesson(id)?.passPct ?? 80;
}

/** Open a lesson; resumes if it's the one already in progress. */
export function openLesson(id: string, restart = false) {
  update((d) => {
    if (!restart && d.progress.activeLesson?.id === id) return;
    d.progress.activeLesson = { id, step: 0, answers: [], startedAt: Date.now(), seed: randomSeed() };
  });
}

export function lessonNext() {
  update((d) => {
    if (d.progress.activeLesson) d.progress.activeLesson.step++;
  });
}

/** Record an answer for the current question (once). Decision answers also feed strategy stats. */
export function lessonAnswer(ok: boolean, decision?: { q: DecisionQuestion; chosen: string }) {
  update((d) => {
    const a = d.progress.activeLesson;
    const lesson = a && getLesson(a.id);
    if (!a || !lesson) return;
    const qi = a.step - lesson.cards.length;
    if (qi < 0 || a.answers.length > qi) return;
    a.answers.push(ok);
    if (decision) {
      const g = gradeLessonQuestion(decision.q);
      const category: StatCategory = g.legal.surrender && g.rec.code.startsWith('R') ? 'surrender' : g.rec.situation.kind;
      recordDecision(d, {
        key: g.rec.situation.key,
        category,
        ok,
        hinted: false,
        cards: g.cards,
        up: g.up,
        legal: g.legal,
        chosen: decision.chosen,
        correct: g.rec.action,
        source: 'lesson',
      });
    }
  });
}

export interface LessonResult {
  correct: number;
  total: number;
  pct: number;
  passed: boolean;
  firstPass: boolean;
}

export function finishLesson(): LessonResult | null {
  let result: LessonResult | null = null;
  update((d) => {
    const a = d.progress.activeLesson;
    const lesson = a && getLesson(a.id);
    if (!a || !lesson) return;
    const total = lesson.questions.length;
    const correct = a.answers.filter(Boolean).length;
    const pct = Math.round((correct / total) * 100);
    const passed = pct >= (lesson.passPct ?? 80);
    const p = (d.progress.lessons[lesson.id] ??= { attempts: 0, bestPct: 0, passedOn: null });
    const firstPass = passed && !p.passedOn;
    p.attempts++;
    p.bestPct = Math.max(p.bestPct, pct);
    if (firstPass) p.passedOn = localDate();
    d.progress.activeLesson = null;
    result = { correct, total, pct, passed, firstPass };
  });
  return result;
}

export function abandonLesson() {
  update((d) => {
    d.progress.activeLesson = null;
  });
}
