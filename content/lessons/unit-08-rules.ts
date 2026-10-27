import type { Lesson } from './types';

export const unit8: Lesson[] = [
  {
    id: 'u8-h17',
    unit: 8,
    title: 'S17 vs H17',
    summary: 'What changes when the dealer hits soft 17.',
    cards: [
      {
        title: 'A small rule, a few new plays',
        body:
          'When the dealer **hits soft 17**, they bust a bit more often but also make more strong hands. It costs players about **0.2%**.\n\n' +
          'Your strategy shifts in a handful of spots: **double 11 vs A**, **double A,7 vs 2** and **double A,8 vs 6**. (At the rare tables with surrender, a few more hands against an ace become surrenders.)',
      },
      {
        title: 'Check the felt',
        body:
          'The rule is printed on the table: "Dealer stands on all 17s" or "Dealer hits soft 17". Set it in Settings and the chart and coach switch over.',
      },
    ],
    questions: [
      { type: 'decision', player: [7, 4], up: 'A', rules: { dealerHitsSoft17: true } },
      { type: 'decision', player: ['A', 7], up: 2, rules: { dealerHitsSoft17: true } },
      { type: 'decision', player: ['A', 8], up: 6, rules: { dealerHitsSoft17: true } },
      { type: 'decision', player: [6, 5], up: 'A', prompt: 'Now at an S17 table:' },
      { type: 'decision', player: ['A', 7], up: 2, prompt: 'Now at an S17 table:' },
      { type: 'choice', prompt: 'Which rule is better for the player?', options: ['Dealer stands on soft 17 (S17)', 'Dealer hits soft 17 (H17)'], answer: 0, explain: 'S17 is worth about 0.2% to the player.' },
    ],
  },
  {
    id: 'u8-payouts',
    unit: 8,
    title: '3:2 vs 6:5',
    summary: 'The rule that matters more than any other.',
    cards: [
      {
        title: 'The silent tax',
        body:
          'A blackjack at **3:2** pays $15 on $10. At **6:5** it pays $12. You get a blackjack about once every 21 hands, so 6:5 adds roughly **1.4%** to the house edge — almost tripling it at an otherwise good table.\n\n' +
          'Basic strategy doesn\'t change. The game just gets much worse.',
      },
    ],
    questions: [
      { type: 'choice', prompt: '$20 bet, blackjack at 6:5. You win…', options: ['$20', '$24', '$30'], answer: 1, explain: '$20 × 1.2 = $24 (it would be $30 at 3:2).' },
      { type: 'choice', prompt: 'Roughly how much does 6:5 add to the house edge?', options: ['0.1%', '0.5%', '1.4%', '10%'], answer: 2, explain: 'About 1.4% — the single most expensive common rule.' },
      { type: 'choice', prompt: 'Does basic strategy change at a 6:5 table?', options: ['Yes, a lot', 'No'], answer: 1, explain: 'The payout only changes how much a blackjack is worth, not how to play hands.' },
      { type: 'choice', prompt: 'Over 100 blackjacks at $10, how much less does 6:5 pay than 3:2?', options: ['$30', '$100', '$300', '$1,000'], answer: 2, explain: '$3 less per blackjack × 100 = $300.' },
      { type: 'choice', prompt: 'Which table is better for the player?', options: ['3:2 with H17', '6:5 with S17'], answer: 0, explain: 'H17 costs about 0.2%; 6:5 costs about 1.4%.' },
    ],
  },
  {
    id: 'u8-other',
    unit: 8,
    title: 'Decks, DAS, peek and more',
    summary: 'How other rules move the edge and your strategy.',
    cards: [
      {
        title: 'Rules that help you',
        body:
          '**Fewer decks** (single and double deck pay better per hand), **double after split (DAS)**, **late surrender**, **resplitting aces**, and **3:2 blackjack** all help the player.\n\n' +
          'With fewer decks you double a bit more often — try switching the chart to 1 or 2 decks.',
      },
      {
        title: 'No peek? Play tighter',
        body:
          'In European no-hole-card games the dealer doesn\'t check for blackjack. If they have one, you lose doubles and splits too. So you **don\'t double 11 vs a 10 or ace**, and **don\'t split aces or 8s against an ace** (or 8s vs a 10).',
      },
    ],
    questions: [
      { type: 'decision', player: [6, 5], up: 10, rules: { dealerPeek: false, lateSurrender: false } },
      { type: 'decision', player: ['A', 'A'], up: 'A', rules: { dealerPeek: false, lateSurrender: false } },
      { type: 'decision', player: [8, 8], up: 10, rules: { dealerPeek: false, lateSurrender: false } },
      { type: 'decision', player: [8, 8], up: 6, rules: { dealerPeek: false, lateSurrender: false } },
      { type: 'choice', prompt: 'Which helps the player?', options: ['More decks', 'Double after split allowed', '6:5 blackjack', 'Dealer hits soft 17'], answer: 1, explain: 'DAS lets you press good split hands. The others favor the house.' },
      { type: 'choice', prompt: 'Without DAS, what happens to 4,4 vs 5?', options: ['Still split', 'Play it as hard 8 — hit', 'Surrender'], answer: 1, explain: 'Splitting 4s only pays when you can double the hands that follow.' },
      { type: 'choice', prompt: 'Generally, fewer decks are…', options: ['Better for the player', 'Better for the house', 'No different'], answer: 0, explain: 'Each removed deck shifts the edge slightly toward the player (all else equal).' },
    ],
  },
];
