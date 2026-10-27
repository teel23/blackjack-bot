'use client';

import { useEffect, useState } from 'react';
import { syncNow, useSync } from '@/lib/sync/engine';
import { shortPath, statusText } from '@/lib/sync/format';

/** Settings → Mac sync. Only shown in the copy of the app served by the home server. */
export default function MacSyncCard() {
  const s = useSync();
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, []);
  if (s.status === 'hidden') return null;

  return (
    <section className="mt-6" aria-labelledby="mac-sync-title">
      <h2 id="mac-sync-title" className="mb-2 text-xs font-semibold uppercase tracking-widest text-muted">
        Mac sync
      </h2>
      <div className="flex flex-col gap-2 rounded-2xl bg-surface-2 px-4 py-3">
        <p role="status" data-testid="sync-status" className="text-sm font-semibold leading-5">
          {s.syncing ? 'Copying to your Mac…' : statusText(s, now)}
        </p>
        {s.savePath && <p className="break-all font-mono text-xs leading-5 text-muted">{shortPath(s.savePath)}</p>}
        <button
          onClick={() => {
            setNow(Date.now());
            void syncNow();
          }}
          disabled={s.syncing}
          className="min-h-12 rounded-2xl border border-line bg-surface font-semibold disabled:opacity-60"
        >
          Sync now
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-faint">
        Progress saves on this phone after every move. When your Mac is reachable on home Wi-Fi, a copy goes there too.
      </p>
    </section>
  );
}
