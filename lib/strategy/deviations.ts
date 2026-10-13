import type { Upcard } from '../engine/cards';
import type { Rules } from '../engine/rules';
import type { Code, DeckGroup } from './tables';

export type TableName = 'hard' | 'soft' | 'pairs';

export interface Deviation {
  /** Which rule set this applies to. */
  when: (r: Rules, g: DeckGroup) => boolean;
  table: TableName;
  row: number;
  ups: Upcard[];
  code: Code;
  /** Why the rule change moves this cell (shown in chart detail). */
  why: string;
}

const h17 = (r: Rules) => r.dealerHitsSoft17;
const noDas = (r: Rules) => !r.doubleAfterSplit;
const noPeek = (r: Rules) => !r.dealerPeek;

/**
 * Cell changes relative to the S17/DAS/peek base tables. Applied in order, so later
 * entries win. Surrender codes fall back automatically when surrender isn't offered.
 */
export const DEVIATIONS: Deviation[] = [
  // ── Dealer hits soft 17 ─────────────────────────────────────────────────
  { when: (r, g) => h17(r) && g === 'multi', table: 'hard', row: 11, ups: [11], code: 'D',
    why: 'When the dealer hits soft 17 they bust a little more often, so doubling 11 against an ace pays.' },
  { when: (r, g) => h17(r) && g !== 'single', table: 'soft', row: 18, ups: [2], code: 'Ds',
    why: 'H17 makes the dealer\'s 2 a bit weaker, enough to double soft 18.' },
  { when: (r, g) => h17(r) && g === 'single', table: 'soft', row: 18, ups: [11], code: 'H',
    why: 'An H17 dealer with an ace up finishes stronger, so soft 18 needs to improve.' },
  { when: (r) => h17(r), table: 'soft', row: 19, ups: [6], code: 'Ds',
    why: 'An H17 dealer showing 6 busts often enough to double soft 19.' },
  { when: (r) => h17(r), table: 'hard', row: 15, ups: [11], code: 'Rh',
    why: 'Against an H17 ace, 15 loses more than half your bet on average — surrender.' },
  { when: (r) => h17(r), table: 'hard', row: 17, ups: [11], code: 'Rs',
    why: 'An H17 ace makes 18+ so often that 17 is worth giving up when you can surrender.' },
  { when: (r, g) => h17(r) && g === 'multi', table: 'pairs', row: 8, ups: [11], code: 'Rp',
    why: 'Against an H17 ace in a big shoe, surrendering 8,8 edges out splitting.' },
  { when: (r, g) => h17(r) && g === 'single', table: 'pairs', row: 7, ups: [11], code: 'Rh',
    why: 'In single deck, two 7s out of the deck make 14 against an H17 ace worth surrendering.' },
  { when: (r, g) => h17(r) && r.dealerPeek && g === 'single', table: 'pairs', row: 9, ups: [11], code: 'P',
    why: 'Against an H17 ace in single deck, two 9s do better split than standing on 18.' },

  // ── No double after split ───────────────────────────────────────────────
  { when: (r, g) => noDas(r) && g !== 'single', table: 'pairs', row: 2, ups: [2, 3], code: 'H',
    why: 'Without doubling after a split, small pairs only split against the weakest dealer cards.' },
  { when: (r, g) => noDas(r) && g === 'single', table: 'pairs', row: 2, ups: [2, 3], code: 'H',
    why: 'Without doubling after a split, 2s only split against 4–7.' },
  { when: (r, g) => noDas(r) && g !== 'single', table: 'pairs', row: 3, ups: [2, 3], code: 'H',
    why: 'Without doubling after a split, 3s only split against 4–7.' },
  { when: (r, g) => noDas(r) && g === 'single', table: 'pairs', row: 3, ups: [2, 3, 8], code: 'H',
    why: 'Without doubling after a split, 3s only split against 4–7.' },
  { when: (r) => noDas(r), table: 'pairs', row: 4, ups: [4, 5, 6], code: 'H',
    why: 'Splitting 4s only pays when you can double the 14s and 15s that follow.' },
  { when: (r, g) => noDas(r) && g === 'single', table: 'pairs', row: 4, ups: [5, 6], code: 'D',
    why: 'In single deck, 4,4 plays as a hard 8: double against 5 and 6.' },
  { when: (r, g) => noDas(r) && g === 'multi', table: 'pairs', row: 6, ups: [2], code: 'H',
    why: 'Without doubling after a split, 6s need the dealer to show 3–6.' },
  { when: (r, g) => noDas(r) && g !== 'multi', table: 'pairs', row: 6, ups: [7], code: 'H',
    why: 'Without doubling after a split, 6s against a 7 is no longer worth it.' },
  { when: (r, g) => noDas(r) && g === 'double', table: 'pairs', row: 6, ups: [2], code: 'P',
    why: 'Double deck still splits 6s against a 2.' },
  { when: (r, g) => noDas(r) && g !== 'multi', table: 'pairs', row: 7, ups: [8], code: 'H',
    why: 'Without doubling after a split, 7s only split against 2–7.' },

  // ── No dealer peek (European no-hole-card) ──────────────────────────────
  { when: noPeek, table: 'hard', row: 11, ups: [10, 11], code: 'H',
    why: 'With no peek, a dealer blackjack takes your double too — don\'t double into a 10 or ace.' },
  { when: noPeek, table: 'pairs', row: 11, ups: [11], code: 'H',
    why: 'With no peek, splitting aces into an ace risks losing both bets to a dealer blackjack.' },
  { when: noPeek, table: 'pairs', row: 8, ups: [10, 11], code: 'H',
    why: 'With no peek, splitting 8s into a 10 or ace risks two bets against a possible blackjack.' },
  { when: (r, g) => noPeek(r) && g === 'single', table: 'hard', row: 10, ups: [10, 11], code: 'H',
    why: 'With no peek, keep your bet small against a 10 or ace.' },
];
