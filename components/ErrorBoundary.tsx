'use client';

import { Component, type ReactNode } from 'react';
import { update } from '@/lib/state/store';

/** Clears in-progress state (a hand, lesson, or drill) that might be what's crashing. Money only moves at settlement, so nothing is lost. */
export function clearInProgress() {
  update((d) => {
    d.table.round = null;
    d.table.undo = null;
    d.table.feedback = null;
    d.table.hint = null;
    d.progress.activeLesson = null;
    d.progress.activeDrill = null;
  });
}

export function ErrorFallback({ onReset }: { onReset?: () => void }) {
  return (
    <div role="alert" className="mx-auto max-w-md px-safe py-10 text-center">
      <p className="text-4xl" aria-hidden="true">🃏</p>
      <h2 className="mt-3 text-xl font-bold">Something went wrong on this screen</h2>
      <p className="mt-2 text-sm text-muted">Your saved progress and bankroll are safe.</p>
      <div className="mt-6 flex flex-col gap-3">
        <button
          className="min-h-12 rounded-2xl bg-gold px-4 font-bold text-black"
          onClick={() => {
            onReset?.();
            window.location.reload();
          }}
        >
          Reload
        </button>
        <button
          className="min-h-12 rounded-2xl border border-line bg-surface-2 px-4 font-semibold"
          onClick={() => {
            clearInProgress();
            window.location.reload();
          }}
        >
          Clear the current hand/lesson and reload
        </button>
      </div>
    </div>
  );
}

export default class ErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  componentDidCatch(error: Error) {
    console.error('Screen error', error);
  }
  render() {
    if (this.state.error) return <ErrorFallback />;
    return this.props.children;
  }
}
