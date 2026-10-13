import type { Rank } from '@/lib/engine/cards';
import type { Action } from '@/lib/engine/round';
import type { Rules } from '@/lib/engine/rules';

/** A card in lesson data: rank only ("A", "K", 7…). Suits are assigned for display. */
export type CardSpec = Rank | number;

export interface CardsVisual {
  /** Shown on the dealer row. Use hole: true to draw the second card face down. */
  dealer?: CardSpec[];
  hole?: boolean;
  /** Shown on the player row. */
  player?: CardSpec[];
  /** A plain row of cards (counting lessons). */
  row?: CardSpec[];
}

export interface LessonCard {
  title: string;
  /** Paragraphs separated by blank lines. **bold** is supported. */
  body: string;
  visual?: CardsVisual;
}

/** "What's the play?" — the right answer comes from the strategy chart for the given rules. */
export interface DecisionQuestion {
  type: 'decision';
  player: CardSpec[];
  up: CardSpec;
  /** Limit the buttons (and the right answer) to these actions, e.g. hit/stand only. */
  actions?: Action[];
  rules?: Partial<Rules>;
  prompt?: string;
  /** Extra teaching line shown after answering (the coach reason is shown too). */
  explain?: string;
}

export interface ChoiceQuestion {
  type: 'choice';
  prompt: string;
  visual?: CardsVisual;
  options: string[];
  answer: number;
  explain: string;
}

export type Question = DecisionQuestion | ChoiceQuestion;

export interface Lesson {
  id: string;
  unit: number;
  title: string;
  /** One line for the lesson path. */
  summary: string;
  cards: LessonCard[];
  questions: Question[];
  /** Percent needed to pass. Default 80. */
  passPct?: number;
}

export interface Unit {
  number: number;
  title: string;
  lessons: Lesson[];
}
