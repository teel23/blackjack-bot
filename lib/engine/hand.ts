import { type Card, cardValue } from './cards';

export interface HandValue {
  total: number;
  /** An ace is currently counted as 11. */
  soft: boolean;
}

export function handValue(cards: readonly Card[]): HandValue {
  let total = 0;
  let aces = 0;
  for (const card of cards) {
    const v = cardValue(card);
    total += v;
    if (v === 1) aces++;
  }
  if (aces > 0 && total + 10 <= 21) return { total: total + 10, soft: true };
  return { total, soft: false };
}

export function handTotal(cards: readonly Card[]): number {
  return handValue(cards).total;
}

export function isBust(cards: readonly Card[]): boolean {
  return handTotal(cards) > 21;
}

/** Natural 21 on the first two cards. Split hands can't make blackjack. */
export function isNatural(cards: readonly Card[], fromSplit = false): boolean {
  return !fromSplit && cards.length === 2 && handTotal(cards) === 21;
}

/** Two cards of the same blackjack value (any two 10-value cards count as a pair). */
export function isPair(cards: readonly Card[]): boolean {
  return cards.length === 2 && cardValue(cards[0]) === cardValue(cards[1]);
}

/** "Soft 17", "Hard 16", "Blackjack", "Bust (24)" */
export function describeHand(cards: readonly Card[], fromSplit = false): string {
  const { total, soft } = handValue(cards);
  if (isNatural(cards, fromSplit)) return 'Blackjack';
  if (total > 21) return `Bust (${total})`;
  return soft ? `Soft ${total}` : `${total}`;
}
