import { type Card, RANKS, SUITS } from '../engine/cards';
import type { Action, Legal, Round } from '../engine/round';
import { DEFAULT_RULES, type Rules, sanitizeRules } from '../engine/rules';
import { type Shoe, createShoe } from '../engine/shoe';

export const SAVE_VERSION = 1;
export const STARTING_BANKROLL = 1000;

export type AnimSpeed = 'off' | 'fast' | 'normal';
export type StatCategory = 'hard' | 'soft' | 'pair' | 'surrender' | 'insurance';
export type DecisionSource = 'table' | 'drill' | 'daily' | 'lesson' | 'review';

export interface Settings {
  rules: Rules;
  coach: boolean;
  animation: AnimSpeed;
  sound: boolean;
  tableMin: number;
  tableMax: number;
  lastBet: number;
  installTipDismissed: boolean;
  /** Skip the one-lesson-per-day pacing. */
  unlockAllLessons: boolean;
  /** Strategy chart: show personal accuracy heat map. */
  chartHeatmap: boolean;
}

export interface BankrollPoint {
  t: number;
  balance: number;
  kind: 'start' | 'session' | 'reset';
}

export interface Bankroll {
  balance: number;
  history: BankrollPoint[];
  resets: number;
}

export interface Session {
  id: string;
  startedAt: number;
  endedAt: number | null;
  /** Active play time; idle gaps over 5 minutes don't count. */
  activeMs: number;
  lastActiveAt: number;
  buyIn: number;
  stack: number;
  hands: number;
  decisions: number;
  correct: number;
  hints: number;
  net: number;
  biggestWin: number;
  biggestLoss: number;
}

export interface CoachFeedback {
  ok: boolean;
  chosen: Action | 'insurance' | 'no-insurance';
  correct: Action | 'insurance' | 'no-insurance';
  reason: string;
  /** e.g. "16 vs 10" */
  label: string;
  hinted: boolean;
  canTakeBack: boolean;
}

export interface UndoSnapshot {
  round: Round;
  shoe: Shoe;
  bankroll: Bankroll;
  session: Session | null;
  quickStack: number;
  handsPlayed: number;
}

export type PlayMode = 'session' | 'quick';

export interface TableState {
  mode: PlayMode | null;
  shoe: Shoe;
  /** Current round, or the last finished one (shown until the next deal). */
  round: Round | null;
  bet: number;
  quickStack: number;
  feedback: CoachFeedback | null;
  /** Hint shown for the current decision (counts toward hint stats once acted on). */
  hint: { action: string; reason: string } | null;
  undo: UndoSnapshot | null;
}

export interface CellStat {
  n: number;
  correct: number;
  last: number;
  lastWrong: number | null;
}

export interface Mistake {
  id: string;
  t: number;
  key: string;
  cards: Card[];
  up: Card;
  legal: Legal;
  chosen: string;
  correct: string;
  source: DecisionSource;
}

export interface Stats {
  cells: Record<string, CellStat>;
  categories: Record<StatCategory, { n: number; correct: number }>;
  handsPlayed: number;
  decisions: number;
  hints: number;
  mistakes: Mistake[];
}

export interface LessonProgress {
  attempts: number;
  bestPct: number;
  /** Local date (YYYY-MM-DD) the lesson was first passed. */
  passedOn: string | null;
}

export interface ActiveLesson {
  id: string;
  /** Index into the lesson's steps (cards then questions). */
  step: number;
  answers: boolean[];
  startedAt: number;
  seed: number;
}

export interface DrillAnswer {
  key: string;
  ok: boolean;
  ms: number;
}

export interface ActiveDrill {
  kind: 'daily' | 'library' | 'review' | 'count';
  /** library: hard/soft/pair/surrender/mixed; count: speed preset */
  mode: string;
  timed: boolean;
  date: string;
  seed: number;
  /** Situation keys to ask, in order (or card list length for counting). */
  queue: string[];
  index: number;
  answers: DrillAnswer[];
  startedAt: number;
  /** Counting drill: the cards shown and the true running count. */
  count?: { cards: Card[]; answer: number; shown: boolean; guess: number | null };
  /** Review drills replay exact hands (queue holds mistake ids). */
  hands?: { cards: Card[]; up: Card; legal: Legal }[];
}

export interface Streak {
  current: number;
  best: number;
  lastGoalDate: string | null;
  freezes: number;
  freezesUsed: string[];
}

export interface Progress {
  lessons: Record<string, LessonProgress>;
  activeLesson: ActiveLesson | null;
  activeDrill: ActiveDrill | null;
  daily: Record<string, { correct: number; total: number; perfect: boolean }>;
  drillHistory: { t: number; kind: string; mode: string; correct: number; total: number; ms: number }[];
  countBest: Record<string, number>;
  streak: Streak;
}

export interface SaveData {
  version: number;
  createdAt: number;
  settings: Settings;
  bankroll: Bankroll;
  sessions: { active: Session | null; past: Session[] };
  table: TableState;
  stats: Stats;
  progress: Progress;
}

// ── Defaults ────────────────────────────────────────────────────────────────

export const DEFAULT_SETTINGS: Settings = {
  rules: DEFAULT_RULES,
  coach: true,
  animation: 'normal',
  sound: false,
  tableMin: 5,
  tableMax: 500,
  lastBet: 25,
  installTipDismissed: false,
  unlockAllLessons: false,
  chartHeatmap: false,
};

const emptyCategories = (): Stats['categories'] => ({
  hard: { n: 0, correct: 0 },
  soft: { n: 0, correct: 0 },
  pair: { n: 0, correct: 0 },
  surrender: { n: 0, correct: 0 },
  insurance: { n: 0, correct: 0 },
});

export function defaultData(now = Date.now()): SaveData {
  return {
    version: SAVE_VERSION,
    createdAt: now,
    settings: { ...DEFAULT_SETTINGS },
    bankroll: { balance: STARTING_BANKROLL, history: [{ t: now, balance: STARTING_BANKROLL, kind: 'start' }], resets: 0 },
    sessions: { active: null, past: [] },
    table: {
      mode: null,
      shoe: createShoe(DEFAULT_RULES.decks),
      round: null,
      bet: DEFAULT_SETTINGS.lastBet,
      quickStack: STARTING_BANKROLL,
      feedback: null,
      hint: null,
      undo: null,
    },
    stats: { cells: {}, categories: emptyCategories(), handsPlayed: 0, decisions: 0, hints: 0, mistakes: [] },
    progress: {
      lessons: {},
      activeLesson: null,
      activeDrill: null,
      daily: {},
      drillHistory: [],
      countBest: {},
      streak: { current: 0, best: 0, lastGoalDate: null, freezes: 0, freezesUsed: [] },
    },
  };
}

// ── Validation helpers (never throw; repair or drop) ────────────────────────

type Obj = Record<string, unknown>;
const isObj = (v: unknown): v is Obj => !!v && typeof v === 'object' && !Array.isArray(v);
const num = (v: unknown, fb: number, min = -Infinity, max = Infinity) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fb;
const bool = (v: unknown, fb: boolean) => (typeof v === 'boolean' ? v : fb);
const strOrNull = (v: unknown) => (typeof v === 'string' ? v : null);
const arr = <T>(v: unknown, keep: (x: unknown) => x is T, max = Infinity): T[] =>
  Array.isArray(v) ? v.filter(keep).slice(-max) : [];

export function isCard(v: unknown): v is Card {
  return isObj(v) && (RANKS as readonly unknown[]).includes(v.rank) && (SUITS as readonly unknown[]).includes(v.suit);
}

function isShoe(v: unknown): v is Shoe {
  if (!isObj(v)) return false;
  const decks = v.decks;
  return (
    (decks === 1 || decks === 2 || decks === 6 || decks === 8) &&
    Array.isArray(v.cards) &&
    v.cards.length === decks * 52 &&
    v.cards.every(isCard) &&
    typeof v.pos === 'number' &&
    v.pos >= 0 &&
    v.pos <= v.cards.length &&
    typeof v.cutAt === 'number' &&
    typeof v.rngState === 'number'
  );
}

function isHand(v: unknown): boolean {
  return isObj(v) && Array.isArray(v.cards) && v.cards.length >= 1 && v.cards.every(isCard) && typeof v.bet === 'number';
}

export function isRound(v: unknown): v is Round {
  if (!isObj(v)) return false;
  return (
    (v.phase === 'insurance' || v.phase === 'player' || v.phase === 'done') &&
    Array.isArray(v.dealer) &&
    v.dealer.length >= 2 &&
    v.dealer.every(isCard) &&
    Array.isArray(v.hands) &&
    v.hands.length >= 1 &&
    v.hands.length <= 4 &&
    v.hands.every(isHand) &&
    typeof v.active === 'number' &&
    v.active >= 0 &&
    v.active < v.hands.length &&
    typeof v.baseBet === 'number' &&
    typeof v.bankrollAtStart === 'number' &&
    isObj(v.insurance) &&
    isShoe(v.shoe) &&
    isObj(v.rules)
  );
}

function isSession(v: unknown): v is Session {
  return isObj(v) && typeof v.id === 'string' && typeof v.startedAt === 'number' && typeof v.stack === 'number';
}

function cleanSession(v: Session): Session {
  return {
    id: v.id,
    startedAt: v.startedAt,
    endedAt: typeof v.endedAt === 'number' ? v.endedAt : null,
    activeMs: num(v.activeMs, 0, 0),
    lastActiveAt: num(v.lastActiveAt, v.startedAt),
    buyIn: num(v.buyIn, 0, 0),
    stack: num(v.stack, 0, 0),
    hands: num(v.hands, 0, 0),
    decisions: num(v.decisions, 0, 0),
    correct: num(v.correct, 0, 0),
    hints: num(v.hints, 0, 0),
    net: num(v.net, 0),
    biggestWin: num(v.biggestWin, 0),
    biggestLoss: num(v.biggestLoss, 0),
  };
}

/**
 * Repair a parsed save of the current version. Anything malformed falls back to its default
 * (and is reported in `dropped`) instead of throwing.
 */
export function sanitize(input: unknown, now = Date.now()): { data: SaveData; dropped: string[] } {
  const d = defaultData(now);
  const dropped: string[] = [];
  if (!isObj(input)) return { data: d, dropped: ['everything'] };

  // Settings
  const s = isObj(input.settings) ? input.settings : {};
  const rules = sanitizeRules(s.rules);
  const tableMin = num(s.tableMin, d.settings.tableMin, 1, 1000);
  d.settings = {
    rules,
    coach: bool(s.coach, true),
    animation: s.animation === 'off' || s.animation === 'fast' || s.animation === 'normal' ? s.animation : 'normal',
    sound: bool(s.sound, false),
    tableMin,
    tableMax: num(s.tableMax, d.settings.tableMax, tableMin, 100000),
    lastBet: num(s.lastBet, d.settings.lastBet, 1),
    installTipDismissed: bool(s.installTipDismissed, false),
    unlockAllLessons: bool(s.unlockAllLessons, false),
    chartHeatmap: bool(s.chartHeatmap, false),
  };
  d.createdAt = num(input.createdAt, now);

  // Bankroll
  const b = isObj(input.bankroll) ? input.bankroll : {};
  d.bankroll = {
    balance: num(b.balance, STARTING_BANKROLL, 0),
    resets: num(b.resets, 0, 0),
    history: arr(
      b.history,
      (p): p is BankrollPoint => isObj(p) && typeof p.t === 'number' && typeof p.balance === 'number',
      2000,
    ).map((p) => ({ t: p.t, balance: p.balance, kind: p.kind === 'session' || p.kind === 'reset' ? p.kind : 'start' })),
  };
  if (!d.bankroll.history.length) d.bankroll.history = [{ t: now, balance: d.bankroll.balance, kind: 'start' }];

  // Sessions
  const ss = isObj(input.sessions) ? input.sessions : {};
  d.sessions = {
    active: isSession(ss.active) ? cleanSession(ss.active) : null,
    past: arr(ss.past, isSession, 500).map(cleanSession),
  };

  // Table
  const t = isObj(input.table) ? input.table : {};
  const shoe = isShoe(t.shoe) ? (t.shoe as Shoe) : createShoe(rules.decks);
  let round: Round | null = null;
  if (t.round != null) {
    if (isRound(t.round)) round = { ...(t.round as Round), rules: sanitizeRules((t.round as Round).rules) };
    else dropped.push('the hand in progress');
  }
  const mode = t.mode === 'session' || t.mode === 'quick' ? t.mode : null;
  d.table = {
    mode: mode === 'session' && !d.sessions.active ? null : mode,
    shoe,
    round,
    bet: num(t.bet, d.settings.lastBet, 0),
    quickStack: num(t.quickStack, STARTING_BANKROLL, 0),
    feedback: isObj(t.feedback) ? (t.feedback as unknown as CoachFeedback) : null,
    hint: isObj(t.hint) ? (t.hint as TableState['hint']) : null,
    // Undo snapshots are convenience only; drop them if anything looks off.
    undo: isObj(t.undo) && isRound((t.undo as Obj).round) && isShoe((t.undo as Obj).shoe) ? (t.undo as unknown as UndoSnapshot) : null,
  };

  // Stats
  const st = isObj(input.stats) ? input.stats : {};
  const cells: Record<string, CellStat> = {};
  if (isObj(st.cells)) {
    for (const [k, v] of Object.entries(st.cells)) {
      if (isObj(v) && typeof v.n === 'number') {
        cells[k] = { n: num(v.n, 0, 0), correct: num(v.correct, 0, 0), last: num(v.last, 0), lastWrong: typeof v.lastWrong === 'number' ? v.lastWrong : null };
      }
    }
  }
  const cats = emptyCategories();
  if (isObj(st.categories)) {
    for (const k of Object.keys(cats) as StatCategory[]) {
      const c = (st.categories as Obj)[k];
      if (isObj(c)) cats[k] = { n: num(c.n, 0, 0), correct: num(c.correct, 0, 0) };
    }
  }
  d.stats = {
    cells,
    categories: cats,
    handsPlayed: num(st.handsPlayed, 0, 0),
    decisions: num(st.decisions, 0, 0),
    hints: num(st.hints, 0, 0),
    mistakes: arr(
      st.mistakes,
      (m): m is Mistake => isObj(m) && typeof m.key === 'string' && Array.isArray(m.cards) && m.cards.every(isCard) && isCard(m.up) && isObj(m.legal),
      50,
    ),
  };

  // Progress
  const p = isObj(input.progress) ? input.progress : {};
  const lessons: Record<string, LessonProgress> = {};
  if (isObj(p.lessons)) {
    for (const [k, v] of Object.entries(p.lessons)) {
      if (isObj(v)) lessons[k] = { attempts: num(v.attempts, 0, 0), bestPct: num(v.bestPct, 0, 0, 100), passedOn: strOrNull(v.passedOn) };
    }
  }
  const al = p.activeLesson;
  const activeLesson =
    isObj(al) && typeof al.id === 'string' && typeof al.step === 'number' && Array.isArray(al.answers)
      ? { id: al.id, step: num(al.step, 0, 0), answers: al.answers.filter((x): x is boolean => typeof x === 'boolean'), startedAt: num(al.startedAt, now), seed: num(al.seed, 1) }
      : null;
  const ad = p.activeDrill;
  const activeDrill =
    isObj(ad) && typeof ad.kind === 'string' && Array.isArray(ad.queue) && typeof ad.index === 'number' && Array.isArray(ad.answers)
      ? (ad as unknown as ActiveDrill)
      : null;
  const daily: Progress['daily'] = {};
  if (isObj(p.daily)) {
    for (const [k, v] of Object.entries(p.daily)) {
      if (isObj(v)) daily[k] = { correct: num(v.correct, 0, 0), total: num(v.total, 0, 0), perfect: bool(v.perfect, false) };
    }
  }
  const sk = isObj(p.streak) ? p.streak : {};
  d.progress = {
    lessons,
    activeLesson,
    activeDrill,
    daily,
    drillHistory: arr(p.drillHistory, (x): x is Progress['drillHistory'][number] => isObj(x) && typeof x.t === 'number', 300),
    countBest: isObj(p.countBest) ? Object.fromEntries(Object.entries(p.countBest).filter(([, v]) => typeof v === 'number')) as Record<string, number> : {},
    streak: {
      current: num(sk.current, 0, 0),
      best: num(sk.best, 0, 0),
      lastGoalDate: strOrNull(sk.lastGoalDate),
      freezes: num(sk.freezes, 0, 0, 2),
      freezesUsed: arr(sk.freezesUsed, (x): x is string => typeof x === 'string', 100),
    },
  };
  d.version = SAVE_VERSION;
  return { data: d, dropped };
}
