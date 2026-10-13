# Blackjack Bot — Project Notes
> iPhone-first blackjack trainer: daily lessons, drills, strategy chart, and a play-money practice table.
> Reference for jumping back into this project.
> Last updated: October 12, 2026 (Phase 5 — drills, chart, stats)

---

## Live URL
🌐 _not deployed yet_ — target **https://blackjack.c2tbuilds.com**

## GitHub
📁 **https://github.com/teel23/blackjack-bot**

## Local Path
`~/dev/blackjack-bot` (code) · `iCloud/COMPUTER/AI/Projects/BlackJack Bot/` (notes copy only)

## Tech Stack
Next.js 16 · TypeScript · Tailwind 4 · zustand · localStorage · Vitest · Playwright (WebKit) · Netlify

## Status
🔧 In Progress

---

## Build log (newest first)

### 2026-10-12 — Phase 5: drills library, strategy chart, stats, review mistakes, settings
- `/drills/`: hard / soft / pairs / surrender / mixed, accuracy or speed (6s per hand), per-category
  accuracy, recent drills, review-mistakes entry, counting-drill entry.
- `/chart/`: Hard/Soft/Pairs tabs from `buildChart(rules)`, letters + Okabe–Ito colors, sticky upcard
  header, dot on cells changed by your rules, tap → reason, rule note, EV per $100 for every action,
  your record. Heat-map toggle (sequential red by miss rate, accuracy % in cell).
- `/stats/`: overall + per-category accuracy, hands/lessons/streak tiles, most-missed hands, recent
  mistakes (chosen vs correct). Review replays the **exact** missed hands with the options you had;
  each fixed one drops off.
- `/settings/`: backup export (iOS share sheet → Files, download fallback) / import with confirm,
  storage-persistence status, full rules editor, table limits, coach/animations/sound, unlock-all,
  install-tip toggle, reset all data. `/about/`: responsible framing + 1-800-GAMBLER (call/text) + NCPG.
- Fixes from e2e: footer link was a 15px tap target; bottom sheets now have a visible close button.

### 2026-10-12 — Phase 4: lessons 1–10, daily unlock, daily drill, streaks
- Lesson data model (`content/lessons`): explanation cards (**bold**, card visuals) + questions —
  `decision` (answer computed from the chart under standard 6D S17 rules, optional hit/stand-only
  subsets) and `choice`. Units 1–4 written (10 lessons, original text). Content validated in tests.
- Lesson player (`/lesson/[id]/`, statically generated): progress bar, per-question feedback, pass at
  80%, resume mid-lesson after a kill, result screen with "unlocks tomorrow".
- One-lesson-per-day pacing (`lib/progress/unlock.ts`) + "Unlock all lessons" setting.
- Daily drill (20 decisions, seeded by date, weighted to misses), drill player (`/drill/`) shared with
  library drills (speed timer) and mistake review; correct answers auto-advance, misses stop to explain.
- Streaks: daily goal = today's drill; perfect drill earns a freeze (max 2) that covers missed days.
- Today screen (streak + 7-day dots, daily goal, next lesson, bankroll/accuracy tiles) and Learn path.
- iOS install tip (one-time, dismissible).
- Tests: 154 unit; e2e adds finish lesson + next-day unlock (Playwright clock), resume mid-lesson,
  full daily drill → streak.

### 2026-10-12 — Phase 3: bankroll + sessions
- `/sessions/`: bankroll hero, stat tiles, bankroll-over-time SVG chart (gold line, tap/drag to
  inspect, reset markers, table view toggle), open-session card, history list (date, hands, active
  time, buy-in, net with ▲/▼ + sign, accuracy, hints, best/worst hand), confirmed + logged reset.
- Lobby shows "Bankroll empty" with reset when broke; quick play refill.
- Fixed: take-back snapshot shared the live session object, so undo didn't restore the stack
  (caught by the new unit test). Fixed chart ticks so the line never exceeds the plot.
- Unit tests 136 (sessions, storage repair/migrate/backup, streak + DST-safe dates). E2E adds
  session buy-in → cash-out → history, and reset.

### 2026-10-12 — Phase 2: practice table + coach mode
- Versioned save layer (`lib/storage`): one `bjbot:data` key, sanitize/repair on load, corrupt data
  backed up to `bjbot:corrupt:<ts>` with a notice, `navigator.storage.persist()`, export/import helpers.
- zustand store with save-after-every-change (microtask) + flush on `pagehide`/hidden.
- Table: SVG card art (suits as paths so iOS never shows emoji), deal/flip animations that never
  replay on resume, dealer reveal sequence with tap-to-skip, fixed-height coach banner and action
  bar (no layout jumps), illegal actions disabled, color-coded actions matching the chart colors.
- Coach mode (✅/❌ + correct play + reason), take-back on mistakes (mistake stays in stats), hint
  button (counted, excluded from accuracy), insurance/even-money prompt, chips + table min/max.
- Lobby: buy-in sessions + quick play (separate stack). 4 split hands fit at 375px (compact labels).
- **Playwright pinned to 1.58.2**: this Mac is on macOS 14, and newer Playwright only ships a frozen
  WebKit build for macOS 14 that fails ("Unknown setting: PushAPIEnabled"). 1.58.2 = WebKit 26.0.
- E2E (WebKit, iPhone SE 3rd gen / 15 / 15 Pro Max): play a hand, take-back, split + double,
  kill-and-resume mid-hand, insurance. 15/15 green. Screenshot tour: `SCREENS=1 npx playwright test`.

### 2026-10-12 — Phase 1: engine + strategy tables
- Scaffolded Next 16.4 app in `~/dev/blackjack-bot`, static export (`out/`), turned off the new
  cacheComponents/partialPrefetching defaults (not needed for an all-client static app).
- `lib/engine`: cards, seeded RNG, shoe with cut card, hand totals/soft logic, rules object,
  round state machine (insurance/even money, peek, surrender, double, split/resplit, split aces,
  ENHC no-peek, dealer H17/S17, settlement). Pure TS, JSON-serializable.
- `lib/strategy`: published base tables for 1 / 2 / 4–8 decks + data deviations (H17, no DAS,
  no peek) + restrictions (no surrender, double 9–11 / 10–11). EV calculator as an independent check.
- Calculator cross-check found and fixed: 1D H17 8,8 vs A is split (not surrender), 1D H17 7,7 vs A
  surrender, 1D H17 9,9 vs A split, 1D no-DAS 2,2 vs 3 hit, and a no-peek 9,9 vs A bug.
- 119 unit tests green. Default chart matches the published 6D S17 DAS LS chart cell for cell.

**Why the EV calculator:** "changing rules must change the chart" means every rule combo needs a
correct chart, but published charts only exist for common combos. The calculator (exact dealer odds
with card removal) verifies every cell of every variant; remaining gaps are all < 0.6% of a bet and
sit on known marginal cells, where the published chart is kept.

---

## Open Items
- [ ] Phase 6: lessons 11–30, counting drill, PWA polish, accessibility pass
- [ ] Phase 7: iPhone hardening (WebKit e2e, kill-and-resume, storage, safe areas, manual checklist)
- [ ] Phase 8: Netlify deploy + blackjack.c2tbuilds.com + portfolio card
- [ ] Ask Carson: games.c2tbuilds.com tile (teel23/mini-games) — not approved yet
- [ ] Ask Carson: AI Dashboard entry (add `'BlackJack Bot': 'blackjack-bot'` to ai-dashboard sync-notes folder map, run sync, journal note) — not approved yet
