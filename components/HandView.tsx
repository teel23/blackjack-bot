'use client';

import type { Card } from '@/lib/engine/cards';
import type { HandOutcome } from '@/lib/engine/round';
import { money } from '@/lib/progress/dates';
import PlayingCard from './PlayingCard';

export const OUTCOME_TEXT: Record<HandOutcome, string> = {
  blackjack: 'Blackjack!',
  win: 'Win',
  push: 'Push',
  lose: 'Lose',
  bust: 'Bust',
  surrender: 'Surrender',
};

const OUTCOME_STYLE: Record<HandOutcome, string> = {
  blackjack: 'bg-gold text-black',
  win: 'bg-good text-black',
  push: 'bg-surface-3 text-ink',
  lose: 'bg-bad text-black',
  bust: 'bg-bad text-black',
  surrender: 'bg-surface-3 text-ink',
};

interface Props {
  cards: Card[];
  /** Index of a card to show face down (dealer hole card). */
  hiddenIndex?: number;
  /** Animation delay (in deal steps) per card index, for the opening deal. */
  dealDelays?: number[];
  cardWidth: number;
  /** Horizontal step between overlapping cards. */
  step: number;
  label?: string;
  totalText?: string | null;
  active?: boolean;
  outcome?: HandOutcome | null;
  net?: number | null;
  bet?: number | null;
  doubled?: boolean;
  /** How each card animates when it first appears (null = no animation, e.g. restored on load). */
  animFor?: (index: number, faceDown: boolean) => 'deal' | 'flip' | null;
  /** Narrow slot (3–4 split hands): stack total and result, short labels. */
  compact?: boolean;
  ariaLabel: string;
}

const SHORT: Record<HandOutcome, string> = {
  blackjack: 'BJ',
  win: 'Win',
  push: 'Push',
  lose: 'Lose',
  bust: 'Bust',
  surrender: 'Surr.',
};

export default function HandView({
  cards,
  hiddenIndex,
  dealDelays,
  cardWidth,
  step,
  totalText,
  active,
  outcome,
  net,
  bet,
  doubled,
  animFor,
  compact,
  ariaLabel,
}: Props) {
  const width = cards.length ? cardWidth + (cards.length - 1) * step : cardWidth;
  const height = cardWidth * 1.4;
  return (
    <div className="flex flex-col items-center gap-1.5" aria-label={ariaLabel} role="group">
      <div className="relative" style={{ width, height }}>
        {cards.map((card, i) => {
          const down = i === hiddenIndex;
          const anim = animFor?.(i, down) ?? null;
          return (
            <div
              key={`${i}-${down ? 'down' : 'up'}`}
              className={`absolute top-0 ${anim === 'deal' ? 'anim-deal' : anim === 'flip' ? 'anim-flip' : ''}`}
              style={{
                left: i * step,
                animationDelay: dealDelays?.[i] ? `calc(var(--anim) * ${dealDelays[i] * 0.55})` : undefined,
                zIndex: i,
              }}
            >
              <PlayingCard card={card} faceDown={down} width={cardWidth} />
            </div>
          );
        })}
        {active && (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-1.5 rounded-xl ring-2 ring-gold"
            style={{ boxShadow: '0 0 18px rgba(244,197,91,0.45)' }}
          />
        )}
      </div>
      <div className={`flex items-center gap-1 whitespace-nowrap ${compact ? 'min-h-[58px] flex-col justify-start' : 'min-h-7 gap-1.5'}`}>
        {totalText && (
          <span
            className={`rounded-full px-2.5 py-0.5 text-sm font-bold tabular-nums ${active ? 'bg-gold text-black' : 'bg-black/45 text-white'}`}
          >
            {totalText}
          </span>
        )}
        {outcome ? (
          <span className={`anim-pop rounded-full px-2.5 py-0.5 text-sm font-bold ${OUTCOME_STYLE[outcome]}`}>
            {compact ? SHORT[outcome] : OUTCOME_TEXT[outcome]}
            {!compact && net != null && net !== 0 ? ` ${money(net, true)}` : ''}
          </span>
        ) : bet ? (
          <span className="rounded-full bg-black/45 px-2 py-0.5 text-xs font-semibold text-gold tabular-nums">
            {money(bet)}
            {doubled ? ' ×2' : ''}
          </span>
        ) : null}
      </div>
    </div>
  );
}
