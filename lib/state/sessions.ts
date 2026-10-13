'use client';

import { STARTING_BANKROLL, type SaveData, type Session } from '../storage/schema';
import { chipsAvailable, roundInProgress } from './table';
import { update } from './store';

const MAX_HISTORY_POINTS = 2000;

function point(d: SaveData, kind: 'session' | 'reset', t = Date.now()) {
  d.bankroll.history.push({ t, balance: d.bankroll.balance, kind });
  if (d.bankroll.history.length > MAX_HISTORY_POINTS) d.bankroll.history.splice(1, d.bankroll.history.length - MAX_HISTORY_POINTS);
}

export function canStartSession(d: SaveData, buyIn: number): boolean {
  return !d.sessions.active && buyIn >= d.settings.tableMin && buyIn <= d.bankroll.balance;
}

export function startSession(buyIn: number) {
  update((d) => {
    if (!canStartSession(d, buyIn)) return;
    const now = Date.now();
    const s: Session = {
      id: `s${now}`,
      startedAt: now,
      endedAt: null,
      activeMs: 0,
      lastActiveAt: now,
      buyIn,
      stack: buyIn,
      hands: 0,
      decisions: 0,
      correct: 0,
      hints: 0,
      net: 0,
      biggestWin: 0,
      biggestLoss: 0,
    };
    d.bankroll.balance = Math.round((d.bankroll.balance - buyIn) * 100) / 100;
    d.sessions.active = s;
    d.table.mode = 'session';
    d.table.round = null;
    d.table.feedback = null;
    d.table.undo = null;
    d.table.hint = null;
    d.table.bet = Math.min(Math.max(d.settings.lastBet, d.settings.tableMin), buyIn, d.settings.tableMax);
  });
}

export function cashOut() {
  update((d) => {
    const s = d.sessions.active;
    if (!s || roundInProgress(d)) return;
    const now = Date.now();
    s.activeMs += Math.min(Math.max(0, now - s.lastActiveAt), 5 * 60_000);
    s.endedAt = now;
    d.bankroll.balance = Math.round((d.bankroll.balance + s.stack) * 100) / 100;
    d.sessions.past.push(s);
    if (d.sessions.past.length > 500) d.sessions.past.splice(0, d.sessions.past.length - 500);
    d.sessions.active = null;
    point(d, 'session', now);
    if (d.table.mode === 'session') {
      d.table.mode = null;
      d.table.round = null;
      d.table.feedback = null;
      d.table.undo = null;
    }
  });
}

export function startQuickPlay() {
  update((d) => {
    if (roundInProgress(d)) return;
    d.table.mode = 'quick';
    d.table.round = null;
    d.table.feedback = null;
    d.table.undo = null;
    if (d.table.quickStack < d.settings.tableMin) d.table.quickStack = STARTING_BANKROLL;
    d.table.bet = Math.min(Math.max(d.settings.lastBet, d.settings.tableMin), d.table.quickStack, d.settings.tableMax);
  });
}

export function refillQuickStack() {
  update((d) => {
    if (roundInProgress(d)) return;
    d.table.quickStack = STARTING_BANKROLL;
  });
}

/** Leave the table. A live session stays open (resume later); quick play just closes. */
export function leaveTable() {
  update((d) => {
    if (roundInProgress(d)) return;
    if (d.table.mode === 'quick') {
      d.table.mode = null;
      d.table.round = null;
      d.table.feedback = null;
      d.table.undo = null;
    }
  });
}

export function resumeSession() {
  update((d) => {
    if (d.sessions.active && !roundInProgress(d)) {
      d.table.mode = 'session';
      d.sessions.active.lastActiveAt = Date.now();
    }
  });
}

export function isBroke(d: SaveData): boolean {
  const available = d.bankroll.balance + (d.sessions.active?.stack ?? 0);
  return available < d.settings.tableMin;
}

/** Start over at $1,000. Logged in history; any open session is closed first. */
export function resetBankroll() {
  update((d) => {
    if (roundInProgress(d) && d.table.mode === 'session') return;
    const now = Date.now();
    const s = d.sessions.active;
    if (s) {
      s.endedAt = now;
      d.bankroll.balance += s.stack;
      d.sessions.past.push(s);
      d.sessions.active = null;
      if (d.table.mode === 'session') {
        d.table.mode = null;
        d.table.round = null;
      }
    }
    d.bankroll.balance = STARTING_BANKROLL;
    d.bankroll.resets++;
    point(d, 'reset', now);
  });
}

export function tableBalance(d: SaveData): number {
  return chipsAvailable(d);
}
