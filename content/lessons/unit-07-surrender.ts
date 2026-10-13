import type { Lesson } from './types';

export const unit7: Lesson[] = [
  {
    id: 'u7-surrender',
    unit: 7,
    title: 'Late surrender',
    summary: 'Give up half on 16 vs 9–A and 15 vs 10.',
    cards: [
      {
        title: 'Losing less is winning',
        body:
          'Some hands lose more than half the time no matter what you do. With **late surrender** you give up half your bet right away — after the dealer has checked for blackjack — and the hand is over.\n\n' +
          'It only makes sense when your expected loss is worse than 50¢ on the dollar.',
      },
      {
        title: 'The surrender list (6 decks, S17)',
        body:
          '**Hard 16 vs 9, 10 or ace.** **Hard 15 vs 10.** That\'s it.\n\n' +
          'It\'s only allowed as your first decision on two cards — after a hit, a 16 vs 10 just hits. And 8,8 is split, not surrendered (at S17).',
        visual: { dealer: ['K', 7], hole: true, player: [10, 6] },
      },
    ],
    questions: [
      { type: 'decision', player: [10, 6], up: 10 },
      { type: 'decision', player: [9, 7], up: 9 },
      { type: 'decision', player: [10, 6], up: 'A' },
      { type: 'decision', player: [9, 6], up: 'K' },
      { type: 'decision', player: [10, 5], up: 9 },
      { type: 'decision', player: [9, 7], up: 8 },
      { type: 'decision', player: [10, 7], up: 'A' },
      { type: 'decision', player: [4, 2, 10], up: 10, explain: 'Three cards: surrender is gone, so 16 vs 10 hits.' },
      { type: 'decision', player: [10, 4], up: 10 },
    ],
  },
  {
    id: 'u7-insurance',
    unit: 7,
    title: 'Why insurance usually isn\'t',
    summary: 'The math behind the side bet — and even money.',
    cards: [
      {
        title: 'It\'s a bet on one card',
        body:
          'Insurance pays **2 to 1** if the dealer\'s hole card is a 10. To break even, more than **1 in 3** of the unseen cards would need to be tens.\n\n' +
          'A normal shoe is about **4 tens in every 13 cards — about 31%**. Less than a third, so insurance loses money over time: roughly 7¢ per dollar insured in a 6-deck shoe.',
      },
      {
        title: 'Even money is the same bet',
        body:
          'With a blackjack against an ace, the dealer offers **even money** — a guaranteed 1:1 instead of 3:2. That\'s exactly the same as taking insurance on your blackjack.\n\n' +
          'Guaranteed feels nice, but on average keeping the blackjack pays more. Insurance only becomes right for card counters when lots of tens remain (unit 10).',
        visual: { dealer: ['A', 'K'], hole: true, player: ['A', 'Q'] },
      },
    ],
    questions: [
      { type: 'choice', prompt: 'Insurance breaks even when the share of tens left is at least…', options: ['1 in 4', '1 in 3', '1 in 2', 'Any amount'], answer: 1, explain: 'It pays 2:1, so it needs to win 1 time in 3 just to break even.' },
      { type: 'choice', prompt: 'About what share of a normal shoe is 10-value cards?', options: ['About 20%', 'About 31%', 'About 40%', 'About 50%'], answer: 1, explain: '16 of 52 cards — about 31%.' },
      { type: 'choice', prompt: 'You have 20 and the dealer shows an ace. Take insurance?', options: ['Yes — protect the 20', 'No'], answer: 1, explain: 'Your hand doesn\'t change the math. Insurance is a separate bet that loses over time.' },
      { type: 'choice', prompt: 'You have blackjack vs an ace. "Even money" is the same as…', options: ['Surrendering', 'Taking insurance', 'Doubling', 'A push'], answer: 1, explain: 'Even money = insuring your blackjack. Both lock in 1:1.' },
      { type: 'choice', prompt: 'Basic strategy says to take insurance…', options: ['Always with blackjack', 'With 19 or more', 'Never', 'Against an ace only'], answer: 2, explain: 'Without tracking cards, insurance is never the right play.' },
      { type: 'choice', prompt: 'Who can sometimes take insurance profitably?', options: ['Nobody', 'Card counters when many tens remain', 'Players with blackjack', 'High rollers'], answer: 1, explain: 'When the count shows the shoe is rich in tens, insurance can become a good bet.' },
    ],
  },
  {
    id: 'u7-review',
    unit: 7,
    title: 'Surrender & insurance review',
    summary: 'Mixed practice.',
    cards: [
      {
        title: 'Quick recap',
        body:
          'Surrender **16 vs 9, 10, A** and **15 vs 10** on your first two cards. Split 8s (S17). Decline insurance and even money. Everything else: the strategy you already know.',
      },
    ],
    questions: [
      { type: 'decision', player: [9, 7], up: 'A' },
      { type: 'decision', player: [8, 8], up: 10 },
      { type: 'decision', player: [10, 5], up: 10 },
      { type: 'decision', player: [10, 5], up: 'A' },
      { type: 'decision', player: [10, 6], up: 7 },
      { type: 'choice', prompt: 'You\'re dealt A,K and the dealer shows an ace. What\'s the best play?', options: ['Take even money', 'Keep the blackjack'], answer: 1, explain: 'Keeping it pays 3:2 when the dealer doesn\'t have blackjack — worth more on average.' },
      { type: 'decision', player: [7, 3, 6], up: 9 },
      { type: 'choice', prompt: 'When is late surrender allowed?', options: ['Any time', 'Only on your first two cards', 'Only after a split', 'Only against an ace'], answer: 1, explain: 'It has to be your first decision.' },
    ],
  },
];
