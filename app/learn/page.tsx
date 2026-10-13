'use client';

import Link from 'next/link';
import AppScreen from '@/components/AppScreen';
import { IconCheck, IconLock } from '@/components/Icons';
import { LESSONS, UNITS, UNIT_TITLES } from '@/content/lessons';
import { localDate } from '@/lib/progress/dates';
import { lessonPath } from '@/lib/progress/unlock';
import { useApp } from '@/lib/state/store';

export default function LearnPage() {
  const data = useApp((s) => s.data);
  const today = localDate();
  const path = lessonPath(LESSONS, data.progress.lessons, today, data.settings.unlockAllLessons);
  const passed = Object.values(data.progress.lessons).filter((l) => l.passedOn).length;

  return (
    <AppScreen title="Learn">
      <Link href="/drills/" className="flex items-center justify-between rounded-3xl felt p-5 text-white shadow-lg">
        <span>
          <span className="block text-xl font-bold">Drills</span>
          <span className="mt-0.5 block text-sm text-white/75">Hard, soft, pairs, surrender, counting — speed or accuracy.</span>
        </span>
        <span aria-hidden="true" className="text-2xl">→</span>
      </Link>

      <div className="mt-6 flex items-baseline justify-between">
        <h2 className="text-lg font-bold">Lesson path</h2>
        <span className="text-sm text-muted">
          {passed}/{LESSONS.length} passed
        </span>
      </div>
      <p className="mt-1 text-sm text-muted">
        A new lesson opens each day after you pass the one before. Replay any lesson you&apos;ve opened.
      </p>

      {UNITS.map((unit) => (
        <section key={unit.number} className="mt-5" aria-label={`Unit ${unit.number}: ${unit.title}`}>
          <h3 className="text-xs font-semibold uppercase tracking-widest text-muted">
            Unit {unit.number} · {UNIT_TITLES[unit.number]}
          </h3>
          <ol className="mt-2 flex flex-col gap-2">
            {unit.lessons.map((lesson) => {
              const state = path.states[lesson.id];
              const p = data.progress.lessons[lesson.id];
              const inner = (
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-10 w-10 shrink-0 place-items-center rounded-full ${
                      state === 'passed' ? 'bg-good text-black' : state === 'available' ? 'bg-gold text-black' : 'bg-surface-3 text-faint'
                    }`}
                    aria-hidden="true"
                  >
                    {state === 'passed' ? <IconCheck size={20} /> : state === 'locked' ? <IconLock size={18} /> : '▶'}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={`block font-semibold ${state === 'locked' ? 'text-muted' : ''}`}>{lesson.title}</span>
                    <span className="block truncate text-sm text-muted">
                      {state === 'locked'
                        ? path.unlocksTomorrow?.id === lesson.id
                          ? 'Unlocks tomorrow'
                          : 'Locked'
                        : p?.bestPct
                          ? `Best ${p.bestPct}% · ${lesson.summary}`
                          : lesson.summary}
                    </span>
                  </span>
                </div>
              );
              return (
                <li key={lesson.id}>
                  {state === 'locked' ? (
                    <div className="rounded-2xl bg-surface p-3" aria-label={`${lesson.title}, locked`} role="group">
                      {inner}
                    </div>
                  ) : (
                    <Link href={`/lesson/${lesson.id}/`} className="block rounded-2xl border border-line bg-surface p-3 active:bg-surface-2">
                      {inner}
                    </Link>
                  )}
                </li>
              );
            })}
          </ol>
        </section>
      ))}
    </AppScreen>
  );
}
