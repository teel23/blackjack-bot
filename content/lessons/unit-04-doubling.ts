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

unit4.push(
  {
    id: 'u4-double-soft',
    unit: 4,
    title: 'Soft doubles',
    summary: 'Doubling ace hands against a weak dealer.',
    cards: [
      {
        title: 'A free swing',
        body:
          'A soft hand can\'t bust on one card, so when the dealer shows a weak 3–6 you can double many ace hands and lose very little when the card is bad.\n\n' +
          'The weaker the dealer and the bigger your soft total, the wider the doubling range.',
        visual: { dealer: [5, 'K'], hole: true, player: ['A', 4] },
      },
      {
        title: 'The soft doubling pattern',
        body:
          '**A,2 and A,3**: double vs 5–6. **A,4 and A,5**: double vs 4–6. **A,6**: double vs 3–6. **A,7**: double vs 3–6 (on more cards, stand).\n\n' +
          'Everything else with A,2–A,6: hit. Never stand on soft 17 or less.',
      },
    ],
    questions: [
      { type: 'decision', player: ['A', 2], up: 5, actions: ['hit', 'stand', 'double'] },
      { type: 'decision', player: ['A', 4], up: 4, actions: ['hit', 'stand', 'double'] },
      { type: 'decision', player: ['A', 3], up: 4, actions: ['hit', 'stand', 'double'] },
      { type: 'decision', player: ['A', 6], up: 3, actions: ['hit', 'stand', 'double'] },
      { type: 'decision', player: ['A', 5], up: 7, actions: ['hit', 'stand', 'double'] },
      { type: 'decision', player: ['A', 7], up: 5, actions: ['hit', 'stand', 'double'] },
      { type: 'decision', player: ['A', 6], up: 2, actions: ['hit', 'stand', 'double'] },
      { type: 'decision', player: ['A', 2], up: 6, actions: ['hit', 'stand', 'double'] },
    ],
  },
  {
    id: 'u4-double-review',
    unit: 4,
    title: 'When not to double',
    summary: 'Strong dealer cards, extra cards, and the 11-vs-ace trap.',
    cards: [
      {
        title: 'Hold back against strength',
        body:
          'Against a **10 or ace**, the dealer is too strong to double 10 into. **11 vs an ace** is a hit at a 6-deck S17 table — close, but hitting wins slightly more.\n\n' +
          'And once you have three cards, doubling is gone: a "double" spot becomes a hit (or a stand for soft 18).',
        visual: { dealer: ['A', 9], hole: true, player: [7, 4] },
      },
    ],
    questions: [
      { type: 'decision', player: [6, 4], up: 10, actions: ['hit', 'stand', 'double'] },
      { type: 'decision', player: [8, 3], up: 'A', actions: ['hit', 'stand', 'double'] },
      { type: 'decision', player: [6, 3], up: 2, actions: ['hit', 'stand', 'double'] },
      { type: 'decision', player: [7, 2], up: 7, actions: ['hit', 'stand', 'double'] },
      { type: 'decision', player: [7, 3], up: 9, actions: ['hit', 'stand', 'double'] },
      { type: 'decision', player: ['A', 7], up: 2, actions: ['hit', 'stand', 'double'], explain: 'At S17 tables soft 18 vs 2 is a stand — the next unit covers A,7 in depth.' },
      { type: 'decision', player: [4, 5, 2], up: 6, actions: ['hit', 'stand', 'double'] },
      { type: 'decision', player: ['A', 8], up: 6, actions: ['hit', 'stand', 'double'], explain: 'Soft 19 stands against a 6 at S17 tables (some H17 tables double it).' },
    ],
  },
);
