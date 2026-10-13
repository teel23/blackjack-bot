import type { Lesson } from './types';

const HSD = ['hit', 'stand', 'double'] as const;

export const unit4: Lesson[] = [
  {
    id: 'u4-double-hard',
    unit: 4,
    title: 'Doubling 9, 10 and 11',
    summary: 'Put more money out when you\'re the favorite.',
    cards: [
      {
        title: 'Why double?',
        body:
          'Doubling means **twice the bet, exactly one more card**. You do it when you\'re likely to win — and with 9, 10 or 11 there\'s a good chance that one card lands you on 19–21.\n\n' +
          'You give up the chance to hit again, so only double when one card is usually enough.',
        visual: { dealer: [6, 'K'], hole: true, player: [6, 5] },
      },
      {
        title: 'The pattern (6 decks, S17)',
        body:
          '**11**: double against everything except an ace (hit vs A).\n\n' +
          '**10**: double against 2–9. Hit against 10 or A — they\'re too strong.\n\n' +
          '**9**: double against 3–6. Otherwise hit.\n\n' +
          'After you\'ve taken a third card you can\'t double anymore — just hit or stand by the hard-total rules.',
      },
    ],
    questions: [
      { type: 'decision', player: [6, 5], up: 6, actions: [...HSD] },
      { type: 'decision', player: [7, 4], up: 'A', actions: [...HSD] },
      { type: 'decision', player: [6, 4], up: 9, actions: [...HSD] },
      { type: 'decision', player: [8, 2], up: 10, actions: [...HSD] },
      { type: 'decision', player: [5, 4], up: 4, actions: [...HSD] },
      { type: 'decision', player: [6, 3], up: 2, actions: [...HSD] },
      { type: 'decision', player: [7, 3], up: 5, actions: [...HSD] },
      { type: 'decision', player: [8, 3], up: 10, actions: [...HSD] },
      { type: 'decision', player: [2, 3, 6], up: 6, actions: [...HSD], explain: 'Three cards — doubling is off the table, so hit 11.' },
      { type: 'decision', player: [5, 4], up: 7, actions: [...HSD] },
    ],
  },
];
