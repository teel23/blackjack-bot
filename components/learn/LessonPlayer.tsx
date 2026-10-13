'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LESSONS, UNIT_TITLES, getLesson } from '@/content/lessons';
import type { ChoiceQuestion, DecisionQuestion } from '@/content/lessons/types';
import { play as sfx } from '@/lib/audio';
import type { Action } from '@/lib/engine/round';
import { gradeLessonQuestion } from '@/lib/learn';
import { localDate } from '@/lib/progress/dates';
import { lessonPath } from '@/lib/progress/unlock';
import { type LessonResult, abandonLesson, finishLesson, lessonAnswer, lessonNext, openLesson } from '@/lib/state/learn';
import { useApp } from '@/lib/state/store';
import { ACTION_LABEL } from '@/lib/strategy/chart';
import { FocusScreen } from '../AppScreen';
import { ActionPad, BottomBar, DecisionTable, ProgressBar, RichText, Visual } from './Bits';

export default function LessonPlayer({ id }: { id: string }) {
  const lesson = getLesson(id);
  const router = useRouter();
  const data = useApp((s) => s.data);
  const active = data.progress.activeLesson;
  const [result, setResult] = useState<LessonResult | null>(null);
  const today = localDate();
  const path = lessonPath(LESSONS, data.progress.lessons, today, data.settings.unlockAllLessons);
  const locked = !lesson || path.states[lesson.id] === 'locked';

  useEffect(() => {
    if (lesson && !locked && !result) openLesson(lesson.id);
  }, [lesson, locked, result]);

  if (!lesson) {
    return (
      <FocusScreen title="Lesson" closeHref="/learn/">
        <p className="py-10 text-center text-muted">That lesson doesn&apos;t exist.</p>
      </FocusScreen>
    );
  }
  if (locked) {
    return (
      <FocusScreen title={lesson.title} closeHref="/learn/">
        <div className="py-12 text-center">
          <p className="text-4xl" aria-hidden="true">🔒</p>
          <h2 className="mt-3 text-xl font-bold">Not unlocked yet</h2>
          <p className="mt-2 text-muted">One new lesson opens each day after you pass the one before it.</p>
          <Link href="/learn/" className="mt-6 inline-flex min-h-12 items-center rounded-2xl bg-gold px-6 font-bold text-black">
            Back to lessons
          </Link>
        </div>
      </FocusScreen>
    );
  }

  const close = () => {
    router.push('/learn/');
  };

  if (result) return <LessonDone lessonId={lesson.id} result={result} onRetry={() => { setResult(null); openLesson(lesson.id, true); }} />;
  if (!active || active.id !== lesson.id) return <FocusScreen title={lesson.title} onClose={close}>{null}</FocusScreen>;

  const totalSteps = lesson.cards.length + lesson.questions.length;
  const step = Math.min(active.step, totalSteps);
  const header = (
    <span className="flex flex-col items-center gap-1.5">
      <span className="text-xs text-muted">
        Unit {lesson.unit} · {UNIT_TITLES[lesson.unit]}
      </span>
      <ProgressBar value={step / totalSteps} label="Lesson progress" />
    </span>
  );

  if (step < lesson.cards.length) {
    const card = lesson.cards[step];
    const last = step === lesson.cards.length - 1;
    return (
      <FocusScreen title={header} onClose={close}>
        <article className="anim-fade flex flex-1 flex-col pt-4" key={step}>
          <p className="text-sm font-semibold text-gold">{lesson.title}</p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">{card.title}</h2>
          {card.visual && (
            <div className="mt-4">
              <Visual v={card.visual} />
            </div>
          )}
          <RichText text={card.body} className="mt-4 text-[17px] leading-relaxed text-muted" />
        </article>
        <BottomBar>
          <button onClick={lessonNext} className="h-[56px] w-full rounded-2xl bg-gold text-lg font-bold text-black">
            {last ? 'Start practice' : 'Next'}
          </button>
        </BottomBar>
      </FocusScreen>
    );
  }

  const qi = step - lesson.cards.length;
  if (qi >= lesson.questions.length) {
    return (
      <FocusScreen title={header} onClose={close}>
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-lg font-semibold">All questions answered.</p>
          <button onClick={() => setResult(finishLesson())} className="h-[56px] w-full rounded-2xl bg-gold text-lg font-bold text-black">
            See result
          </button>
        </div>
      </FocusScreen>
    );
  }

  const q = lesson.questions[qi];
  const answered = active.answers.length > qi;
  const onContinue = () => {
    if (qi === lesson.questions.length - 1) {
      setResult(finishLesson());
    } else lessonNext();
  };

  return (
    <FocusScreen title={header} onClose={close}>
      <div className="flex flex-1 flex-col pt-3" key={`q${qi}`}>
        <p className="text-sm text-muted">
          Question {qi + 1} of {lesson.questions.length}
        </p>
        {q.type === 'decision' ? (
          <DecisionStep q={q} answered={answered} ok={active.answers[qi]} onContinue={onContinue} />
        ) : (
          <ChoiceStep q={q} answered={answered} ok={active.answers[qi]} onContinue={onContinue} />
        )}
      </div>
    </FocusScreen>
  );
}

function Feedback({ ok, title, body }: { ok: boolean; title: string; body: string }) {
  return (
    <div role="status" className={`anim-fade mt-3 rounded-2xl border p-3 ${ok ? 'border-good/50 bg-good/10' : 'border-bad/50 bg-bad/10'}`}>
      <p className="font-bold">
        <span aria-hidden="true">{ok ? '✅ ' : '❌ '}</span>
        {title}
      </p>
      <p className="mt-1 text-[15px] text-muted">{body}</p>
    </div>
  );
}

function DecisionStep({ q, answered, ok, onContinue }: { q: DecisionQuestion; answered: boolean; ok?: boolean; onContinue: () => void }) {
  const g = useMemo(() => gradeLessonQuestion(q), [q]);
  const [chosen, setChosen] = useState<Action | null>(null);
  const pick = (a: Action) => {
    if (answered) return;
    const right = a === g.rec.action;
    setChosen(a);
    sfx(right ? 'correct' : 'wrong');
    lessonAnswer(right, { q, chosen: a });
  };
  return (
    <>
      <h2 className="mt-1 text-xl font-bold">{q.prompt ?? 'What\'s the play?'}</h2>
      <div className="mt-3">
        <DecisionTable cards={g.cards} up={g.up} />
      </div>
      {answered && (
        <Feedback
          ok={!!ok}
          title={ok ? `${ACTION_LABEL[g.rec.action]} — correct` : `The play is ${ACTION_LABEL[g.rec.action]}`}
          body={[g.reason, q.explain].filter(Boolean).join(' ')}
        />
      )}
      <BottomBar>
        {answered ? (
          <button onClick={onContinue} className="h-[56px] w-full rounded-2xl bg-gold text-lg font-bold text-black">
            Continue
          </button>
        ) : (
          <ActionPad legal={g.legal} onPick={pick} />
        )}
        {answered && chosen === null && <span className="sr-only">Already answered</span>}
      </BottomBar>
    </>
  );
}

function ChoiceStep({ q, answered, ok, onContinue }: { q: ChoiceQuestion; answered: boolean; ok?: boolean; onContinue: () => void }) {
  const [picked, setPicked] = useState<number | null>(null);
  const pick = (i: number) => {
    if (answered) return;
    setPicked(i);
    const right = i === q.answer;
    sfx(right ? 'correct' : 'wrong');
    lessonAnswer(right);
  };
  return (
    <>
      <h2 className="mt-1 text-xl font-bold">{q.prompt}</h2>
      {q.visual && (
        <div className="mt-3">
          <Visual v={q.visual} />
        </div>
      )}
      <div className="mt-4 flex flex-col gap-2" role="radiogroup" aria-label="Answers">
        {q.options.map((opt, i) => {
          const isAnswer = answered && i === q.answer;
          const isWrongPick = answered && picked === i && i !== q.answer;
          return (
            <button
              key={i}
              role="radio"
              aria-checked={picked === i}
              disabled={answered}
              onClick={() => pick(i)}
              className={`min-h-[52px] rounded-2xl border px-4 py-2 text-left text-[17px] font-semibold transition-colors ${
                isAnswer ? 'border-good bg-good/15' : isWrongPick ? 'border-bad bg-bad/15' : 'border-line bg-surface'
              } ${answered && !isAnswer && !isWrongPick ? 'opacity-50' : ''}`}
            >
              {opt}
              {isAnswer && <span className="sr-only"> (correct answer)</span>}
            </button>
          );
        })}
      </div>
      {answered && <Feedback ok={!!ok} title={ok ? 'Correct' : `Answer: ${q.options[q.answer]}`} body={q.explain} />}
      <BottomBar>
        <button
          onClick={onContinue}
          disabled={!answered}
          className="h-[56px] w-full rounded-2xl bg-gold text-lg font-bold text-black disabled:opacity-30"
        >
          {answered ? 'Continue' : 'Pick an answer'}
        </button>
      </BottomBar>
    </>
  );
}

function LessonDone({ lessonId, result, onRetry }: { lessonId: string; result: LessonResult; onRetry: () => void }) {
  const lesson = getLesson(lessonId)!;
  const idx = LESSONS.findIndex((l) => l.id === lessonId);
  const nextLesson = LESSONS[idx + 1];
  return (
    <FocusScreen title={lesson.title} closeHref="/learn/">
      <div className="anim-fade flex flex-1 flex-col items-center pt-10 text-center">
        <p className="text-6xl" aria-hidden="true">{result.passed ? '🎉' : '📚'}</p>
        <h2 className="mt-4 text-3xl font-bold">{result.passed ? 'Lesson passed' : 'Not quite'}</h2>
        <p className="mt-2 text-lg text-muted">
          {result.correct} of {result.total} correct · {result.pct}%
        </p>
        <p className="mt-4 max-w-xs text-muted">
          {result.passed
            ? nextLesson
              ? result.firstPass
                ? `"${nextLesson.title}" unlocks tomorrow. Come back for it — and do today's drill to keep your streak.`
                : `Nice review. Next up: "${nextLesson.title}".`
              : 'That\'s the last lesson in the path for now.'
            : `You need ${lesson.passPct ?? 80}% to pass. Try again — the explanations are the fastest way to get it.`}
        </p>
      </div>
      <BottomBar>
        <div className="flex flex-col gap-2">
          {!result.passed && (
            <button onClick={onRetry} className="h-[56px] w-full rounded-2xl bg-gold text-lg font-bold text-black">
              Try again
            </button>
          )}
          <Link
            href="/"
            onClick={() => abandonLesson()}
            className={`flex h-[56px] w-full items-center justify-center rounded-2xl text-lg font-bold ${result.passed ? 'bg-gold text-black' : 'border border-line bg-surface'}`}
          >
            Done
          </Link>
        </div>
      </BottomBar>
    </FocusScreen>
  );
}
