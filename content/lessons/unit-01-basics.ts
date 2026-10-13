import type { Lesson } from './types';

export const unit1: Lesson[] = [
  {
    id: 'u1-values',
    unit: 1,
    title: 'Cards and totals',
    summary: 'What every card is worth, and why aces are special.',
    cards: [
      {
        title: 'Counting up a hand',
        body:
          'In blackjack only the number matters — suits never do. Cards **2 through 9** are worth their number.\n\n' +
          '**10, Jack, Queen and King** are all worth 10. A third of the deck is worth 10, which is why "assume the next card is a 10" is a handy instinct.',
        visual: { player: ['K', 7] },
      },
      {
        title: 'Aces flex',
        body:
          'An **ace** counts as 11 or 1 — whichever helps you. Ace + 6 is 17, but if you take another card and get a 9, the ace drops to 1 and you have 16, not 26.\n\n' +
          'A hand where an ace is still counting as 11 is called **soft** ("soft 17"). Every other hand is **hard**.',
        visual: { player: ['A', 6] },
      },
    ],
    questions: [
      { type: 'choice', prompt: 'What is this hand worth?', visual: { player: ['Q', 8] }, options: ['16', '18', '19', '28'], answer: 1, explain: 'Queen = 10, plus 8 = 18.' },
      { type: 'choice', prompt: 'What is this hand worth?', visual: { player: ['A', 9] }, options: ['10', 'Soft 20', 'Hard 20', '21'], answer: 1, explain: 'Ace as 11 + 9 = 20, and because the ace is still 11 it\'s a soft 20.' },
      { type: 'choice', prompt: 'What is this hand worth?', visual: { player: ['A', 6, 9] }, options: ['26 — bust', 'Soft 16', 'Hard 16', '17'], answer: 2, explain: 'Counting the ace as 11 would make 26, so it counts as 1: 1 + 6 + 9 = hard 16.' },
      { type: 'choice', prompt: 'What is this hand worth?', visual: { player: ['A', 'A', 8] }, options: ['Soft 20', '10', 'Hard 30', 'Soft 12'], answer: 0, explain: 'One ace counts 11, the other counts 1: 11 + 1 + 8 = soft 20.' },
      { type: 'choice', prompt: 'Which of these is a soft hand?', options: ['K + 7', '9 + 8', 'A + 5', 'A + 5 + 10'], answer: 2, explain: 'A + 5 is soft 16 — the ace still counts as 11. Add a 10 and it becomes hard 16.' },
      { type: 'choice', prompt: 'What is this hand worth?', visual: { player: [10, 'J', 'A'] }, options: ['21', 'Soft 21', '31 — bust', '11'], answer: 0, explain: '10 + 10 = 20, and the ace has to count as 1: 21. Not a blackjack — that needs exactly two cards.' },
    ],
  },
  {
    id: 'u1-goal',
    unit: 1,
    title: 'The goal: beat the dealer',
    summary: 'Winning, busting, and pushing.',
    cards: [
      {
        title: 'You vs. the dealer',
        body:
          'Everyone at the table plays against the dealer, not against each other. You win by finishing **closer to 21 than the dealer** without going over.\n\n' +
          'Go over 21 and you **bust** — you lose right away, even if the dealer busts later. That one rule is the whole house advantage.',
      },
      {
        title: 'Pushes',
        body:
          'If you and the dealer finish on the same total, it\'s a **push**: nobody wins and your bet comes back.\n\n' +
          'If the dealer busts, every player who hasn\'t busted wins.',
        visual: { dealer: [10, 8], player: [9, 9] },
      },
    ],
    questions: [
      { type: 'choice', prompt: 'You have 19. The dealer finishes with 18. What happens?', options: ['You win', 'Push', 'You lose'], answer: 0, explain: '19 is closer to 21 than 18 — you win.' },
      { type: 'choice', prompt: 'You hit 15 and draw a 9 (24). Later the dealer busts too. What happens?', options: ['You win', 'Push', 'You lose'], answer: 2, explain: 'You busted first, so your bet was already lost. The player always acts before the dealer — that\'s the house edge.' },
      { type: 'choice', prompt: 'You stand on 20 and the dealer makes 20. What happens?', options: ['You win', 'Push — bet returned', 'You lose'], answer: 1, explain: 'Equal totals are a push.' },
      { type: 'choice', prompt: 'You stand on 13. The dealer draws to 23. What happens?', options: ['You win', 'Push', 'You lose'], answer: 0, explain: 'The dealer busted and you didn\'t — you win, even with a weak total.' },
      { type: 'choice', prompt: 'Who are you trying to beat?', options: ['The other players', 'The dealer', 'Everyone at the table'], answer: 1, explain: 'Each player plays their own hand against the dealer.' },
    ],
  },
  {
    id: 'u1-blackjack',
    unit: 1,
    title: 'Blackjack and the dealer\'s rules',
    summary: 'Naturals, and why the dealer has no choices.',
    cards: [
      {
        title: 'A natural',
        body:
          'An ace plus any 10-value card **as your first two cards** is a **blackjack**. It beats every other 21 and usually pays **3 to 2** — $15 on a $10 bet.\n\n' +
          'If the dealer also has blackjack, it\'s a push.',
        visual: { player: ['A', 'K'] },
      },
      {
        title: 'The dealer plays by rules',
        body:
          'The dealer makes no decisions. They **hit until they reach 17 or more**, then stand. Most tables say whether the dealer stands or hits on a soft 17 — it\'s printed on the felt.\n\n' +
          'Because the dealer\'s play is fixed, you can know the best response to every hand. That\'s **basic strategy**, and it\'s what this app teaches.',
      },
    ],
    questions: [
      { type: 'choice', prompt: 'Which hand is a blackjack?', options: ['7 + 7 + 7', 'A + Q', 'A + 5 + 5', '10 + J + A'], answer: 1, explain: 'Only an ace and a 10-value card as the first two cards count as blackjack.' },
      { type: 'choice', prompt: 'You bet $20 and get blackjack at a 3:2 table. How much do you win?', options: ['$20', '$24', '$30', '$40'], answer: 2, explain: '3:2 means $3 for every $2 bet: $20 × 1.5 = $30.' },
      { type: 'choice', prompt: 'The dealer has 16. What must they do?', visual: { dealer: [10, 6] }, options: ['Stand', 'Hit', 'It depends on your hand'], answer: 1, explain: 'Dealers hit anything under 17 no matter what you have.' },
      { type: 'choice', prompt: 'The dealer has hard 17. What do they do?', visual: { dealer: [10, 7] }, options: ['Stand', 'Hit'], answer: 0, explain: 'At 17 or more (hard), the dealer always stands.' },
      { type: 'choice', prompt: 'You have blackjack and so does the dealer. Result?', options: ['You win 3:2', 'Push', 'You lose'], answer: 1, explain: 'Two blackjacks push.' },
      { type: 'choice', prompt: 'Your first two cards are 10 and 5, then you draw a 6 for 21. Does that pay 3:2?', options: ['Yes', 'No — it\'s a regular 21 paying 1:1'], answer: 1, explain: 'Blackjack needs exactly two cards. A three-card 21 pays even money if it wins.' },
    ],
  },
];
