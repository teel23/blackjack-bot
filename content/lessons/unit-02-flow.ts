import type { Lesson } from './types';

export const unit2: Lesson[] = [
  {
    id: 'u2-deal',
    unit: 2,
    title: 'Betting and the deal',
    summary: 'Bet first, then two cards each — one dealer card stays hidden.',
    cards: [
      {
        title: 'Bet before you see cards',
        body:
          'Every round starts with a bet inside the table\'s **minimum and maximum**. Once cards come out, your bet is locked in — you can only add to it by doubling or splitting.',
      },
      {
        title: 'The deal',
        body:
          'You get two cards face up. The dealer gets one card face up — the **upcard** — and one face down, the **hole card**.\n\n' +
          'Every strategy decision you make is based on two things: **your total** and the **dealer\'s upcard**.',
        visual: { dealer: [9, 'K'], hole: true, player: [10, 6] },
      },
      {
        title: 'Your options',
        body:
          '**Hit** — take a card. **Stand** — keep what you have. **Double** — double your bet, take exactly one card. **Split** — turn a pair into two hands. **Surrender** — give up half your bet (where offered).\n\n' +
          'Some options are only allowed on your first two cards. The app greys out anything you can\'t do.',
      },
    ],
    questions: [
      { type: 'choice', prompt: 'What two things decide the right play?', options: ['Your total and the dealer\'s upcard', 'Your total and your bet size', 'The dealer\'s hole card and your total', 'How the last hand went'], answer: 0, explain: 'You can\'t see the hole card, and past hands don\'t change the odds of this one.' },
      { type: 'choice', prompt: 'In this picture, what is the dealer\'s upcard?', visual: { dealer: [9, 'K'], hole: true, player: [10, 6] }, options: ['9', 'King', '19', 'Can\'t tell'], answer: 0, explain: 'The face-up card is the upcard — a 9. The hole card stays hidden until you finish.' },
      { type: 'choice', prompt: 'You want to double your bet and take exactly one more card. That\'s…', options: ['Splitting', 'Doubling down', 'Insurance', 'Surrender'], answer: 1, explain: 'Doubling down: twice the bet, one card, no more choices.' },
      { type: 'choice', prompt: 'Which option gives back half your bet and ends the hand?', options: ['Stand', 'Split', 'Surrender', 'Push'], answer: 2, explain: 'Late surrender returns half your bet. Not every casino offers it.' },
      { type: 'choice', prompt: 'Can you raise your bet after seeing your first two cards?', options: ['Yes, any time', 'Only by doubling or splitting', 'Only if you\'re winning'], answer: 1, explain: 'Doubling and splitting are the only ways to put more money out mid-hand.' },
    ],
  },
  {
    id: 'u2-dealer',
    unit: 2,
    title: 'Peek, soft 17, and the dealer',
    summary: 'How the dealer checks for blackjack and plays out a hand.',
    cards: [
      {
        title: 'The peek',
        body:
          'When the upcard is an **ace or a 10**, most US dealers **peek** at the hole card before you act. If it\'s a blackjack, the hand ends right there and you only lose your original bet.\n\n' +
          'If the dealer doesn\'t peek (common in Europe), a dealer blackjack found later can take your doubles and splits too — so you play more cautiously.',
        visual: { dealer: ['A', 'K'], hole: true },
      },
      {
        title: 'S17 vs H17',
        body:
          'Read the felt: **"Dealer stands on all 17s" (S17)** or **"Dealer hits soft 17" (H17)**. Hitting soft 17 helps the dealer a little, which nudges a few of your decisions.\n\n' +
          'This app defaults to S17. You can change the rules in Settings and the strategy chart updates to match.',
      },
    ],
    questions: [
      { type: 'choice', prompt: 'The dealer shows a 10 and peeks — it\'s a blackjack. You bet $10 and had 18. What do you lose?', options: ['$0', '$10', '$20'], answer: 1, explain: 'The hand ends immediately. You only lose your original bet.' },
      { type: 'choice', prompt: 'Which upcards make a peeking dealer check for blackjack?', options: ['Any upcard', 'Ace or 10-value', 'Only an ace', '7 or higher'], answer: 1, explain: 'Only an ace or a 10-value card can complete a blackjack.' },
      { type: 'choice', prompt: 'Dealer has A + 6 (soft 17) at an S17 table. What do they do?', visual: { dealer: ['A', 6] }, options: ['Stand', 'Hit'], answer: 0, explain: 'S17 = stands on all 17s, soft ones included.' },
      { type: 'choice', prompt: 'Dealer has A + 6 at an H17 table. What do they do?', visual: { dealer: ['A', 6] }, options: ['Stand', 'Hit'], answer: 1, explain: 'H17 dealers hit soft 17.' },
      { type: 'choice', prompt: 'Dealer has 6 + 5 + 4. What do they do?', visual: { dealer: [6, 5, 4] }, options: ['Stand on 15', 'Hit'], answer: 1, explain: 'Under 17, the dealer always hits.' },
      { type: 'choice', prompt: 'Why does a dealer who doesn\'t peek change your strategy?', options: ['It doesn\'t', 'A hidden dealer blackjack can take doubles and splits', 'You can see the hole card'], answer: 1, explain: 'Without a peek, money you add by doubling or splitting is at risk to a blackjack.' },
    ],
  },
  {
    id: 'u2-payouts',
    unit: 2,
    title: 'Payouts and insurance',
    summary: 'What each result pays — and what insurance really is.',
    cards: [
      {
        title: 'What things pay',
        body:
          'A regular win pays **1 to 1** (bet $10, win $10). A blackjack pays **3 to 2** ($15 on $10) at good tables, or **6 to 5** ($12) at worse ones. A push returns your bet.\n\n' +
          'Doubled hands win or lose twice the bet. Surrender costs half.',
      },
      {
        title: 'Insurance is a side bet',
        body:
          'When the dealer shows an ace you\'re offered **insurance**: a side bet of up to half your bet that pays **2 to 1** if the hole card is a 10.\n\n' +
          'It sounds like protection, but it\'s just a bet that the next card is a 10 — and that\'s true less than a third of the time. We\'ll do the math in unit 7. For now: **basic strategy never takes insurance.**',
        visual: { dealer: ['A', 'K'], hole: true },
      },
    ],
    questions: [
      { type: 'choice', prompt: 'You bet $25 and win a normal hand. How much do you win?', options: ['$12.50', '$25', '$37.50', '$50'], answer: 1, explain: 'Regular wins pay 1:1.' },
      { type: 'choice', prompt: 'You bet $10 and get blackjack at a 6:5 table. You win…', options: ['$10', '$12', '$15', '$20'], answer: 1, explain: '6:5 pays $6 per $5: $10 × 1.2 = $12. At 3:2 you\'d get $15.' },
      { type: 'choice', prompt: 'You double a $10 bet and win. How much do you win?', options: ['$10', '$15', '$20', '$30'], answer: 2, explain: 'Your bet became $20, and it pays 1:1.' },
      { type: 'choice', prompt: 'Insurance pays…', options: ['1 to 1', '3 to 2', '2 to 1', '6 to 5'], answer: 2, explain: 'Insurance pays 2:1 — but it wins less than a third of the time.' },
      { type: 'choice', prompt: 'You bet $10. Max insurance is…', options: ['$5', '$10', '$20'], answer: 0, explain: 'Insurance is capped at half your original bet.' },
      { type: 'choice', prompt: 'You surrender a $20 bet. You get back…', options: ['$0', '$10', '$20'], answer: 1, explain: 'Surrender returns half.' },
    ],
  },
];
