import type { Lesson } from './types';

export const unit6: Lesson[] = [
  {
    id: 'u6-always',
    unit: 6,
    title: 'Always split aces and 8s',
    summary: 'Two rules that never change.',
    cards: [
      {
        title: 'Aces: two great starts',
        body:
          'A,A is either 2 or soft 12 — a mediocre hand. Split it and you get **two hands that each start with an ace**. Most casinos give split aces only one card each, and it\'s still a big win.',
        visual: { player: ['A', 'A'] },
      },
      {
        title: '8s: escape 16',
        body:
          '8,8 is **16, the worst total in the game**. Split it into two hands starting at 8. Against a 10 or ace you\'ll still lose money on average — just less than you\'d lose playing 16.',
        visual: { dealer: ['K', 6], hole: true, player: [8, 8] },
      },
    ],
    questions: [
      { type: 'decision', player: ['A', 'A'], up: 6 },
      { type: 'decision', player: [8, 8], up: 10 },
      { type: 'decision', player: ['A', 'A'], up: 10 },
      { type: 'decision', player: [8, 8], up: 'A' },
      { type: 'decision', player: [8, 8], up: 7 },
      { type: 'decision', player: ['A', 'A'], up: 'A' },
      { type: 'decision', player: [8, 8], up: 9 },
    ],
  },
  {
    id: 'u6-never',
    unit: 6,
    title: 'Never split 10s or 5s',
    summary: 'Keep 20. Treat 5,5 as 10. 4s only with DAS vs 5–6.',
    cards: [
      {
        title: 'Don\'t break up 20',
        body:
          'Two 10-value cards make **20, which wins about 80% of the time it stands**. Splitting trades a near-sure win for two hands starting at 10. **Never split tens** — K,Q included.',
        visual: { player: ['K', 'Q'] },
      },
      {
        title: '5,5 is a 10',
        body:
          'Two 5s are a great **hard 10** — double it against 2–9, hit vs 10 or ace. Split them and you get two hands starting at 5, which is terrible.\n\n' +
          '**4,4** is hard 8: just hit, except split against 5 or 6 when you can double after splitting.',
      },
    ],
    questions: [
      { type: 'decision', player: [10, 10], up: 6 },
      { type: 'decision', player: ['K', 'Q'], up: 5 },
      { type: 'decision', player: [5, 5], up: 6 },
      { type: 'decision', player: [5, 5], up: 10 },
      { type: 'decision', player: [4, 4], up: 5 },
      { type: 'decision', player: [4, 4], up: 8 },
      { type: 'decision', player: ['J', 'J'], up: 'A' },
      { type: 'decision', player: [5, 5], up: 9 },
    ],
  },
  {
    id: 'u6-rest',
    unit: 6,
    title: 'The rest of the pairs',
    summary: '2s, 3s, 6s, 7s and 9s.',
    cards: [
      {
        title: 'Split into weakness',
        body:
          '**2,2 and 3,3**: split vs 2–7. **6,6**: split vs 2–6. **7,7**: split vs 2–7. Against stronger cards, play them as hard totals.\n\n' +
          'These splits work because the dealer is likely to bust and doubling after a split lets you press good draws.',
      },
      {
        title: '9s are the odd ones',
        body:
          '**9,9 (18)**: split vs 2–6 and 8–9. **Stand vs 7** — the dealer\'s most likely finish is 17, which your 18 beats. Stand vs 10 and ace too.',
        visual: { dealer: [7, 'K'], hole: true, player: [9, 9] },
      },
    ],
    questions: [
      { type: 'decision', player: [2, 2], up: 7 },
      { type: 'decision', player: [3, 3], up: 8 },
      { type: 'decision', player: [6, 6], up: 2 },
      { type: 'decision', player: [6, 6], up: 7 },
      { type: 'decision', player: [7, 7], up: 7 },
      { type: 'decision', player: [7, 7], up: 8 },
      { type: 'decision', player: [9, 9], up: 7 },
      { type: 'decision', player: [9, 9], up: 8 },
      { type: 'decision', player: [9, 9], up: 'A' },
      { type: 'decision', player: [2, 2], up: 3 },
    ],
  },
];
