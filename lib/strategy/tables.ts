/**
 * Published total-dependent basic strategy, S17 + DAS + late surrender + dealer peek,
 * one base table per deck group. Rule changes are layered on as data in deviations.ts.
 *
 * Codes: H hit · S stand · D double (else hit) · Ds double (else stand) · P split
 *        Rh surrender (else hit) · Rs surrender (else stand) · Rp surrender (else split)
 * Columns: dealer 2 3 4 5 6 7 8 9 10 A
 */
export type Code = 'H' | 'S' | 'D' | 'Ds' | 'P' | 'Rh' | 'Rs' | 'Rp';
export type DeckGroup = 'single' | 'double' | 'multi';

export interface BaseTables {
  /** Hard totals 5–21. */
  hard: Record<number, string>;
  /** Soft totals 12–21 (12 = A,A when not splitting). */
  soft: Record<number, string>;
  /** Pair card value 2–11 (11 = aces). Non-P cells are what to do instead. */
  pairs: Record<number, string>;
}

const ALL_H = 'H H H H H H H H H H';
const ALL_S = 'S S S S S S S S S S';
const ALL_P = 'P P P P P P P P P P';

const COMMON_HARD_HIGH = { 17: ALL_S, 18: ALL_S, 19: ALL_S, 20: ALL_S, 21: ALL_S };
const COMMON_SOFT_HIGH = { 12: ALL_H, 20: ALL_S, 21: ALL_S };

export const BASE: Record<DeckGroup, BaseTables> = {
  multi: {
    hard: {
      5: ALL_H, 6: ALL_H, 7: ALL_H, 8: ALL_H,
      9:  'H D D D D H H H H H',
      10: 'D D D D D D D D H H',
      11: 'D D D D D D D D D H',
      12: 'H H S S S H H H H H',
      13: 'S S S S S H H H H H',
      14: 'S S S S S H H H H H',
      15: 'S S S S S H H H Rh H',
      16: 'S S S S S H H Rh Rh Rh',
      ...COMMON_HARD_HIGH,
    },
    soft: {
      ...COMMON_SOFT_HIGH,
      13: 'H H H D D H H H H H',
      14: 'H H H D D H H H H H',
      15: 'H H D D D H H H H H',
      16: 'H H D D D H H H H H',
      17: 'H D D D D H H H H H',
      18: 'S Ds Ds Ds Ds S S H H H',
      19: ALL_S,
    },
    pairs: {
      2:  'P P P P P P H H H H',
      3:  'P P P P P P H H H H',
      4:  'H H H P P H H H H H',
      5:  'D D D D D D D D H H',
      6:  'P P P P P H H H H H',
      7:  'P P P P P P H H H H',
      8:  ALL_P,
      9:  'P P P P P S P P S S',
      10: ALL_S,
      11: ALL_P,
    },
  },
  double: {
    hard: {
      5: ALL_H, 6: ALL_H, 7: ALL_H, 8: ALL_H,
      9:  'D D D D D H H H H H',
      10: 'D D D D D D D D H H',
      11: 'D D D D D D D D D D',
      12: 'H H S S S H H H H H',
      13: 'S S S S S H H H H H',
      14: 'S S S S S H H H H H',
      15: 'S S S S S H H H Rh H',
      16: 'S S S S S H H H Rh Rh',
      ...COMMON_HARD_HIGH,
    },
    soft: {
      ...COMMON_SOFT_HIGH,
      13: 'H H H D D H H H H H',
      14: 'H H H D D H H H H H',
      15: 'H H D D D H H H H H',
      16: 'H H D D D H H H H H',
      17: 'H D D D D H H H H H',
      18: 'S Ds Ds Ds Ds S S H H H',
      19: ALL_S,
    },
    pairs: {
      2:  'P P P P P P H H H H',
      3:  'P P P P P P H H H H',
      4:  'H H H P P H H H H H',
      5:  'D D D D D D D D H H',
      6:  'P P P P P P H H H H',
      7:  'P P P P P P P H H H',
      8:  ALL_P,
      9:  'P P P P P S P P S S',
      10: ALL_S,
      11: ALL_P,
    },
  },
  single: {
    hard: {
      5: ALL_H, 6: ALL_H, 7: ALL_H,
      8:  'H H H D D H H H H H',
      9:  'D D D D D H H H H H',
      10: 'D D D D D D D D H H',
      11: 'D D D D D D D D D D',
      12: 'H H S S S H H H H H',
      13: 'S S S S S H H H H H',
      14: 'S S S S S H H H H H',
      15: 'S S S S S H H H Rh H',
      16: 'S S S S S H H H Rh Rh',
      ...COMMON_HARD_HIGH,
    },
    soft: {
      ...COMMON_SOFT_HIGH,
      13: 'H H D D D H H H H H',
      14: 'H H D D D H H H H H',
      15: 'H H D D D H H H H H',
      16: 'H H D D D H H H H H',
      17: 'D D D D D H H H H H',
      18: 'S Ds Ds Ds Ds S S H H S',
      19: 'S S S S Ds S S S S S',
    },
    pairs: {
      2:  'P P P P P P H H H H',
      3:  'P P P P P P P H H H',
      4:  'H H P P P H H H H H',
      5:  'D D D D D D D D H H',
      6:  'P P P P P P H H H H',
      7:  'P P P P P P P H Rs H',
      8:  ALL_P,
      9:  'P P P P P S P P S S',
      10: ALL_S,
      11: ALL_P,
    },
  },
};

export function parseRow(row: string): Code[] {
  const cells = row.trim().split(/\s+/) as Code[];
  if (cells.length !== 10) throw new Error(`Bad strategy row: ${row}`);
  return cells;
}
