import type { Lesson } from './types';

export const unit9: Lesson[] = [
  {
    id: 'u9-edge',
    unit: 9,
    title: 'The house edge',
    summary: 'What "0.5%" really means for your money.',
    cards: [
      {
        title: 'A small number, every hand',
        body:
          'With perfect basic strategy at a good table, the casino keeps about **0.5% of every dollar you bet** on average. That sounds tiny — but it applies to every hand, forever.\n\n' +
          '**Expected loss = bet × hands × edge.** At $10 a hand and 80 hands an hour: $10 × 80 × 0.5% = **$4 an hour**, on average.',
      },
      {
        title: 'Mistakes are expensive',
        body:
          'Guessing instead of using basic strategy usually pushes the edge to **2% or more** — four times worse. Bad rules (6:5) add more. That\'s why learning the chart matters even though it can\'t make you a winner.',
      },
    ],
    questions: [
      { type: 'choice', prompt: '$25 a hand, 100 hands, 0.5% edge. Expected loss?', options: ['$0.50', '$12.50', '$25', '$125'], answer: 1, explain: '$25 × 100 × 0.005 = $12.50.' },
      { type: 'choice', prompt: 'With perfect basic strategy, over a long time you will…', options: ['Win slowly', 'Break even', 'Lose slowly'], answer: 2, explain: 'Basic strategy minimizes the loss. It doesn\'t flip the edge.' },
      { type: 'choice', prompt: 'Which raises the house edge the most?', options: ['Playing by hunch', 'Taking a break', 'Betting the table minimum'], answer: 0, explain: 'Poor decisions can quadruple the edge.' },
      { type: 'choice', prompt: '$10 a hand at 2% edge (guessing), 80 hands an hour — expected loss per hour?', options: ['$4', '$16', '$80'], answer: 1, explain: '$10 × 80 × 0.02 = $16 an hour.' },
      { type: 'choice', prompt: 'Does betting more change the edge?', options: ['Yes, bigger bets have a lower edge', 'No — it just changes how much you expect to lose'], answer: 1, explain: 'The percentage stays the same; the dollars scale with the bet.' },
    ],
  },
  {
    id: 'u9-variance',
    unit: 9,
    title: 'Swings happen',
    summary: 'Why a session can go way up or down — and mean nothing.',
    cards: [
      {
        title: 'Variance is huge',
        body:
          'One hand of blackjack swings about **±1.15 bets** on average (doubles and splits make it bigger). Over 100 hands at $10, being up or down **$100+** is completely normal, even with perfect play.\n\n' +
          'Your session results tell you almost nothing about whether you played well. Your **accuracy** does.',
      },
      {
        title: 'Streaks aren\'t signals',
        body:
          'Losing 8 hands in a row happens regularly. The next hand doesn\'t "know" about the streak — the odds are the same. Feeling "due" is the gambler\'s fallacy.',
      },
    ],
    questions: [
      { type: 'choice', prompt: 'You lost 6 hands in a row. Your next hand is…', options: ['More likely to win', 'More likely to lose', 'The same as any other hand'], answer: 2, explain: 'Cards have no memory (counting aside — unit 10).' },
      { type: 'choice', prompt: 'You played perfectly and lost $150 tonight at $10 a hand. That means…', options: ['You played wrong', 'Normal variance', 'The shoe was rigged'], answer: 1, explain: 'Swings like that are routine even with perfect play.' },
      { type: 'choice', prompt: 'The best way to judge your play is…', options: ['Session profit', 'Your decision accuracy', 'How you felt'], answer: 1, explain: 'Accuracy measures skill; results mostly measure luck in the short run.' },
      { type: 'choice', prompt: 'Why does this app use play money only?', options: ['To keep learning separate from gambling', 'It\'s a demo', 'No reason'], answer: 0, explain: 'You can learn the game without risking money.' },
      { type: 'choice', prompt: 'Over a few hundred hands, results are mostly…', options: ['Skill', 'Luck (variance)', 'The dealer\'s choices'], answer: 1, explain: 'Short-run results are dominated by variance.' },
    ],
  },
  {
    id: 'u9-why-lose',
    unit: 9,
    title: 'Why basic strategy still loses',
    summary: 'Betting systems, chasing, and staying in control.',
    cards: [
      {
        title: 'No betting system beats the edge',
        body:
          'Doubling your bet after a loss (the **Martingale**), raising after a win, or any progression **can\'t change the house edge** — every hand has the same negative expectation, so any mix of bets does too. Systems just change how the losses arrive: usually many small wins and one huge loss.',
      },
      {
        title: 'Staying in control',
        body:
          'If you ever play for real money: set a limit before you start, treat it as the cost of entertainment, never chase losses, and walk away when the limit is gone.\n\n' +
          'If gambling stops being fun, help is free and confidential — **1-800-GAMBLER** (see About).',
      },
    ],
    questions: [
      { type: 'choice', prompt: 'Doubling your bet after every loss will…', options: ['Guarantee a profit', 'Not change the house edge', 'Remove the house edge'], answer: 1, explain: 'It changes the pattern of results, not the expected loss — and table limits end the streak-chasing.' },
      { type: 'choice', prompt: 'You\'re down for the night. The smart move is…', options: ['Bet bigger to win it back', 'Stick to your limit and stop', 'Switch tables until you win'], answer: 1, explain: 'Chasing losses is how a bad night becomes a disaster.' },
      { type: 'choice', prompt: 'Basic strategy\'s job is to…', options: ['Guarantee wins', 'Lose as little as possible', 'Predict the next card'], answer: 1, explain: 'It minimizes the edge — that\'s the most a non-counter can do.' },
      { type: 'choice', prompt: 'A "hot" table is…', options: ['More likely to keep paying', 'Just a run of luck', 'Worth raising bets on'], answer: 1, explain: 'Past results don\'t change future odds.' },
      { type: 'choice', prompt: 'Free, confidential help with problem gambling (US):', options: ['1-800-GAMBLER', 'There isn\'t any', 'Only at casinos'], answer: 0, explain: 'The National Problem Gambling Helpline — call or text 1-800-GAMBLER.' },
    ],
  },
];
