import { type Card, rankValue } from './engine/cards';

/** Hi-Lo tag: 2–6 = +1, 7–9 = 0, tens and aces = −1. */
export function hiLo(card: Card): number {
  const v = rankValue(card.rank);
  if (v >= 2 && v <= 6) return 1;
  if (v === 1 || v === 10) return -1;
  return 0;
}

export function signedCount(n: number): string {
  return n > 0 ? `+${n}` : n < 0 ? `−${Math.abs(n)}` : '0';
}
