/**
 * Expected-value calculator for basic-strategy decisions.
 *
 * - Dealer outcomes are computed exactly with card removal (player's two cards, the upcard,
 *   and every card the dealer draws).
 * - Player draws use the post-deal composition without further removal (standard CA shortcut).
 * - Splits are approximated as two independent hands without resplitting.
 *
 * Accurate enough to rank actions and explain them; the strategy tables stay the source of truth.
 */
import type { Rules } from '../engine/rules';
import { surrenderAvailable } from '../engine/rules';

/** Counts by blackjack value; index 1 = ace … 10 = ten-value. Index 0 unused. */
export type Comp = number[];

export function shoeComp(decks: number): Comp {
  const c = new Array(11).fill(0);
  for (let v = 1; v <= 9; v++) c[v] = 4 * decks;
  c[10] = 16 * decks;
  return c;
}

function sum(comp: Comp): number {
  let n = 0;
  for (let v = 1; v <= 10; v++) n += comp[v];
  return n;
}

/** Index 0..4 = dealer finishes 17..21, 5 = bust. Conditioned on no dealer blackjack. */
export type DealerDist = number[];

export interface DealerResult {
  dist: DealerDist;
  /** Probability the hole card gives the dealer a natural. */
  pBJ: number;
}

export function dealerOutcomes(comp: Comp, up: number, hitsSoft17: boolean): DealerResult {
  const memo = new Map<number, DealerDist>();
  const work = comp.slice();

  // Key = multiset of cards drawn so far (4 bits per value); total/softness follow from it.
  const walk = (drawSum: number, hasAce: boolean, key: number): DealerDist => {
    const cached = memo.get(key);
    if (cached) return cached;
    const hard = up + drawSum;
    const soft = (hasAce || up === 1) && hard + 10 <= 21;
    const total = soft ? hard + 10 : hard;
    let out: DealerDist;
    if (total > 21) out = [0, 0, 0, 0, 0, 1];
    else if (total > 17 || (total === 17 && !(soft && hitsSoft17))) {
      out = [0, 0, 0, 0, 0, 0];
      out[total - 17] = 1;
    } else {
      out = [0, 0, 0, 0, 0, 0];
      const n = sum(work);
      for (let v = 1; v <= 10; v++) {
        if (!work[v]) continue;
        const p = work[v] / n;
        work[v]--;
        const sub = walk(drawSum + v, hasAce || v === 1, key + 16 ** (v - 1));
        work[v]++;
        for (let i = 0; i < 6; i++) out[i] += p * sub[i];
      }
    }
    memo.set(key, out);
    return out;
  };

  const n = sum(work);
  const dist = [0, 0, 0, 0, 0, 0];
  let pBJ = 0;
  for (let v = 1; v <= 10; v++) {
    if (!work[v]) continue;
    const p = work[v] / n;
    if ((up === 1 && v === 10) || (up === 10 && v === 1)) {
      pBJ += p;
      continue;
    }
    work[v]--;
    const sub = walk(v, v === 1, 16 ** (v - 1));
    work[v]++;
    for (let i = 0; i < 6; i++) dist[i] += p * sub[i];
  }
  const norm = 1 - pBJ;
  return { dist: dist.map((x) => x / norm), pBJ };
}

function standEV(total: number, d: DealerDist): number {
  if (total > 21) return -1;
  let ev = d[5];
  for (let i = 0; i < 5; i++) {
    const dt = 17 + i;
    if (total > dt) ev += d[i];
    else if (total < dt) ev -= d[i];
  }
  return ev;
}

function valueOf(hardSum: number, hasAce: boolean): number {
  return hasAce && hardSum + 10 <= 21 ? hardSum + 10 : hardSum;
}

/** Player EVs for one starting hand against one dealer distribution, with fixed draw probabilities. */
class PlayerSolver {
  private probs: number[];
  private hitMemo = new Map<number, number>();
  constructor(
    comp: Comp,
    private dealer: DealerDist,
    /** Value the hole card is known NOT to be after a peek (10 under an ace, ace under a 10). */
    excludedHole: number | null = null,
  ) {
    const n = sum(comp);
    if (excludedHole === null) {
      this.probs = comp.map((x) => x / n);
    } else {
      // Player draws come from the shoe minus an unknown hole card that isn't `excludedHole`.
      const holeN = n - comp[excludedHole];
      this.probs = comp.map(() => 0);
      for (let h = 1; h <= 10; h++) {
        if (h === excludedHole || !comp[h]) continue;
        const q = comp[h] / holeN;
        for (let v = 1; v <= 10; v++) this.probs[v] += (q * (comp[v] - (v === h ? 1 : 0))) / (n - 1);
      }
    }
  }
  stand(hardSum: number, hasAce: boolean) {
    return standEV(valueOf(hardSum, hasAce), this.dealer);
  }
  best(hardSum: number, hasAce: boolean): number {
    if (valueOf(hardSum, hasAce) > 21) return -1;
    return Math.max(this.stand(hardSum, hasAce), this.hit(hardSum, hasAce));
  }
  hit(hardSum: number, hasAce: boolean): number {
    const key = hardSum * 2 + (hasAce ? 1 : 0);
    const cached = this.hitMemo.get(key);
    if (cached !== undefined) return cached;
    let ev = 0;
    for (let v = 1; v <= 10; v++) {
      const p = this.probs[v];
      if (!p) continue;
      const s = hardSum + v;
      const a = hasAce || v === 1;
      ev += p * (valueOf(s, a) > 21 ? -1 : this.best(s, a));
    }
    this.hitMemo.set(key, ev);
    return ev;
  }
  double(hardSum: number, hasAce: boolean): number {
    let ev = 0;
    for (let v = 1; v <= 10; v++) {
      const p = this.probs[v];
      if (!p) continue;
      ev += p * 2 * this.stand(hardSum + v, hasAce || v === 1);
    }
    return ev;
  }
  /** One hand of a split pair (value x), no resplit. */
  splitHand(x: number, rules: Rules): number {
    let ev = 0;
    for (let v = 1; v <= 10; v++) {
      const p = this.probs[v];
      if (!p) continue;
      const s = x + v;
      const a = x === 1 || v === 1;
      let e: number;
      if (x === 1 && !rules.hitSplitAces) e = this.stand(s, a);
      else {
        e = this.best(s, a);
        if (rules.doubleAfterSplit && doubleAllowedOn(valueOf(s, a), rules)) e = Math.max(e, this.double(s, a));
      }
      ev += p * e;
    }
    return ev;
  }
}

function doubleAllowedOn(total: number, rules: Rules): boolean {
  if (rules.doubleOn === 'any2') return true;
  if (rules.doubleOn === '9-11') return total >= 9 && total <= 11;
  return total >= 10 && total <= 11;
}

export interface ActionEVs {
  stand: number;
  hit: number;
  double: number | null;
  split: number | null;
  surrender: number | null;
}

/**
 * EVs for a specific two-card hand (values a, b; ace = 1) vs dealer upcard (ace = 1 or 11).
 * In peek games EVs are conditional on the dealer not having blackjack.
 */
export function handEVs(rules: Rules, a: number, b: number, upcard: number, comp?: Comp): ActionEVs {
  const up = upcard === 11 ? 1 : upcard;
  const work = (comp ?? shoeComp(rules.decks)).slice();
  work[a]--;
  work[b]--;
  work[up]--;
  const { dist, pBJ } = dealerOutcomes(work, up, rules.dealerHitsSoft17);
  const peeked = rules.dealerPeek && (up === 1 || up === 10);
  const solver = new PlayerSolver(work, dist, peeked ? (up === 1 ? 10 : 1) : null);
  const hasAce = a === 1 || b === 1;
  const hard = a + b;
  const total = valueOf(hard, hasAce);

  let stand = solver.stand(hard, hasAce);
  let hit = solver.hit(hard, hasAce);
  let dbl: number | null = doubleAllowedOn(total, rules) ? solver.double(hard, hasAce) : null;
  let split: number | null = a === b ? 2 * solver.splitHand(a, rules) : null;
  const surrender = surrenderAvailable(rules) ? -0.5 : null;

  // No peek: a dealer blackjack (found later) takes every chip the player has out.
  if (!rules.dealerPeek && pBJ > 0) {
    const mix = (ev: number, stake: number) => (1 - pBJ) * ev - pBJ * stake;
    stand = mix(stand, 1);
    hit = mix(hit, 1);
    if (dbl !== null) dbl = mix(dbl, 2);
    if (split !== null) split = mix(split, 2);
  }
  return { stand, hit, double: dbl, split, surrender };
}

export type CellKind = 'hard' | 'soft' | 'pair';

/**
 * Total-dependent EVs for a chart cell: averages every two-card composition that makes
 * the row, weighted by how likely it is to be dealt.
 * hard: row = total (5–19); soft: row = soft total (13–20); pair: row = card value (2–11).
 */
export function cellEVs(rules: Rules, kind: CellKind, row: number, upcard: number): ActionEVs | null {
  const up = upcard === 11 ? 1 : upcard;
  const base = shoeComp(rules.decks);
  base[up]--;
  const combos: [number, number, number][] = [];
  if (kind === 'hard') {
    for (let a = 2; a <= 10; a++) {
      const b = row - a;
      if (b <= a || b > 10) continue;
      combos.push([a, b, base[a] * base[b]]);
    }
  } else if (kind === 'soft') {
    const x = row - 11;
    if (x >= 2 && x <= 9) combos.push([1, x, 1]);
  } else {
    const x = row === 11 ? 1 : row;
    combos.push([x, x, 1]);
  }
  if (!combos.length) return null;

  const acc: ActionEVs = { stand: 0, hit: 0, double: 0, split: 0, surrender: 0 };
  let wsum = 0;
  let any: ActionEVs | null = null;
  for (const [a, b, w] of combos) {
    if (!w) continue;
    const ev = handEVs(rules, a, b, upcard, base.map((n, i) => (i === up ? n + 1 : n)));
    any = ev;
    wsum += w;
    acc.stand += w * ev.stand;
    acc.hit += w * ev.hit;
    acc.double = (acc.double ?? 0) + w * (ev.double ?? 0);
    acc.split = (acc.split ?? 0) + w * (ev.split ?? 0);
    acc.surrender = (acc.surrender ?? 0) + w * (ev.surrender ?? 0);
  }
  if (!any || !wsum) return null;
  return {
    stand: acc.stand / wsum,
    hit: acc.hit / wsum,
    double: any.double === null ? null : (acc.double as number) / wsum,
    split: any.split === null ? null : (acc.split as number) / wsum,
    surrender: any.surrender === null ? null : (acc.surrender as number) / wsum,
  };
}

export type EvAction = keyof ActionEVs;

export function bestAction(evs: ActionEVs): { action: EvAction; ev: number } {
  let best: { action: EvAction; ev: number } = { action: 'stand', ev: evs.stand };
  for (const k of ['hit', 'double', 'split', 'surrender'] as EvAction[]) {
    const v = evs[k];
    if (v !== null && v > best.ev) best = { action: k, ev: v };
  }
  return best;
}
