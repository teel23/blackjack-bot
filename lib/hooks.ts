'use client';

import { useSyncExternalStore } from 'react';
import type { AnimSpeed } from './storage/schema';

function subscribeResize(cb: () => void) {
  window.addEventListener('resize', cb);
  window.visualViewport?.addEventListener('resize', cb);
  window.addEventListener('orientationchange', cb);
  return () => {
    window.removeEventListener('resize', cb);
    window.visualViewport?.removeEventListener('resize', cb);
    window.removeEventListener('orientationchange', cb);
  };
}

let cached = { w: 375, h: 667 };
function snapshotViewport() {
  const w = window.innerWidth;
  const h = window.visualViewport?.height ?? window.innerHeight;
  if (w !== cached.w || h !== cached.h) cached = { w, h };
  return cached;
}
const serverViewport = { w: 375, h: 667 };

export function useViewport() {
  return useSyncExternalStore(subscribeResize, snapshotViewport, () => serverViewport);
}

function subscribeMedia(query: string) {
  return (cb: () => void) => {
    const mq = window.matchMedia(query);
    mq.addEventListener('change', cb);
    return () => mq.removeEventListener('change', cb);
  };
}
const subscribeReduced = subscribeMedia('(prefers-reduced-motion: reduce)');

export function usePrefersReducedMotion(): boolean {
  return useSyncExternalStore(
    subscribeReduced,
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches,
    () => false,
  );
}

/** Animation duration in ms for the player's setting (0 when off or reduced motion). */
export function useAnimMs(setting: AnimSpeed): number {
  const reduced = usePrefersReducedMotion();
  if (reduced || setting === 'off') return 0;
  return setting === 'fast' ? 140 : 260;
}

const subscribeStandalone = subscribeMedia('(display-mode: standalone)');

export function useIsStandalone(): boolean {
  return useSyncExternalStore(
    subscribeStandalone,
    () =>
      (navigator as Navigator & { standalone?: boolean }).standalone === true ||
      window.matchMedia('(display-mode: standalone)').matches,
    () => false,
  );
}
