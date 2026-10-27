import { SAVE_VERSION, type SaveData, defaultData, sanitize } from './schema';

export const STORAGE_KEY = 'bjbot:data';
const CORRUPT_PREFIX = 'bjbot:corrupt:';

export interface LoadResult {
  data: SaveData;
  /** Shown once to the player when something had to be repaired or reset. */
  notice: string | null;
  fresh: boolean;
}

/**
 * Upgrade older save shapes step by step. Each step takes the previous version's object.
 */
const MIGRATIONS: Record<number, (old: Record<string, unknown>) => Record<string, unknown>> = {
  // v2: surrender became opt-in (most casinos don't offer it) — switch it off for existing players.
  1: (v1) => {
    const settings = (v1.settings ?? {}) as Record<string, unknown>;
    const rules = (settings.rules ?? {}) as Record<string, unknown>;
    return { ...v1, version: 2, settings: { ...settings, rules: { ...rules, lateSurrender: false } } };
  },
};

export function migrate(raw: unknown): { data: SaveData; notice: string | null } {
  if (!raw || typeof raw !== 'object') throw new Error('Save is not an object');
  let obj = raw as Record<string, unknown>;
  let version = typeof obj.version === 'number' ? obj.version : 0;
  if (version < 1) throw new Error('Unknown save version');
  if (version > SAVE_VERSION) {
    // Saved by a newer build (e.g. an old cached app after an update). Keep what we understand.
    const { data, dropped } = sanitize(obj);
    return { data, notice: dropped.length ? `Some newer data couldn't be read: ${dropped.join(', ')}.` : null };
  }
  while (version < SAVE_VERSION) {
    const step = MIGRATIONS[version];
    if (!step) throw new Error(`No migration from v${version}`);
    obj = step(obj);
    version++;
  }
  const { data, dropped } = sanitize(obj);
  return {
    data,
    notice: dropped.length ? `Some saved data couldn't be restored (${dropped.join(', ')}). Everything else is safe.` : null,
  };
}

function safeStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const s = window.localStorage;
    const probe = '__bjbot_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return s;
  } catch {
    return null;
  }
}

export function loadData(): LoadResult {
  const storage = safeStorage();
  if (!storage) {
    return { data: defaultData(), notice: 'Storage is unavailable (private browsing?). Progress won\'t be saved.', fresh: true };
  }
  const raw = storage.getItem(STORAGE_KEY);
  if (raw === null) return { data: defaultData(), notice: null, fresh: true };
  try {
    const { data, notice } = migrate(JSON.parse(raw));
    return { data, notice, fresh: false };
  } catch {
    try {
      storage.setItem(`${CORRUPT_PREFIX}${Date.now()}`, raw);
    } catch {
      /* full — the copy is best effort */
    }
    return {
      data: defaultData(),
      notice: 'Your saved data was damaged and couldn\'t be loaded, so the app started fresh. A copy of the old data was kept.',
      fresh: true,
    };
  }
}

let lastWritten = '';
let lastError: string | null = null;

export function saveData(data: SaveData): boolean {
  const storage = safeStorage();
  if (!storage) return false;
  const json = JSON.stringify(data);
  if (json === lastWritten) return true;
  try {
    storage.setItem(STORAGE_KEY, json);
    lastWritten = json;
    lastError = null;
    return true;
  } catch (e) {
    lastError = e instanceof Error ? e.message : 'write failed';
    return false;
  }
}

export function lastSaveError(): string | null {
  return lastError;
}

export function corruptBackups(): string[] {
  const storage = safeStorage();
  if (!storage) return [];
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    if (k?.startsWith(CORRUPT_PREFIX)) keys.push(k);
  }
  return keys;
}

/** Ask the browser not to evict our data (Safari may clear storage for sites not visited in a while). */
export async function requestPersistence(): Promise<boolean | null> {
  try {
    if (typeof navigator === 'undefined' || !navigator.storage?.persist) return null;
    if (await navigator.storage.persisted?.()) return true;
    return await navigator.storage.persist();
  } catch {
    return null;
  }
}

export function clearAllData() {
  const storage = safeStorage();
  if (!storage) return;
  const keys: string[] = [];
  for (let i = 0; i < storage.length; i++) {
    const k = storage.key(i);
    // Mac sync bookkeeping survives a reset, so the reset itself syncs instead of the old Mac copy coming back.
    if (k?.startsWith('bjbot:') && k !== 'bjbot:sync') keys.push(k);
  }
  keys.forEach((k) => storage.removeItem(k));
  lastWritten = '';
}
