'use client';

import { create } from 'zustand';
import { getData, replaceData, useApp } from '../state/store';
import { migrate } from '../storage/persist';
import type { SaveData } from '../storage/schema';
import { ServerError, Unreachable, archiveConflict, getSave, ping, putSave } from './api';
import { type Decision, type RemoteSave, decide, safeToAdopt } from './decide';
import { hashSave } from './hash';
import { loadMeta, saveMeta } from './meta';

/**
 * Mac sync sits on top of the normal save: localStorage is still written after every action, and
 * a copy goes to the home server whenever it's reachable. On Netlify `/api/ping` doesn't exist,
 * so this stays hidden and does nothing.
 */
export type SyncStatus = 'hidden' | 'checking' | 'ok' | 'unreachable' | 'error' | 'conflict';

export interface SyncState {
  status: SyncStatus;
  syncing: boolean;
  lastSyncAt: number | null;
  savePath: string | null;
  /** Both sides changed: the Mac's copy, until the player picks one. */
  conflict: RemoteSave | null;
  /** Mac copy is newer; it loads once no hand/lesson/drill is in progress. */
  waiting: boolean;
}

export const useSync = create<SyncState>(() => ({
  status: 'hidden',
  syncing: false,
  lastSyncAt: null,
  savePath: null,
  conflict: null,
  waiting: false,
}));

export const PUSH_DEBOUNCE_MS = 5000;

let started = false;
let listening = false;
let applyingRemote = false;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let inFlight: Promise<void> | null = null;
let again = false;

function remoteHash(r: RemoteSave | null): string | null {
  return r ? hashSave(r.data) : null;
}

function markSynced(revision: number, hash: string) {
  const m = saveMeta({ lastSyncedRevision: revision, lastSyncedHash: hash, lastSyncAt: Date.now(), seenServer: true });
  useSync.setState({ status: 'ok', lastSyncAt: m.lastSyncAt, conflict: null, waiting: false });
}

function failed(e: unknown) {
  // No toasts, no nags: the card just says where things stand.
  useSync.setState({ status: e instanceof Unreachable ? 'unreachable' : 'error' });
}

function adopt(remote: RemoteSave) {
  const { data } = migrate(remote.data);
  applyingRemote = true;
  try {
    replaceData(data);
  } finally {
    applyingRemote = false;
  }
  markSynced(remote.revision, hashSave(getData()));
}

async function push(baseRevision: number, opts: { keepalive?: boolean } = {}) {
  const data = getData();
  const hash = hashSave(data);
  const meta = loadMeta();
  const res = await putSave({ baseRevision, updatedAt: meta.localChangedAt ?? Date.now(), deviceId: meta.deviceId, data }, opts);
  if (res.ok) return markSynced(res.revision, hash);
  // 409: the Mac moved on. Same rules as a pull, with the copy it sent back.
  await apply(decide({ meta: loadMeta(), local: getData(), localHash: hashSave(getData()), remote: res.current, remoteHash: remoteHash(res.current) }), true);
}

async function apply(d: Decision, afterConflict = false) {
  switch (d.kind) {
    case 'none':
      return markSynced(loadMeta().lastSyncedRevision ?? 0, loadMeta().lastSyncedHash ?? hashSave(getData()));
    case 'mark':
      return markSynced(d.remote.revision, hashSave(getData()));
    case 'push':
      if (afterConflict && d.baseRevision !== 0) return; // don't loop on repeated 409s
      return push(d.baseRevision);
    case 'adopt':
      return adopt(d.remote);
    case 'wait':
      useSync.setState({ status: 'ok', waiting: true });
      return;
    case 'conflict':
      useSync.setState({ status: 'conflict', conflict: d.remote, waiting: false });
  }
}

async function runSync() {
  const remote = await getSave();
  const local = getData();
  await apply(decide({ meta: loadMeta(), local, localHash: hashSave(local), remote, remoteHash: remoteHash(remote) }));
}

/** Pull, compare, then push/adopt/flag a conflict. Calls made while one is running coalesce. */
export function syncNow(): Promise<void> {
  if (useSync.getState().status === 'hidden') return Promise.resolve();
  if (inFlight) {
    again = true;
    return inFlight;
  }
  useSync.setState({ syncing: true });
  inFlight = (async () => {
    try {
      do {
        again = false;
        await runSync();
      } while (again);
    } catch (e) {
      failed(e);
    } finally {
      inFlight = null;
      useSync.setState({ syncing: false });
    }
  })();
  return inFlight;
}

/** Push only if something changed since the last sync. Used by the debounce and on the way out. */
export async function pushIfChanged(opts: { keepalive?: boolean } = {}) {
  const s = useSync.getState();
  if (s.status === 'hidden' || s.conflict || inFlight) return;
  const meta = loadMeta();
  if (hashSave(getData()) === meta.lastSyncedHash) return;
  if (meta.lastSyncedRevision === null) {
    if (!opts.keepalive) await syncNow(); // first contact needs a pull first
    return;
  }
  try {
    await push(meta.lastSyncedRevision, opts);
  } catch (e) {
    if (!opts.keepalive) failed(e);
  }
}

function schedulePush() {
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushIfChanged();
  }, PUSH_DEBOUNCE_MS);
}

function listen() {
  if (listening) return;
  listening = true;
  useApp.subscribe((s, prev) => {
    if (!s.hydrated || !prev.hydrated || s.data === prev.data || applyingRemote) return;
    saveMeta({ localChangedAt: Date.now() });
    schedulePush();
    // A newer Mac copy was waiting for the hand/lesson/drill to finish.
    if (useSync.getState().waiting && safeToAdopt(s.data)) void syncNow();
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void syncNow();
    else void pushIfChanged({ keepalive: true });
  });
  window.addEventListener('online', () => void syncNow());
  window.addEventListener('pagehide', () => void pushIfChanged({ keepalive: true }));
}

/** Call once after the store hydrates. */
export function startSync() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const meta = loadMeta();
  const homeHost = meta.seenServer || location.hostname.endsWith('.local');
  if (homeHost) {
    useSync.setState({ status: 'checking', lastSyncAt: meta.lastSyncAt, savePath: meta.savePath });
    listen();
  }
  void (async () => {
    try {
      const p = await ping();
      if (!p) {
        // Something answered without the API (Netlify, `npm start`): stay hidden.
        if (!homeHost) return;
        throw new ServerError('no API');
      }
      saveMeta({ seenServer: true, savePath: p.savePath });
      useSync.setState({ status: 'checking', savePath: p.savePath, lastSyncAt: loadMeta().lastSyncAt });
      listen();
      await syncNow();
    } catch (e) {
      if (homeHost) failed(e);
    }
  })();
}

/** Conflict: keep this device's progress. The Mac's copy is archived first, then overwritten. */
export async function chooseLocal(): Promise<boolean> {
  const remote = useSync.getState().conflict;
  if (!remote) return true;
  const meta = loadMeta();
  try {
    await archiveConflict({ side: 'mac', deviceId: remote.deviceId, revision: remote.revision, updatedAt: remote.updatedAt, data: remote.data });
    useSync.setState({ conflict: null, status: 'checking' });
    saveMeta({ lastSyncedRevision: remote.revision, lastSyncedHash: hashSave(remote.data) });
    await push(remote.revision);
    return true;
  } catch {
    useSync.setState({ conflict: remote, status: 'conflict' });
    saveMeta({ lastSyncedRevision: meta.lastSyncedRevision, lastSyncedHash: meta.lastSyncedHash });
    return false;
  }
}

/** Conflict: use the Mac's progress. This device's copy is archived on the Mac first. */
export async function chooseMac(): Promise<boolean> {
  const remote = useSync.getState().conflict;
  if (!remote) return true;
  const local: SaveData = getData();
  if (!safeToAdopt(local)) return false;
  const meta = loadMeta();
  try {
    await archiveConflict({ side: 'phone', deviceId: meta.deviceId, revision: meta.lastSyncedRevision, updatedAt: meta.localChangedAt, data: local });
  } catch {
    return false;
  }
  adopt(remote);
  return true;
}
