import { describe, expect, it } from 'vitest';
import { cards, c, rankValue, upcardOf } from '@/lib/engine/cards';
import { describeHand, handValue, isBust, isNatural, isPair } from '@/lib/engine/hand';

describe('card values', () => {
  it('counts faces as 10 and aces as 1 before soft logic', () => {
    expect(rankValue('K')).toBe(10);
    expect(rankValue('Q')).toBe(10);
    expect(rankValue('J')).toBe(10);
    expect(rankValue('10')).toBe(10);
    expect(rankValue('A')).toBe(1);
    expect(rankValue('7')).toBe(7);
  });
  it('maps an ace upcard to 11 for strategy lookups', () => {
    expect(upcardOf(c('A'))).toBe(11);
    expect(upcardOf(c('K'))).toBe(10);
    expect(upcardOf(c(6))).toBe(6);
  });
});

describe('hand totals and soft logic', () => {
  it.each([
    [[10, 6], 16, false],
    [['A', 6], 17, true],
    [['A', 6, 10], 17, false],
    [['A', 'A'], 12, true],
    [['A', 'A', 9], 21, true],
    [['A', 'A', 'A', 'A', 'A', 'A'], 16, true],
    [['A', 5, 'A'], 17, true],
    [['A', 5, 'A', 10], 17, false],
    [['A', 'K'], 21, true],
    [[10, 'Q', 2], 22, false],
    [['A', 9, 'A'], 21, true],
    [[2, 3], 5, false],
  ] as const)('%j → %i (soft %s)', (ranks, total, soft) => {
    expect(handValue(cards(...ranks))).toEqual({ total, soft });
  });

  it('detects busts', () => {
    expect(isBust(cards(10, 6, 9))).toBe(true);
    expect(isBust(cards('A', 6, 9))).toBe(false); // hard 16
  });

  it('blackjack is only a two-card 21 that did not come from a split', () => {
    expect(isNatural(cards('A', 'K'))).toBe(true);
    expect(isNatural(cards('A', '10'))).toBe(true);
    expect(isNatural(cards('A', 5, 5))).toBe(false);
    expect(isNatural(cards('A', 'K'), true)).toBe(false);
  });

  it('pairs compare blackjack value, so K-Q is a pair', () => {
    expect(isPair(cards(8, 8))).toBe(true);
    expect(isPair(cards('K', 'Q'))).toBe(true);
    expect(isPair(cards('A', 'A'))).toBe(true);
    expect(isPair(cards(8, 9))).toBe(false);
    expect(isPair(cards(8, 8, 8))).toBe(false);
  });

  it('describes hands in plain words', () => {
    expect(describeHand(cards('A', 'K'))).toBe('Blackjack');
    expect(describeHand(cards('A', 6))).toBe('Soft 17');
    expect(describeHand(cards(10, 6))).toBe('16');
    expect(describeHand(cards(10, 6, 9))).toBe('Bust (25)');
  });
});
