import { describe, expect, it } from 'vitest';
import { UPCARDS, type Upcard, c, cards } from '@/lib/engine/cards';
import type { Legal } from '@/lib/engine/round';
import { DEFAULT_RULES, type Rules } from '@/lib/engine/rules';
import { buildChart, classify, codeFor, recommend, upIndex } from '@/lib/strategy/chart';
import { cellEVs, type ActionEVs } from '@/lib/strategy/ev';
import { reasonFor } from '@/lib/strategy/reasons';

const rules = (over: Partial<Rules> = {}): Rules => ({ ...DEFAULT_RULES, ...over });

/**
 * Published basic strategy for 4–8 decks, dealer stands soft 17, double after split,
 * late surrender, dealer peeks. Typed out independently of lib/strategy/tables.ts.
 *              2  3  4  5  6  7  8  9  T  A
 */
const PUBLISHED_HARD: Record<number, string> = {
  5: 'H H H H H H H H H H',
  8: 'H H H H H H H H H H',
  9: 'H D D D D H H H H H',
  10: 'D D D D D D D D H H',
  11: 'D D D D D D D D D H',
  12: 'H H S S S H H H H H',
  13: 'S S S S S H H H H H',
  14: 'S S S S S H H H H H',
  15: 'S S S S S H H H Rh H',
  16: 'S S S S S H H Rh Rh Rh',
  17: 'S S S S S S S S S S',
  21: 'S S S S S S S S S S',
};
const PUBLISHED_SOFT: Record<number, string> = {
  13: 'H H H D D H H H H H',
  14: 'H H H D D H H H H H',
  15: 'H H D D D H H H H H',
  16: 'H H D D D H H H H H',
  17: 'H D D D D H H H H H',
  18: 'S Ds Ds Ds Ds S S H H H',
  19: 'S S S S S S S S S S',
  20: 'S S S S S S S S S S',
};
const PUBLISHED_PAIRS: Record<number, string> = {
  2: 'P P P P P P H H H H',
  3: 'P P P P P P H H H H',
  4: 'H H H P P H H H H H',
  5: 'D D D D D D D D H H',
  6: 'P P P P P H H H H H',
  7: 'P P P P P P H H H H',
  8: 'P P P P P P P P P P',
  9: 'P P P P P S P P S S',
  10: 'S S S S S S S S S S',
  11: 'P P P P P P P P P P',
};

describe('default rules chart matches the published chart', () => {
  const chart = buildChart(DEFAULT_RULES);
  for (const [name, published, table] of [
    ['hard', PUBLISHED_HARD, chart.hard],
    ['soft', PUBLISHED_SOFT, chart.soft],
    ['pairs', PUBLISHED_PAIRS, chart.pairs],
  ] as const) {
    for (const [row, str] of Object.entries(published)) {
      it(`${name} ${row}`, () => {
        expect(table[Number(row)].join(' ')).toBe(str);
      });
    }
  }
  it('hard 6, 7 and 18–20 are fixed plays', () => {
    expect(chart.hard[6].every((x) => x === 'H')).toBe(true);
    expect(chart.hard[7].every((x) => x === 'H')).toBe(true);
    for (const t of [18, 19, 20]) expect(chart.hard[t].every((x) => x === 'S')).toBe(true);
  });
});

describe('changing rules changes the chart', () => {
  const cell = (r: Rules, kind: 'hard' | 'soft' | 'pair', row: number, up: Upcard) => codeFor(buildChart(r), { kind, row, up });

  it('H17: double 11 vs A, double soft 18 vs 2 and soft 19 vs 6, surrender 15/17/8-8 vs A', () => {
    const h17 = rules({ dealerHitsSoft17: true });
    expect(cell(h17, 'hard', 11, 11)).toBe('D');
    expect(cell(h17, 'soft', 18, 2)).toBe('Ds');
    expect(cell(h17, 'soft', 19, 6)).toBe('Ds');
    expect(cell(h17, 'hard', 15, 11)).toBe('Rh');
    expect(cell(h17, 'hard', 17, 11)).toBe('Rs');
    expect(cell(h17, 'pair', 8, 11)).toBe('Rp');
    expect(buildChart(h17).changed['hard:11:11']).toBeDefined();
  });

  it('no DAS: fewer small-pair splits', () => {
    const r = rules({ doubleAfterSplit: false });
    expect(cell(r, 'pair', 2, 2)).toBe('H');
    expect(cell(r, 'pair', 3, 3)).toBe('H');
    expect(cell(r, 'pair', 4, 5)).toBe('H');
    expect(cell(r, 'pair', 6, 2)).toBe('H');
    expect(cell(r, 'pair', 2, 4)).toBe('P');
  });

  it('no surrender falls back to hit/stand/split', () => {
    const r = rules({ lateSurrender: false });
    expect(cell(r, 'hard', 16, 10)).toBe('H');
    expect(cell(r, 'hard', 15, 10)).toBe('H');
    expect(cell(rules({ lateSurrender: false, dealerHitsSoft17: true }), 'hard', 17, 11)).toBe('S');
    expect(cell(rules({ lateSurrender: false, dealerHitsSoft17: true }), 'pair', 8, 11)).toBe('P');
  });

  it('single and double deck double more', () => {
    expect(cell(rules({ decks: 1 }), 'hard', 8, 5)).toBe('D');
    expect(cell(rules({ decks: 1 }), 'hard', 11, 11)).toBe('D');
    expect(cell(rules({ decks: 2 }), 'hard', 9, 2)).toBe('D');
    expect(cell(rules({ decks: 1 }), 'soft', 17, 2)).toBe('D');
  });

  it('no peek: no doubling 11 or splitting aces/8s into a 10 or ace', () => {
    const r = rules({ dealerPeek: false });
    expect(cell(r, 'hard', 11, 10)).toBe('H');
    expect(cell(r, 'pair', 11, 11)).toBe('H');
    expect(cell(r, 'pair', 8, 10)).toBe('H');
    expect(cell(r, 'hard', 16, 10)).toBe('H'); // surrender needs a peek
  });

  it('double restrictions remove soft doubles and small doubles', () => {
    const r = rules({ doubleOn: '10-11' });
    expect(cell(r, 'hard', 9, 4)).toBe('H');
    expect(cell(r, 'soft', 18, 4)).toBe('S');
    expect(cell(r, 'soft', 17, 4)).toBe('H');
    expect(cell(r, 'hard', 10, 4)).toBe('D');
  });

  it('payout and resplit rules do not change the chart', () => {
    const a = buildChart(DEFAULT_RULES);
    const b = buildChart(rules({ blackjackPayout: '6:5', maxHands: 2, resplitAces: true }));
    expect(b.hard).toEqual(a.hard);
    expect(b.soft).toEqual(a.soft);
    expect(b.pairs).toEqual(a.pairs);
  });
});

describe('charts agree with the EV calculator', () => {
  const evOf = (code: string, ev: ActionEVs): number => {
    const or = (a: number | null, b: number) => (a === null ? b : a);
    switch (code) {
      case 'H': return ev.hit;
      case 'S': return ev.stand;
      case 'D': return or(ev.double, ev.hit);
      case 'Ds': return or(ev.double, ev.stand);
      case 'P': return or(ev.split, -Infinity);
      case 'Rh': return or(ev.surrender, ev.hit);
      case 'Rs': return or(ev.surrender, ev.stand);
      default: return or(ev.surrender, or(ev.split, -Infinity));
    }
  };
  const best = (ev: ActionEVs) => Math.max(...[ev.hit, ev.stand, ev.double, ev.split, ev.surrender].filter((x): x is number => x !== null));

  const variants: [string, Rules][] = [
    ['6D S17 DAS LS (default)', DEFAULT_RULES],
    ['8D S17', rules({ decks: 8 })],
    ['6D H17', rules({ dealerHitsSoft17: true })],
    ['6D no DAS', rules({ doubleAfterSplit: false })],
    ['6D no surrender', rules({ lateSurrender: false })],
    ['6D no peek', rules({ dealerPeek: false })],
    ['2D S17', rules({ decks: 2 })],
    ['2D H17', rules({ decks: 2, dealerHitsSoft17: true })],
    ['1D S17', rules({ decks: 1 })],
    ['1D H17 no DAS', rules({ decks: 1, dealerHitsSoft17: true, doubleAfterSplit: false })],
    ['6D double 9–11', rules({ doubleOn: '9-11' })],
  ];

  for (const [label, r] of variants) {
    it(`${label}: every cell within 0.75% of the calculator's best play`, () => {
      const chart = buildChart(r);
      const isDefault = r === DEFAULT_RULES;
      const tolerance = isDefault ? 0.0005 : 0.0075;
      const rows: [('hard' | 'soft' | 'pair'), Record<number, string[]>, number[]][] = [
        ['hard', chart.hard, [5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]],
        ['soft', chart.soft, [13, 14, 15, 16, 17, 18, 19, 20]],
        ['pair', chart.pairs, [2, 3, 4, 5, 6, 7, 8, 9, 10, 11]],
      ];
      for (const [kind, table, rowList] of rows) {
        for (const row of rowList) {
          for (const up of UPCARDS) {
            const ev = cellEVs(r, kind, row, up);
            if (!ev) continue;
            const code = table[row][upIndex(up)];
            const gap = best(ev) - evOf(code, ev);
            expect(gap, `${kind} ${row} v ${up}: ${code}`).toBeLessThanOrEqual(tolerance);
          }
        }
      }
    });
  }
});

describe('recommend() respects what is legal right now', () => {
  const all: Legal = { hit: true, stand: true, double: true, split: true, surrender: true };
  const noDouble: Legal = { ...all, double: false, surrender: false, split: false };

  it('doubles 11 vs 6 on two cards, hits it on three', () => {
    expect(recommend(DEFAULT_RULES, cards(6, 5), c(6), all).action).toBe('double');
    expect(recommend(DEFAULT_RULES, cards(3, 3, 5), c(6), noDouble).action).toBe('hit');
  });

  it('soft 18 vs 4: double on two cards, stand after', () => {
    expect(recommend(DEFAULT_RULES, cards('A', 7), c(4), all).action).toBe('double');
    expect(recommend(DEFAULT_RULES, cards('A', 2, 5), c(4), noDouble).action).toBe('stand');
  });

  it('16 vs 10: surrender first, hit later', () => {
    expect(recommend(DEFAULT_RULES, cards(10, 6), c('K'), all).action).toBe('surrender');
    expect(recommend(DEFAULT_RULES, cards(10, 2, 4), c('K'), noDouble).action).toBe('hit');
  });

  it('8,8 vs 6 at the hand limit plays as hard 16', () => {
    const r = recommend(DEFAULT_RULES, cards(8, 8), c(6), { ...all, split: false, surrender: false });
    expect(r.action).toBe('stand');
    expect(r.situation.kind).toBe('hard');
  });

  it('locked split aces just stand', () => {
    const locked: Legal = { hit: false, stand: true, double: false, split: false, surrender: false };
    expect(recommend(DEFAULT_RULES, cards('A', 4), c(6), locked).action).toBe('stand');
  });

  it('never splits tens or fives', () => {
    expect(recommend(DEFAULT_RULES, cards('K', 'Q'), c(6), all).action).toBe('stand');
    expect(recommend(DEFAULT_RULES, cards(5, 5), c(6), all).action).toBe('double');
  });
});

describe('classification keys and reasons', () => {
  it('builds stable stat keys', () => {
    expect(classify(cards(10, 6), c(10), true).key).toBe('H16v10');
    expect(classify(cards('A', 7), c('A'), true).key).toBe('S18v11');
    expect(classify(cards(8, 8), c('A'), true).key).toBe('P8v11');
    expect(classify(cards(8, 8), c('A'), false).key).toBe('H16v11');
    expect(classify(cards('A', 'A'), c(5), true).key).toBe('P11v5');
  });

  it('has a reason for every default-chart cell', () => {
    const chart = buildChart(DEFAULT_RULES);
    for (const [kind, table] of [['hard', chart.hard], ['soft', chart.soft], ['pair', chart.pairs]] as const) {
      for (const [row, codes] of Object.entries(table)) {
        codes.forEach((code, i) => {
          const up = UPCARDS[i];
          const action = code === 'H' ? 'hit' : code === 'S' ? 'stand' : code === 'P' ? 'split' : code.startsWith('R') ? 'surrender' : 'double';
          const text = reasonFor({ kind, row: Number(row), up }, action, code);
          expect(text.length).toBeGreaterThan(10);
        });
      }
    }
  });
});
