/** Sync bookkeeping, kept apart from the save itself (`bjbot:data` is untouched by sync). */
export const SYNC_KEY = 'bjbot:sync';

export interface SyncMeta {
  deviceId: string;
  /** Mac revision this device last matched; null = never synced. */
  lastSyncedRevision: number | null;
  /** Hash of the save at that point. A different local hash = unsynced changes. */
  lastSyncedHash: string | null;
  localChangedAt: number | null;
  lastSyncAt: number | null;
  /** This copy of the app has talked to the home server before (so offline = "Mac not reachable"). */
  seenServer: boolean;
  savePath: string | null;
}

function newDeviceId(): string {
  try {
    return crypto.randomUUID().slice(0, 8);
  } catch {
    return Math.random().toString(36).slice(2, 10);
  }
}

export function emptyMeta(deviceId = newDeviceId()): SyncMeta {
  return { deviceId, lastSyncedRevision: null, lastSyncedHash: null, localChangedAt: null, lastSyncAt: null, seenServer: false, savePath: null };
}

/** Repair whatever is stored; a broken record just means "never synced". */
export function parseMeta(raw: string | null): SyncMeta {
  const base = emptyMeta();
  if (!raw) return base;
  try {
    const m = JSON.parse(raw) as Partial<SyncMeta>;
    const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : null);
    return {
      deviceId: typeof m.deviceId === 'string' && m.deviceId ? m.deviceId : base.deviceId,
      lastSyncedRevision: num(m.lastSyncedRevision),
      lastSyncedHash: typeof m.lastSyncedHash === 'string' ? m.lastSyncedHash : null,
      localChangedAt: num(m.localChangedAt),
      lastSyncAt: num(m.lastSyncAt),
      seenServer: m.seenServer === true,
      savePath: typeof m.savePath === 'string' ? m.savePath : null,
    };
  } catch {
    return base;
  }
}

let cached: SyncMeta | null = null;

export function loadMeta(): SyncMeta {
  if (cached) return cached;
  let raw: string | null = null;
  try {
    raw = localStorage.getItem(SYNC_KEY);
  } catch {
    /* storage unavailable: sync still works for this page load */
  }
  cached = parseMeta(raw);
  return cached;
}

export function saveMeta(patch: Partial<SyncMeta>): SyncMeta {
  cached = { ...loadMeta(), ...patch };
  try {
    localStorage.setItem(SYNC_KEY, JSON.stringify(cached));
  } catch {
    /* best effort */
  }
  return cached;
}
