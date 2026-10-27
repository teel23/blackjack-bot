import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Round } from '../../lib/engine/round';
import { type SaveData, defaultData } from '../../lib/storage/schema';
import { type RemoteSave, decide, hasProgress, safeToAdopt } from '../../lib/sync/decide';
import { hashSave, hashString } from '../../lib/sync/hash';
import { SYNC_KEY, type SyncMeta, emptyMeta, parseMeta } from '../../lib/sync/meta';
import { ago, shortPath, statusText } from '../../lib/sync/format';

const fresh = () => defaultData(1_000);

function played(hands = 3): SaveData {
  const d = fresh();
  d.stats.handsPlayed = hands;
  d.stats.decisions = hands;
  d.bankroll.balance = 1000 + hands * 25;
  return d;
}

function midRound(d: SaveData): SaveData {
  d.table.round = { phase: 'player' } as unknown as Round;
  return d;
}

const remote = (data: SaveData, revision = 4): RemoteSave => ({ revision, updatedAt: 5_000, deviceId: 'mac', data });

function synced(local: SaveData, revision = 3): SyncMeta {
  return { ...emptyMeta('phone'), lastSyncedRevision: revision, lastSyncedHash: hashSave(local), lastSyncAt: 1 };
}

const run = (meta: SyncMeta, local: SaveData, r: RemoteSave | null) =>
  decide({ meta, local, localHash: hashSave(local), remote: r, remoteHash: r ? hashSave(r.data) : null });

describe('sync decisions', () => {
  it('a device that never synced and has no progress adopts the Mac copy', () => {
    const local = fresh();
    expect(hasProgress(local)).toBe(false);
    expect(run(emptyMeta(), local, remote(played(10))).kind).toBe('adopt');
  });

  it('a never-synced device with real progress never overwrites or adopts silently — conflict', () => {
    for (const mutate of [
      (d: SaveData) => void (d.stats.handsPlayed = 1),
      (d: SaveData) => void (d.progress.lessons['u1-values'] = { attempts: 1, bestPct: 80, passedOn: '2026-10-01' }),
      (d: SaveData) => void d.progress.drillHistory.push({ t: 1, kind: 'daily', mode: 'mixed', correct: 1, total: 1, ms: 1 }),
      (d: SaveData) => void (d.sessions.past = [{ id: 's' } as SaveData['sessions']['past'][number]]),
    ]) {
      const local = fresh();
      mutate(local);
      expect(hasProgress(local)).toBe(true);
      expect(run(emptyMeta(), local, remote(played(10))).kind).toBe('conflict');
    }
  });

  it('no Mac copy yet: push from revision 0', () => {
    expect(run(emptyMeta(), played(), null)).toEqual({ kind: 'push', baseRevision: 0 });
  });

  it('Mac newer and no unsynced local changes: adopt', () => {
    const local = played(2);
    expect(run(synced(local), local, remote(played(9), 4)).kind).toBe('adopt');
  });

  it('unsynced local changes and a newer Mac copy: conflict, not adopt', () => {
    const local = played(2);
    const meta = synced(local, 3);
    local.stats.handsPlayed = 3; // played offline since the last sync
    const d = run(meta, local, remote(played(9), 4));
    expect(d.kind).toBe('conflict');
  });

  it('never adopts mid-round, mid-lesson or mid-drill — waits instead', () => {
    const cases: ((d: SaveData) => void)[] = [
      (d) => midRound(d),
      (d) => void (d.progress.activeLesson = { id: 'u1-values', step: 1, answers: [], startedAt: 1, seed: 1 }),
      (d) => void (d.progress.activeDrill = { kind: 'daily', mode: 'mixed', timed: false, date: '2026-10-27', seed: 1, queue: [], index: 0, answers: [], startedAt: 1 }),
    ];
    for (const mutate of cases) {
      const local = played(2);
      mutate(local);
      expect(safeToAdopt(local)).toBe(false);
      // Synced at exactly this state (e.g. a push mid-hand), then the Mac moved on.
      expect(run(synced(local), local, remote(played(9), 4)).kind).toBe('wait');
    }
    // A fresh device with a hand already dealt also waits.
    const freshMid = midRound(fresh());
    expect(['wait', 'conflict']).toContain(run(emptyMeta(), freshMid, remote(played(9))).kind);
    expect(run(emptyMeta(), freshMid, remote(played(9))).kind).not.toBe('adopt');
  });

  it('same revision: push only when something changed (hash skip)', () => {
    const local = played(2);
    const meta = synced(local, 3);
    expect(run(meta, local, remote(played(2), 3))).toEqual({ kind: 'none' });
    local.stats.handsPlayed = 3;
    expect(run(meta, local, remote(played(2), 3))).toEqual({ kind: 'push', baseRevision: 3 });
  });

  it('identical content on both sides is just recorded, never a conflict', () => {
    const local = played(4);
    expect(run(emptyMeta(), local, remote(structuredClone(local), 7)).kind).toBe('mark');
  });
});

describe('sync metadata + hash', () => {
  it('hash is stable and sensitive to any change', () => {
    const a = played(2);
    expect(hashSave(a)).toBe(hashSave(structuredClone(a)));
    expect(hashSave(JSON.parse(JSON.stringify(a)))).toBe(hashSave(a));
    const b = structuredClone(a);
    b.bankroll.balance += 1;
    expect(hashSave(b)).not.toBe(hashSave(a));
    expect(hashString('')).toMatch(/^[0-9a-f]{14}$/);
  });

  it('broken metadata means "never synced", keeping the device id when possible', () => {
    expect(parseMeta('{nope').lastSyncedRevision).toBeNull();
    const m = parseMeta(JSON.stringify({ deviceId: 'abc', lastSyncedRevision: 'x', lastSyncedHash: 5, seenServer: 'yes' }));
    expect(m).toMatchObject({ deviceId: 'abc', lastSyncedRevision: null, lastSyncedHash: null, seenServer: false });
    expect(SYNC_KEY).toBe('bjbot:sync');
  });

  it('status text', () => {
    const now = 10 * 60_000;
    expect(statusText({ status: 'ok', lastSyncAt: now - 2 * 60_000, waiting: false, syncing: false }, now)).toBe('Copied to Mac 2 min ago');
    expect(statusText({ status: 'unreachable', lastSyncAt: null, waiting: false, syncing: false })).toBe('Mac not reachable — progress is safe on this phone');
    expect(statusText({ status: 'hidden', lastSyncAt: null, waiting: false, syncing: false })).toBe('Not set up (web version)');
    expect(ago(now - 5_000, now)).toBe('just now');
    expect(shortPath('/Users/carson/blackjack-bot-data/save.json')).toBe('~/blackjack-bot-data/save.json');
  });
});

// ── Engine against a mocked home server ──────────────────────────────────────

class MemStorage {
  m = new Map<string, string>();
  get length() {
    return this.m.size;
  }
  key(i: number) {
    return [...this.m.keys()][i] ?? null;
  }
  getItem(k: string) {
    return this.m.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.m.set(k, String(v));
  }
  removeItem(k: string) {
    this.m.delete(k);
  }
  clear() {
    this.m.clear();
  }
}

function jsonRes(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

describe('sync engine (mocked server)', () => {
  let storage: MemStorage;
  beforeEach(() => {
    vi.resetModules();
    storage = new MemStorage();
    vi.stubGlobal('localStorage', storage);
    vi.stubGlobal('window', { localStorage: storage });
  });
  afterEach(() => vi.unstubAllGlobals());

  async function load(local: SaveData, meta?: SyncMeta) {
    if (meta) storage.setItem(SYNC_KEY, JSON.stringify(meta));
    const store = await import('../../lib/state/store');
    const engine = await import('../../lib/sync/engine');
    store.useApp.setState({ data: local, hydrated: true });
    engine.useSync.setState({ status: 'checking' });
    return { store, engine };
  }

  it('fresh device adopts the Mac copy via replaceData', async () => {
    const mac = played(12);
    const fetch = vi.fn(async () => jsonRes(200, remote(mac, 6)));
    vi.stubGlobal('fetch', fetch);
    const { store, engine } = await load(fresh());
    await engine.syncNow();
    expect(store.getData().stats.handsPlayed).toBe(12);
    expect(engine.useSync.getState().status).toBe('ok');
    expect(JSON.parse(storage.getItem(SYNC_KEY)!).lastSyncedRevision).toBe(6);
    expect(JSON.parse(storage.getItem('bjbot:data')!).stats.handsPlayed).toBe(12);
  });

  it('push 409 → conflict banner state, local copy untouched', async () => {
    const local = played(2);
    const meta = synced(local, 3);
    local.stats.handsPlayed = 5;
    const mac = played(9);
    const fetch = vi.fn(async (_url: string, init?: RequestInit) =>
      init?.method === 'PUT' ? jsonRes(409, { error: 'revision mismatch', current: remote(mac, 4) }) : jsonRes(404, {}),
    );
    vi.stubGlobal('fetch', fetch);
    const { store, engine } = await load(local, meta);
    await engine.pushIfChanged();
    expect(engine.useSync.getState().status).toBe('conflict');
    expect(engine.useSync.getState().conflict?.revision).toBe(4);
    expect(store.getData().stats.handsPlayed).toBe(5);

    // Keep this phone's: the Mac copy is archived first, then overwritten with base = its revision.
    fetch.mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === '/api/conflict') return jsonRes(200, { ok: true });
      if (init?.method === 'PUT') return jsonRes(200, { revision: 5 });
      return jsonRes(404, {});
    });
    expect(await engine.chooseLocal()).toBe(true);
    const calls = fetch.mock.calls.map(([u, i]) => `${i?.method ?? 'GET'} ${u}`);
    expect(calls.slice(-2)).toEqual(['POST /api/conflict', 'PUT /api/save']);
    const archived = JSON.parse(fetch.mock.calls.at(-2)![1]!.body as string);
    expect(archived).toMatchObject({ side: 'mac', revision: 4 });
    expect(JSON.parse(fetch.mock.calls.at(-1)![1]!.body as string).baseRevision).toBe(4);
    expect(engine.useSync.getState()).toMatchObject({ status: 'ok', conflict: null });
  });

  it('skips the push when nothing changed since the last sync', async () => {
    const local = played(2);
    const fetch = vi.fn(async () => jsonRes(200, { revision: 9 }));
    vi.stubGlobal('fetch', fetch);
    const { engine } = await load(local, synced(local, 3));
    await engine.pushIfChanged();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('Mac unreachable: status says so, nothing thrown, data untouched', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => Promise.reject(new TypeError('Load failed'))));
    const local = played(2);
    const { store, engine } = await load(local, synced(local, 3));
    await engine.syncNow();
    expect(engine.useSync.getState().status).toBe('unreachable');
    expect(store.getData().stats.handsPlayed).toBe(2);
  });

  it('newer Mac copy waits until the hand is over', async () => {
    const local = midRound(played(2));
    vi.stubGlobal('fetch', vi.fn(async () => jsonRes(200, remote(played(9), 4))));
    const { store, engine } = await load(local, synced(local, 3));
    await engine.syncNow();
    expect(engine.useSync.getState().waiting).toBe(true);
    expect(store.getData().stats.handsPlayed).toBe(2);
  });
});
