'use client';

import type { ReactNode } from 'react';
import type { CardsVisual } from '@/content/lessons/types';
import { type Card, cardSpoken } from '@/lib/engine/cards';
import type { Action, Legal } from '@/lib/engine/round';
import { specCards } from '@/lib/learn';
import { ACTION_LABEL } from '@/lib/strategy/chart';
import PlayingCard from '../PlayingCard';

/** Paragraphs split on blank lines; **bold** supported. */
export function RichText({ text, className = '' }: { text: string; className?: string }) {
  return (
    <div className={`flex flex-col gap-3 ${className}`}>
      {text.split(/\n\n+/).map((para, i) => (
        <p key={i}>
          {para.split(/(\*\*[^*]+\*\*)/g).map((part, j) =>
            part.startsWith('**') ? (
              <strong key={j} className="font-semibold text-ink">
                {part.slice(2, -2)}
              </strong>
            ) : (
              part
            ),
          )}
        </p>
      ))}
    </div>
  );
}

export function CardRow({ cards, hiddenIndex, width = 56, label }: { cards: Card[]; hiddenIndex?: number; width?: number; label: string }) {
  const step = Math.min(width * 0.62, 44);
  return (
    <div role="group" aria-label={label} className="relative mx-auto" style={{ width: width + (cards.length - 1) * step, height: width * 1.4 }}>
      {cards.map((card, i) => (
        <div key={i} className="absolute top-0" style={{ left: i * step }}>
          <PlayingCard card={card} faceDown={i === hiddenIndex} width={width} />
        </div>
      ))}
    </div>
  );
}

/** Lesson visuals: dealer and/or player rows on a felt panel. */
export function Visual({ v, width = 56 }: { v: CardsVisual; width?: number }) {
  const dealer = v.dealer ? specCards(v.dealer, 2) : null;
  const player = v.player ? specCards(v.player) : null;
  const row = v.row ? specCards(v.row, 1) : null;
  return (
    <div className="felt flex flex-col items-center gap-3 rounded-3xl p-4">
      {dealer && (
        <div className="flex flex-col items-center gap-1">
          <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-white/60">Dealer</span>
          <CardRow cards={dealer} hiddenIndex={v.hole ? 1 : undefined} width={width} label={`Dealer shows ${cardSpoken(dealer[0])}`} />
        </div>
      )}
      {player && (
        <div className="flex flex-col items-center gap-1">
          {dealer && <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-white/60">You</span>}
          <CardRow cards={player} width={width} label={`Your cards: ${player.map(cardSpoken).join(', ')}`} />
        </div>
      )}
      {row && <CardRow cards={row} width={width} label={row.map(cardSpoken).join(', ')} />}
    </div>
  );
}

/** Dealer upcard (+ face-down hole) over the player's hand. */
export function DecisionTable({ cards, up, width = 64, caption }: { cards: Card[]; up: Card; width?: number; caption?: ReactNode }) {
  const hole: Card = { rank: '2', suit: 'S' };
  return (
    <div className="felt flex flex-col items-center gap-4 rounded-3xl px-4 py-5">
      <div className="flex flex-col items-center gap-1">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-white/60">Dealer</span>
        <CardRow cards={[up, hole]} hiddenIndex={1} width={width} label={`Dealer shows ${cardSpoken(up)}`} />
      </div>
      {caption}
      <div className="flex flex-col items-center gap-1">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-[0.18em] text-white/60">You</span>
        <CardRow cards={cards} width={width} label={`Your cards: ${cards.map(cardSpoken).join(', ')}`} />
      </div>
    </div>
  );
}

export const ACTION_BG: Record<Action, string> = {
  hit: 'var(--act-hit)',
  stand: 'var(--act-stand)',
  double: 'var(--act-double)',
  split: 'var(--act-split)',
  surrender: 'var(--act-surrender)',
};

/** The five action buttons, same layout as the table. Illegal ones are disabled, never hidden. */
export function ActionPad({
  legal,
  onPick,
  marks,
  disabled,
  surrender = true,
}: {
  legal: Legal;
  /** Show the Surrender button at all (hidden when the rules don't offer it). */
  surrender?: boolean;
  onPick: (a: Action) => void;
  /** After answering: mark the chosen/correct buttons. */
  marks?: { chosen?: Action | null; correct?: Action };
  disabled?: boolean;
}) {
  const btn = (a: Action, small?: boolean) => {
    const isCorrect = marks?.correct === a;
    const isWrong = marks?.chosen === a && !isCorrect;
    return (
      <button
        key={a}
        disabled={disabled || !legal[a]}
        onClick={() => onPick(a)}
        aria-label={`${ACTION_LABEL[a]}${isCorrect ? ' (correct play)' : ''}${isWrong ? ' (your answer)' : ''}`}
        className={`rounded-2xl font-bold text-black shadow-md transition-transform active:scale-[0.97] disabled:opacity-30 disabled:saturate-0 ${
          small ? 'h-12 text-[0.9375rem]' : 'h-[60px] text-lg'
        } ${isCorrect ? 'opacity-100! saturate-100! ring-4 ring-good ring-offset-2 ring-offset-bg' : ''} ${isWrong ? 'opacity-100! saturate-100! ring-4 ring-bad ring-offset-2 ring-offset-bg' : ''}`}
        style={{ background: ACTION_BG[a] }}
      >
        {ACTION_LABEL[a]}
      </button>
    );
  };
  return (
    <div className="flex flex-col gap-2">
      <div className={`grid gap-2 ${surrender ? 'grid-cols-3' : 'grid-cols-2'}`}>
        {((surrender ? ['double', 'split', 'surrender'] : ['double', 'split']) as Action[]).map((a) => btn(a, true))}
      </div>
      <div className="grid grid-cols-2 gap-2">{(['hit', 'stand'] as Action[]).map((a) => btn(a))}</div>
    </div>
  );
}

export function ProgressBar({ value, label }: { value: number; label: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(value * 100)}
      className="h-2 w-full overflow-hidden rounded-full bg-surface-3"
    >
      <div className="h-full rounded-full bg-gold transition-transform duration-300" style={{ transform: `translateX(${(value - 1) * 100}%)` }} />
    </div>
  );
}

export function BottomBar({ children }: { children: ReactNode }) {
  return (
    <div className="sticky bottom-0 -mx-4 mt-auto border-t border-line bg-bg/95 px-4 pt-3 backdrop-blur-md" style={{ paddingBottom: 'calc(var(--safe-bottom) + 12px)' }}>
      {children}
    </div>
  );
}
