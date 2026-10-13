import type { DecisionQuestion } from '@/content/lessons/types';
import { type Card, SUITS, c } from './engine/cards';
import { handValue, isPair } from './engine/hand';
import type { Action, Legal } from './engine/round';
import { DEFAULT_RULES, type Rules, surrenderAvailable } from './engine/rules';
import { type Recommendation, recommend } from './strategy/chart';
import { reasonFor } from './strategy/reasons';

/** What's legal as the first decision on a hand (no splits made yet, plenty of chips). */
export function firstDecisionLegal(cards: readonly Card[], rules: Rules, only?: readonly Action[]): Legal {
  const two = cards.length === 2;
  const { total } = handValue(cards);
  const doubleOk =
    rules.doubleOn === 'any2' ||
    (rules.doubleOn === '9-11' && total >= 9 && total <= 11) ||
    (rules.doubleOn === '10-11' && total >= 10 && total <= 11);
  const legal: Legal = {
    hit: total < 21,
    stand: true,
    double: two && total < 21 && doubleOk,
    split: two && isPair(cards),
    surrender: two && surrenderAvailable(rules),
  };
  if (only) for (const k of Object.keys(legal) as Action[]) if (!only.includes(k)) legal[k] = false;
  if (!legal.hit && !legal.stand) legal.stand = true;
  return legal;
}

export interface Graded {
  rec: Recommendation;
  legal: Legal;
  reason: string;
}

export function grade(cards: readonly Card[], up: Card, rules: Rules, only?: readonly Action[], legalOverride?: Legal): Graded {
  const legal = legalOverride ?? firstDecisionLegal(cards, rules, only);
  const rec = recommend(rules, cards, up, legal);
  return { rec, legal, reason: reasonFor(rec.situation, rec.action, rec.code) };
}

/** Turn lesson card specs into cards with varied suits. */
export function specCards(specs: readonly (string | number)[], offset = 0): Card[] {
  return specs.map((s, i) => c(s as never, SUITS[(i + offset) % 4]));
}

export function lessonRules(q: DecisionQuestion): Rules {
  return { ...DEFAULT_RULES, ...q.rules };
}

export function gradeLessonQuestion(q: DecisionQuestion) {
  const cards = specCards(q.player);
  const up = specCards([q.up], 2)[0];
  return { cards, up, ...grade(cards, up, lessonRules(q), q.actions) };
}
