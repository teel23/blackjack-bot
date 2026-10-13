import { migrate } from './persist';
import type { SaveData } from './schema';

export interface BackupFile {
  app: 'blackjack-bot';
  exportedAt: string;
  data: SaveData;
}

export function makeBackup(data: SaveData): BackupFile {
  return { app: 'blackjack-bot', exportedAt: new Date().toISOString(), data };
}

export function backupFilename(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `blackjack-bot-backup-${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}.json`;
}

/** Parse an imported backup. Accepts the wrapped file or a bare save object. Throws a readable error. */
export function parseBackup(text: string): { data: SaveData; notice: string | null } {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error('That file isn\'t valid JSON.');
  }
  const obj = parsed as Partial<BackupFile> & Record<string, unknown>;
  const inner = obj && obj.app === 'blackjack-bot' ? obj.data : obj;
  try {
    return migrate(inner);
  } catch {
    throw new Error('That file doesn\'t look like a Blackjack Bot backup.');
  }
}

/** Share (iOS "Save to Files") or download a backup. Returns how it was delivered. */
export async function deliverBackup(data: SaveData): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const json = JSON.stringify(makeBackup(data), null, 2);
  const name = backupFilename();
  const file = typeof File !== 'undefined' ? new File([json], name, { type: 'application/json' }) : null;
  try {
    if (file && navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: 'Blackjack Bot backup' });
      return 'shared';
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled';
    // fall through to download
  }
  const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10_000);
  return 'downloaded';
}
