'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppScreen from '@/components/AppScreen';
import { LESSONS } from '@/content/lessons';
import { cardLabel } from '@/lib/engine/cards';
import { localDate } from '@/lib/progress/dates';
import { reconcileStreak } from '@/lib/progress/streak';
import { startReview } from '@/lib/state/drills';
import { accuracy, overallAccuracy } from '@/lib/state/stats';
import { useApp } from '@/lib/state/store';
import { situationLabel } from '@/lib/state/table';
import { ACTION_LABEL, parseSituationKey } from '@/lib/strategy/chart';
import type { StatCategory } from '@/lib/storage/schema';

const CATS: { id: StatCategory; label: string }[] = [
  { id: 'hard', label: 'Hard totals' },
  { id: 'soft', label: 'Soft totals' },
  { id: 'pair', label: 'Pairs' },
  { id: 'surrender', label: 'Surrender' },
  { id: 'insurance', label: 'Insurance' },
];

function label(action: string) {
  if (action === 'insurance') return 'Insurance';
  if (action === 'no-insurance') return 'No insurance';
  if (action === 'timeout') return 'Ran out of time';
  return ACTION_LABEL[action as keyof typeof ACTION_LABEL] ?? action;
}

export default function StatsPage() {
  const router = useRouter();
  const data = useApp((s) => s.data);
  const { stats, progress } = data;
  const overall = overallAccuracy(data);
  const streak = reconcileStreak(progress.streak, localDate());
  const lessonsDone = Object.values(progress.lessons).filter((l) => l.passedOn).length;
  const missed = Object.entries(stats.cells)
    .map(([key, c]) => ({ key, misses: c.n - c.correct, n: c.n, acc: accuracy(c.n, c.correct) ?? 0 }))
    .filter((x) => x.misses > 0)
    .sort((a, b) => b.misses - a.misses || a.acc - b.acc)
    .slice(0, 8);
  const reviewable = stats.mistakes.filter((m) => m.key !== 'INS');
  const recent = [...stats.mistakes].reverse().slice(0, 10);

  return (
    <AppScreen title="Stats">
      <section aria-label="Overall accuracy">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Strategy accuracy</p>
        <p className="mt-1 text-6xl font-bold tabular-nums">{overall === null ? '—' : `${overall}%`}</p>
        <p className="mt-1 text-sm text-muted">
          {stats.decisions.toLocaleString()} decisions · hints don&apos;t count toward accuracy ({stats.hints} used)
        </p>
      </section>

      <section className="mt-6 rounded-3xl border border-line bg-surface p-4" aria-label="Accuracy by category">
        <h2 className="text-base font-bold">By category</h2>
        <ul className="mt-3 flex flex-col gap-3">
          {CATS.map(({ id, label: name }) => {
            const c = stats.categories[id];
            const acc = accuracy(c.n, c.correct);
            return (
              <li key={id}>
                <div className="flex justify-between text-sm">
                  <span className="font-semibold">{name}</span>
                  <span className="tabular-nums text-muted">
                    {acc === null ? 'No data yet' : `${acc}% · ${c.n}`}
                  </span>
                </div>
                <div className="mt-1.5 h-3 w-full rounded-full bg-surface-3" aria-hidden="true">
                  {acc !== null && <div className="h-3 rounded-full bg-gold" style={{ width: `${Math.max(2, acc)}%` }} />}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-4 grid grid-cols-2 gap-2" aria-label="Totals">
        <Tile label="Hands played" value={stats.handsPlayed.toLocaleString()} />
        <Tile label="Lessons passed" value={`${lessonsDone} / ${LESSONS.length}`} />
        <Tile label="Current streak" value={`${streak.current} day${streak.current === 1 ? '' : 's'}`} />
        <Tile label="Best streak" value={`${streak.best} day${streak.best === 1 ? '' : 's'}`} />
      </section>

      <section className="mt-6">
        <div className="flex items-baseline justify-between">
          <h2 className="text-base font-bold">Most-missed hands</h2>
          <Link href="/chart/" className="min-h-11 content-center text-sm font-semibold text-info">
            Chart
          </Link>
        </div>
        {missed.length === 0 ? (
          <p className="rounded-2xl bg-surface p-4 text-sm text-muted">Nothing missed yet. Play a few hands or a drill.</p>
        ) : (
          <ol className="flex flex-col divide-y divide-line rounded-2xl bg-surface px-4">
            {missed.map((m) => {
              const s = parseSituationKey(m.key);
              return (
                <li key={m.key} className="flex items-center justify-between py-3">
                  <span className="font-semibold">{s ? situationLabel(s) : m.key === 'INS' ? 'Insurance' : m.key}</span>
                  <span className="text-sm tabular-nums text-muted">
                    missed {m.misses} of {m.n}
                  </span>
                </li>
              );
            })}
          </ol>
        )}
      </section>

      <section className="mt-6">
        <h2 className="text-base font-bold">Review mistakes</h2>
        <p className="mt-1 text-sm text-muted">Replays the exact hands you missed most recently. Get one right and it drops off the list.</p>
        <button
          disabled={!reviewable.length}
          onClick={() => {
            if (startReview()) router.push('/drill/');
          }}
          className="mt-3 min-h-12 w-full rounded-2xl bg-gold font-bold text-black disabled:opacity-40"
        >
          {reviewable.length ? `Review ${Math.min(20, reviewable.length)} hand${reviewable.length === 1 ? '' : 's'}` : 'No mistakes to review'}
        </button>
        {recent.length > 0 && (
          <ul className="mt-3 flex flex-col gap-2">
            {recent.map((m) => {
              const s = parseSituationKey(m.key);
              return (
                <li key={m.id} className="rounded-2xl bg-surface p-3 text-sm">
                  <div className="flex justify-between gap-2">
                    <span className="font-semibold">
                      {m.cards.map(cardLabel).join(' ')} <span className="text-muted">vs</span> {cardLabel(m.up)}
                    </span>
                    <span className="text-xs text-faint">{m.source}</span>
                  </div>
                  <p className="mt-1 text-muted">
                    {s ? `${situationLabel(s)}: ` : ''}you chose <span className="text-bad">{label(m.chosen)}</span>, correct was{' '}
                    <span className="text-good">{label(m.correct)}</span>
                  </p>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </AppScreen>
  );
}

function Tile({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl bg-surface p-3">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-0.5 text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
