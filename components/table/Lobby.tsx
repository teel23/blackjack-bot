'use client';

import Link from 'next/link';
import { useState } from 'react';
import AppScreen from '../AppScreen';
import { formatDuration, money } from '@/lib/progress/dates';
import {
  canStartSession,
  cashOut,
  isBroke,
  resetBankroll,
  resumeSession,
  startQuickPlay,
  startSession,
} from '@/lib/state/sessions';
import { accuracy } from '@/lib/state/stats';
import { useApp } from '@/lib/state/store';

const BUY_INS = [100, 250, 500, 1000];

export default function Lobby() {
  const data = useApp((s) => s.data);
  const { bankroll, sessions, settings, table } = data;
  const active = sessions.active;
  const options = BUY_INS.filter((b) => b <= bankroll.balance);
  const allIn = bankroll.balance >= settings.tableMin && !options.includes(bankroll.balance) ? [bankroll.balance] : [];
  const choices = [...options, ...allIn].slice(-4);
  const [buyIn, setBuyIn] = useState<number>(() => Math.min(500, bankroll.balance));
  const selected = choices.includes(buyIn) ? buyIn : choices[choices.length - 1] ?? 0;
  const broke = isBroke(data);

  return (
    <AppScreen title="Play">
      <section className="rounded-3xl felt p-5 text-white shadow-lg" aria-label="Bankroll">
        <div className="text-xs font-semibold uppercase tracking-widest text-white/70">Bankroll · play money</div>
        <div className="mt-1 text-4xl font-extrabold tabular-nums">{money(bankroll.balance + (active?.stack ?? 0))}</div>
        {active && <div className="mt-1 text-sm text-white/75">{money(active.stack)} of it is on the table in your session</div>}
        <Link href="/sessions/" className="mt-3 inline-flex min-h-11 items-center text-sm font-semibold text-gold underline-offset-2">
          Sessions &amp; bankroll history →
        </Link>
      </section>

      {active ? (
        <section className="mt-4 rounded-3xl border border-line bg-surface p-5">
          <h2 className="text-lg font-bold">Session in progress</h2>
          <p className="mt-1 text-sm text-muted">
            Stack {money(active.stack)} · {active.hands} hands · {formatDuration(active.activeMs)}
            {active.decisions ? ` · ${accuracy(active.decisions, active.correct)}% accurate` : ''}
          </p>
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button onClick={resumeSession} className="min-h-12 rounded-2xl bg-gold font-bold text-black">
              Back to table
            </button>
            <button onClick={cashOut} className="min-h-12 rounded-2xl border border-line bg-surface-2 font-semibold">
              Cash out
            </button>
          </div>
        </section>
      ) : broke ? (
        <section className="mt-4 rounded-3xl border border-line bg-surface p-5">
          <h2 className="text-lg font-bold">Bankroll empty</h2>
          <p className="mt-1 text-sm text-muted">
            Going broke is part of learning variance. Reset to $1,000 — it&apos;s logged in your history as a stat, nothing more.
          </p>
          <button onClick={resetBankroll} className="mt-4 min-h-12 w-full rounded-2xl bg-gold font-bold text-black">
            Reset bankroll to $1,000
          </button>
        </section>
      ) : (
        <section className="mt-4 rounded-3xl border border-line bg-surface p-5">
          <h2 className="text-lg font-bold">Start a session</h2>
          <p className="mt-1 text-sm text-muted">Buy in from your bankroll, play, then cash out. Every session is tracked.</p>
          <div className="mt-4 grid grid-cols-4 gap-2" role="radiogroup" aria-label="Buy-in">
            {choices.map((b) => (
              <button
                key={b}
                role="radio"
                aria-checked={selected === b}
                onClick={() => setBuyIn(b)}
                className={`min-h-12 rounded-2xl text-[15px] font-bold tabular-nums ${selected === b ? 'bg-gold text-black' : 'bg-surface-2'}`}
              >
                {money(b)}
              </button>
            ))}
          </div>
          <button
            onClick={() => startSession(selected)}
            disabled={!canStartSession(data, selected)}
            className="mt-3 min-h-12 w-full rounded-2xl bg-gold font-bold text-black disabled:opacity-40"
          >
            Buy in for {money(selected)}
          </button>
        </section>
      )}

      <section className="mt-4 rounded-3xl border border-line bg-surface p-5">
        <h2 className="text-lg font-bold">Quick play</h2>
        <p className="mt-1 text-sm text-muted">
          Just practice. Separate {money(table.quickStack)} stack, no session tracking — your strategy accuracy still counts.
        </p>
        <button
          onClick={startQuickPlay}
          className="mt-4 min-h-12 w-full rounded-2xl border border-line bg-surface-2 font-semibold"
        >
          Quick play
        </button>
      </section>
    </AppScreen>
  );
}
