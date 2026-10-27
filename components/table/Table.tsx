'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { upcardLabel, upcardOf } from '@/lib/engine/cards';
import { describeHand, handValue } from '@/lib/engine/hand';
import { type Action, type Round, canAffordInsurance, insuranceCost, legalActions } from '@/lib/engine/round';
import { rulesSummary, surrenderAvailable } from '@/lib/engine/rules';
import { play as sfx } from '@/lib/audio';
import { useAnimMs, useViewport } from '@/lib/hooks';
import { money } from '@/lib/progress/dates';
import { cashOut, leaveTable, refillQuickStack } from '@/lib/state/sessions';
import { update, useApp } from '@/lib/state/store';
import {
  CHIPS,
  addChip,
  canDeal,
  chipsAvailable,
  chooseInsurance,
  clearBet,
  currentRecommendation,
  deal,
  playAction,
  roundInProgress,
  showHint,
  takeBack,
} from '@/lib/state/table';
import { ACTION_LABEL } from '@/lib/strategy/chart';
import BottomSheet from '../BottomSheet';
import Toggle from '../Toggle';
import HandView from '../HandView';
import { IconBack, IconBulb, IconMore, IconUndo } from '../Icons';

const ACTION_COLORS: Record<Action, string> = {
  hit: 'var(--act-hit)',
  stand: 'var(--act-stand)',
  double: 'var(--act-double)',
  split: 'var(--act-split)',
  surrender: 'var(--act-surrender)',
};

const CHIP_COLORS: Record<number, [string, string]> = {
  5: ['#d63c3c', '#ffffff'],
  25: ['#178a4a', '#ffffff'],
  100: ['#24242b', '#ffffff'],
  500: ['#7446d6', '#ffffff'],
};

function dealerTotalText(round: Round, shownDealer: number, hidden: boolean): string {
  if (hidden) return upcardLabel(upcardOf(round.dealer[0]));
  const cards = round.dealer.slice(0, shownDealer);
  return describeHand(cards);
}

/** Card width from the viewport: big enough to read, small enough to fit 4 split hands at 375px. */
function useLayout(handCount: number, compact: boolean) {
  const { w, h } = useViewport();
  const base = Math.max(48, Math.min(0.16 * w, 0.105 * h, 86));
  // Landscape (compact): dealer and player sit side by side, each gets half the width.
  const avail = compact ? Math.min(w, 960) / 2 - 24 : Math.min(w, 512) - 32;
  const slot = avail / handCount;
  const cardWidth = Math.floor(Math.min(base, (slot - 8) / 1.84));
  const stepFor = (count: number, width = cardWidth, slotW = slot) =>
    count <= 1 ? 0 : Math.max(9, Math.min(width * 0.42, (slotW - 8 - width) / (count - 1)));
  return { base: Math.floor(base), cardWidth, slot, stepFor, avail };
}

export default function Table() {
  const data = useApp((s) => s.data);
  const { table, settings } = data;
  const round = table.round;
  const animMs = useAnimMs(settings.animation);
  const [menuOpen, setMenuOpen] = useState(false);

  // Cards present when the screen mounted (e.g. restored after the app was killed) never animate.
  const [mounted] = useState(() => {
    const ids = new Set<string>();
    if (round) {
      round.dealer.forEach((_, i) => ids.add(`${round.id}:d${i}:${i === 1 && !round.holeRevealed ? 'down' : 'up'}`));
      if (round.phase === 'done') round.dealer.forEach((_, i) => ids.add(`${round.id}:d${i}:up`));
      round.hands.forEach((h, hi) => h.cards.forEach((_, ci) => ids.add(`${round.id}:h${hi}:${ci}`)));
    }
    return { ids, roundId: round?.phase === 'done' ? round.id : null };
  });

  // ── Dealer reveal sequencing (purely visual; the round is already settled) ──
  const [reveal, setReveal] = useState<{ id: string; shown: number }>({ id: '', shown: 0 });
  const done = round?.phase === 'done';
  const animateReveal = !!round && done && round.id !== mounted.roundId && animMs > 0;
  const shownDealer = !round
    ? 0
    : !done
      ? round.dealer.length
      : reveal.id === round.id
        ? reveal.shown
        : animateReveal
          ? 1
          : round.dealer.length;
  const revealing = !!round && done && shownDealer < round.dealer.length;

  useEffect(() => {
    if (!round || round.phase !== 'done' || !animateReveal) return;
    const dealtNow = round.hands.length === 1 && round.hands[0].cards.length === 2 && round.dealer.length === 2;
    const first = dealtNow ? animMs * 2.6 : animMs * 0.8;
    const step = animMs * 1.7;
    const timers: ReturnType<typeof setTimeout>[] = [];
    for (let k = 2; k <= round.dealer.length; k++) {
      timers.push(setTimeout(() => setReveal({ id: round.id, shown: k }), first + (k - 2) * step));
    }
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [round?.id, round?.phase]);

  const skipReveal = useCallback(() => {
    if (round && revealing) setReveal({ id: round.id, shown: round.dealer.length });
  }, [round, revealing]);

  // Sounds on result (after the reveal finishes).
  const lastResult = useRef<string | null>(mounted.roundId);
  useEffect(() => {
    if (!round || !done || revealing || lastResult.current === round.id) return;
    lastResult.current = round.id;
    if (round.net > 0) sfx('win');
    else if (round.net < 0) sfx('lose');
  }, [round, done, revealing]);

  const handCount = round?.hands.length ?? 1;
  const { h: viewH } = useViewport();
  const compact = viewH < 520;
  const layout = useLayout(handCount, compact);

  const animFor = (id: string, faceDown: boolean, flip = false): 'deal' | 'flip' | null => {
    const key = `${id}:${faceDown ? 'down' : 'up'}`;
    if (mounted.ids.has(key) || mounted.ids.has(id)) return null;
    return flip ? 'flip' : 'deal';
  };

  const legal = round ? legalActions(round) : null;
  // No surrender at this table → no Surrender button at all (layout is fixed per rule set, not per hand).
  const showSurrender = surrenderAvailable(round ? round.rules : settings.rules);
  const rowActions: Action[] = showSurrender ? ['double', 'split', 'surrender'] : ['double', 'split'];
  const rec = useMemo(() => currentRecommendation(data), [data]);
  const available = chipsAvailable(data);
  const inProgress = roundInProgress(data);
  const deck = canDeal(data);
  const broke = !inProgress && available < settings.tableMin;
  const hintFor = table.hint ? (round?.phase === 'player' ? rec?.action ?? null : null) : null;

  const dealerHidden = !!round && (done ? shownDealer < 2 : !round.holeRevealed);
  const dealerCards = round ? round.dealer.slice(0, done ? Math.max(2, shownDealer) : round.dealer.length) : [];
  const opening = !!round && round.hands.length === 1 && round.hands[0].cards.length === 2;

  return (
    <div
      className="felt game-surface fixed inset-0 flex flex-col overflow-hidden"
      style={{ ['--anim' as string]: `${animMs}ms`, overscrollBehavior: 'none' }}
    >
      {/* Top bar */}
      <div className="pt-safe">
        <div className={`mx-auto flex items-center gap-1 px-safe ${compact ? 'h-11 max-w-4xl' : 'h-14 max-w-lg'}`}>
          <Link href="/" aria-label="Home" className="-ml-2 grid min-h-11 min-w-11 place-items-center rounded-full text-white/80">
            <IconBack />
          </Link>
          <div className="min-w-0 flex-1 leading-tight">
            <div className="text-lg font-bold tabular-nums text-white" aria-live="polite">
              {money(available)}
            </div>
            <div className="truncate text-[11px] text-white/60">
              {table.mode === 'quick' ? 'Quick play' : 'Session stack'} · {rulesSummary(settings.rules)}
            </div>
          </div>
          <button
            onClick={showHint}
            disabled={!round || (round.phase !== 'player' && round.phase !== 'insurance') || !!table.hint}
            className="flex min-h-11 items-center gap-1 rounded-full bg-black/30 px-3 text-sm font-semibold text-white disabled:opacity-40"
            aria-label="Hint: show the correct play"
          >
            <IconBulb size={18} /> Hint
          </button>
          <button
            onClick={() => setMenuOpen(true)}
            aria-label="Table menu"
            className="-mr-2 grid min-h-11 min-w-11 place-items-center rounded-full text-white/80"
          >
            <IconMore />
          </button>
        </div>
      </div>

      {/* Felt */}
      <div
        className={`relative mx-auto flex w-full min-h-0 flex-1 px-safe ${
          compact ? 'max-w-4xl flex-row flex-wrap content-around items-center justify-around' : 'max-w-lg flex-col justify-around'
        }`}
        onClick={skipReveal}
      >
        {/* Dealer */}
        <section aria-label="Dealer" className="flex flex-col items-center">
          <div className="mb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/55">Dealer</div>
          {round ? (
            <HandView
              cards={dealerCards}
              hiddenIndex={dealerHidden ? 1 : undefined}
              dealDelays={opening && round.dealer.length >= 2 ? [1, 3] : undefined}
              cardWidth={layout.base}
              step={layout.stepFor(dealerCards.length, layout.base, layout.avail)}
              totalText={dealerTotalText(round, Math.max(2, shownDealer), dealerHidden)}
              animFor={(i, down) => animFor(`${round.id}:d${i}`, down, i === 1 && !down)}
              ariaLabel={`Dealer hand: ${dealerHidden ? `showing ${describeHand([round.dealer[0]])}` : describeHand(dealerCards)}`}
            />
          ) : (
            <div style={{ height: layout.base * 1.4 + 34 }} className="grid place-items-center text-sm text-white/50">
              Blackjack pays {settings.rules.blackjackPayout} · Dealer {settings.rules.dealerHitsSoft17 ? 'hits' : 'stands on'} soft 17
            </div>
          )}
        </section>

        {/* Coach / status banner — fixed height so nothing jumps */}
        <CoachBanner revealing={revealing} compact={compact} />

        {/* Player */}
        <section aria-label="Your hands" className="flex items-end justify-center">
          {round ? (
            round.hands.map((h, hi) => {
              const isActive = round.phase === 'player' && hi === round.active && round.hands.length > 1;
              const v = handValue(h.cards);
              return (
                <div key={hi} className="flex justify-center" style={{ width: round.hands.length > 1 ? layout.slot : undefined }}>
                  <HandView
                    cards={h.cards}
                    dealDelays={opening ? [0, 2] : undefined}
                    cardWidth={layout.cardWidth}
                    step={layout.stepFor(h.cards.length)}
                    totalText={done && h.outcome === 'blackjack' ? '21' : v.soft && v.total < 21 ? `Soft ${v.total}` : `${v.total}`}
                    active={isActive}
                    outcome={done && !revealing ? h.outcome : null}
                    net={done && !revealing ? h.net : null}
                    bet={h.bet}
                    doubled={h.doubled}
                    animFor={(ci) => animFor(`${round.id}:h${hi}:${ci}`, false)}
                    compact={round.hands.length >= 3}
                    ariaLabel={`${round.hands.length > 1 ? `Hand ${hi + 1}: ` : 'Your hand: '}${describeHand(h.cards, h.fromSplit)}${isActive ? ' (playing)' : ''}`}
                  />
                </div>
              );
            })
          ) : (
            <BetCircle bet={table.bet} height={layout.cardWidth * 1.4 + 34} />
          )}
        </section>
      </div>

      {/* Bottom action bar: same height in every phase */}
      <div className="border-t border-black/30 bg-black/35 backdrop-blur-sm pb-safe">
        <div
          className={`mx-auto flex flex-col gap-2 px-safe ${compact ? 'max-w-4xl py-2' : 'max-w-lg py-2.5'}`}
          style={{ minHeight: compact ? 60 : 132 }}
        >
          {round && round.phase === 'insurance' ? (
            <InsuranceBar round={round} compact={compact} />
          ) : round && round.phase === 'player' && legal && compact ? (
            <div className={`grid gap-2 ${showSurrender ? 'grid-cols-5' : 'grid-cols-4'}`}>
              {(['hit', 'stand', ...rowActions] as Action[]).map((a) => (
                <ActionButton key={a} action={a} enabled={legal[a]} hinted={hintFor === a} small />
              ))}
            </div>
          ) : round && round.phase === 'player' && legal ? (
            <>
              <div className={`grid gap-2 ${showSurrender ? 'grid-cols-3' : 'grid-cols-2'}`}>
                {rowActions.map((a) => (
                  <ActionButton key={a} action={a} enabled={legal[a]} hinted={hintFor === a} small />
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(['hit', 'stand'] as Action[]).map((a) => (
                  <ActionButton key={a} action={a} enabled={legal[a]} hinted={hintFor === a} />
                ))}
              </div>
            </>
          ) : revealing ? (
            <button
              onClick={skipReveal}
              className={`flex w-full items-center justify-center rounded-2xl bg-black/30 text-base font-semibold text-white/80 ${compact ? 'h-11' : 'h-[112px]'}`}
            >
              Dealer&apos;s turn… <span className="ml-2 text-sm text-white/50">(tap to skip)</span>
            </button>
          ) : broke ? (
            <BrokeBar quick={table.mode === 'quick'} compact={compact} />
          ) : (
            <BetBar bet={table.bet} available={available} canDealNow={deck.ok} why={deck.why} compact={compact} />
          )}
        </div>
      </div>

      <TableMenu open={menuOpen} onClose={() => setMenuOpen(false)} />
    </div>
  );
}

function BetCircle({ bet, height }: { bet: number; height: number }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ height }}>
      <div className="grid h-20 w-20 place-items-center rounded-full border-2 border-dashed border-white/40 text-center">
        <span className="text-lg font-bold tabular-nums text-gold">{bet ? money(bet) : '—'}</span>
      </div>
      <span className="text-sm text-white/60">{bet ? 'Your bet' : 'Tap chips to bet'}</span>
    </div>
  );
}

function ActionButton({ action, enabled, hinted, small }: { action: Action; enabled: boolean; hinted: boolean; small?: boolean }) {
  return (
    <button
      onClick={(e) => {
        sfx('deal');
        playAction(action, e.timeStamp);
      }}
      disabled={!enabled}
      aria-label={`${ACTION_LABEL[action]}${hinted ? ' (suggested)' : ''}`}
      className={`rounded-2xl font-bold text-black shadow-md transition-transform active:scale-[0.97] disabled:opacity-30 disabled:saturate-0 ${
        small ? 'h-12 text-[15px]' : 'h-[60px] text-lg'
      } ${hinted ? 'ring-4 ring-white ring-offset-2 ring-offset-black/40' : ''}`}
      style={{ background: ACTION_COLORS[action] }}
    >
      {ACTION_LABEL[action]}
    </button>
  );
}

function InsuranceBar({ round, compact }: { round: Round; compact?: boolean }) {
  const evenMoney = describeHand(round.hands[0].cards) === 'Blackjack';
  const cost = insuranceCost(round);
  const affordable = canAffordInsurance(round);
  return (
    <>
      {!compact && (
        <p className="flex h-12 items-center justify-center text-center text-[15px] font-semibold text-white">
          {evenMoney ? 'Dealer shows an ace. Take even money?' : `Dealer shows an ace. Insurance costs ${money(cost)}.`}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2">
        <button
          onClick={(e) => chooseInsurance(false, e.timeStamp)}
          className={`rounded-2xl bg-white text-lg font-bold text-black active:scale-[0.97] ${compact ? 'h-11' : 'h-[60px]'}`}
        >
          {evenMoney ? 'Keep blackjack' : 'No insurance'}
        </button>
        <button
          onClick={(e) => chooseInsurance(true, e.timeStamp)}
          disabled={!affordable}
          className={`rounded-2xl bg-black/40 text-lg font-bold text-white ring-1 ring-white/30 active:scale-[0.97] disabled:opacity-30 ${compact ? 'h-11' : 'h-[60px]'}`}
        >
          {evenMoney ? 'Even money' : `Insure ${money(cost)}`}
        </button>
      </div>
    </>
  );
}

function BetBar({ bet, available, canDealNow, why, compact }: { bet: number; available: number; canDealNow: boolean; why?: string; compact?: boolean }) {
  const settings = useApp((s) => s.data.settings);
  return (
    <div className={compact ? 'flex items-center gap-3' : 'contents'}>
      <div className={`flex h-12 items-center justify-between gap-2 ${compact ? 'shrink-0' : ''}`} role="group" aria-label="Chips">
        {CHIPS.map((v) => {
          const [bg, fg] = CHIP_COLORS[v];
          const disabled = bet + v > Math.min(available, settings.tableMax);
          return (
            <button
              key={v}
              onClick={() => {
                sfx('chip');
                addChip(v);
              }}
              disabled={disabled}
              aria-label={`Add ${money(v)} chip`}
              className="grid h-12 w-12 shrink-0 place-items-center rounded-full text-sm font-extrabold shadow-md active:scale-95 disabled:opacity-30"
              style={{
                background: `repeating-conic-gradient(${bg} 0 30deg, ${fg}22 30deg 45deg)`,
                color: fg,
                boxShadow: `inset 0 0 0 4px ${bg}, inset 0 0 0 6px ${fg}55`,
              }}
            >
              {v}
            </button>
          );
        })}
        <button
          onClick={clearBet}
          disabled={!bet}
          className="h-11 rounded-xl bg-black/30 px-3 text-sm font-semibold text-white disabled:opacity-30"
        >
          Clear
        </button>
      </div>
      <button
        onClick={(e) => {
          sfx('deal');
          deal(e.timeStamp);
        }}
        disabled={!canDealNow}
        className={`w-full rounded-2xl bg-gold text-lg font-extrabold text-black shadow-md active:scale-[0.98] disabled:opacity-40 ${compact ? 'h-12' : 'h-[60px]'}`}
      >
        {canDealNow || !why ? `Deal ${bet ? money(bet) : ''}` : why}
      </button>
    </div>
  );
}

function BrokeBar({ quick, compact }: { quick: boolean; compact?: boolean }) {
  return (
    <div className={compact ? 'flex items-center gap-3' : 'contents'}>
      <p className="flex h-12 items-center justify-center text-center text-[15px] font-semibold text-white">
        You&apos;re out of chips at this table. It happens — that&apos;s variance.
      </p>
      {quick ? (
        <button onClick={refillQuickStack} className="h-[60px] w-full rounded-2xl bg-gold text-lg font-extrabold text-black">
          Refill to $1,000
        </button>
      ) : (
        <button onClick={cashOut} className="h-[60px] w-full rounded-2xl bg-gold text-lg font-extrabold text-black">
          End session
        </button>
      )}
    </div>
  );
}

function CoachBanner({ revealing, compact }: { revealing: boolean; compact?: boolean }) {
  const data = useApp((s) => s.data);
  const { table, settings } = data;
  const round = table.round;
  const fb = settings.coach ? table.feedback : null;

  let content: React.ReactNode;
  if (table.hint && round && round.phase !== 'done') {
    content = (
      <div className="anim-fade">
        <p className="font-bold text-white">
          <span aria-hidden="true">💡 </span>Hint: {table.hint.action}
        </p>
        <p className="mt-0.5 text-white/80">{table.hint.reason}</p>
      </div>
    );
  } else if (fb) {
    content = (
      <div className={`anim-fade flex items-start gap-2 ${fb.ok ? '' : ''}`}>
        <span aria-hidden="true" className="text-lg leading-6">{fb.ok ? '✅' : '❌'}</span>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-white">
            {fb.ok ? `${labelFor(fb.chosen)} — correct` : `${fb.label} → ${labelFor(fb.correct)}`}
            {!fb.ok && <span className="font-normal text-white/70"> (you chose {labelFor(fb.chosen).toLowerCase()})</span>}
          </p>
          <p className="mt-0.5 line-clamp-2 text-white/80">{fb.reason}</p>
          {round?.phase === 'done' && !revealing && <ResultLine round={round} />}
        </div>
        {fb.canTakeBack && !revealing && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              takeBack();
            }}
            className="flex min-h-11 shrink-0 items-center gap-1 rounded-xl bg-white px-3 text-sm font-bold text-black"
          >
            <IconUndo size={16} /> Take back
          </button>
        )}
      </div>
    );
  } else if (round?.phase === 'done' && !revealing) {
    content = <ResultLine round={round} big />;
  } else if (round?.phase === 'player') {
    const hand = round.hands[round.active];
    content = (
      <p className="text-center text-white/80">
        {round.hands.length > 1 ? `Hand ${round.active + 1} of ${round.hands.length}: ` : 'Your move: '}
        <span className="font-semibold text-white">
          {describeHand(hand.cards, hand.fromSplit)} vs {upcardLabel(upcardOf(round.dealer[0]))}
        </span>
      </p>
    );
  } else if (round?.phase === 'insurance') {
    content = <p className="text-center text-white/80">The dealer will check for blackjack after you decide.</p>;
  } else if (!round) {
    content = (
      <p className="text-white/75">
        {settings.coach ? 'Coach mode is on: you’ll get feedback after every decision.' : 'Place a bet to deal.'}
      </p>
    );
  } else {
    content = null;
  }

  return (
    <div
      aria-live="polite"
      className={`mx-auto flex w-full items-center overflow-hidden rounded-2xl bg-black/25 px-3 leading-[1.3] ${
        compact ? 'order-first h-[56px] basis-full text-[13px]' : 'h-[92px] text-[14px]'
      }`}
    >
      <div className="w-full">{content}</div>
    </div>
  );
}

function labelFor(a: string): string {
  if (a === 'insurance') return 'Insurance';
  if (a === 'no-insurance') return 'No insurance';
  return ACTION_LABEL[a as Action] ?? a;
}

function ResultLine({ round, big }: { round: Round; big?: boolean }) {
  const dealer = describeHand(round.dealer);
  const dealerText = round.dealerBlackjack ? 'Dealer has blackjack' : handValue(round.dealer).total > 21 ? `Dealer busts (${handValue(round.dealer).total})` : `Dealer has ${dealer}`;
  const net = round.net;
  const verdict = net > 0 ? `You win ${money(net)}` : net < 0 ? `You lose ${money(-net)}` : 'Push — bet returned';
  return (
    <p className={`${big ? 'text-center text-base' : 'mt-1 text-[13px]'} font-semibold text-white`}>
      {dealerText}. <span className={net > 0 ? 'text-good' : net < 0 ? 'text-bad' : 'text-white'}>{verdict}.</span>
    </p>
  );
}

function TableMenu({ open, onClose }: { open: boolean; onClose: () => void }) {
  const data = useApp((s) => s.data);
  const { settings, table } = data;
  const inProgress = roundInProgress(data);
  const session = data.sessions.active;
  return (
    <BottomSheet open={open} onClose={onClose} title="Table">
      <div className="flex flex-col gap-2 pb-2">
        <Toggle
          label="Coach mode"
          hint="Feedback after every decision"
          checked={settings.coach}
          onChange={(v) => update((d) => void (d.settings.coach = v))}
        />
        <div className="flex min-h-12 items-center justify-between gap-3 rounded-2xl bg-surface-2 px-4">
          <span className="font-semibold">Animations</span>
          <div className="flex gap-1" role="radiogroup" aria-label="Animation speed">
            {(['off', 'fast', 'normal'] as const).map((s) => (
              <button
                key={s}
                role="radio"
                aria-checked={settings.animation === s}
                onClick={() => update((d) => void (d.settings.animation = s))}
                className={`min-h-10 rounded-xl px-3 text-sm font-semibold capitalize ${settings.animation === s ? 'bg-gold text-black' : 'bg-surface-3'}`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>
        <Link href="/chart/" className="flex min-h-12 items-center rounded-2xl bg-surface-2 px-4 font-semibold">
          Strategy chart for these rules
        </Link>
        <Link href="/settings/" className="flex min-h-12 items-center rounded-2xl bg-surface-2 px-4 font-semibold">
          Table rules &amp; settings
        </Link>
        {table.mode === 'session' && session ? (
          <button
            disabled={inProgress}
            onClick={() => {
              cashOut();
              onClose();
            }}
            className="min-h-12 rounded-2xl bg-gold px-4 font-bold text-black disabled:opacity-40"
          >
            Cash out {money(session.stack)}
            {inProgress ? ' (finish the hand first)' : ''}
          </button>
        ) : (
          <button
            disabled={inProgress}
            onClick={() => {
              leaveTable();
              onClose();
            }}
            className="min-h-12 rounded-2xl bg-gold px-4 font-bold text-black disabled:opacity-40"
          >
            End quick play{inProgress ? ' (finish the hand first)' : ''}
          </button>
        )}
      </div>
    </BottomSheet>
  );
}
