'use client';

import { create } from 'zustand';
import { loadData, requestPersistence, saveData } from '../storage/persist';
import { type SaveData, defaultData } from '../storage/schema';

export interface AppState {
  data: SaveData;
  hydrated: boolean;
  /** One-time message about repaired/reset data, shown as a banner. */
  notice: string | null;
  /** Result of navigator.storage.persist(); null = unknown/unsupported. */
  persisted: boolean | null;
}

export const useApp = create<AppState>(() => ({
  data: defaultData(0),
  hydrated: false,
  notice: null,
  persisted: null,
}));

let saveQueued = false;
function queueSave() {
  if (saveQueued) return;
  saveQueued = true;
  queueMicrotask(() => {
    saveQueued = false;
    const { data, hydrated } = useApp.getState();
    if (hydrated) saveData(data);
  });
}

/** Apply a change to a copy of the saved data; persisted right after (same tick). */
export function update(fn: (draft: SaveData) => void) {
  const next = structuredClone(useApp.getState().data);
  fn(next);
  useApp.setState({ data: next });
  queueSave();
}

export function getData(): SaveData {
  return useApp.getState().data;
}

type Hook = (data: SaveData) => void;
const hydrateHooks: Hook[] = [];
/** Run on every load (e.g. streak bookkeeping for days the app wasn't opened). */
export function onHydrate(fn: Hook) {
  hydrateHooks.push(fn);
}

let hydrating = false;
export function hydrate() {
  if (useApp.getState().hydrated || hydrating) return;
  hydrating = true;
  const { data, notice } = loadData();
  for (const hook of hydrateHooks) {
    try {
      hook(data);
    } catch {
      /* a bookkeeping hook must never block loading */
    }
  }
  useApp.setState({ data, hydrated: true, notice });
  saveData(data);
  void requestPersistence().then((persisted) => useApp.setState({ persisted }));

  const flush = () => saveData(useApp.getState().data);
  window.addEventListener('pagehide', flush);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') flush();
  });
}

/** Replace everything (import / reset). */
export function replaceData(data: SaveData, notice: string | null = null) {
  useApp.setState({ data, notice });
  saveData(data);
}

export function dismissNotice() {
  useApp.setState({ notice: null });
}
