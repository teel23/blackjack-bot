'use client';

import { upcardLabel } from '../engine/cards';
import type { Situation } from '../strategy/chart';
import { describeHand } from '../engine/hand';
import {
  type Action,
  type Round,
  act as engineAct,
  decideInsurance as engineInsurance,
  legalActions,
  startRound,
} from '../engine/round';
import { createShoe } from '../engine/shoe';
import { ACTION_LABEL, recommend } from '../strategy/chart';
import { INSURANCE_REASON, evenMoneyReason, reasonFor } from '../strategy/reasons';
import type { SaveData, StatCategory } from '../storage/schema';
import { recordDecision } from './stats';
import { getData, update } from './store';

export const CHIPS = [5, 25, 100, 500] as const;

/** Chips the player can bet with right now (session stack or quick-play stack). */
export function chipsAvailable(d: SaveData): number {
  if (d.table.mode === 'session') return d.sessions.active?.stack ?? 0;
  if (d.table.mode === 'quick') return d.table.quickStack;
  return 0;
}

export function roundInProgress(d: SaveData): boolean {
  return !!d.table.round && d.table.round.phase !== 'done';
}

export function maxBet(d: SaveData): number {
  return Math.min(d.settings.tableMax, chipsAvailable(d));
}

function clampBet(d: SaveData, bet: number): number {
  return Math.max(0, Math.min(bet, maxBet(d)));
}

export function addChip(value: number) {
  update((d) => {
    if (roundInProgress(d)) return;
    d.table.bet = clampBet(d, d.table.bet + value);
  });
}

export function clearBet() {
  update((d) => {
    if (!roundInProgress(d)) d.table.bet = 0;
  });
}

export function setBet(bet: number) {
  update((d) => {
    if (!roundInProgress(d)) d.table.bet = clampBet(d, bet);
  });
}

export function canDeal(d: SaveData): { ok: boolean; why?: string } {
  if (!d.table.mode) return { ok: false, why: 'Start a session or quick play first.' };
  if (roundInProgress(d)) return { ok: false, why: 'Finish the hand first.' };
  const bet = d.table.bet;
  if (bet < d.settings.tableMin) return { ok: false, why: `Table minimum is $${d.settings.tableMin}.` };
  if (bet > d.settings.tableMax) return { ok: false, why: `Table maximum is $${d.settings.tableMax}.` };
  if (bet > chipsAvailable(d)) return { ok: false, why: 'Not enough chips for that bet.' };
  return { ok: true };
}

function touchSession(d: SaveData, now: number) {
  const s = d.sessions.active;
  if (!s || d.table.mode !== 'session') return;
  s.activeMs += Math.min(Math.max(0, now - s.lastActiveAt), 5 * 60_000);
  s.lastActiveAt = now;
}

function applySettlement(d: SaveData, round: Round) {
  const net = round.net;
  d.stats.handsPlayed++;
  if (d.table.mode === 'session' && d.sessions.active) {
    const s = d.sessions.active;
    s.stack = Math.round((s.stack + net) * 100) / 100;
    s.hands++;
    s.net = Math.round((s.net + net) * 100) / 100;
    s.biggestWin = Math.max(s.biggestWin, net);
    s.biggestLoss = Math.min(s.biggestLoss, net);
  } else if (d.table.mode === 'quick') {
    d.table.quickStack = Math.round((d.table.quickStack + net) * 100) / 100;
  }
}

export function deal() {
  update((d) => {
    if (!canDeal(d).ok) return;
    const now = Date.now();
    touchSession(d, now);
    const shoe = d.table.round?.shoe ?? d.table.shoe;
    const round = startRound({ rules: d.settings.rules, shoe, bet: d.table.bet, bankroll: chipsAvailable(d) });
    d.table.round = round;
    d.table.shoe = round.shoe;
    d.table.feedback = null;
    d.table.hint = null;
    d.table.undo = null;
    d.settings.lastBet = d.table.bet;
    if (round.phase === 'done') applySettlement(d, round);
  });
}

export function situationLabel(s: Pick<Situation, 'kind' | 'row' | 'up'>): string {
  const up = upcardLabel(s.up);
  if (s.kind === 'pair') {
    const p = s.row === 11 ? 'A' : String(s.row);
    return `${p},${p} vs ${up}`;
  }
  return `${s.kind === 'soft' ? 'Soft ' : ''}${s.row} vs ${up}`;
}

export function currentRecommendation(d: SaveData) {
  const round = d.table.round;
  if (!round || round.phase !== 'player') return null;
  const hand = round.hands[round.active];
  return recommend(round.rules, hand.cards, round.dealer[0], legalActions(round));
}

export function showHint() {
  update((d) => {
    const round = d.table.round;
    if (!round || d.table.hint) return;
    if (round.phase === 'insurance') {
      d.table.hint = { action: 'No insurance', reason: INSURANCE_REASON };
    } else {
      const rec = currentRecommendation(d);
      if (!rec) return;
      d.table.hint = { action: ACTION_LABEL[rec.action], reason: reasonFor(rec.situation, rec.action, rec.code) };
    }
    d.stats.hints++;
    if (d.table.mode === 'session' && d.sessions.active) d.sessions.active.hints++;
  });
}

function snapshot(d: SaveData) {
  if (!d.settings.coach || !d.table.round) return null;
  return {
    round: d.table.round,
    shoe: d.table.shoe,
    bankroll: d.bankroll,
    session: d.sessions.active,
    quickStack: d.table.quickStack,
    handsPlayed: d.stats.handsPlayed,
  };
}

function countDecision(d: SaveData, ok: boolean, hinted: boolean) {
  if (d.table.mode === 'session' && d.sessions.active && !hinted) {
    d.sessions.active.decisions++;
    if (ok) d.sessions.active.correct++;
  }
}

export function playAction(action: Action) {
  update((d) => {
    const round = d.table.round;
    if (!round || round.phase !== 'player') return;
    const legal = legalActions(round);
    if (!legal[action]) return;
    const hand = round.hands[round.active];
    const rec = recommend(round.rules, hand.cards, round.dealer[0], legal);
    const ok = rec.action === action;
    const hinted = !!d.table.hint;
    const category: StatCategory =
      legal.surrender && rec.code.startsWith('R') ? 'surrender' : rec.situation.kind;

    recordDecision(d, {
      key: rec.situation.key,
      category,
      ok,
      hinted,
      cards: hand.cards,
      up: round.dealer[0],
      legal,
      chosen: action,
      correct: rec.action,
      source: 'table',
    });
    countDecision(d, ok, hinted);

    const undo = ok ? null : snapshot(d);
    touchSession(d, Date.now());
    const next = engineAct(round, action);
    d.table.round = next;
    d.table.shoe = next.shoe;
    d.table.hint = null;
    d.table.undo = undo;
    d.table.feedback = {
      ok,
      chosen: action,
      correct: rec.action,
      reason: reasonFor(rec.situation, rec.action, rec.code),
      label: situationLabel(rec.situation),
      hinted,
      canTakeBack: !!undo,
    };
    if (next.phase === 'done') applySettlement(d, next);
  });
}

export function chooseInsurance(take: boolean) {
  update((d) => {
    const round = d.table.round;
    if (!round || round.phase !== 'insurance') return;
    const ok = !take;
    const hinted = !!d.table.hint;
    const hand = round.hands[0];
    const evenMoney = describeHand(hand.cards) === 'Blackjack';
    recordDecision(d, {
      key: 'INS',
      category: 'insurance',
      ok,
      hinted,
      cards: hand.cards,
      up: round.dealer[0],
      legal: { hit: false, stand: false, double: false, split: false, surrender: false },
      chosen: take ? 'insurance' : 'no-insurance',
      correct: 'no-insurance',
      source: 'table',
    });
    countDecision(d, ok, hinted);
    const undo = ok ? null : snapshot(d);
    const next = engineInsurance(round, take);
    d.table.round = next;
    d.table.shoe = next.shoe;
    d.table.hint = null;
    d.table.undo = undo;
    d.table.feedback = {
      ok,
      chosen: take ? 'insurance' : 'no-insurance',
      correct: 'no-insurance',
      reason: evenMoney ? evenMoneyReason(round.rules.blackjackPayout) : INSURANCE_REASON,
      label: evenMoney ? 'Even money' : 'Insurance',
      hinted,
      canTakeBack: !!undo,
    };
    if (next.phase === 'done') applySettlement(d, next);
  });
}

/** Coach mode: undo the last (wrong) decision and try again. The mistake stays in stats. */
export function takeBack() {
  update((d) => {
    const u = d.table.undo;
    if (!u) return;
    d.table.round = u.round;
    d.table.shoe = u.shoe;
    d.bankroll = u.bankroll;
    d.sessions.active = u.session;
    d.table.quickStack = u.quickStack;
    d.stats.handsPlayed = u.handsPlayed;
    d.table.undo = null;
    d.table.feedback = null;
  });
}

export function dismissFeedback() {
  update((d) => {
    d.table.feedback = null;
  });
}

/** Rules changed: start a fresh shoe for the new deck count before the next deal. */
export function syncShoeToRules(d: SaveData) {
  if (roundInProgress(d)) return;
  if (d.table.shoe.decks !== d.settings.rules.decks) {
    d.table.shoe = createShoe(d.settings.rules.decks);
    if (d.table.round) d.table.round = { ...d.table.round, shoe: d.table.shoe };
  }
}

export function tableSnapshot() {
  return getData().table;
}
