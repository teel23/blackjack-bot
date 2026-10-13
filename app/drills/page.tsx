'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import AppScreen from '@/components/AppScreen';
import { DRILL_FILTERS, type DrillFilter } from '@/lib/progress/drillPicker';
import { LIBRARY_SIZE, SPEED_SECONDS, startLibraryDrill, startReview } from '@/lib/state/drills';
import { accuracy } from '@/lib/state/stats';
import { useApp } from '@/lib/state/store';
import type { StatCategory } from '@/lib/storage/schema';

const CAT: Record<DrillFilter, StatCategory | null> = { hard: 'hard', soft: 'soft', pair: 'pair', surrender: 'surrender', mixed: null };

export default function DrillsPage() {
  const router = useRouter();
  const data = useApp((s) => s.data);
  const [timed, setTimed] = useState(false);
  const mistakes = data.stats.mistakes.filter((m) => m.key !== 'INS').length;
  const recent = [...data.progress.drillHistory].reverse().slice(0, 5);

  return (
    <AppScreen title="Drills" back="/learn/">
      <div className="grid grid-cols-2 gap-1 rounded-2xl bg-surface p-1" role="radiogroup" aria-label="Drill mode">
        {[
          { v: false, label: 'Accuracy', sub: 'No clock' },
          { v: true, label: 'Speed', sub: `${SPEED_SECONDS}s per hand` },
        ].map((m) => (
          <button
            key={m.label}
            role="radio"
            aria-checked={timed === m.v}
            onClick={() => setTimed(m.v)}
            className={`min-h-12 rounded-xl px-3 py-1 text-center ${timed === m.v ? 'bg-gold text-black' : 'text-muted'}`}
          >
            <span className="block font-bold">{m.label}</span>
            <span className="block text-xs opacity-75">{m.sub}</span>
          </button>
        ))}
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {DRILL_FILTERS.map((f) => {
          const cat = CAT[f.id];
          const st = cat ? data.stats.categories[cat] : null;
          const acc = st ? accuracy(st.n, st.correct) : null;
          return (
            <li key={f.id}>
              <button
                onClick={() => {
                  startLibraryDrill(f.id, timed);
                  router.push('/drill/');
                }}
                className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface p-4 text-left active:bg-surface-2"
              >
                <span className="flex-1">
                  <span className="block font-bold">{f.title}</span>
                  <span className="block text-sm text-muted">{f.blurb}</span>
                </span>
                <span className="text-right text-sm tabular-nums text-muted">
                  {acc !== null ? (
                    <>
                      <span className="block text-base font-semibold text-ink">{acc}%</span>
                      {st!.n} tried
                    </>
                  ) : (
                    `${LIBRARY_SIZE} hands`
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <section className="mt-6 grid grid-cols-1 gap-2">
        <button
          disabled={!mistakes}
          onClick={() => {
            if (startReview()) router.push('/drill/');
          }}
          className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4 text-left disabled:opacity-50"
        >
          <span>
            <span className="block font-bold">Review mistakes</span>
            <span className="block text-sm text-muted">
              {mistakes ? `Replay the last ${Math.min(20, mistakes)} hands you missed. Fixed ones drop off.` : 'No mistakes to review — nice.'}
            </span>
          </span>
          <span className="text-lg font-bold tabular-nums">{mistakes}</span>
        </button>
        <Link href="/count/" className="flex items-center justify-between rounded-2xl border border-line bg-surface p-4">
          <span>
            <span className="block font-bold">Counting drill (Hi-Lo)</span>
            <span className="block text-sm text-muted">Cards flash by — keep the running count. Theory practice only.</span>
          </span>
          <span aria-hidden="true">→</span>
        </Link>
      </section>

      {recent.length > 0 && (
        <section className="mt-6">
          <h2 className="text-base font-bold">Recent drills</h2>
          <ul className="mt-2 flex flex-col divide-y divide-line rounded-2xl bg-surface px-4">
            {recent.map((r, i) => (
              <li key={i} className="flex justify-between py-3 text-sm">
                <span>
                  {r.kind === 'daily' ? 'Daily' : r.kind === 'review' ? 'Review' : r.kind === 'count' ? 'Counting' : DRILL_FILTERS.find((f) => f.id === r.mode)?.title}
                  <span className="text-muted"> · {new Date(r.t).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
                </span>
                <span className="font-semibold tabular-nums">
                  {r.correct}/{r.total}
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AppScreen>
  );
}
