# Blackjack Bot — Project Notes
> iPhone-first blackjack trainer: daily lessons, drills, strategy chart, and a play-money practice table.
> Reference for jumping back into this project.
> Last updated: October 13, 2026 (Phase 8 — live)

---

## Live URL
🌐 **https://blackjack.c2tbuilds.com** (once the DNS record is added) · works now at **https://c2t-blackjack-bot.netlify.app**

## GitHub
📁 **https://github.com/teel23/blackjack-bot**

## Local Path
`~/dev/blackjack-bot` (code) · `iCloud/COMPUTER/AI/Projects/BlackJack Bot/` (notes copy only)

## Tech Stack
Next.js 16 · TypeScript · Tailwind 4 · zustand · localStorage · Vitest · Playwright (WebKit) · Netlify

## Status
✅ Live (beta) on Netlify — deploy with `npm run deploy` (not git-linked)

---

## Manual iPhone checklist
Run once in **Safari**, then again after **Add to Home Screen** (installed app). ~10 minutes.

**Safari**
- [ ] Open blackjack.c2tbuilds.com — Today screen loads, no zoomed-in or sideways-scrolling page.
- [ ] Notch/Dynamic Island: headers sit below it; tab bar sits above the home indicator.
- [ ] Rotate to landscape on the table — dealer and player side by side, nothing cut off. Rotate back.
- [ ] Play → Quick play → Deal. Double-tap Hit fast: only one card comes. Buttons never jump around.
- [ ] Split a pair (keep dealing until you get one) — hands fit, no sideways scroll.
- [ ] Mid-hand, swipe Safari away (kill it). Reopen the URL — same cards, same bankroll.
- [ ] Pull down on the table — the page doesn't refresh.
- [ ] Settings → Export backup → "Save to Files" works. Import it back → "Backup restored."
- [ ] Settings → Sound on → play a hand: sounds play (sound only starts after a tap).
- [ ] iOS Settings → Accessibility → Larger Text, bump it up — lesson text grows, table still fits.
- [ ] VoiceOver on: swipe through the table — cards read as "Ten of hearts", buttons have names.

**Installed (Share → Add to Home Screen)**
- [ ] Icon looks right on the Home Screen; launch shows the dark splash, then the app full-screen.
- [ ] Status bar text is readable over the dark header.
- [ ] Airplane Mode on → open the app → every tab works (Today, Learn, a lesson, Play, Chart, Stats).
- [ ] Start the daily drill, answer a few, swipe the app away, reopen — it resumes on the same hand.
- [ ] Settings → Backup shows "Your browser has agreed to keep this app's data" (installed apps get this).
- [ ] After a later deploy: reopen → "A new version is ready" appears (never mid-hand) → Update reloads.

## Build log (newest first)

### 2026-10-13 — Phase 8: published
- Netlify site `c2t-blackjack-bot` created, production deployed (static `out/`, 252 files), security +
  cache headers via `netlify.toml` (sw.js no-cache, `_next/static` immutable). All routes 200, 404 page works.
- Custom domain `blackjack.c2tbuilds.com` attached in Netlify. **DNS record not found yet** (checked
  Namecheap's authoritative servers) — add CNAME `blackjack` → `c2t-blackjack-bot.netlify.app.`
- Production e2e: 45/45 core flows pass against the live site (`BASE_URL=… npm run e2e`).
- Lighthouse (mobile, simulated slow 4G + 4× CPU): Accessibility 100, Best Practices 100, SEO 100 on
  every page; Performance 78–88, CLS 0. Split lesson metadata out of the Today/Learn/Stats bundles
  (generated `content/lessons/meta.ts`), which took Today from 74 → 88.
- Portfolio card added to teel23/portfolio (real screenshot from production), pushed → Vercel.

### 2026-10-13 — Phase 7: iPhone hardening
- New e2e hardening suite (all 3 iPhones): true relaunch from saved storage mid-hand, daily drill
  resumes with identical cards, reload during the dealer reveal (no replay, no double pay), corrupt JSON
  (fresh start + `bjbot:corrupt:*` copy + notice), broken hand dropped while bankroll survives,
  simulated notch/home-indicator insets, double-tap guard, overscroll/touch-action, storage.persist().
- Double-tap guard: a repeated identical action within 280ms of the *input event's* timestamp is
  ignored (two quick Hit taps = one hit).
- Added `apple-mobile-web-app-capable` (Next only emits the non-prefixed tag).
- Full suite: 177 unit + 77 e2e (×3 iPhones where applicable), run twice — 154/154 green.

### 2026-10-13 — Phase 6: lessons 11–30, counting drill, PWA polish, accessibility
- All 30 lessons written (units 1–10, original text). Every decision answer printed and checked against
  its explanation (`npx tsx scripts/print-lesson-answers.ts`); content validated in unit tests.
- `/count/`: Hi-Lo counting drill (10/20/52 cards × slow/medium/fast), pauses when backgrounded, ±1/±5
  count pad (iOS numeric keyboard has no minus), per-card review with running totals.
- PWA: iOS launch screens for 10 iPhone sizes (`scripts/make-splash.mjs`, not precached), maskable
  icon, manifest. **Fixed: the service worker's first install triggered a page reload** — now it only
  reloads after the player taps Update.
- Offline verified for real: e2e starts a private server, waits for the precache, kills the server,
  then loads every route + client navigation from the service worker.
- Dynamic Type: root font follows iOS text size (`-apple-system-body`, default 17→16px, capped at 20px);
  content text converted to rem. Landscape: compact table (dealer/player side by side, one-row actions).
- Accessibility: axe audit (WCAG 2.1 AA) on 11 screens + live table — 0 serious/critical. Fixed day-dot
  ARIA and locked-lesson contrast; lighter `--faint`.

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
- [ ] **Add DNS:** Namecheap → c2tbuilds.com → Advanced DNS → CNAME `blackjack` → `c2t-blackjack-bot.netlify.app.` (then Netlify issues SSL automatically)
- [ ] Run the manual iPhone checklist (above) in Safari and as an installed app
- [ ] Optional: switch portfolio `demoUrl` to https://blackjack.c2tbuilds.com once SSL is live
- [ ] Optional: connect the GitHub repo in the Netlify UI for auto-deploys on push
- [ ] Ask Carson: games.c2tbuilds.com tile (teel23/mini-games) — not approved yet
- [ ] Ask Carson: AI Dashboard entry (add `'BlackJack Bot': 'blackjack-bot'` to ai-dashboard sync-notes folder map, run sync, journal note) — not approved yet
