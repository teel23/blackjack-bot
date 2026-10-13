import type { Lesson } from './types';

const HSD = ['hit', 'stand', 'double'] as const;

export const unit5: Lesson[] = [
  {
    id: 'u5-soft-basics',
    unit: 5,
    title: 'What "soft" really means',
    summary: 'Soft 17 or less never stands; soft 19+ always does.',
    cards: [
      {
        title: 'A safety net',
        body:
          'In a soft hand the ace can drop from 11 to 1, so **one card can never bust you**. That makes hitting cheap.\n\n' +
          'Soft 17 (A,6) feels like 17 but it\'s weak — the dealer stands on 17 and you can only tie or lose to it. **Never stand on soft 17 or less.**',
        visual: { player: ['A', 6] },
      },
      {
        title: 'When to stop',
        body:
          '**Soft 19 and soft 20 stand** (A,8 and A,9) — already strong. Soft 18 is the tricky one; it gets its own lesson next.\n\n' +
          'Multi-card soft hands follow the same rules: A,2,4 is soft 17 — hit it.',
      },
    ],
    questions: [
      { type: 'decision', player: ['A', 6], up: 7, actions: [...HSD] },
      { type: 'decision', player: ['A', 3], up: 9, actions: [...HSD] },
      { type: 'decision', player: ['A', 8], up: 10, actions: [...HSD] },
      { type: 'decision', player: ['A', 9], up: 6, actions: [...HSD] },
      { type: 'decision', player: ['A', 2, 4], up: 4, actions: [...HSD], explain: 'Three cards — no doubling — so soft 17 just hits.' },
      { type: 'decision', player: ['A', 5], up: 2, actions: [...HSD] },
      { type: 'decision', player: ['A', 6], up: 10, actions: [...HSD] },
      { type: 'decision', player: ['A', 8], up: 2, actions: [...HSD] },
    ],
  },
  {
    id: 'u5-a7',
    unit: 5,
    title: 'A,7: the trickiest hand',
    summary: 'Stand, double, or hit soft 18 — it depends on the upcard.',
    cards: [
      {
        title: 'Three answers for one hand',
        body:
          'Soft 18 is good but not great. Against a **2, 7 or 8** it already matches or beats the dealer\'s usual finish — **stand**.\n\n' +
          'Against **3–6** the dealer is weak enough to **double** (if you can\'t, stand).\n\n' +
          'Against **9, 10 or ace**, 18 is an underdog — **hit**. You can\'t bust on one card, and you might improve.',
        visual: { dealer: [9, 'K'], hole: true, player: ['A', 7] },
      },
    ],
    questions: [
      { type: 'decision', player: ['A', 7], up: 2, actions: [...HSD] },
      { type: 'decision', player: ['A', 7], up: 3, actions: [...HSD] },
      { type: 'decision', player: ['A', 7], up: 6, actions: [...HSD] },
      { type: 'decision', player: ['A', 7], up: 7, actions: [...HSD] },
      { type: 'decision', player: ['A', 7], up: 8, actions: [...HSD] },
      { type: 'decision', player: ['A', 7], up: 9, actions: [...HSD] },
      { type: 'decision', player: ['A', 7], up: 'K', actions: [...HSD] },
      { type: 'decision', player: ['A', 7], up: 'A', actions: [...HSD] },
      { type: 'decision', player: ['A', 3, 4], up: 5, actions: [...HSD], explain: 'Soft 18 on three cards vs a 5: you\'d double, but you can\'t — so stand.' },
      { type: 'decision', player: ['A', 2, 5], up: 10, actions: [...HSD] },
    ],
  },
  {
    id: 'u5-review',
    unit: 5,
    title: 'Soft hands review',
    summary: 'Mixed soft decisions, including three-card hands.',
    cards: [
      {
        title: 'Soft hands in one breath',
        body:
          '**A,2–A,6**: hit, but double against the weak cards from the last unit. **A,7**: stand vs 2, 7, 8 · double vs 3–6 · hit vs 9–A. **A,8, A,9**: stand.\n\n' +
          'On three or more cards, a "double" becomes hit — except soft 18, which stands.',
      },
    ],
    questions: [
      { type: 'decision', player: ['A', 2], up: 4, actions: [...HSD] },
      { type: 'decision', player: ['A', 4], up: 5, actions: [...HSD] },
      { type: 'decision', player: ['A', 6], up: 6, actions: [...HSD] },
      { type: 'decision', player: ['A', 7], up: 8, actions: [...HSD] },
      { type: 'decision', player: ['A', 8], up: 6, actions: [...HSD] },
      { type: 'decision', player: ['A', 5, 'A'], up: 3, actions: [...HSD] },
      { type: 'decision', player: ['A', 7], up: 'A', actions: [...HSD] },
      { type: 'decision', player: ['A', 9], up: 10, actions: [...HSD] },
      { type: 'decision', player: ['A', 'A', 6], up: 9, actions: [...HSD] },
    ],
  },
];
