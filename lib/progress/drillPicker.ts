import { type Card, type Rank, SUITS, type Upcard, UPCARDS } from '../engine/cards';
import { Rng } from '../engine/rng';
import type { Rules } from '../engine/rules';
import { buildChart, codeFor, parseSituationKey, situationKey } from '../strategy/chart';
import type { CellStat } from '../storage/schema';

export type DrillFilter = 'hard' | 'soft' | 'pair' | 'surrender' | 'mixed';

export const DRILL_FILTERS: { id: DrillFilter; title: string; blurb: string }[] = [
  { id: 'hard', title: 'Hard totals', blurb: '8 through 17 — hit, stand, double.' },
  { id: 'soft', title: 'Soft totals', blurb: 'A,2 through A,9 — the ace hands.' },
  { id: 'pair', title: 'Pairs', blurb: 'Split or not, every pair.' },
  { id: 'surrender', title: 'Surrender', blurb: 'The give-up spots, and the near misses.' },
  { id: 'mixed', title: 'Mixed', blurb: 'Everything, weighted to what you miss.' },
];

const TENS: Rank[] = ['10', 'J', 'Q', 'K'];

/** Situation keys a drill can ask about. Trivial rows (hard 5–7, 18+) are left out. */
export function drillCandidates(rules: Rules, filter: DrillFilter): string[] {
  const keys: string[] = [];
  const chart = buildChart(rules);
  const add = (kind: 'hard' | 'soft' | 'pair', rows: number[], ups: Upcard[] = UPCARDS) => {
    for (const row of rows) for (const up of ups) keys.push(situationKey(kind, row, up));
  };
  if (filter === 'hard' || filter === 'mixed') add('hard', [8, 9, 10, 11, 12, 13, 14, 15, 16, 17]);
  if (filter === 'soft' || filter === 'mixed') add('soft', [13, 14, 15, 16, 17, 18, 19]);
  if (filter === 'pair' || filter === 'mixed') add('pair', [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]);
  if (filter === 'surrender') {
    add('hard', [14, 15, 16, 17], [8, 9, 10, 11]);
    add('pair', [7, 8], [9, 10, 11]);
    // Make sure every surrender cell for these rules is in the pool.
    for (const [row, codes] of Object.entries(chart.hard)) {
      codes.forEach((code, i) => code.startsWith('R') && keys.push(situationKey('hard', Number(row), UPCARDS[i])));
    }
  }
  return [...new Set(keys)];
}

/** How "interesting" a cell is to drill: rows where people actually go wrong matter more. */
function baseWeight(key: string, rules: Rules): number {
  const s = parseSituationKey(key);
  if (!s) return 0;
  const code = codeFor(buildChart(rules), s);
  if (s.kind === 'hard' && (s.row >= 17 || s.row <= 8) && !code.startsWith('R')) return 0.35;
  if (s.kind === 'soft' && s.row >= 19 && code === 'S') return 0.4;
  if (s.kind === 'pair' && (s.row === 10 || s.row === 11 || s.row === 8) && code !== 'Rp') return 0.6;
  return 1;
}

/**
 * Pick n situations, weighted toward cells you miss (and ones you haven't seen).
 * Deterministic for a seed so a resumed drill shows the same hands.
 */
export function pickDrill(
  keys: string[],
  cells: Record<string, CellStat>,
  rules: Rules,
  n: number,
  seed: number,
): string[] {
  const rng = new Rng(seed);
  const pool = keys.map((key) => {
    const st = cells[key];
    const missRate = st ? (st.n - st.correct + 0.5) / (st.n + 2) : 0.25;
    const unseen = !st || st.n === 0 ? 1.4 : 1;
    const recentMiss = st?.lastWrong && st.lastWrong >= st.last - 1 ? 1.5 : 1;
    return { key, w: baseWeight(key, rules) * (1 + 5 * missRate) * unseen * recentMiss };
  });
  const out: string[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let r = rng.next() * total;
    let i = 0;
    while (i < pool.length - 1 && r > pool[i].w) {
      r -= pool[i].w;
      i++;
    }
    out.push(pool[i].key);
    pool.splice(i, 1);
    if (!pool.length && out.length < n) pool.push(...keys.map((key) => ({ key, w: 1 })));
  }
  return out;
}

function rankFor(value: number, rng: Rng): Rank {
  if (value === 11 || value === 1) return 'A';
  if (value === 10) return rng.pick(TENS);
  return String(value) as Rank;
}

/** Concrete cards for a situation key. Same key + seed → same cards. */
export function handForKey(key: string, seed: number): { cards: Card[]; up: Card } | null {
  const s = parseSituationKey(key);
  if (!s) return null;
  const rng = new Rng(seed);
  const suit = () => rng.pick(SUITS);
  let values: number[];
  if (s.kind === 'pair') values = [s.row, s.row];
  else if (s.kind === 'soft') values = [11, s.row - 11];
  else {
    const options: [number, number][] = [];
    for (let a = 2; a <= 10; a++) {
      const b = s.row - a;
      if (b > a && b <= 10) options.push([a, b]);
    }
    if (!options.length) return null;
    values = rng.pick(options);
    if (rng.next() < 0.5) values = [values[1], values[0]];
  }
  const cards = values.map((v) => ({ rank: rankFor(v, rng), suit: suit() }));
  const up = { rank: rankFor(s.up, rng), suit: suit() };
  return { cards, up };
}
