import { roundInProgress } from '../state/table';
import type { SaveData } from '../storage/schema';
import type { SyncMeta } from './meta';

/** What the Mac has (GET /api/save, or the `current` copy in a 409). */
export interface RemoteSave {
  revision: number;
  updatedAt: number;
  deviceId: string;
  data: SaveData;
}

export type Decision =
  | { kind: 'none' } // already in sync
  | { kind: 'push'; baseRevision: number }
  | { kind: 'mark'; remote: RemoteSave } // same content on both sides — just record the revision
  | { kind: 'adopt'; remote: RemoteSave }
  | { kind: 'wait'; remote: RemoteSave } // adopt once no hand/lesson/drill is in progress
  | { kind: 'conflict'; remote: RemoteSave };

/** Anything worth keeping: a fresh install has none of this. */
export function hasProgress(d: SaveData): boolean {
  return (
    d.stats.handsPlayed > 0 ||
    d.stats.decisions > 0 ||
    Object.keys(d.progress.lessons).length > 0 ||
    Object.keys(d.progress.daily).length > 0 ||
    d.progress.drillHistory.length > 0 ||
    d.sessions.past.length > 0 ||
    !!d.sessions.active ||
    !!d.progress.activeLesson ||
    !!d.progress.activeDrill ||
    roundInProgress(d)
  );
}

/** Swapping the whole save is only allowed between hands, lessons and drills. */
export function safeToAdopt(d: SaveData): boolean {
  return !roundInProgress(d) && !d.progress.activeLesson && !d.progress.activeDrill;
}

export function hasUnsyncedChanges(meta: SyncMeta, localHash: string): boolean {
  return localHash !== meta.lastSyncedHash;
}

/**
 * Decide what to do after reading the Mac's copy. Never discards data: whenever both sides
 * changed, the answer is a conflict for the player to resolve.
 */
export function decide(args: {
  meta: SyncMeta;
  local: SaveData;
  localHash: string;
  remote: RemoteSave | null;
  remoteHash: string | null;
}): Decision {
  const { meta, local, localHash, remote, remoteHash } = args;
  if (!remote) return { kind: 'push', baseRevision: 0 };
  if (remoteHash === localHash) return { kind: 'mark', remote };

  const adoptOrWait = (): Decision => (safeToAdopt(local) ? { kind: 'adopt', remote } : { kind: 'wait', remote });

  if (meta.lastSyncedRevision === null) {
    // Never synced. A fresh install (or the Home Screen app's separate storage) takes the Mac copy.
    return hasProgress(local) ? { kind: 'conflict', remote } : adoptOrWait();
  }
  const dirty = hasUnsyncedChanges(meta, localHash);
  if (remote.revision === meta.lastSyncedRevision) return dirty ? { kind: 'push', baseRevision: remote.revision } : { kind: 'none' };
  // The Mac moved on (another device, or a restored save).
  return dirty ? { kind: 'conflict', remote } : adoptOrWait();
}
