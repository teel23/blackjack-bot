'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { play as sfx } from '@/lib/audio';
import type { Action } from '@/lib/engine/round';
import { usePrefersReducedMotion } from '@/lib/hooks';
import { grade } from '@/lib/learn';
import { DRILL_FILTERS } from '@/lib/progress/drillPicker';
import {
  type DrillSummary,
  SPEED_SECONDS,
  abandonDrill,
  drillAnswer,
  drillHand,
  drillNext,
  startReview,
} from '@/lib/state/drills';
import { useApp } from '@/lib/state/store';
import { situationLabel } from '@/lib/state/table';
import { ACTION_LABEL } from '@/lib/strategy/chart';
import { FocusScreen } from '../AppScreen';
import { ActionPad, BottomBar, DecisionTable, ProgressBar } from './Bits';

function drillTitle(kind: string, mode: string) {
  if (kind === 'daily') return 'Daily drill';
  if (kind === 'review') return 'Review mistakes';
  return `${DRILL_FILTERS.find((f) => f.id === mode)?.title ?? 'Drill'} drill`;
}

export default function DrillPlayer() {
  const router = useRouter();
  const drill = useApp((s) => s.data.progress.activeDrill);
  const rules = useApp((s) => s.data.settings.rules);
  const [summary, setSummary] = useState<DrillSummary | null>(null);
  const [chosen, setChosen] = useState<Action | 'timeout' | null>(null);
  const reduced = usePrefersReducedMotion();
  const shownAt = useRef(0);

  const hand = useMemo(() => (drill ? drillHand(drill) : null), [drill]);
  const g = useMemo(() => (hand ? grade(hand.cards, hand.up, rules, undefined, hand.legal) : null), [hand, rules]);
  const answered = !!drill && drill.answers.length > drill.index;
  const last = answered ? drill!.answers[drill!.index] : null;

  useEffect(() => {
    shownAt.current = performance.now();
  }, [drill?.index, drill?.seed]);

  const next = useCallback(() => {
    setChosen(null);
    const s = drillNext();
    if (s) setSummary(s);
  }, []);

  const pick = useCallback(
    (a: Action | 'timeout') => {
      if (!drill || answered || !g) return;
      setChosen(a);
      const ok = a === g.rec.action;
      sfx(ok ? 'correct' : 'wrong');
      drillAnswer(a, Math.round(performance.now() - shownAt.current));
    },
    [drill, answered, g],
  );

  // Correct answers move on by themselves; misses wait so you can read the fix.
  useEffect(() => {
    if (!answered || !last?.ok) return;
    const t = setTimeout(next, reduced ? 900 : 650);
    return () => clearTimeout(t);
  }, [answered, last?.ok, next, reduced, drill?.index]);

  if (summary) return <DrillDone s={summary} onReview={() => { if (startReview()) setSummary(null); }} />;

  if (!drill || !hand || !g) {
    return (
      <FocusScreen title="Drill" closeHref="/learn/">
        <div className="py-12 text-center">
          <p className="text-muted">No drill in progress.</p>
          <Link href="/learn/" className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-gold px-6 font-bold text-black">
            Pick a drill
          </Link>
        </div>
      </FocusScreen>
    );
  }

  const close = () => {
    if (drill.kind !== 'daily') abandonDrill();
    router.push(drill.kind === 'daily' ? '/' : '/learn/');
  };
  const sit = g.rec.situation;

  return (
    <FocusScreen
      onClose={close}
      title={
        <span className="flex flex-col items-center gap-1.5">
          <span className="text-xs text-muted">
            {drillTitle(drill.kind, drill.mode)} · {Math.min(drill.index + 1, drill.queue.length)} / {drill.queue.length}
          </span>
          <ProgressBar value={drill.index / drill.queue.length} label="Drill progress" />
        </span>
      }
    >
      <div className="flex flex-1 flex-col pt-3">
        {drill.timed && !answered && <Timer key={drill.index} seconds={SPEED_SECONDS} onTimeout={() => pick('timeout')} />}
        <h2 className="mt-1 text-xl font-bold">What&apos;s the play?</h2>
        <div className="mt-3" key={drill.index}>
          <DecisionTable cards={hand.cards} up={hand.up} width={70} />
        </div>
        {answered && last && (
          <div
            role="status"
            className={`anim-fade mt-3 rounded-2xl border p-3 ${last.ok ? 'border-good/50 bg-good/10' : 'border-bad/50 bg-bad/10'}`}
          >
            <p className="font-bold">
              <span aria-hidden="true">{last.ok ? '✅ ' : '❌ '}</span>
              {last.ok
                ? `${ACTION_LABEL[g.rec.action]} — correct`
                : `${situationLabel(sit)}: ${ACTION_LABEL[g.rec.action]}${chosen === 'timeout' ? ' (time ran out)' : ''}`}
            </p>
            {!last.ok && <p className="mt-1 text-[0.9375rem] text-muted">{g.reason}</p>}
          </div>
        )}
        <BottomBar>
          {answered && !last?.ok ? (
            <button onClick={next} className="h-[56px] w-full rounded-2xl bg-gold text-lg font-bold text-black">
              {drill.index + 1 >= drill.queue.length ? 'Finish' : 'Next'}
            </button>
          ) : (
            <ActionPad
              legal={g.legal}
              onPick={pick}
              disabled={answered}
              marks={answered ? { chosen: chosen === 'timeout' ? null : chosen, correct: g.rec.action } : undefined}
            />
          )}
        </BottomBar>
      </div>
    </FocusScreen>
  );
}

function Timer({ seconds, onTimeout }: { seconds: number; onTimeout: () => void }) {
  const cb = useRef(onTimeout);
  useEffect(() => {
    cb.current = onTimeout;
  });
  useEffect(() => {
    const t = setTimeout(() => cb.current(), seconds * 1000);
    return () => clearTimeout(t);
  }, [seconds]);
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-surface-3" aria-hidden="true">
      <div className="h-full w-full origin-left rounded-full bg-info" style={{ animation: `drill-timer ${seconds}s linear forwards` }} />
      <style>{'@keyframes drill-timer { from { transform: scaleX(1) } to { transform: scaleX(0) } }'}</style>
    </div>
  );
}

function DrillDone({ s, onReview }: { s: DrillSummary; onReview: () => void }) {
  const pct = Math.round((s.correct / Math.max(1, s.total)) * 100);
  const avg = (s.ms / Math.max(1, s.total) / 1000).toFixed(1);
  return (
    <FocusScreen title={drillTitle(s.kind, s.mode)} closeHref={s.kind === 'daily' ? '/' : '/learn/'}>
      <div className="anim-fade flex flex-1 flex-col items-center pt-10 text-center">
        <p className="text-6xl" aria-hidden="true">{s.perfect ? '🏆' : pct >= 80 ? '🔥' : '💪'}</p>
        <h2 className="mt-4 text-3xl font-bold">
          {s.correct} / {s.total}
        </h2>
        <p className="mt-1 text-muted">
          {pct}% correct · {avg}s per decision
        </p>
        {s.kind === 'daily' && (
          <p className="mt-4 rounded-2xl bg-surface px-4 py-3 text-[0.9375rem]">
            Daily goal done — streak: <strong>{s.streak} day{s.streak === 1 ? '' : 's'}</strong>
            {s.earnedFreeze ? ' · Perfect drill earned a streak freeze ❄️' : ''}
          </p>
        )}
        {s.missed.length > 0 && <p className="mt-4 text-sm text-muted">Missed: {s.missed.length}. They’ll show up more often in your drills.</p>}
      </div>
      <BottomBar>
        <div className="flex flex-col gap-2">
          {s.missed.length > 0 && (
            <button onClick={onReview} className="h-[56px] w-full rounded-2xl bg-gold text-lg font-bold text-black">
              Review my mistakes
            </button>
          )}
          <Link
            href={s.kind === 'daily' ? '/' : '/learn/'}
            className={`flex h-[56px] w-full items-center justify-center rounded-2xl text-lg font-bold ${s.missed.length ? 'border border-line bg-surface' : 'bg-gold text-black'}`}
          >
            Done
          </Link>
        </div>
      </BottomBar>
    </FocusScreen>
  );
}
