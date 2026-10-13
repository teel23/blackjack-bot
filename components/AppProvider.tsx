'use client';

import { useEffect } from 'react';
import { hydrate, useApp } from '@/lib/state/store';
import '@/lib/state/progress';
import NoticeBanner from './NoticeBanner';
import ServiceWorker from './ServiceWorker';
import DynamicType from './DynamicType';
import { useAudioUnlock } from '@/lib/audio';

export default function AppProvider({ children }: { children: React.ReactNode }) {
  const hydrated = useApp((s) => s.hydrated);
  useEffect(() => {
    hydrate();
  }, []);
  useAudioUnlock();

  return (
    <>
      {hydrated ? (
        children
      ) : (
        <div className="felt grid min-h-dvh place-items-center" aria-busy="true" aria-label="Loading Blackjack Bot">
          <Logo />
        </div>
      )}
      <NoticeBanner />
      <ServiceWorker />
      <DynamicType />
    </>
  );
}

export function Logo({ size = 72 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      <rect x="10" y="8" width="30" height="42" rx="5" fill="#fff" transform="rotate(-10 25 29)" />
      <rect x="24" y="12" width="30" height="42" rx="5" fill="#fff" stroke="#0a100e" strokeWidth="1.5" transform="rotate(8 39 33)" />
      <path
        d="M39 24c-4 5-9 7-9 12a4.5 4.5 0 0 0 7.5 3.3L36 44h6l-1.5-4.7A4.5 4.5 0 0 0 48 36c0-5-5-7-9-12z"
        fill="#0a100e"
        transform="rotate(8 39 33)"
      />
    </svg>
  );
}
