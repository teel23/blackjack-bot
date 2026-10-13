'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { FocusScreen } from '@/components/AppScreen';
import PlayingCard from '@/components/PlayingCard';
import { BottomBar } from '@/components/learn/Bits';
import { cardLabel, cardSpoken } from '@/lib/engine/cards';
import { hiLo, signedCount as signed } from '@/lib/count';
import CountPad from '@/components/CountPad';
import { Rng, randomSeed } from '@/lib/engine/rng';
import { freshDecks } from '@/lib/engine/shoe';
import { localDate } from '@/lib/progress/dates';
import { update, useApp } from '@/lib/state/store';

const LENGTHS = [10, 20, 52] as const;
const SPEEDS = [
  { id: 'slow', label: 'Slow', ms: 1300 },
  { id: 'medium', label: 'Medium', ms: 850 },
  { id: 'fast', label: 'Fast', ms: 500 },
] as const;

function startCount(n: number, speed: string) {
  const rng = new Rng(randomSeed());
  const cards = rng.shuffle(freshDecks(1)).slice(0, n);
  const answer = cards.reduce((s, c) => s + hiLo(c), 0);
  update((d) => {
    d.progress.activeDrill = {
      kind: 'count',
      mode: speed,
      timed: true,
      date: localDate(),
      seed: rng.state,
      queue: [],
      index: 0,
      answers: [],
      startedAt: Date.now(),
      count: { cards, answer, shown: false, guess: null },
    };
  });
}

export default function CountPage() {
  const drill = useApp((s) => (s.data.progress.activeDrill?.kind === 'count' ? s.data.progress.activeDrill : null));
  const best = useApp((s) => s.data.progress.countBest);
  const [n, setN] = useState<number>(20);
  const [speed, setSpeed] = useState<string>('medium');

  if (!drill?.count) {
    return (
      <FocusScreen title="Counting drill" closeHref="/drills/">
        <div className="flex flex-1 flex-col pt-4">
          <h2 className="text-2xl font-bold">Keep the running count</h2>
          <p className="mt-2 text-muted">
            Cards flash one at a time. Add <strong className="text-ink">+1</strong> for 2–6, <strong className="text-ink">0</strong> for 7–9,{' '}
            <strong className="text-ink">−1</strong> for 10s and aces. Enter the total at the end.
          </p>
          <p className="mt-2 text-xs text-faint">Educational practice of the theory in unit 10 — not a betting tool.</p>
          <Choice label="Cards" value={n} options={LENGTHS.map((v) => ({ value: v, label: v === 52 ? 'Full deck' : String(v) }))} onChange={setN} />
          <Choice label="Speed" value={speed} options={SPEEDS.map((s) => ({ value: s.id, label: s.label }))} onChange={setSpeed} />
          {best[`${n}-${speed}`] !== undefined && (
            <p className="mt-4 text-sm text-muted">Correct runs at this setting: {best[`${n}-${speed}`]}</p>
          )}
        </div>
        <BottomBar>
          <button onClick={() => startCount(n, speed)} className="h-[56px] w-full rounded-2xl bg-gold text-lg font-bold text-black">
            Start
          </button>
        </BottomBar>
      </FocusScreen>
    );
  }

  return <CountRun />;
}

function Choice<T extends string | number>({ label, value, options, onChange }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void }) {
  return (
    <div className="mt-5">
      <p className="mb-2 text-sm font-semibold text-muted">{label}</p>
      <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={String(o.value)}
            role="radio"
            aria-checked={value === o.value}
            onClick={() => onChange(o.value)}
            className={`min-h-12 rounded-2xl font-semibold ${value === o.value ? 'bg-gold text-black' : 'bg-surface'}`}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

function CountRun() {
  const drill = useApp((s) => s.data.progress.activeDrill)!;
  const count = drill.count!;
  const ms = SPEEDS.find((s) => s.id === drill.mode)?.ms ?? 850;
  const [index, setIndex] = useState(0);
  const [guess, setGuess] = useState(0);
  const flashing = !count.shown;

  // Flash cards one by one; pause while the app is in the background.
  useEffect(() => {
    if (!flashing) return;
    const t = setInterval(() => {
      if (document.visibilityState !== 'visible') return;
      setIndex((i) => {
        if (i + 1 >= count.cards.length) {
          clearInterval(t);
          update((d) => {
            if (d.progress.activeDrill?.count) d.progress.activeDrill.count.shown = true;
          });
          return i;
        }
        return i + 1;
      });
    }, ms);
    return () => clearInterval(t);
  }, [flashing, ms, count.cards.length]);

  const submit = () => {
    update((d) => {
      const a = d.progress.activeDrill;
      if (!a?.count || a.count.guess !== null) return;
      a.count.guess = guess;
      const ok = guess === a.count.answer;
      d.progress.drillHistory.push({ t: Date.now(), kind: 'count', mode: `${a.count.cards.length}-${a.mode}`, correct: ok ? 1 : 0, total: 1, ms: Date.now() - a.startedAt });
      const key = `${a.count.cards.length}-${a.mode}`;
      if (ok) d.progress.countBest[key] = (d.progress.countBest[key] ?? 0) + 1;
    });
  };
  const exit = () =>
    update((d) => {
      d.progress.activeDrill = null;
    });

  const title = `Counting · ${count.cards.length} cards`;

  if (flashing) {
    const card = count.cards[index];
    return (
      <FocusScreen title={title} onClose={exit}>
        <div className="flex flex-1 flex-col items-center justify-center gap-6">
          <p className="text-sm text-muted" aria-live="off">
            Card {index + 1} of {count.cards.length}
          </p>
          <div key={index} className="anim-pop">
            <PlayingCard card={card} width={150} />
          </div>
          <span className="sr-only" aria-live="assertive">
            {cardSpoken(card)}
          </span>
        </div>
      </FocusScreen>
    );
  }

  if (count.guess === null) {
    return (
      <FocusScreen title={title} onClose={exit}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4">
          <h2 className="text-2xl font-bold">What&apos;s the running count?</h2>
          <CountPad value={guess} onChange={setGuess} />
        </div>
        <BottomBar>
          <button onClick={submit} className="h-[56px] w-full rounded-2xl bg-gold text-lg font-bold text-black">
            Check
          </button>
        </BottomBar>
      </FocusScreen>
    );
  }

  const ok = count.guess === count.answer;
  const runningTotals = count.cards.reduce<number[]>((acc, c) => [...acc, (acc.at(-1) ?? 0) + hiLo(c)], []);
  return (
    <FocusScreen title={title} closeHref="/drills/" onClose={exit}>
      <div className="flex flex-1 flex-col pt-4">
        <div className={`rounded-3xl border p-5 text-center ${ok ? 'border-good/50 bg-good/10' : 'border-bad/50 bg-bad/10'}`} role="status">
          <p className="text-4xl" aria-hidden="true">{ok ? '🎯' : '🤏'}</p>
          <p className="mt-2 text-2xl font-bold">{ok ? 'Exactly right' : `It was ${signed(count.answer)}`}</p>
          <p className="mt-1 text-muted">You said {signed(count.guess)}</p>
        </div>
        <h3 className="mt-5 text-sm font-semibold text-muted">The cards</h3>
        <ol className="mt-2 grid grid-cols-4 gap-1.5 text-center text-sm tabular-nums">
          {count.cards.map((c, i) => {
            const running = runningTotals[i];
            return (
              <li key={i} className="rounded-xl bg-surface px-1 py-1.5">
                <span className="font-semibold">{cardLabel(c)}</span>
                <span className="block text-xs text-muted">
                  {signed(hiLo(c))} → {signed(running)}
                </span>
              </li>
            );
          })}
        </ol>
      </div>
      <BottomBar>
        <div className="grid grid-cols-2 gap-2">
          <Link href="/drills/" onClick={exit} className="flex h-[56px] items-center justify-center rounded-2xl border border-line bg-surface font-semibold">
            Done
          </Link>
          <button onClick={() => startCount(count.cards.length, drill.mode)} className="h-[56px] rounded-2xl bg-gold text-lg font-bold text-black">
            Again
          </button>
        </div>
      </BottomBar>
    </FocusScreen>
  );
}
