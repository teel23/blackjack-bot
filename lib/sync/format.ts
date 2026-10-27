import type { SyncState } from './engine';

export function ago(t: number, now = Date.now()): string {
  const s = Math.max(0, Math.round((now - t) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return `on ${new Date(t).toLocaleDateString([], { month: 'short', day: 'numeric' })}`;
}

export function when(t: number): string {
  return new Date(t).toLocaleString([], { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

/** "/Users/carson/blackjack-bot-data/save.json" → "~/blackjack-bot-data/save.json" */
export function shortPath(p: string): string {
  return p.replace(/^\/Users\/[^/]+\//, '~/');
}

export function statusText(s: Pick<SyncState, 'status' | 'lastSyncAt' | 'waiting' | 'syncing'>, now = Date.now()): string {
  if (s.waiting) return 'Your Mac has newer progress — it loads after this hand, lesson or drill.';
  switch (s.status) {
    case 'hidden':
      return 'Not set up (web version)';
    case 'checking':
      return s.lastSyncAt ? `Checking your Mac… (last copied ${ago(s.lastSyncAt, now)})` : 'Checking your Mac…';
    case 'ok':
      return s.lastSyncAt ? `Copied to Mac ${ago(s.lastSyncAt, now)}` : 'Connected to your Mac';
    case 'unreachable':
      return 'Mac not reachable — progress is safe on this phone';
    case 'error':
      return 'Your Mac had a problem saving — progress is safe on this phone';
    case 'conflict':
      return 'Your Mac has different progress — pick which to keep in the banner above.';
  }
}
