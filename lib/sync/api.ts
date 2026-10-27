import type { SaveData } from '../storage/schema';
import type { RemoteSave } from './decide';

/** Away from home the Mac never answers — give up fast so it costs nothing. */
export const TIMEOUT_MS = 3000;
/** Browsers cap keepalive request bodies at 64 KB. */
const KEEPALIVE_MAX = 60_000;

export class Unreachable extends Error {}
export class ServerError extends Error {}

async function request(path: string, init: RequestInit = {}): Promise<Response> {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), TIMEOUT_MS);
  try {
    return await fetch(path, {
      ...init,
      cache: 'no-store',
      credentials: 'same-origin',
      signal: init.keepalive ? undefined : ctl.signal,
      headers: { 'Content-Type': 'application/json', ...(init.headers ?? {}) },
    });
  } catch {
    throw new Unreachable('Mac not reachable');
  } finally {
    clearTimeout(timer);
  }
}

async function json<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    throw new ServerError(`bad response (${res.status})`);
  }
}

/** The home server's ping, or null when this isn't the Mac-hosted app (e.g. Netlify's 404 page). */
export async function ping(): Promise<{ serverTime: number; savePath: string | null } | null> {
  const res = await request('/api/ping');
  if (!res.ok || !(res.headers.get('content-type') ?? '').includes('application/json')) return null;
  const body = await json<{ ok?: boolean; app?: string; serverTime?: number; savePath?: string }>(res).catch(() => null);
  if (!body?.ok || body.app !== 'blackjack-bot') return null;
  return { serverTime: body.serverTime ?? Date.now(), savePath: body.savePath ?? null };
}

export async function getSave(): Promise<RemoteSave | null> {
  const res = await request('/api/save');
  if (res.status === 404) {
    const ct = res.headers.get('content-type') ?? '';
    if (ct.includes('application/json')) return null;
    throw new ServerError('no home server here');
  }
  if (!res.ok) throw new ServerError(`GET /api/save → ${res.status}`);
  return json<RemoteSave>(res);
}

export type PutResult = { ok: true; revision: number } | { ok: false; current: RemoteSave | null };

export async function putSave(
  body: { baseRevision: number; updatedAt: number; deviceId: string; data: SaveData },
  opts: { keepalive?: boolean } = {},
): Promise<PutResult> {
  const text = JSON.stringify(body);
  const res = await request('/api/save', { method: 'PUT', body: text, keepalive: !!opts.keepalive && text.length < KEEPALIVE_MAX });
  if (res.status === 409) return { ok: false, current: (await json<{ current: RemoteSave | null }>(res)).current };
  if (!res.ok) throw new ServerError(`PUT /api/save → ${res.status}`);
  return { ok: true, revision: (await json<{ revision: number }>(res)).revision };
}

/** Archive the copy that lost a conflict on the Mac (conflicts/). */
export async function archiveConflict(body: {
  side: 'mac' | 'phone';
  deviceId: string;
  revision: number | null;
  updatedAt: number | null;
  data: SaveData;
}): Promise<void> {
  const res = await request('/api/conflict', { method: 'POST', body: JSON.stringify(body) });
  if (!res.ok) throw new ServerError(`POST /api/conflict → ${res.status}`);
}
