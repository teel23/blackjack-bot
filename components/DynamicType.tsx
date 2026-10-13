'use client';

import { useEffect } from 'react';

/**
 * Follow the iOS text-size setting (Dynamic Type). Safari exposes it through the
 * `-apple-system-body` font; we map its default (17px) to our 16px design size and
 * cap growth at 20px so the table layout stays intact. Everything sized in rem scales.
 */
export default function DynamicType() {
  useEffect(() => {
    const apply = () => {
      if (!window.matchMedia('(pointer: coarse)').matches) return;
      const probe = document.createElement('span');
      probe.style.font = '-apple-system-body';
      probe.style.position = 'absolute';
      probe.style.visibility = 'hidden';
      document.body.appendChild(probe);
      const px = parseFloat(getComputedStyle(probe).fontSize);
      probe.remove();
      const root = Number.isFinite(px) ? Math.max(16, Math.min(20, px - 1)) : 16;
      document.documentElement.style.fontSize = root === 16 ? '' : `${root}px`;
    };
    apply();
    const onVisible = () => document.visibilityState === 'visible' && apply();
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);
  return null;
}
