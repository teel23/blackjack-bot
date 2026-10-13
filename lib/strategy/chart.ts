import { type Card, type Upcard, UPCARDS, cardValue, upcardOf } from '../engine/cards';
import { handValue, isPair } from '../engine/hand';
import type { Action, Legal } from '../engine/round';
import { type Rules, surrenderAvailable } from '../engine/rules';
import { DEVIATIONS, type Deviation, type TableName } from './deviations';
import { BASE, type Code, type DeckGroup, parseRow } from './tables';

export type { Code } from './tables';
export type { TableName } from './deviations';

export interface Chart {
  hard: Record<number, Code[]>;
  soft: Record<number, Code[]>;
  pairs: Record<number, Code[]>;
  /** Deviations that changed a cell from the base table, keyed "table:row:up". */
  changed: Record<string, Deviation>;
}

export function deckGroup(rules: Rules): DeckGroup {
  return rules.decks === 1 ? 'single' : rules.decks === 2 ? 'double' : 'multi';
}

export function upIndex(up: Upcard): number {
  return up - 2;
}

function doubleAllowed(total: number, rules: Rules): boolean {
  if (rules.doubleOn === 'any2') return true;
  if (rules.doubleOn === '9-11') return total >= 9 && total <= 11;
  return total >= 10 && total <= 11;
}

/** Strip codes the rules make impossible (surrender, restricted doubles). */
function restrict(code: Code, total: number, rules: Rules): Code {
  let c = code;
  if (!surrenderAvailable(rules)) {
    if (c === 'Rh') c = 'H';
    else if (c === 'Rs') c = 'S';
    else if (c === 'Rp') c = 'P';
  }
  if ((c === 'D' || c === 'Ds') && !doubleAllowed(total, rules)) c = c === 'D' ? 'H' : 'S';
  return c;
}

const cache = new Map<string, Chart>();

export function chartKey(rules: Rules): string {
  return [
    rules.decks,
    rules.dealerHitsSoft17 ? 'h17' : 's17',
    rules.doubleAfterSplit ? 'das' : 'nodas',
    surrenderAvailable(rules) ? 'ls' : 'nols',
    rules.dealerPeek ? 'peek' : 'enhc',
    rules.doubleOn,
  ].join('|');
}

/** Build the full basic-strategy chart for a rule set. Changing rules changes the chart. */
export function buildChart(rules: Rules): Chart {
  const key = chartKey(rules);
  const hit = cache.get(key);
  if (hit) return hit;

  const g = deckGroup(rules);
  const base = BASE[g];
  const tables: Record<TableName, Record<number, Code[]>> = { hard: {}, soft: {}, pairs: {} };
  for (const name of ['hard', 'soft', 'pairs'] as TableName[]) {
    for (const [row, str] of Object.entries(base[name])) tables[name][Number(row)] = parseRow(str);
  }

  const changed: Record<string, Deviation> = {};
  for (const dev of DEVIATIONS) {
    if (!dev.when(rules, g)) continue;
    const row = tables[dev.table][dev.row];
    for (const up of dev.ups) {
      if (row[upIndex(up)] !== dev.code) {
        row[upIndex(up)] = dev.code;
        changed[`${dev.table}:${dev.row}:${up}`] = dev;
      }
    }
  }

  // Apply rule restrictions last so every cell is something you can actually do.
  for (const [row, cells] of Object.entries(tables.hard)) {
    tables.hard[Number(row)] = cells.map((c) => restrict(c, Number(row), rules));
  }
  for (const [row, cells] of Object.entries(tables.soft)) {
    tables.soft[Number(row)] = cells.map((c) => restrict(c, Number(row), rules));
  }
  for (const [row, cells] of Object.entries(tables.pairs)) {
    const v = Number(row);
    const total = v === 11 ? 12 : v * 2;
    tables.pairs[v] = cells.map((c) => restrict(c, total, rules));
  }

  const chart: Chart = { ...tables, changed };
  cache.set(key, chart);
  return chart;
}

export type HandKind = 'hard' | 'soft' | 'pair';

export interface Situation {
  kind: HandKind;
  /** hard/soft total, or pair card value (11 = aces). */
  row: number;
  up: Upcard;
  /** Stable key for stats, e.g. "H16v10", "S18v11", "P8v11". */
  key: string;
}

export function situationKey(kind: HandKind, row: number, up: Upcard): string {
  return `${kind === 'hard' ? 'H' : kind === 'soft' ? 'S' : 'P'}${row}v${up}`;
}

export function parseSituationKey(key: string): Situation | null {
  const m = /^([HSP])(\d+)v(\d+)$/.exec(key);
  if (!m) return null;
  const kind: HandKind = m[1] === 'H' ? 'hard' : m[1] === 'S' ? 'soft' : 'pair';
  const up = Number(m[3]) as Upcard;
  if (!UPCARDS.includes(up)) return null;
  return { kind, row: Number(m[2]), up, key };
}

/** Classify a hand for chart lookup. Pairs count as pairs only if a split is possible. */
export function classify(cards: readonly Card[], upcard: Card, canSplit: boolean): Situation {
  const up = upcardOf(upcard);
  if (canSplit && isPair(cards)) {
    const v = cardValue(cards[0]);
    const row = v === 1 ? 11 : v;
    return { kind: 'pair', row, up, key: situationKey('pair', row, up) };
  }
  const { total, soft } = handValue(cards);
  const kind: HandKind = soft ? 'soft' : 'hard';
  const row = Math.max(kind === 'hard' ? 5 : 12, Math.min(21, total));
  return { kind, row, up, key: situationKey(kind, row, up) };
}

export function codeFor(chart: Chart, s: Pick<Situation, 'kind' | 'row' | 'up'>): Code {
  const table = s.kind === 'pair' ? chart.pairs : s.kind === 'soft' ? chart.soft : chart.hard;
  return table[s.row][upIndex(s.up)];
}

/** Turn a chart code into the action to take given what's legal right now. */
export function resolveCode(code: Code, legal: Legal): Action | null {
  switch (code) {
    case 'H': return legal.hit ? 'hit' : 'stand';
    case 'S': return 'stand';
    case 'D': return legal.double ? 'double' : legal.hit ? 'hit' : 'stand';
    case 'Ds': return legal.double ? 'double' : 'stand';
    case 'Rh': return legal.surrender ? 'surrender' : legal.hit ? 'hit' : 'stand';
    case 'Rs': return legal.surrender ? 'surrender' : 'stand';
    case 'Rp': return legal.surrender ? 'surrender' : legal.split ? 'split' : null;
    case 'P': return legal.split ? 'split' : null;
  }
}

export interface Recommendation {
  action: Action;
  code: Code;
  situation: Situation;
}

/** The basic-strategy play for a hand, respecting what's legal (e.g. no double on 3 cards). */
export function recommend(rules: Rules, cards: readonly Card[], upcard: Card, legal: Legal): Recommendation {
  const chart = buildChart(rules);
  if (isPair(cards)) {
    const pairSit = classify(cards, upcard, true);
    const code = codeFor(chart, pairSit);
    const action = resolveCode(code, legal);
    if (action) return { action, code, situation: pairSit };
  }
  const sit = classify(cards, upcard, false);
  const code = codeFor(chart, sit);
  const action = resolveCode(code, legal) ?? 'stand';
  return { action, code, situation: sit };
}

export const CODE_LABEL: Record<Code, string> = {
  H: 'Hit',
  S: 'Stand',
  D: 'Double (else hit)',
  Ds: 'Double (else stand)',
  P: 'Split',
  Rh: 'Surrender (else hit)',
  Rs: 'Surrender (else stand)',
  Rp: 'Surrender (else split)',
};

export const ACTION_LABEL: Record<Action, string> = {
  hit: 'Hit',
  stand: 'Stand',
  double: 'Double',
  split: 'Split',
  surrender: 'Surrender',
};

/** Main action a code asks for when everything is legal. */
export function primaryAction(code: Code): Action {
  switch (code) {
    case 'H': return 'hit';
    case 'S': return 'stand';
    case 'D':
    case 'Ds': return 'double';
    case 'P': return 'split';
    default: return 'surrender';
  }
}
