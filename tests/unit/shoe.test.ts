import { describe, expect, it } from 'vitest';
import { c } from '@/lib/engine/cards';
import { Rng, nextRandom } from '@/lib/engine/rng';
import { createShoe, drawCard, freshDecks, needsShuffle, stackDeal, shuffleShoe } from '@/lib/engine/shoe';

describe('rng', () => {
  it('is deterministic for a seed', () => {
    const a = new Rng(42);
    const b = new Rng(42);
    const seqA = Array.from({ length: 5 }, () => a.next());
    const seqB = Array.from({ length: 5 }, () => b.next());
    expect(seqA).toEqual(seqB);
    seqA.forEach((v) => expect(v).toBeGreaterThanOrEqual(0));
    seqA.forEach((v) => expect(v).toBeLessThan(1));
  });
  it('state advances', () => {
    const [, s1] = nextRandom(1);
    const [, s2] = nextRandom(s1);
    expect(s1).not.toBe(s2);
  });
});

describe('shoe', () => {
  it.each([1, 2, 6, 8] as const)('%i deck shoe has 52n cards with correct composition', (decks) => {
    const shoe = createShoe(decks, 7);
    expect(shoe.cards).toHaveLength(52 * decks);
    const aces = shoe.cards.filter((x) => x.rank === 'A').length;
    const tens = shoe.cards.filter((x) => ['10', 'J', 'Q', 'K'].includes(x.rank)).length;
    expect(aces).toBe(4 * decks);
    expect(tens).toBe(16 * decks);
  });

  it('same seed → same order; different seed → different order', () => {
    expect(createShoe(6, 99).cards).toEqual(createShoe(6, 99).cards);
    expect(createShoe(6, 99).cards).not.toEqual(createShoe(6, 100).cards);
  });

  it('places the cut card around nominal penetration and flags a reshuffle past it', () => {
    const shoe = createShoe(6, 1);
    expect(shoe.cutAt / shoe.cards.length).toBeGreaterThan(0.7);
    expect(shoe.cutAt / shoe.cards.length).toBeLessThan(0.8);
    expect(needsShuffle(shoe)).toBe(false);
    shoe.pos = shoe.cutAt;
    expect(needsShuffle(shoe)).toBe(true);
    const fresh = shuffleShoe(shoe);
    expect(fresh.pos).toBe(0);
    expect(fresh.shuffles).toBe(shoe.shuffles + 1);
  });

  it('reshuffles instead of crashing if a round empties the shoe', () => {
    const shoe = createShoe(1, 3);
    shoe.pos = shoe.cards.length;
    const card = drawCard(shoe);
    expect(card).toBeDefined();
    expect(shoe.pos).toBe(1);
  });

  it('stacked deals put cards in deal order and keep the shoe size honest', () => {
    const shoe = stackDeal([c(8, 'H'), c(8, 'D')], c(6, 'S'), c(10, 'C'), [c(3, 'H')], 6, 5);
    expect(shoe.cards).toHaveLength(312);
    expect(shoe.cards.slice(0, 5).map((x) => x.rank)).toEqual(['8', '6', '8', '10', '3']);
    expect(freshDecks(1)).toHaveLength(52);
  });
});
