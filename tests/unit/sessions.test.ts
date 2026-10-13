import { beforeEach, describe, expect, it } from 'vitest';
import { c } from '@/lib/engine/cards';
import { stackDeal } from '@/lib/engine/shoe';
import { cashOut, isBroke, resetBankroll, startQuickPlay, startSession } from '@/lib/state/sessions';
import { getData, replaceData, update } from '@/lib/state/store';
import { deal, playAction, setBet, takeBack } from '@/lib/state/table';
import { defaultData } from '@/lib/storage/schema';

function stack(p: [number, number], up: number, hole: number, draws: number[] = []) {
  update((d) => {
    d.table.shoe = stackDeal([c(p[0], 'H'), c(p[1], 'D')], c(up, 'S'), c(hole, 'C'), draws.map((x) => c(x, 'H')), 6, 3);
    d.table.round = null;
  });
}

beforeEach(() => replaceData(defaultData()));

describe('sessions', () => {
  it('buy-in moves chips from the bankroll to the session stack', () => {
    startSession(250);
    const d = getData();
    expect(d.bankroll.balance).toBe(750);
    expect(d.sessions.active?.stack).toBe(250);
    expect(d.table.mode).toBe('session');
  });

  it('hands settle against the session, and cash-out logs history', () => {
    startSession(250);
    stack([10, 9], 6, 10, [8]);
    setBet(25);
    deal();
    playAction('stand');
    let d = getData();
    expect(d.sessions.active).toMatchObject({ stack: 275, hands: 1, net: 25, decisions: 1, correct: 1, biggestWin: 25 });
    cashOut();
    d = getData();
    expect(d.sessions.active).toBeNull();
    expect(d.bankroll.balance).toBe(1025);
    expect(d.sessions.past).toHaveLength(1);
    expect(d.bankroll.history.at(-1)).toMatchObject({ balance: 1025, kind: 'session' });
    expect(d.table.mode).toBeNull();
  });

  it('cannot cash out mid-hand', () => {
    startSession(100);
    stack([10, 6], 7, 10, [5]);
    setBet(25);
    deal();
    cashOut();
    expect(getData().sessions.active).not.toBeNull();
  });

  it('take back restores the stack after a wrong play that ended the hand', () => {
    startSession(100);
    stack([10, 6], 10, 7, [9]);
    setBet(25);
    deal();
    playAction('stand'); // wrong: surrender is correct
    expect(getData().sessions.active?.stack).toBe(75);
    takeBack();
    const d = getData();
    expect(d.sessions.active?.stack).toBe(100);
    expect(d.table.round?.phase).toBe('player');
    expect(d.stats.mistakes).toHaveLength(1);
  });

  it('quick play never touches the bankroll', () => {
    startQuickPlay();
    stack([10, 9], 6, 10, [8]);
    setBet(25);
    deal();
    playAction('stand');
    const d = getData();
    expect(d.table.quickStack).toBe(1025);
    expect(d.bankroll.balance).toBe(1000);
    expect(d.sessions.past).toHaveLength(0);
  });

  it('reset is logged and restores $1,000', () => {
    update((d) => void (d.bankroll.balance = 3));
    expect(isBroke(getData())).toBe(true);
    resetBankroll();
    const d = getData();
    expect(d.bankroll.balance).toBe(1000);
    expect(d.bankroll.resets).toBe(1);
    expect(d.bankroll.history.at(-1)?.kind).toBe('reset');
  });
});
