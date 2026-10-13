import type { Card } from '../engine/cards';
import type { Legal } from '../engine/round';
import type { DecisionSource, SaveData, StatCategory } from '../storage/schema';

export interface DecisionRecord {
  key: string;
  category: StatCategory;
  ok: boolean;
  hinted: boolean;
  cards: Card[];
  up: Card;
  legal: Legal;
  chosen: string;
  correct: string;
  source: DecisionSource;
}

const MAX_MISTAKES = 50;

/** Record one strategy decision. Hinted decisions don't count toward accuracy. */
export function recordDecision(d: SaveData, r: DecisionRecord, now = Date.now()) {
  const cell = (d.stats.cells[r.key] ??= { n: 0, correct: 0, last: 0, lastWrong: null });
  cell.last = now;
  if (!r.ok) cell.lastWrong = now;
  if (!r.hinted) {
    cell.n++;
    if (r.ok) cell.correct++;
    const cat = d.stats.categories[r.category];
    cat.n++;
    if (r.ok) cat.correct++;
    d.stats.decisions++;
  }
  if (!r.ok) {
    d.stats.mistakes.push({
      id: `${now}-${Math.random().toString(36).slice(2, 7)}`,
      t: now,
      key: r.key,
      cards: r.cards,
      up: r.up,
      legal: r.legal,
      chosen: r.chosen,
      correct: r.correct,
      source: r.source,
    });
    if (d.stats.mistakes.length > MAX_MISTAKES) d.stats.mistakes.splice(0, d.stats.mistakes.length - MAX_MISTAKES);
  }
}

export function accuracy(n: number, correct: number): number | null {
  return n > 0 ? Math.round((correct / n) * 100) : null;
}

export function overallAccuracy(d: SaveData): number | null {
  const cats = Object.values(d.stats.categories);
  const n = cats.reduce((s, c) => s + c.n, 0);
  const correct = cats.reduce((s, c) => s + c.correct, 0);
  return accuracy(n, correct);
}
