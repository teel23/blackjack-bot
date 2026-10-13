'use client';

import { useEffect, useRef, useState } from 'react';
import { roundInProgress } from '@/lib/state/table';
import { useApp } from '@/lib/state/store';

/** Registers the service worker and offers updates without ever reloading mid-hand. */
export default function ServiceWorker() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const updateRequested = useRef(false);
  const busy = useApp((s) => roundInProgress(s.data) || !!s.data.progress.activeDrill);

  useEffect(() => {
    if (process.env.NODE_ENV !== 'production' || !('serviceWorker' in navigator)) return;
    let reg: ServiceWorkerRegistration | undefined;
    const watch = (r: ServiceWorkerRegistration) => {
      if (r.waiting && navigator.serviceWorker.controller) setWaiting(r.waiting);
      r.addEventListener('updatefound', () => {
        const sw = r.installing;
        sw?.addEventListener('statechange', () => {
          if (sw.state === 'installed' && navigator.serviceWorker.controller) setWaiting(sw);
        });
      });
    };
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((r) => {
        reg = r;
        watch(r);
      })
      .catch(() => {});
    // Reload only when the player asked for the update — never on the first install's clients.claim().
    const onController = () => {
      if (!updateRequested.current) return;
      updateRequested.current = false;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener('controllerchange', onController);
    const onVisible = () => {
      if (document.visibilityState === 'visible') reg?.update().catch(() => {});
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onController);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  if (!waiting || busy) return null;
  return (
    <div className="fixed inset-x-0 z-40 px-safe" style={{ bottom: 'calc(var(--tabbar-h) + var(--safe-bottom) + 12px)' }}>
      <div className="mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-line bg-surface-3 p-3 shadow-2xl anim-fade">
        <p className="flex-1 text-sm">A new version of Blackjack Bot is ready.</p>
        <button
          className="min-h-11 rounded-xl bg-gold px-4 text-sm font-bold text-black"
          onClick={() => {
            updateRequested.current = true;
            waiting.postMessage({ type: 'SKIP_WAITING' });
          }}
        >
          Update
        </button>
      </div>
    </div>
  );
}
