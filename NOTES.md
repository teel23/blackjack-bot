# Blackjack Bot — Project Notes
> iPhone-first blackjack trainer: daily lessons, drills, strategy chart, and a play-money practice table.
> Reference for jumping back into this project.
> Last updated: October 12, 2026 (Phase 1 — engine + strategy)

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
- [ ] Phase 2: practice table + coach mode
- [ ] Phase 3: bankroll + sessions + history
- [ ] Phase 4: lessons 1–10 + daily unlock + streaks
- [ ] Phase 5: drills, strategy chart, stats, review mistakes
- [ ] Phase 6: lessons 11–30, counting drill, PWA polish, accessibility pass
- [ ] Phase 7: iPhone hardening (WebKit e2e, kill-and-resume, storage, safe areas, manual checklist)
- [ ] Phase 8: Netlify deploy + blackjack.c2tbuilds.com + portfolio card
- [ ] Ask Carson: games.c2tbuilds.com tile (teel23/mini-games) — not approved yet
- [ ] Ask Carson: AI Dashboard entry (add `'BlackJack Bot': 'blackjack-bot'` to ai-dashboard sync-notes folder map, run sync, journal note) — not approved yet
