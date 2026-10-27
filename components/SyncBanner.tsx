'use client';

import { useState } from 'react';
import { useApp } from '@/lib/state/store';
import { safeToAdopt } from '@/lib/sync/decide';
import { chooseLocal, chooseMac, useSync } from '@/lib/sync/engine';
import { when } from '@/lib/sync/format';

/** Both this device and the Mac changed. Nothing is lost: the copy you don't keep is archived on the Mac. */
export default function SyncBanner() {
  const conflict = useSync((s) => s.conflict);
  const safe = useApp((s) => safeToAdopt(s.data));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!conflict) return null;

  const pick = async (fn: () => Promise<boolean>) => {
    setBusy(true);
    setError(null);
    const ok = await fn();
    setBusy(false);
    if (!ok) setError("Couldn't reach your Mac — nothing changed. Try again at home.");
  };

  return (
    <div role="alert" className="fixed inset-x-0 top-0 z-50 px-safe" style={{ paddingTop: 'calc(var(--safe-top) + 8px)' }}>
      <div className="mx-auto max-w-md rounded-2xl border border-line bg-surface-3 p-3 shadow-2xl anim-fade">
        <p className="text-sm leading-5">
          Your Mac has different progress from <strong>{when(conflict.updatedAt)}</strong>. The one you don&apos;t keep is saved on the Mac.
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button disabled={busy} onClick={() => pick(chooseLocal)} className="min-h-11 rounded-xl bg-gold px-2 text-sm font-bold text-black disabled:opacity-50">
            Keep this phone&apos;s
          </button>
          <button
            disabled={busy || !safe}
            onClick={() => pick(chooseMac)}
            className="min-h-11 rounded-xl border border-line bg-surface-2 px-2 text-sm font-semibold disabled:opacity-50"
          >
            Use the Mac&apos;s
          </button>
        </div>
        {!safe && <p className="mt-2 text-xs text-muted">Finish this hand, lesson or drill to use the Mac&apos;s copy.</p>}
        {error && <p className="mt-2 text-xs text-muted">{error}</p>}
      </div>
    </div>
  );
}
