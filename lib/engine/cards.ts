export const SUITS = ['S', 'H', 'D', 'C'] as const;
export const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'] as const;

export type Suit = (typeof SUITS)[number];
export type Rank = (typeof RANKS)[number];

export interface Card {
  rank: Rank;
  suit: Suit;
}

/** Blackjack value of a rank, with aces counted as 1 (soft logic lives in hand.ts). */
export function rankValue(rank: Rank): number {
  if (rank === 'A') return 1;
  if (rank === 'J' || rank === 'Q' || rank === 'K' || rank === '10') return 10;
  return Number(rank);
}

export function cardValue(card: Card): number {
  return rankValue(card.rank);
}

/** Dealer upcard as used by strategy tables: 2–10, with ace = 11. */
export type Upcard = 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;
export const UPCARDS: Upcard[] = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11];

export function upcardOf(card: Card): Upcard {
  const v = cardValue(card);
  return (v === 1 ? 11 : v) as Upcard;
}

export function upcardLabel(up: Upcard): string {
  return up === 11 ? 'A' : String(up);
}

export function isTenValue(card: Card): boolean {
  return cardValue(card) === 10;
}

export function cardLabel(card: Card): string {
  const suit = { S: '♠', H: '♥', D: '♦', C: '♣' }[card.suit];
  return `${card.rank}${suit}`;
}

const SUIT_NAMES: Record<Suit, string> = { S: 'spades', H: 'hearts', D: 'diamonds', C: 'clubs' };
const RANK_NAMES: Record<Rank, string> = {
  A: 'Ace', '2': 'Two', '3': 'Three', '4': 'Four', '5': 'Five', '6': 'Six', '7': 'Seven',
  '8': 'Eight', '9': 'Nine', '10': 'Ten', J: 'Jack', Q: 'Queen', K: 'King',
};

/** Spoken label for VoiceOver. */
export function cardSpoken(card: Card): string {
  return `${RANK_NAMES[card.rank]} of ${SUIT_NAMES[card.suit]}`;
}

/** Make a card from a short code like "A", "10", "K" (suit defaults to spades). Handy for tests and lessons. */
export function c(rank: Rank | number, suit: Suit = 'S'): Card {
  const r = (typeof rank === 'number' ? (rank === 1 || rank === 11 ? 'A' : String(rank)) : rank) as Rank;
  return { rank: r, suit };
}

/** Rotate suits so lesson/drill hands don't look identical. */
export function cards(...ranks: (Rank | number)[]): Card[] {
  return ranks.map((r, i) => c(r, SUITS[i % 4]));
}
