import type { Lesson } from './types';

const HS = ['hit', 'stand'] as const;

export const unit3: Lesson[] = [
  {
    id: 'u3-stiffs',
    unit: 3,
    title: 'Stiff hands and bust cards',
    summary: 'Hard 13–16: stand against 2–6, hit against 7–A.',
    cards: [
      {
        title: 'Stiff hands',
        body:
          'Hard **12 through 16** are "stiff" hands: one more card might bust you, but they rarely win as they are. Most of blackjack is deciding what to do with them.',
        visual: { player: [10, 6] },
      },
      {
        title: 'Read the upcard',
        body:
          'A dealer showing **2, 3, 4, 5 or 6** has to draw at least once more and **busts often** — about 35–42% of the time. Those are "bust cards".\n\n' +
          'A dealer showing **7 through ace** usually finishes on 17 or better.\n\n' +
          'So with 13–16: **stand against 2–6**, let the dealer take the risk. **Hit against 7–A** — standing would mostly lose anyway.',
        visual: { dealer: [6, 'K'], hole: true, player: [10, 5] },
      },
    ],
    questions: [
      { type: 'decision', player: [10, 6], up: 5, actions: [...HS] },
      { type: 'decision', player: [9, 5], up: 9, actions: [...HS] },
      { type: 'decision', player: [8, 5], up: 3, actions: [...HS] },
      { type: 'decision', player: [10, 5], up: 7, actions: [...HS] },
      { type: 'decision', player: [9, 7], up: 2, actions: [...HS] },
      { type: 'decision', player: [10, 4], up: 'A', actions: [...HS] },
      { type: 'decision', player: [7, 6], up: 6, actions: [...HS] },
      { type: 'decision', player: [9, 6], up: 'K', actions: [...HS], explain: '15 against a 10 is a hit — a 10 up is too strong to stand against.' },
    ],
  },
  {
    id: 'u3-twelve',
    unit: 3,
    title: 'Hard 12, and the easy ones',
    summary: '12 is special; 11 or less always hits; 17+ always stands.',
    cards: [
      {
        title: 'The easy ones',
        body:
          'With **11 or less**, no card can bust you — always take one (or double; that\'s next unit).\n\n' +
          'With **hard 17 or more**, stand. Too many cards bust you and the dealer has to beat 17.',
      },
      {
        title: '12 is the exception',
        body:
          'Only a 10-value card busts 12, so hitting is less risky than with 13–16. Against a **2 or 3**, the dealer isn\'t weak enough — **hit 12**. Against **4, 5 or 6**, stand. Against 7–A, hit like any stiff.',
        visual: { dealer: [3, 'Q'], hole: true, player: [10, 2] },
      },
    ],
    questions: [
      { type: 'decision', player: [10, 2], up: 2, actions: [...HS] },
      { type: 'decision', player: [7, 5], up: 4, actions: [...HS] },
      { type: 'decision', player: [9, 3], up: 3, actions: [...HS] },
      { type: 'decision', player: [8, 4], up: 6, actions: [...HS] },
      { type: 'decision', player: [10, 7], up: 'A', actions: [...HS] },
      { type: 'decision', player: [5, 4], up: 10, actions: [...HS] },
      { type: 'decision', player: [10, 8], up: 9, actions: [...HS] },
      { type: 'decision', player: [6, 6], up: 7, actions: [...HS], prompt: 'Treat this pair as hard 12 (splitting comes later).' },
    ],
  },
  {
    id: 'u3-review',
    unit: 3,
    title: 'Hard totals review',
    summary: 'Mixed hit-or-stand practice on every hard total.',
    cards: [
      {
        title: 'The whole picture',
        body:
          '**≤11** always hit. **12**: stand only vs 4–6. **13–16**: stand vs 2–6, hit vs 7–A. **17+**: stand.\n\n' +
          'That\'s every hard hand when your only options are hit or stand. Ten quick ones to lock it in.',
      },
    ],
    questions: [
      { type: 'decision', player: [10, 3], up: 2, actions: [...HS] },
      { type: 'decision', player: [9, 2], up: 'A', actions: [...HS] },
      { type: 'decision', player: [10, 6], up: 7, actions: [...HS] },
      { type: 'decision', player: [8, 4], up: 3, actions: [...HS] },
      { type: 'decision', player: [7, 7], up: 5, actions: [...HS], prompt: 'Play it as hard 14.' },
      { type: 'decision', player: [10, 2, 5], up: 8, actions: [...HS] },
      { type: 'decision', player: [3, 4, 9], up: 4, actions: [...HS] },
      { type: 'decision', player: [10, 2], up: 5, actions: [...HS] },
      { type: 'decision', player: [8, 7], up: 'A', actions: [...HS] },
      { type: 'decision', player: [6, 5, 6], up: 10, actions: [...HS] },
    ],
  },
];
