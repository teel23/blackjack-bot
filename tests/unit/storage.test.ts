import { describe, expect, it } from 'vitest';
import { startRound } from '@/lib/engine/round';
import { DEFAULT_RULES } from '@/lib/engine/rules';
import { createShoe } from '@/lib/engine/shoe';
import { parseBackup, makeBackup } from '@/lib/storage/backup';
import { migrate } from '@/lib/storage/persist';
import { SAVE_VERSION, defaultData, sanitize } from '@/lib/storage/schema';

describe('saved data', () => {
  it('a fresh save survives a JSON round trip unchanged', () => {
    const d = defaultData(1);
    d.table.round = startRound({ rules: DEFAULT_RULES, shoe: createShoe(6, 4), bet: 10, bankroll: 1000 });
    const { data, dropped } = sanitize(JSON.parse(JSON.stringify(d)), 1);
    expect(dropped).toEqual([]);
    expect(data).toEqual(d);
  });

  it('drops a corrupt hand but keeps everything else', () => {
    const d = defaultData(1) as unknown as Record<string, unknown>;
    (d.table as Record<string, unknown>).round = { phase: 'player', hands: 'nope' };
    (d.bankroll as Record<string, unknown>).balance = 777;
    const { data, dropped } = sanitize(d, 1);
    expect(data.table.round).toBeNull();
    expect(data.bankroll.balance).toBe(777);
    expect(dropped).toContain('the hand in progress');
  });

  it('repairs bad field types with defaults', () => {
    const { data } = sanitize({ version: 1, settings: { coach: 'yes', rules: { decks: 3 } }, bankroll: { balance: 'lots' } }, 1);
    expect(data.settings.coach).toBe(true);
    expect(data.settings.rules.decks).toBe(6);
    expect(data.bankroll.balance).toBe(1000);
  });

  it('rejects things that are not saves', () => {
    expect(() => migrate(null)).toThrow();
    expect(() => migrate('hello')).toThrow();
    expect(() => migrate({ foo: 1 })).toThrow();
  });

  it('v1 saves migrate to v2 with surrender switched off', () => {
    const v1 = { ...defaultData(1), version: 1 } as unknown as Record<string, unknown>;
    (v1.settings as { rules: Record<string, unknown> }).rules.lateSurrender = true;
    (v1.bankroll as { balance: number }).balance = 777;
    const { data } = migrate(v1);
    expect(data.version).toBe(2);
    expect(data.settings.rules.lateSurrender).toBe(false);
    expect(data.bankroll.balance).toBe(777);
  });

  it('tolerates a save from a newer version', () => {
    const { data } = migrate({ ...defaultData(1), version: SAVE_VERSION + 3 });
    expect(data.version).toBe(SAVE_VERSION);
  });

  it('backup files import, wrapped or bare', () => {
    const d = defaultData(1);
    d.bankroll.balance = 4321;
    expect(parseBackup(JSON.stringify(makeBackup(d))).data.bankroll.balance).toBe(4321);
    expect(parseBackup(JSON.stringify(d)).data.bankroll.balance).toBe(4321);
    expect(() => parseBackup('{not json')).toThrow(/valid JSON/);
    expect(() => parseBackup('{"app":"other"}')).toThrow(/Blackjack Bot backup/);
  });
});
