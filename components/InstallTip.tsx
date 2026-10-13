'use client';

import { useSyncExternalStore } from 'react';
import { useIsStandalone } from '@/lib/hooks';
import { update, useApp } from '@/lib/state/store';
import { IconClose } from './Icons';

const noop = () => () => {};
function isIOS() {
  const ua = navigator.userAgent;
  return /iPhone|iPad|iPod/.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

/** One-time iOS "Add to Home Screen" tip. Installing also protects saved progress from Safari's cleanup. */
export default function InstallTip() {
  const dismissed = useApp((s) => s.data.settings.installTipDismissed);
  const standalone = useIsStandalone();
  const ios = useSyncExternalStore(noop, isIOS, () => false);
  if (dismissed || standalone || !ios) return null;
  return (
    <section aria-label="Install tip" className="mb-4 rounded-3xl border border-info/40 bg-info/10 p-4">
      <div className="flex items-start gap-3">
        <div className="flex-1">
          <h2 className="font-bold">Add Blackjack Bot to your Home Screen</h2>
          <p className="mt-1 text-sm text-muted">
            It opens full-screen, works offline, and keeps your progress safer — Safari can clear data for sites you
            haven&apos;t visited in a while.
          </p>
          <ol className="mt-2 list-decimal pl-5 text-sm">
            <li>
              Tap the <strong>Share</strong> button{' '}
              <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" className="inline -mt-1" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 3v12M7 8l5-5 5 5M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-7" />
              </svg>{' '}
              in Safari&apos;s toolbar.
            </li>
            <li>
              Choose <strong>Add to Home Screen</strong>, then <strong>Add</strong>.
            </li>
          </ol>
        </div>
        <button
          aria-label="Dismiss install tip"
          onClick={() => update((d) => void (d.settings.installTipDismissed = true))}
          className="-mr-2 -mt-2 grid min-h-11 min-w-11 place-items-center rounded-full text-muted"
        >
          <IconClose size={20} />
        </button>
      </div>
    </section>
  );
}
