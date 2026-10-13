'use client';

import { useEffect } from 'react';
import { useApp } from './state/store';

/**
 * Tiny synthesized sound effects. Off by default; iOS only allows audio after a user tap,
 * so the AudioContext is created/resumed inside the first touch after sound is enabled.
 */
let ctx: AudioContext | null = null;

function context(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const AC = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  return ctx;
}

export function useAudioUnlock() {
  useEffect(() => {
    const unlock = () => {
      if (!useApp.getState().data.settings.sound) return;
      const c = context();
      if (c && c.state === 'suspended') void c.resume();
    };
    window.addEventListener('pointerdown', unlock, { passive: true });
    return () => window.removeEventListener('pointerdown', unlock);
  }, []);
}

function tone(freq: number, ms: number, type: OscillatorType = 'sine', gain = 0.08, delay = 0) {
  const c = context();
  if (!c || c.state !== 'running') return;
  const t0 = c.currentTime + delay / 1000;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + ms / 1000);
  osc.connect(g).connect(c.destination);
  osc.start(t0);
  osc.stop(t0 + ms / 1000 + 0.02);
}

export type Sfx = 'deal' | 'chip' | 'win' | 'lose' | 'correct' | 'wrong';

export function play(sfx: Sfx) {
  if (!useApp.getState().data.settings.sound) return;
  switch (sfx) {
    case 'deal': return tone(900, 50, 'triangle', 0.04);
    case 'chip': return tone(1400, 40, 'square', 0.03);
    case 'win': tone(660, 120); tone(880, 160, 'sine', 0.08, 110); return;
    case 'lose': return tone(220, 220, 'sine', 0.07);
    case 'correct': return tone(1046, 90, 'sine', 0.05);
    case 'wrong': return tone(180, 160, 'sawtooth', 0.03);
  }
}
