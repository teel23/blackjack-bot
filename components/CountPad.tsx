'use client';

import { signedCount as signed } from '@/lib/count';

/** Signed number entry — iOS's numeric keyboard has no minus key, so use big ± buttons. */
export default function CountPad({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const clamp = (v: number) => Math.max(-30, Math.min(30, v));
  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-3">
      <output aria-live="polite" aria-label="Your count" className="text-6xl font-bold tabular-nums">
        {signed(value)}
      </output>
      <div className="grid w-full grid-cols-2 gap-3">
        <button onClick={() => onChange(clamp(value - 1))} aria-label="Minus one" className="h-16 rounded-2xl bg-surface-2 text-3xl font-bold">
          −1
        </button>
        <button onClick={() => onChange(clamp(value + 1))} aria-label="Plus one" className="h-16 rounded-2xl bg-surface-2 text-3xl font-bold">
          +1
        </button>
        <button onClick={() => onChange(clamp(value - 5))} aria-label="Minus five" className="h-12 rounded-2xl bg-surface text-lg font-semibold">
          −5
        </button>
        <button onClick={() => onChange(clamp(value + 5))} aria-label="Plus five" className="h-12 rounded-2xl bg-surface text-lg font-semibold">
          +5
        </button>
      </div>
      <button onClick={() => onChange(0)} className="min-h-11 text-sm text-muted underline">
        Reset to 0
      </button>
    </div>
  );
}
