'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import AppScreen from '@/components/AppScreen';
import { IconFlame, IconSnow } from '@/components/Icons';
import InstallTip from '@/components/InstallTip';
import { LESSONS, UNIT_TITLES } from '@/content/lessons';
import { addDays, localDate, money } from '@/lib/progress/dates';
import { lessonPath } from '@/lib/progress/unlock';
import { reconcileStreak } from '@/lib/progress/streak';
import { DAILY_SIZE, dailyDone, startDaily, startLibraryDrill } from '@/lib/state/drills';
import { overallAccuracy } from '@/lib/state/stats';
import { useApp } from '@/lib/state/store';

export default function TodayPage() {
  const router = useRouter();
  const data = useApp((s) => s.data);
  const today = localDate();
  const streak = reconcileStreak(data.progress.streak, today);
  const done = dailyDone(data, today);
  const result = data.progress.daily[today];
  const active = data.progress.activeDrill;
  const dailyInProgress = active?.kind === 'daily' && active.date === today;
  const path = lessonPath(LESSONS, data.progress.lessons, today, data.settings.unlockAllLessons);
  const activeLesson = data.progress.activeLesson;
  const acc = overallAccuracy(data);
  const passed = Object.values(data.progress.lessons).filter((l) => l.passedOn).length;

  const week = Array.from({ length: 7 }, (_, i) => addDays(today, i - 6));

  return (
    <AppScreen title="Today">
      <InstallTip />

      <section aria-label="Streak" className="rounded-3xl border border-line bg-surface p-5">
        <div className="flex items-center gap-4">
          <div className={`grid h-14 w-14 place-items-center rounded-2xl ${streak.current ? 'bg-gold/15 text-gold' : 'bg-surface-3 text-muted'}`}>
            <IconFlame size={30} />
          </div>
          <div className="flex-1">
            <p className="text-3xl font-bold tabular-nums leading-none">
              {streak.current} <span className="text-base font-semibold text-muted">day streak</span>
            </p>
            <p className="mt-1 text-sm text-muted">
              Best {streak.best}
              {streak.freezes > 0 && (
                <>
                  {' '}
                  · <IconSnow size={14} className="inline -mt-0.5 text-info" /> {streak.freezes} freeze{streak.freezes === 1 ? '' : 's'}
                </>
              )}
            </p>
          </div>
        </div>
        <ol className="mt-4 grid grid-cols-7 gap-1.5" aria-label="Last 7 days">
          {week.map((d) => {
            const hit = !!data.progress.daily[d];
            const froze = streak.freezesUsed.includes(d);
            const label = new Date(`${d}T12:00:00`).toLocaleDateString('en-US', { weekday: 'narrow' });
            return (
              <li key={d} className="flex flex-col items-center gap-1">
                <span
                  className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold ${
                    hit ? 'bg-gold text-black' : froze ? 'bg-info/25 text-info' : d === today ? 'border-2 border-dashed border-line' : 'bg-surface-3'
                  }`}
                  aria-label={`${d}: ${hit ? 'goal done' : froze ? 'streak freeze used' : 'no drill'}`}
                >
                  {hit ? '✓' : froze ? '❄' : ''}
                </span>
                <span className="text-[11px] text-faint">{label}</span>
              </li>
            );
          })}
        </ol>
      </section>

      <section aria-label="Daily goal" className="mt-4 rounded-3xl felt p-5 text-white shadow-lg">
        <p className="text-xs font-semibold uppercase tracking-widest text-white/70">Daily goal</p>
        <h2 className="mt-1 text-2xl font-bold">Today&apos;s drill</h2>
        {done ? (
          <>
            <p className="mt-1 text-white/80">
              Done ✓ — {result.correct}/{result.total} correct{result.perfect ? ' · perfect!' : ''}. See you tomorrow.
            </p>
            <button
              onClick={() => {
                startLibraryDrill('mixed', false);
                router.push('/drill/');
              }}
              className="mt-4 min-h-12 w-full rounded-2xl bg-white/15 font-semibold"
            >
              Practice more (doesn&apos;t change the goal)
            </button>
          </>
        ) : (
          <>
            <p className="mt-1 text-white/80">
              {dailyInProgress
                ? `${active!.answers.length} of ${DAILY_SIZE} done — pick up where you left off.`
                : `${DAILY_SIZE} quick decisions, weighted toward hands you miss. About 3 minutes.`}
            </p>
            <button
              onClick={() => {
                startDaily();
                router.push('/drill/');
              }}
              className="mt-4 min-h-12 w-full rounded-2xl bg-gold text-lg font-bold text-black"
            >
              {dailyInProgress ? 'Resume drill' : 'Start drill'}
            </button>
          </>
        )}
      </section>

      <section aria-label="Lesson" className="mt-4 rounded-3xl border border-line bg-surface p-5">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted">Lesson</p>
        {activeLesson ? (
          <LessonCta id={activeLesson.id} label="Resume lesson" />
        ) : path.next ? (
          <LessonCta id={path.next.id} label={data.progress.lessons[path.next.id]?.attempts ? 'Try again' : 'Start lesson'} />
        ) : path.unlocksTomorrow ? (
          <>
            <h2 className="mt-1 text-xl font-bold">Next lesson tomorrow</h2>
            <p className="mt-1 text-sm text-muted">
              &ldquo;{path.unlocksTomorrow.title}&rdquo; opens tomorrow. One new lesson a day keeps it sticking.
            </p>
            <Link href="/learn/" className="mt-4 flex min-h-12 items-center justify-center rounded-2xl border border-line bg-surface-2 font-semibold">
              Replay a lesson
            </Link>
          </>
        ) : (
          <>
            <h2 className="mt-1 text-xl font-bold">All caught up</h2>
            <p className="mt-1 text-sm text-muted">You&apos;ve passed every lesson so far. Drills and the table keep it fresh.</p>
          </>
        )}
      </section>

      <section className="mt-4 grid grid-cols-2 gap-3">
        <Link href="/play/" className="rounded-3xl border border-line bg-surface p-4">
          <p className="text-xs text-muted">Bankroll</p>
          <p className="mt-1 text-xl font-bold tabular-nums">
            {money(data.bankroll.balance + (data.sessions.active?.stack ?? 0))}
          </p>
          <p className="mt-2 text-sm font-semibold text-gold">Practice table →</p>
        </Link>
        <Link href="/stats/" className="rounded-3xl border border-line bg-surface p-4">
          <p className="text-xs text-muted">Strategy accuracy</p>
          <p className="mt-1 text-xl font-bold tabular-nums">{acc === null ? '—' : `${acc}%`}</p>
          <p className="mt-2 text-sm font-semibold text-gold">
            {passed}/{LESSONS.length} lessons →
          </p>
        </Link>
      </section>
    </AppScreen>
  );
}

function LessonCta({ id, label }: { id: string; label: string }) {
  const lesson = LESSONS.find((l) => l.id === id)!;
  return (
    <>
      <h2 className="mt-1 text-xl font-bold">{lesson.title}</h2>
      <p className="mt-1 text-sm text-muted">
        Unit {lesson.unit} · {UNIT_TITLES[lesson.unit]} — {lesson.summary}
      </p>
      <Link href={`/lesson/${lesson.id}/`} className="mt-4 flex min-h-12 items-center justify-center rounded-2xl bg-gold text-lg font-bold text-black">
        {label}
      </Link>
    </>
  );
}
