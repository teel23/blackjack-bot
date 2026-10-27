'use client';

import type { Card } from '../engine/cards';
import type { Action, Legal } from '../engine/round';
import { randomSeed, seedFromString } from '../engine/rng';
import { grade } from '../learn';
import { type Rules, surrenderAvailable } from '../engine/rules';
import { localDate } from '../progress/dates';
import { type DrillFilter, drillCandidates, handForKey, pickDrill } from '../progress/drillPicker';
import { completeGoal } from '../progress/streak';
import type { ActiveDrill, SaveData, StatCategory } from '../storage/schema';
import { recordDecision } from './stats';
import { getData, update } from './store';

export const DAILY_SIZE = 20;
export const LIBRARY_SIZE = 20;
/** Seconds per decision in speed mode. */
export const SPEED_SECONDS = 6;

export function dailyDone(d: SaveData, today = localDate()): boolean {
  return !!d.progress.daily[today];
}

/** Start (or resume) today's daily drill. Returns false if it's already done today. */
export function startDaily(): boolean {
  const today = localDate();
  const d = getData();
  const a = d.progress.activeDrill;
  if (a?.kind === 'daily' && a.date === today) return true;
  const seed = seedFromString(`daily:${today}:${d.createdAt}`);
  const keys = pickDrill(drillCandidates(d.settings.rules, 'mixed'), d.stats.cells, d.settings.rules, DAILY_SIZE, seed);
  update((x) => {
    x.progress.activeDrill = newDrill('daily', 'mixed', false, today, seed, keys);
  });
  return true;
}

export function startLibraryDrill(filter: DrillFilter, timed: boolean) {
  const d = getData();
  const seed = randomSeed();
  const keys = pickDrill(drillCandidates(d.settings.rules, filter), d.stats.cells, d.settings.rules, LIBRARY_SIZE, seed);
  update((x) => {
    x.progress.activeDrill = newDrill('library', filter, timed, localDate(), seed, keys);
  });
}

/** Replay your most recent missed hands — the exact cards, newest first. */
export function startReview(limit = 20): boolean {
  const d = getData();
  const picks = [...d.stats.mistakes].reverse().filter((m) => m.key !== 'INS').slice(0, limit);
  if (!picks.length) return false;
  update((x) => {
    const drill = newDrill('review', 'mistakes', false, localDate(), randomSeed(), picks.map((m) => m.id));
    drill.hands = picks.map((m) => ({ cards: m.cards, up: m.up, legal: m.legal }));
    x.progress.activeDrill = drill;
  });
  return true;
}

function newDrill(kind: ActiveDrill['kind'], mode: string, timed: boolean, date: string, seed: number, queue: string[]): ActiveDrill {
  return { kind, mode, timed, date, seed, queue, index: 0, answers: [], startedAt: Date.now() };
}

/** The hand for question i of the active drill (deterministic, so resuming shows the same cards). */
export function drillHand(a: ActiveDrill, i = a.index): { key: string; cards: Card[]; up: Card; legal?: Legal } | null {
  const key = a.queue[i];
  if (a.hands) return a.hands[i] ? { key, ...a.hands[i] } : null;
  const hand = key ? handForKey(key, (a.seed + i * 7919) >>> 0) : null;
  return hand ? { key, ...hand } : null;
}

/** Replayed hands keep the options you had — minus surrender if your table no longer offers it. */
export function drillLegal(hand: { legal?: Legal }, rules: Rules): Legal | undefined {
  return hand.legal ? { ...hand.legal, surrender: hand.legal.surrender && surrenderAvailable(rules) } : undefined;
}

export function drillAnswer(chosen: Action | 'timeout', ms: number) {
  update((d) => {
    const a = d.progress.activeDrill;
    if (!a || a.answers.length > a.index) return;
    const hand = drillHand(a);
    if (!hand) return;
    const g = grade(hand.cards, hand.up, d.settings.rules, undefined, drillLegal(hand, d.settings.rules));
    const ok = chosen === g.rec.action;
    // Fixed it: drop that mistake from the review list.
    if (ok && a.kind === 'review') d.stats.mistakes = d.stats.mistakes.filter((m) => m.id !== hand.key);
    a.answers.push({ key: g.rec.situation.key, ok, ms });
    const category: StatCategory = g.legal.surrender && g.rec.code.startsWith('R') ? 'surrender' : g.rec.situation.kind;
    recordDecision(d, {
      key: g.rec.situation.key,
      category,
      ok,
      hinted: false,
      cards: hand.cards,
      up: hand.up,
      legal: g.legal,
      chosen,
      correct: g.rec.action,
      source: a.kind === 'daily' ? 'daily' : a.kind === 'review' ? 'review' : 'drill',
    });
  });
}

export interface DrillSummary {
  kind: ActiveDrill['kind'];
  mode: string;
  correct: number;
  total: number;
  ms: number;
  perfect: boolean;
  streak: number;
  earnedFreeze: boolean;
  missed: string[];
}

/** Advance; on the last question, record the result (and the daily goal/streak). */
export function drillNext(): DrillSummary | null {
  let summary: DrillSummary | null = null;
  update((d) => {
    const a = d.progress.activeDrill;
    if (!a || a.answers.length <= a.index) return;
    a.index++;
    if (a.index < a.queue.length) return;
    const correct = a.answers.filter((x) => x.ok).length;
    const total = a.answers.length;
    const ms = a.answers.reduce((s, x) => s + x.ms, 0);
    const perfect = correct === total;
    let earnedFreeze = false;
    d.progress.drillHistory.push({ t: Date.now(), kind: a.kind, mode: a.mode, correct, total, ms });
    if (d.progress.drillHistory.length > 300) d.progress.drillHistory.splice(0, d.progress.drillHistory.length - 300);
    if (a.kind === 'daily' && !d.progress.daily[a.date]) {
      const today = localDate();
      d.progress.daily[a.date] = { correct, total, perfect };
      if (a.date === today) {
        const before = d.progress.streak.freezes;
        d.progress.streak = completeGoal(d.progress.streak, today, perfect);
        earnedFreeze = d.progress.streak.freezes > before;
      }
    }
    summary = {
      kind: a.kind,
      mode: a.mode,
      correct,
      total,
      ms,
      perfect,
      streak: d.progress.streak.current,
      earnedFreeze,
      missed: a.answers.filter((x) => !x.ok).map((x) => x.key),
    };
    d.progress.activeDrill = null;
  });
  return summary;
}

export function abandonDrill() {
  update((d) => {
    d.progress.activeDrill = null;
  });
}
