# MASTER — Blackjack Bot spec

Locked decisions from the 2026-10-12 kickoff. Change these deliberately, not casually.

**Status:** 🔧 In Progress · **Live URL:** _not deployed yet_ · **Repo:** https://github.com/teel23/blackjack-bot

## Product

An interactive blackjack trainer: rules + basic strategy through short daily lessons, drills, and a
practice table with a play-money bankroll. iPhone Safari / Home Screen PWA is the primary target.

## Engine (`lib/engine`)

- Configurable rules: decks 1/2/6/8, H17/S17, BJ 3:2 or 6:5, DAS, double on any two / 9–11 / 10–11,
  max hands after splits (2–4), resplit aces, hit split aces, late surrender, insurance, dealer peek.
- **Defaults:** 6 decks, S17, 3:2, DAS, late surrender, peek, resplit to 4 hands, double any two,
  no resplit aces, no hitting split aces, insurance offered.
- Shoe with cut card (65% / 70% / 75% penetration for 1 / 2 / 6–8 decks, ±4%), reshuffle before
  the next round once the cut card is out. Seeded RNG (mulberry32) for tests, drills, and lessons.
- Late surrender requires peek. With no peek (ENHC), a dealer blackjack takes doubled/split bets too.
- Round state is a plain JSON object; the bankroll only changes when a round settles.

## Strategy (`lib/strategy`)

- `buildChart(rules)` = published base table for the deck group (1, 2, 4–8) at S17/DAS/LS/peek,
  plus data-driven deviations (`deviations.ts`) for H17, no DAS, no peek, then restrictions for
  no surrender and limited doubling.
- `ev.ts` is an independent combinatorial EV calculator (exact dealer probabilities with card removal,
  peek-conditioned draws, approximate splits). Used by tests and for "why" numbers in the chart detail.
- Coach reasons (`reasons.ts`) are original one-liners.

## Features

1. **Practice table** — single player vs dealer, quick toggleable animations, chip betting with table
   min/max, coach mode (default on: ✅/❌ + correct play + one-line reason, "take it back"), hint
   button (counted as a hint in stats), insurance/even money prompt.
2. **Bankroll & sessions** — $1,000 play-money bankroll; sessions with buy-in and cash-out; tracks
   length, hands, net, accuracy, biggest win/loss; history list + bankroll-over-time chart; reset
   bankroll (logged); quick-play mode with its own stack and no session tracking.
3. **Daily lessons** — 30 lessons in 10 units, one new lesson unlocks per day (the day after the
   previous one is passed), replay any old one. Each: 1–3 explanation cards, 5–10 interactive
   questions/hands on that concept only, pass at 80%. Stored as data in `content/lessons`.
4. **Daily drill & streaks** — 20 flash decisions weighted to most-missed hands; daily goal = finish
   the drill; streak counter; perfect drill earns a streak freeze (max 2), auto-used on a missed day.
5. **Drills library** — hard, soft, pairs, surrender, mixed; speed (timer) and accuracy modes;
   counting drill (cards flash by, enter running count on a +/− keypad).
6. **Strategy chart** — current rules, color + letter coded (color-blind safe), tap a cell for the
   explanation and EVs, toggle a personal accuracy heat map.
7. **Stats** — overall and per-category accuracy, most-missed hands, hands played, lessons done,
   streak; "review mistakes" replays recent misses.
8. **Settings** — rules, animation speed, coach on/off, sound on/off (off by default), backup
   export/import (JSON), reset all data.

## iPhone requirements

- 375px first; verify 393 and 430. Portrait primary; landscape must not break.
- `viewport-fit=cover`, safe-area insets, `100dvh`. Fixed bottom action bar, ≥44pt targets,
  illegal actions disabled not hidden. `touch-action: manipulation`, inputs ≥16px, no hover-only UI,
  no horizontal scrolling, `overscroll-behavior: none` on the table.
- PWA: manifest, apple-touch-icon, standalone, theme color, offline for everything (service worker
  precaches the whole static export). One-time iOS "Add to Home Screen" tip.
- Data safety: `navigator.storage.persist()`, nudge to install, export/import at the top of
  Settings, versioned storage with migrations, corrupt data backed up + notice, save every action.
- Animations: transform/opacity only, short, skippable, off under `prefers-reduced-motion`.
- Sound only after a tap; no `navigator.vibrate`. Error boundary per screen with a data-safe reload.

## Responsible framing

Footer + About: "Educational trainer. Play money only. Basic strategy reduces the house edge but
doesn't eliminate it." About links to the National Problem Gambling Helpline (1-800-GAMBLER).
No real-money features, no affiliate links, no gambling ads.

## Explicitly out of scope

- Accounts, sync, backend, Supabase.
- Push/scheduled notifications (iOS web needs a push server for those).
- Multiplayer, side bets, real-money anything.

## Publishing

- GitHub `teel23/blackjack-bot` (public) ✅ approved
- Netlify site `c2t-blackjack-bot` + `blackjack.c2tbuilds.com` ✅ approved (Carson adds the CNAME)
- Portfolio card in `teel23/portfolio` ✅ approved
- games.c2tbuilds.com tile ❌ not approved yet — ask
- AI Dashboard entry ❌ not approved yet — ask
