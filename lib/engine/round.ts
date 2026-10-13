import { type Card, cardValue, isTenValue } from './cards';
import { handValue, isBust, isNatural, isPair } from './hand';
import { type Rules, blackjackMultiplier, surrenderAvailable } from './rules';
import { type Shoe, drawCard, needsShuffle, shuffleShoe } from './shoe';

export type Phase = 'insurance' | 'player' | 'done';
export type Action = 'hit' | 'stand' | 'double' | 'split' | 'surrender';
export type HandOutcome = 'blackjack' | 'win' | 'push' | 'lose' | 'bust' | 'surrender';

export interface PlayerHand {
  cards: Card[];
  bet: number;
  doubled: boolean;
  fromSplit: boolean;
  splitAces: boolean;
  surrendered: boolean;
  done: boolean;
  outcome: HandOutcome | null;
  /** Net chips won/lost on this hand once settled. */
  net: number;
}

export interface InsuranceState {
  offered: boolean;
  /** null until the player decides. */
  taken: boolean | null;
  bet: number;
  net: number;
}

export interface Round {
  /** Unique within a shoe's life: "<shuffle>.<position>". */
  id: string;
  rules: Rules;
  shoe: Shoe;
  phase: Phase;
  /** dealer[0] is the upcard, dealer[1] the hole card. */
  dealer: Card[];
  holeRevealed: boolean;
  dealerBlackjack: boolean;
  hands: PlayerHand[];
  active: number;
  baseBet: number;
  /** Chips the player had when the round started; limits doubles/splits/insurance. */
  bankrollAtStart: number;
  insurance: InsuranceState;
  reshuffled: boolean;
  /** Total net for the round once phase is 'done'. */
  net: number;
}

export interface Legal {
  hit: boolean;
  stand: boolean;
  double: boolean;
  split: boolean;
  surrender: boolean;
}

export const NO_ACTIONS: Legal = { hit: false, stand: false, double: false, split: false, surrender: false };

function newHand(cards: Card[], bet: number, fromSplit = false, splitAces = false): PlayerHand {
  return { cards, bet, doubled: false, fromSplit, splitAces, surrendered: false, done: false, outcome: null, net: 0 };
}

function clone<T>(v: T): T {
  return structuredClone(v);
}

export function committed(round: Round): number {
  return round.hands.reduce((s, h) => s + h.bet, 0) + round.insurance.bet;
}

export function chipsFree(round: Round): number {
  return round.bankrollAtStart - committed(round);
}

export interface StartOptions {
  rules: Rules;
  shoe: Shoe;
  bet: number;
  bankroll: number;
}

export function startRound({ rules, shoe, bet, bankroll }: StartOptions): Round {
  if (!(bet > 0)) throw new Error('Bet must be positive');
  if (bet > bankroll) throw new Error('Bet exceeds bankroll');
  let s = clone(shoe);
  let reshuffled = false;
  if (s.decks !== rules.decks) {
    s = shuffleShoe({ ...s, decks: rules.decks });
    reshuffled = true;
  } else if (needsShuffle(s)) {
    s = shuffleShoe(s);
    reshuffled = true;
  }
  const id = `${s.shuffles}.${s.pos}`;
  const p1 = drawCard(s);
  const up = drawCard(s);
  const p2 = drawCard(s);
  const hole = drawCard(s);

  const round: Round = {
    id,
    rules,
    shoe: s,
    phase: 'player',
    dealer: [up, hole],
    holeRevealed: false,
    dealerBlackjack: false,
    hands: [newHand([p1, p2], bet)],
    active: 0,
    baseBet: bet,
    bankrollAtStart: bankroll,
    insurance: { offered: false, taken: null, bet: 0, net: 0 },
    reshuffled,
    net: 0,
  };

  if (up.rank === 'A' && rules.insurance) {
    round.insurance.offered = true;
    round.phase = 'insurance';
    return round;
  }
  return afterInsurance(round);
}

/** Insurance costs half the bet; with a player blackjack this is "even money". */
export function insuranceCost(round: Round): number {
  return round.baseBet / 2;
}

export function canAffordInsurance(round: Round): boolean {
  return chipsFree(round) >= insuranceCost(round);
}

export function decideInsurance(round: Round, take: boolean): Round {
  if (round.phase !== 'insurance') throw new Error('No insurance decision pending');
  const r = clone(round);
  if (take && !canAffordInsurance(r)) throw new Error('Not enough chips for insurance');
  r.insurance.taken = take;
  r.insurance.bet = take ? insuranceCost(r) : 0;
  r.phase = 'player';
  return afterInsurance(r);
}

function dealerHasNatural(r: Round): boolean {
  return isNatural(r.dealer.slice(0, 2));
}

/** Peek (if the rules allow), pay naturals, or hand control to the player. Mutates r. */
function afterInsurance(r: Round): Round {
  const up = r.dealer[0];
  const peekable = up.rank === 'A' || isTenValue(up);
  if (r.rules.dealerPeek && peekable && dealerHasNatural(r)) {
    r.holeRevealed = true;
    r.dealerBlackjack = true;
    return settle(r);
  }
  const hand = r.hands[0];
  if (isNatural(hand.cards)) {
    hand.done = true;
    return finishPlayer(r);
  }
  r.phase = 'player';
  return r;
}

export function legalActions(round: Round): Legal {
  if (round.phase !== 'player') return NO_ACTIONS;
  const hand = round.hands[round.active];
  if (!hand || hand.done) return NO_ACTIONS;
  const rules = round.rules;
  const { total } = handValue(hand.cards);
  const twoCards = hand.cards.length === 2;
  const free = chipsFree(round);
  const lockedAces = hand.splitAces && !rules.hitSplitAces;

  const hit = total < 21 && !lockedAces;
  const doubleTotalOk =
    rules.doubleOn === 'any2' ||
    (rules.doubleOn === '9-11' && total >= 9 && total <= 11) ||
    (rules.doubleOn === '10-11' && total >= 10 && total <= 11);
  const double =
    twoCards &&
    total < 21 &&
    !hand.splitAces &&
    doubleTotalOk &&
    (!hand.fromSplit || rules.doubleAfterSplit) &&
    free >= hand.bet;
  const acesPair = twoCards && hand.cards[0].rank === 'A' && hand.cards[1].rank === 'A';
  const split =
    twoCards &&
    isPair(hand.cards) &&
    round.hands.length < rules.maxHands &&
    (!acesPair || !hand.fromSplit || rules.resplitAces) &&
    free >= hand.bet;
  const surrender =
    surrenderAvailable(rules) && round.hands.length === 1 && twoCards && !hand.fromSplit;

  return { hit, stand: true, double, split, surrender };
}

export function act(round: Round, action: Action): Round {
  const legal = legalActions(round);
  if (!legal[action]) throw new Error(`Illegal action: ${action}`);
  const r = clone(round);
  const hand = r.hands[r.active];

  switch (action) {
    case 'hit': {
      hand.cards.push(drawCard(r.shoe));
      const { total } = handValue(hand.cards);
      if (total >= 21) hand.done = true;
      break;
    }
    case 'stand':
      hand.done = true;
      break;
    case 'double':
      hand.bet *= 2;
      hand.doubled = true;
      hand.cards.push(drawCard(r.shoe));
      hand.done = true;
      break;
    case 'surrender':
      hand.surrendered = true;
      hand.done = true;
      break;
    case 'split': {
      const aces = hand.cards[0].rank === 'A';
      const a = newHand([hand.cards[0]], hand.bet, true, aces);
      const b = newHand([hand.cards[1]], hand.bet, true, aces);
      r.hands.splice(r.active, 1, a, b);
      dealSecondCard(r, r.active);
      break;
    }
  }
  return advance(r);
}

/** Give a split hand its second card and auto-finish it if no decisions remain. */
function dealSecondCard(r: Round, index: number) {
  const hand = r.hands[index];
  hand.cards.push(drawCard(r.shoe));
  const { total } = handValue(hand.cards);
  if (total === 21) {
    hand.done = true;
    return;
  }
  if (hand.splitAces && !r.rules.hitSplitAces) {
    const canResplit =
      hand.cards[1].rank === 'A' && r.rules.resplitAces && r.hands.length < r.rules.maxHands;
    if (!canResplit) hand.done = true;
  }
}

/** Move to the next unfinished hand, dealing split hands their second card as play reaches them. */
function advance(r: Round): Round {
  while (r.active < r.hands.length) {
    const hand = r.hands[r.active];
    if (hand.cards.length === 1) dealSecondCard(r, r.active);
    if (!hand.done) return r;
    r.active++;
  }
  r.active = r.hands.length - 1;
  return finishPlayer(r);
}

export function dealerShouldHit(cards: readonly Card[], rules: Rules): boolean {
  const { total, soft } = handValue(cards);
  if (total < 17) return true;
  return total === 17 && soft && rules.dealerHitsSoft17;
}

/** All player hands are done: reveal, let the dealer draw if anything is still live, settle. Mutates r. */
function finishPlayer(r: Round): Round {
  r.holeRevealed = true;
  if (dealerHasNatural(r)) {
    r.dealerBlackjack = true;
    return settle(r);
  }
  const singleNatural = r.hands.length === 1 && isNatural(r.hands[0].cards);
  const live = r.hands.some((h) => !h.surrendered && !isBust(h.cards)) && !singleNatural;
  if (live) {
    while (dealerShouldHit(r.dealer, r.rules)) r.dealer.push(drawCard(r.shoe));
  }
  return settle(r);
}

function settle(r: Round): Round {
  const dealerTotal = handValue(r.dealer).total;
  const dealerBust = dealerTotal > 21;
  const single = r.hands.length === 1;

  for (const h of r.hands) {
    const natural = single && isNatural(h.cards, h.fromSplit);
    const total = handValue(h.cards).total;
    if (h.surrendered) {
      h.outcome = 'surrender';
      h.net = -h.bet / 2;
    } else if (r.dealerBlackjack) {
      // With a peek this happens before any doubling/splitting. Without one, all bets are lost (ENHC).
      h.outcome = natural ? 'push' : 'lose';
      h.net = natural ? 0 : -h.bet;
    } else if (natural) {
      h.outcome = 'blackjack';
      h.net = h.bet * blackjackMultiplier(r.rules);
    } else if (total > 21) {
      h.outcome = 'bust';
      h.net = -h.bet;
    } else if (dealerBust || total > dealerTotal) {
      h.outcome = 'win';
      h.net = h.bet;
    } else if (total === dealerTotal) {
      h.outcome = 'push';
      h.net = 0;
    } else {
      h.outcome = 'lose';
      h.net = -h.bet;
    }
    h.done = true;
  }

  if (r.insurance.taken) {
    r.insurance.net = r.dealerBlackjack ? r.insurance.bet * 2 : -r.insurance.bet;
  }
  r.holeRevealed = true;
  r.phase = 'done';
  r.net = round2(r.hands.reduce((s, h) => s + h.net, 0) + r.insurance.net);
  return r;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Dealer cards the player can currently see. */
export function visibleDealer(round: Round): Card[] {
  return round.holeRevealed ? round.dealer : round.dealer.slice(0, 1);
}

export function dealerUpcardValue(round: Round): number {
  const v = cardValue(round.dealer[0]);
  return v === 1 ? 11 : v;
}
