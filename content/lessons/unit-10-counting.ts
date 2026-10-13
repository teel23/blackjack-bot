import type { Lesson } from './types';

export const unit10: Lesson[] = [
  {
    id: 'u10-running',
    unit: 10,
    title: 'The running count (Hi-Lo)',
    summary: 'Tracking which cards have left the shoe.',
    cards: [
      {
        title: 'Why counting works at all',
        body:
          'Blackjack is the rare casino game where the past matters: cards that are dealt are gone until the shuffle. A shoe with **lots of 10s and aces left** is better for the player (more blackjacks, better doubles). One full of small cards favors the dealer.',
      },
      {
        title: 'Hi-Lo values',
        body:
          'Give every card you see a value: **2–6 = +1**, **7–9 = 0**, **10, J, Q, K, A = −1**. Add them up as cards come out — that\'s the **running count**. A full deck adds up to zero.\n\n' +
          'This is theory to understand the game — practice it in the counting drill.',
        visual: { row: [5, 'K', 3, 9, 'A', 2] },
      },
    ],
    questions: [
      { type: 'choice', prompt: 'Hi-Lo value of a 4?', options: ['+1', '0', '−1'], answer: 0, explain: '2 through 6 are +1.' },
      { type: 'choice', prompt: 'Hi-Lo value of a Queen?', options: ['+1', '0', '−1'], answer: 2, explain: 'Tens and aces are −1.' },
      { type: 'choice', prompt: 'Hi-Lo value of an 8?', options: ['+1', '0', '−1'], answer: 1, explain: '7, 8 and 9 are neutral.' },
      { type: 'choice', prompt: 'Running count after these cards?', visual: { row: [5, 'K', 3, 9, 'A', 2] }, options: ['−1', '0', '+1', '+2'], answer: 1, explain: '5 (+1), K (−1), 3 (+1), 9 (0), A (−1), 2 (+1) = 0.' },
      { type: 'choice', prompt: 'Running count after these cards?', visual: { row: [2, 6, 4, 'J', 3] }, options: ['+2', '+3', '+4', '+5'], answer: 1, explain: '+1 +1 +1 −1 +1 = +3.' },
      { type: 'choice', prompt: 'Running count after these cards?', visual: { row: ['A', 10, 'K', 7, 'Q'] }, options: ['−4', '−3', '−2', '+4'], answer: 0, explain: 'Four −1s and a neutral 7: −4.' },
      { type: 'choice', prompt: 'A high positive count means the remaining cards are…', options: ['Rich in small cards', 'Rich in 10s and aces', 'Exactly normal'], answer: 1, explain: 'You\'ve seen lots of small cards, so big ones are left.' },
    ],
  },
  {
    id: 'u10-true',
    unit: 10,
    title: 'The true count',
    summary: 'Adjusting for how much of the shoe is left.',
    cards: [
      {
        title: 'Per deck, not in total',
        body:
          'A running count of +6 means a lot more with one deck left than with five. So counters divide by the **decks remaining**: **true count = running count ÷ decks left**.\n\n' +
          '+6 with 3 decks left → true count **+2**. +6 with 1.5 decks left → **+4**.',
      },
      {
        title: 'What the true count does',
        body:
          'Each +1 of true count shifts the edge roughly **0.5% toward the player**. Starting from about −0.5%, the player only has an edge around **+2 or higher** — and counters raise bets then. At +3 or more, insurance starts to pay.',
      },
    ],
    questions: [
      { type: 'choice', prompt: 'Running count +8, 4 decks left. True count?', options: ['+1', '+2', '+4', '+8'], answer: 1, explain: '8 ÷ 4 = +2.' },
      { type: 'choice', prompt: 'Running count +9, 3 decks left. True count?', options: ['+2', '+3', '+6', '+9'], answer: 1, explain: '9 ÷ 3 = +3.' },
      { type: 'choice', prompt: 'Running count −6, 2 decks left. True count?', options: ['−2', '−3', '−6', '+3'], answer: 1, explain: '−6 ÷ 2 = −3.' },
      { type: 'choice', prompt: 'Running count +4, half a deck left. True count?', options: ['+2', '+4', '+8'], answer: 2, explain: '4 ÷ 0.5 = +8 — near the end of the shoe, the count matters more.' },
      { type: 'choice', prompt: 'Roughly when does the player get the edge (from about −0.5%)?', options: ['True count +1', 'True count +2 or so', 'Never'], answer: 1, explain: 'Each +1 is worth about 0.5%, so around +1 to +2 it crosses zero.' },
      { type: 'choice', prompt: 'At a high true count, insurance…', options: ['Is still always bad', 'Can become a good bet', 'Is required'], answer: 1, explain: 'With enough tens left (about +3 true), insurance becomes profitable.' },
    ],
  },
  {
    id: 'u10-reality',
    unit: 10,
    title: 'What counting can and can\'t do',
    summary: 'The honest picture.',
    cards: [
      {
        title: 'A thin, slow edge',
        body:
          'Even skilled counters only get an edge of about **0.5–1%**, and only by betting much more when the count is high. Variance is brutal: long losing stretches are normal, and it takes a very large bankroll to ride them out.',
      },
      {
        title: 'Casinos fight back',
        body:
          'Counting in your head is legal in most places, but casinos can **shuffle early, limit your bets, or ask you to leave**. Continuous shuffling machines make counting useless.\n\n' +
          'This unit is here so you understand the game. Blackjack Bot is a trainer — play money only — and isn\'t a plan to make money.',
      },
    ],
    questions: [
      { type: 'choice', prompt: 'A skilled counter\'s typical edge is about…', options: ['0.5–1%', '10%', '50%'], answer: 0, explain: 'Small edges and big swings.' },
      { type: 'choice', prompt: 'Counting in your head is…', options: ['Illegal everywhere', 'Usually legal, but casinos can refuse your play', 'Always welcome'], answer: 1, explain: 'Using devices is illegal; mental counting isn\'t, but casinos can back you off.' },
      { type: 'choice', prompt: 'A continuous shuffling machine…', options: ['Helps counters', 'Makes counting useless', 'Has no effect'], answer: 1, explain: 'Cards go straight back in, so the count never builds.' },
      { type: 'choice', prompt: 'How does a counter actually win?', options: ['By playing every hand perfectly at a flat bet', 'By betting more when the count is high', 'By predicting the next card'], answer: 1, explain: 'The edge comes from bet sizing, plus a few strategy changes.' },
      { type: 'choice', prompt: 'Even with a small edge, a counter can lose for…', options: ['A few hands at most', 'Weeks or more', 'Never'], answer: 1, explain: 'Variance dwarfs a 1% edge over short stretches.' },
    ],
  },
];
