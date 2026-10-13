'use client';

import Link from 'next/link';
import { useState } from 'react';
import AppScreen from '@/components/AppScreen';
import BankrollChart, { type ChartPoint } from '@/components/BankrollChart';
import BottomSheet from '@/components/BottomSheet';
import { formatDuration, money } from '@/lib/progress/dates';
import { resetBankroll } from '@/lib/state/sessions';
import { accuracy } from '@/lib/state/stats';
import { useApp } from '@/lib/state/store';
import { roundInProgress } from '@/lib/state/table';

function when(t: number) {
  return new Date(t).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export default function SessionsPage() {
  const data = useApp((s) => s.data);
  const { bankroll, sessions } = data;
  const [confirm, setConfirm] = useState(false);
  const active = sessions.active;
  const total = bankroll.balance + (active?.stack ?? 0);
  const points: ChartPoint[] = [...bankroll.history];
  if (active) points.push({ t: active.lastActiveAt, balance: total, kind: 'now' });
  const past = [...sessions.past].reverse();
  const net = sessions.past.reduce((s, x) => s + x.net, 0);
  const hands = sessions.past.reduce((s, x) => s + x.hands, 0);
  const blocked = !!active && roundInProgress(data) && data.table.mode === 'session';

  return (
    <AppScreen title="Sessions" back="/play/">
      <section aria-label="Bankroll summary">
        <div className="text-xs font-semibold uppercase tracking-widest text-muted">Bankroll · play money</div>
        <div className="mt-1 text-5xl font-bold tabular-nums">{money(total)}</div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          <Stat label="Sessions" value={String(sessions.past.length)} />
          <Stat label="Net, all sessions" value={money(net, true)} />
          <Stat label="Resets" value={String(bankroll.resets)} />
        </dl>
      </section>

      <section className="mt-6 rounded-3xl border border-line bg-surface p-4">
        <h2 className="text-base font-bold">Bankroll over time</h2>
        <p className="mb-3 text-xs text-muted">After each cash-out and reset. Tap or drag the chart to inspect a point.</p>
        <BankrollChart points={points} />
      </section>

      {active && (
        <section className="mt-6 rounded-3xl border border-gold/40 bg-surface p-4">
          <h2 className="text-base font-bold">Open session</h2>
          <SessionRow s={active} open />
          <Link href="/play/" className="mt-3 flex min-h-12 items-center justify-center rounded-2xl bg-gold font-bold text-black">
            Back to the table
          </Link>
        </section>
      )}

      <section className="mt-6">
        <h2 className="mb-2 text-base font-bold">History</h2>
        {past.length === 0 ? (
          <p className="rounded-2xl bg-surface p-4 text-sm text-muted">
            No finished sessions yet. Buy in from the Play tab, then cash out to log a session.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {past.map((s) => (
              <li key={s.id} className="rounded-2xl bg-surface p-4">
                <SessionRow s={s} />
              </li>
            ))}
          </ul>
        )}
        {hands > 0 && <p className="mt-2 text-xs text-faint">{hands.toLocaleString()} hands across all sessions.</p>}
      </section>

      <section className="mt-8 rounded-3xl border border-line bg-surface p-4">
        <h2 className="text-base font-bold">Reset bankroll</h2>
        <p className="mt-1 text-sm text-muted">
          Start over at $1,000. Any open session is cashed out first. Resets are logged in your history — no shame, just a stat.
        </p>
        <button
          disabled={blocked}
          onClick={() => setConfirm(true)}
          className="mt-3 min-h-12 w-full rounded-2xl border border-line bg-surface-2 font-semibold disabled:opacity-40"
        >
          {blocked ? 'Finish your hand first' : 'Reset to $1,000'}
        </button>
      </section>

      <BottomSheet open={confirm} onClose={() => setConfirm(false)} title="Reset bankroll?">
        <p className="text-sm text-muted">Your bankroll goes back to $1,000 and the reset is added to your history.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button onClick={() => setConfirm(false)} className="min-h-12 rounded-2xl bg-surface-2 font-semibold">
            Cancel
          </button>
          <button
            onClick={() => {
              resetBankroll();
              setConfirm(false);
            }}
            className="min-h-12 rounded-2xl bg-gold font-bold text-black"
          >
            Reset
          </button>
        </div>
      </BottomSheet>
    </AppScreen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <dt className="text-[0.6875rem] text-muted">{label}</dt>
      <dd className="mt-0.5 text-lg font-semibold tabular-nums">{value}</dd>
    </div>
  );
}

function SessionRow({ s, open }: { s: import('@/lib/storage/schema').Session; open?: boolean }) {
  const acc = accuracy(s.decisions, s.correct);
  const up = s.net > 0;
  const down = s.net < 0;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted">{when(s.startedAt)}</span>
        <span className="text-lg font-semibold tabular-nums">
          <span aria-hidden="true" className={up ? 'text-good' : down ? 'text-bad' : 'text-muted'}>
            {up ? '▲ ' : down ? '▼ ' : '• '}
          </span>
          {money(s.net, true)}
        </span>
      </div>
      <p className="mt-1 text-sm">
        {s.hands} hands · {formatDuration(s.activeMs)} · buy-in {money(s.buyIn)}
        {open ? ` · stack ${money(s.stack)}` : ''}
      </p>
      <p className="mt-0.5 text-xs text-muted">
        {acc !== null ? `${acc}% strategy accuracy` : 'No decisions yet'}
        {s.hints ? ` · ${s.hints} hint${s.hints === 1 ? '' : 's'}` : ''}
        {s.biggestWin > 0 ? ` · best hand ${money(s.biggestWin, true)}` : ''}
        {s.biggestLoss < 0 ? ` · worst ${money(s.biggestLoss, true)}` : ''}
      </p>
    </div>
  );
}
