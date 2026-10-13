export type DeckCount = 1 | 2 | 6 | 8;
export type BlackjackPayout = '3:2' | '6:5';
export type DoubleOn = 'any2' | '9-11' | '10-11';

export interface Rules {
  decks: DeckCount;
  /** true = H17 (dealer hits soft 17), false = S17 */
  dealerHitsSoft17: boolean;
  blackjackPayout: BlackjackPayout;
  doubleAfterSplit: boolean;
  doubleOn: DoubleOn;
  /** Max total hands after splitting (2 = no resplit). */
  maxHands: 2 | 3 | 4;
  resplitAces: boolean;
  hitSplitAces: boolean;
  /** Late surrender. Only available when the dealer peeks. */
  lateSurrender: boolean;
  insurance: boolean;
  /** Dealer checks for blackjack with an A or 10 up. Off = European no-hole-card: dealer blackjack takes all bets. */
  dealerPeek: boolean;
}

export const DEFAULT_RULES: Rules = {
  decks: 6,
  dealerHitsSoft17: false,
  blackjackPayout: '3:2',
  doubleAfterSplit: true,
  doubleOn: 'any2',
  maxHands: 4,
  resplitAces: false,
  hitSplitAces: false,
  lateSurrender: true,
  insurance: true,
  dealerPeek: true,
};

export function surrenderAvailable(rules: Rules): boolean {
  return rules.lateSurrender && rules.dealerPeek;
}

export function blackjackMultiplier(rules: Rules): number {
  return rules.blackjackPayout === '3:2' ? 1.5 : 1.2;
}

/** Fraction of the shoe dealt before the cut card. */
export function penetration(decks: DeckCount): number {
  return decks === 1 ? 0.65 : decks === 2 ? 0.7 : 0.75;
}

/** Short summary for headers, e.g. "6D · S17 · 3:2 · DAS · LS". */
export function rulesSummary(r: Rules): string {
  return [
    `${r.decks}D`,
    r.dealerHitsSoft17 ? 'H17' : 'S17',
    r.blackjackPayout,
    r.doubleAfterSplit ? 'DAS' : 'no DAS',
    surrenderAvailable(r) ? 'LS' : null,
    r.dealerPeek ? null : 'no peek',
    r.doubleOn === 'any2' ? null : `D${r.doubleOn}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

/** Normalize possibly-partial/old saved rules into a valid Rules object. */
export function sanitizeRules(input: unknown): Rules {
  const r = (input && typeof input === 'object' ? input : {}) as Partial<Rules>;
  const pick = <T>(v: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(v as T) ? (v as T) : fallback;
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);
  return {
    decks: pick(r.decks, [1, 2, 6, 8] as const, DEFAULT_RULES.decks),
    dealerHitsSoft17: bool(r.dealerHitsSoft17, DEFAULT_RULES.dealerHitsSoft17),
    blackjackPayout: pick(r.blackjackPayout, ['3:2', '6:5'] as const, DEFAULT_RULES.blackjackPayout),
    doubleAfterSplit: bool(r.doubleAfterSplit, DEFAULT_RULES.doubleAfterSplit),
    doubleOn: pick(r.doubleOn, ['any2', '9-11', '10-11'] as const, DEFAULT_RULES.doubleOn),
    maxHands: pick(r.maxHands, [2, 3, 4] as const, DEFAULT_RULES.maxHands),
    resplitAces: bool(r.resplitAces, DEFAULT_RULES.resplitAces),
    hitSplitAces: bool(r.hitSplitAces, DEFAULT_RULES.hitSplitAces),
    lateSurrender: bool(r.lateSurrender, DEFAULT_RULES.lateSurrender),
    insurance: bool(r.insurance, DEFAULT_RULES.insurance),
    dealerPeek: bool(r.dealerPeek, DEFAULT_RULES.dealerPeek),
  };
}
