import { describe, expect, it } from 'vitest';
import { type Rank, SUITS, c } from '@/lib/engine/cards';
import { handValue } from '@/lib/engine/hand';
import { type Round, act, decideInsurance, legalActions, startRound } from '@/lib/engine/round';
import { DEFAULT_RULES, type Rules } from '@/lib/engine/rules';
import { stackDeal } from '@/lib/engine/shoe';

type R = Rank | number;
const rules = (over: Partial<Rules> = {}): Rules => ({ ...DEFAULT_RULES, ...over });

function deal(p: [R, R], up: R, hole: R, draws: R[] = [], opts: { rules?: Rules; bet?: number; bankroll?: number } = {}): Round {
  const ru = opts.rules ?? rules();
  const shoe = stackDeal(
    [c(p[0], 'H'), c(p[1], 'D')],
    c(up, 'S'),
    c(hole, 'C'),
    draws.map((d, i) => c(d, SUITS[i % 4])),
    ru.decks,
    1,
  );
  return startRound({ rules: ru, shoe, bet: opts.bet ?? 10, bankroll: opts.bankroll ?? 1000 });
}

describe('basic flow and dealer play', () => {
  it('pays a win 1:1', () => {
    const r = act(deal([10, 'K'], 10, 8), 'stand');
    expect(r.phase).toBe('done');
    expect(r.hands[0].outcome).toBe('win');
    expect(r.net).toBe(10);
  });

  it('dealer hits 16 and can make 21', () => {
    const r = act(deal([10, 8], 10, 6, [5]), 'stand');
    expect(handValue(r.dealer).total).toBe(21);
    expect(r.hands[0].outcome).toBe('lose');
    expect(r.net).toBe(-10);
  });

  it('S17 dealer stands on soft 17', () => {
    const r = act(deal([10, 9], 6, 'A', [2]), 'stand');
    expect(r.dealer).toHaveLength(2);
    expect(r.net).toBe(10);
  });

  it('H17 dealer hits soft 17', () => {
    const r = act(deal([10, 9], 6, 'A', [2], { rules: rules({ dealerHitsSoft17: true }) }), 'stand');
    expect(r.dealer).toHaveLength(3);
    expect(handValue(r.dealer).total).toBe(19);
    expect(r.hands[0].outcome).toBe('push');
    expect(r.net).toBe(0);
  });

  it('dealer does not draw when every player hand busted', () => {
    const r = act(deal([10, 6], 6, 10, [10]), 'hit');
    expect(r.hands[0].outcome).toBe('bust');
    expect(r.dealer).toHaveLength(2);
    expect(r.net).toBe(-10);
  });

  it('auto-stands on 21 after a hit', () => {
    const r = act(deal([5, 6], 6, 10, [10, 10]), 'hit');
    expect(r.phase).toBe('done');
    expect(r.hands[0].outcome).toBe('win');
  });

  it('round state survives a JSON round-trip and keeps playing', () => {
    const r = deal([10, 6], 7, 10, [3, 5]);
    const restored: Round = JSON.parse(JSON.stringify(r));
    expect(restored).toEqual(r);
    const after = act(act(restored, 'hit'), 'hit');
    expect(after.phase).toBe('done');
  });

  it('rejects illegal actions and bad bets', () => {
    const r = act(deal([10, 'K'], 10, 8), 'stand');
    expect(() => act(r, 'hit')).toThrow();
    expect(() => deal([10, 9], 7, 10, [], { bet: 2000 })).toThrow();
    expect(() => deal([10, 9], 7, 10, [], { bet: 0 })).toThrow();
  });
});

describe('blackjacks, peek and insurance', () => {
  it('pays blackjack 3:2', () => {
    const r = deal(['A', 'K'], 9, 7);
    expect(r.phase).toBe('done');
    expect(r.hands[0].outcome).toBe('blackjack');
    expect(r.net).toBe(15);
    expect(r.dealer).toHaveLength(2);
  });

  it('pays blackjack 6:5 when the rules say so', () => {
    const r = deal(['A', 'K'], 9, 7, [], { rules: rules({ blackjackPayout: '6:5' }) });
    expect(r.net).toBe(12);
  });

  it('offers insurance with an ace up and resolves the peek after', () => {
    const r = deal([10, 9], 'A', 'K');
    expect(r.phase).toBe('insurance');
    expect(legalActions(r).hit).toBe(false);
    const declined = decideInsurance(r, false);
    expect(declined.phase).toBe('done');
    expect(declined.dealerBlackjack).toBe(true);
    expect(declined.net).toBe(-10);
    const taken = decideInsurance(r, true);
    expect(taken.insurance.net).toBe(10);
    expect(taken.net).toBe(0);
  });

  it('loses the insurance bet when the dealer has no blackjack', () => {
    const r = decideInsurance(deal([10, 9], 'A', 7), true);
    expect(r.phase).toBe('player');
    expect(r.insurance.bet).toBe(5);
    const done = act(r, 'stand');
    expect(done.insurance.net).toBe(-5);
    expect(done.net).toBe(10 - 5);
  });

  it('player blackjack pushes a dealer blackjack', () => {
    const r = decideInsurance(deal(['A', 'Q'], 'A', 'K'), false);
    expect(r.hands[0].outcome).toBe('push');
    expect(r.net).toBe(0);
  });

  it('even money locks in 1:1 either way', () => {
    expect(decideInsurance(deal(['A', 'K'], 'A', 9), true).net).toBe(10);
    expect(decideInsurance(deal(['A', 'K'], 'A', 'Q'), true).net).toBe(10);
    expect(decideInsurance(deal(['A', 'K'], 'A', 9), false).net).toBe(15);
  });

  it('peeks under a 10 and ends the hand before any decision', () => {
    const r = deal([10, 9], 'K', 'A');
    expect(r.phase).toBe('done');
    expect(r.net).toBe(-10);
  });

  it('no insurance phase when insurance is turned off', () => {
    const r = deal([10, 9], 'A', 7, [], { rules: rules({ insurance: false }) });
    expect(r.phase).toBe('player');
  });

  it('without a peek, a dealer blackjack takes doubles too (ENHC)', () => {
    const r = deal([6, 5], 10, 'A', [10], { rules: rules({ dealerPeek: false }) });
    expect(r.phase).toBe('player');
    const done = act(r, 'double');
    expect(done.dealerBlackjack).toBe(true);
    expect(done.net).toBe(-20);
  });
});

describe('surrender', () => {
  it('gives back half the bet', () => {
    const r = deal([10, 6], 10, 7);
    expect(legalActions(r).surrender).toBe(true);
    const done = act(r, 'surrender');
    expect(done.hands[0].outcome).toBe('surrender');
    expect(done.net).toBe(-5);
  });

  it('is only allowed as the first decision', () => {
    const r = act(deal([10, 4], 10, 7, [2]), 'hit');
    expect(legalActions(r).surrender).toBe(false);
  });

  it('is unavailable without the rule or without a peek', () => {
    expect(legalActions(deal([10, 6], 10, 7, [], { rules: rules({ lateSurrender: false }) })).surrender).toBe(false);
    expect(legalActions(deal([10, 6], 10, 7, [], { rules: rules({ dealerPeek: false }) })).surrender).toBe(false);
  });

  it('is not allowed after a split', () => {
    const r = act(deal([8, 8], 10, 7, [2, 3]), 'split');
    expect(legalActions(r).surrender).toBe(false);
  });
});

describe('doubling', () => {
  it('doubles the bet and draws exactly one card', () => {
    const r = deal([6, 5], 6, 10, [10, 7]);
    const done = act(r, 'double');
    expect(done.hands[0].cards).toHaveLength(3);
    expect(done.hands[0].bet).toBe(20);
    expect(done.net).toBe(20);
  });

  it('respects double-on restrictions', () => {
    const r911 = rules({ doubleOn: '9-11' });
    expect(legalActions(deal([10, 2], 6, 10, [], { rules: r911 })).double).toBe(false);
    expect(legalActions(deal([6, 5], 6, 10, [], { rules: r911 })).double).toBe(true);
    expect(legalActions(deal(['A', 6], 6, 10, [], { rules: r911 })).double).toBe(false);
    const r1011 = rules({ doubleOn: '10-11' });
    expect(legalActions(deal([5, 4], 6, 10, [], { rules: r1011 })).double).toBe(false);
  });

  it('needs two cards and enough chips', () => {
    expect(legalActions(act(deal([3, 2], 6, 10, [4]), 'hit')).double).toBe(false);
    expect(legalActions(deal([6, 5], 6, 10, [], { bet: 10, bankroll: 15 })).double).toBe(false);
  });

  it('double after split follows the DAS rule', () => {
    const das = act(deal([8, 8], 6, 10, [3]), 'split');
    expect(legalActions(das).double).toBe(true);
    const noDas = act(deal([8, 8], 6, 10, [3], { rules: rules({ doubleAfterSplit: false }) }), 'split');
    expect(legalActions(noDas).double).toBe(false);
  });
});

describe('splitting', () => {
  it('plays each split hand in turn and settles them separately', () => {
    let r = deal([8, 8], 6, 10, [3, 10, 10, 10]);
    expect(legalActions(r).split).toBe(true);
    r = act(r, 'split');
    expect(r.hands).toHaveLength(2);
    expect(r.hands[0].cards.map((x) => x.rank)).toEqual(['8', '3']);
    expect(r.hands[1].cards).toHaveLength(1);
    r = act(r, 'double');
    expect(r.active).toBe(1);
    expect(r.hands[1].cards.map((x) => x.rank)).toEqual(['8', '10']);
    r = act(r, 'stand');
    expect(r.phase).toBe('done');
    expect(r.hands.map((h) => h.outcome)).toEqual(['win', 'win']);
    expect(r.net).toBe(30);
  });

  it('resplits up to the hand limit', () => {
    let r = deal([8, 8], 6, 10, [8, 8, 8, 2, 2, 2, 2]);
    r = act(r, 'split');
    expect(legalActions(r).split).toBe(true);
    r = act(r, 'split');
    expect(r.hands).toHaveLength(3);
    r = act(r, 'split');
    expect(r.hands).toHaveLength(4);
    expect(legalActions(r).split).toBe(false);
  });

  it('honors a lower resplit limit', () => {
    let r = deal([8, 8], 6, 10, [8, 2], { rules: rules({ maxHands: 2 }) });
    r = act(r, 'split');
    expect(legalActions(r).split).toBe(false);
  });

  it('split aces get one card each and cannot be hit', () => {
    let r = deal(['A', 'A'], 6, 10, ['A', 5, 10]);
    r = act(r, 'split');
    expect(r.phase).toBe('done');
    expect(r.hands.map((h) => h.cards.length)).toEqual([2, 2]);
    expect(r.net).toBe(20);
  });

  it('can resplit aces when the rules allow it', () => {
    let r = deal(['A', 'A'], 6, 10, ['A', 5, 5, 10], { rules: rules({ resplitAces: true }) });
    r = act(r, 'split');
    const legal = legalActions(r);
    expect(legal.split).toBe(true);
    expect(legal.hit).toBe(false);
    expect(legal.double).toBe(false);
    r = act(r, 'split');
    expect(r.hands).toHaveLength(3);
  });

  it('can hit split aces when the rules allow it', () => {
    const r = act(deal(['A', 'A'], 6, 10, [2, 5], { rules: rules({ hitSplitAces: true }) }), 'split');
    expect(legalActions(r).hit).toBe(true);
  });

  it('21 after a split pays 1:1, not 3:2', () => {
    const r = act(deal(['A', 'A'], 6, 10, ['K', 9, 2]), 'split');
    expect(r.hands[0].outcome).toBe('win');
    expect(r.hands[0].net).toBe(10);
    expect(r.net).toBe(20);
  });

  it('needs chips to split', () => {
    expect(legalActions(deal([8, 8], 6, 10, [], { bet: 10, bankroll: 15 })).split).toBe(false);
  });

  it('can split any two ten-value cards', () => {
    expect(legalActions(deal(['K', 'Q'], 6, 10)).split).toBe(true);
  });
});
