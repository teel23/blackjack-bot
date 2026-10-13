import { type Card, RANKS, SUITS } from './cards';
import type { DeckCount } from './rules';
import { penetration } from './rules';
import { Rng, randomSeed } from './rng';

export interface Shoe {
  decks: DeckCount;
  /** Full shuffled order; cards[pos] is the next card out. */
  cards: Card[];
  pos: number;
  /** Reshuffle before the next round once pos reaches this index. */
  cutAt: number;
  rngState: number;
  shuffles: number;
}

export function freshDecks(decks: number): Card[] {
  const out: Card[] = [];
  for (let d = 0; d < decks; d++) {
    for (const suit of SUITS) for (const rank of RANKS) out.push({ rank, suit });
  }
  return out;
}

export function createShoe(decks: DeckCount, seed: number = randomSeed()): Shoe {
  return shuffleShoe({ decks, cards: [], pos: 0, cutAt: 0, rngState: seed >>> 0, shuffles: -1 });
}

export function shuffleShoe(shoe: Shoe): Shoe {
  const rng = new Rng(shoe.rngState);
  const cards = rng.shuffle(freshDecks(shoe.decks));
  // Cut card lands within ±4% of nominal penetration, like a real dealer's cut.
  const pen = penetration(shoe.decks) + (rng.next() - 0.5) * 0.08;
  const cutAt = Math.round(cards.length * pen);
  return { ...shoe, cards, pos: 0, cutAt, rngState: rng.state, shuffles: shoe.shuffles + 1 };
}

export function needsShuffle(shoe: Shoe): boolean {
  return shoe.pos >= shoe.cutAt;
}

export function cardsLeft(shoe: Shoe): number {
  return shoe.cards.length - shoe.pos;
}

/** Mutates the shoe (rounds work on their own copy). Reshuffles if it ever runs dry mid-round. */
export function drawCard(shoe: Shoe): Card {
  if (shoe.pos >= shoe.cards.length) {
    const fresh = shuffleShoe(shoe);
    Object.assign(shoe, fresh);
  }
  return shoe.cards[shoe.pos++];
}

/**
 * A shoe whose next cards are exactly `top` (in deal order), followed by a normal shuffle.
 * Deal order is player, dealer up, player, dealer hole, then draws.
 */
export function stackedShoe(top: Card[], decks: DeckCount = 6, seed: number = randomSeed()): Shoe {
  const base = createShoe(decks, seed);
  const rest = [...base.cards];
  // Remove one matching card per stacked card so the shoe composition stays honest.
  for (const card of top) {
    const i = rest.findIndex((x) => x.rank === card.rank && x.suit === card.suit);
    if (i >= 0) rest.splice(i, 1);
    else {
      const j = rest.findIndex((x) => x.rank === card.rank);
      if (j >= 0) rest.splice(j, 1);
    }
  }
  const cards = [...top, ...rest];
  return { ...base, cards, pos: 0, cutAt: Math.max(base.cutAt, top.length + 1) };
}

/** Stack a deal: player gets p1,p2; dealer shows `up` with `hole` underneath; then `draws` in order. */
export function stackDeal(
  player: [Card, Card],
  up: Card,
  hole: Card,
  draws: Card[] = [],
  decks: DeckCount = 6,
  seed?: number,
): Shoe {
  return stackedShoe([player[0], up, player[1], hole, ...draws], decks, seed);
}
