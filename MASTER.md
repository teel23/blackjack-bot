# MASTER — Blackjack Bot spec

Locked decisions from the 2026-10-12 kickoff. Change these deliberately, not casually.

**Status:** ✅ Live (beta) · **Live URL:** https://blackjack.c2tbuilds.com (fallback https://c2t-blackjack-bot.netlify.app) · **Repo:** https://github.com/teel23/blackjack-bot

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

## Mac sync (approved 2026-10-27)

Carson's Mac is the app's home. No third-party services, accounts, databases or hosting.

- `scripts/home-server.mjs` (plain Node, no deps): HTTPS on :8443 with an mkcert cert for
  `<LocalHostName>.local`, `localhost`, `127.0.0.1`. Serves a deployed copy of the static build with the
  `netlify.toml` headers. LAN/loopback clients only, same-origin `Origin` required for writes.
- API (JSON): `GET /api/ping`, `GET /api/save` (404 when empty), `PUT /api/save`
  (`baseRevision` must match, else 409 + current copy), `POST /api/conflict` (archives the losing copy).
  Atomic writes (temp + fsync + rename), 5 MB cap, `version` must be numeric. Hourly history, newest 200.
- Data: `~/blackjack-bot-data/` (not iCloud, not the repo). Best-effort mirror to iCloud `data/save.json`.
- Client (`lib/sync`): localStorage stays the source of truth on the phone. Push ~5 s after a change and on
  launch / visible / online / pagehide (keepalive) / "Sync now", 3 s timeouts, skipped when unchanged.
  Fresh device with no progress adopts the Mac copy; a newer Mac copy is adopted only with no unsynced
  local changes and never mid-hand/lesson/drill; both changed → banner, the copy not kept is archived.
- Settings → Mac sync card (status, path, Sync now); hidden when `/api/ping` is missing (Netlify).
- Netlify is unchanged: same build, sync hidden.

## Explicitly out of scope

- Accounts, cloud sync, third-party backends, Supabase. (The home server on Carson's Mac is the one
  approved exception, 2026-10-27 — see above.)
- Push/scheduled notifications (iOS web needs a push server for those).
- Multiplayer, side bets, real-money anything.

## Publishing

- GitHub `teel23/blackjack-bot` (public) ✅ done
- Netlify site `c2t-blackjack-bot` (id `f7f62ddb-caff-4442-b929-b742555c1035`, account `teel23`) ✅ deployed;
  custom domain `blackjack.c2tbuilds.com` attached — needs the Namecheap CNAME `blackjack` →
  `c2t-blackjack-bot.netlify.app.`; Netlify issues SSL automatically once it resolves.
- Portfolio card in `teel23/portfolio` ✅ pushed (links the netlify.app URL, which forwards to the
  custom domain once SSL is live; switch `demoUrl` to blackjack.c2tbuilds.com any time).
- games.c2tbuilds.com tile ❌ not approved yet — ask
- AI Dashboard entry ❌ not approved yet — ask

## Deploying
`npm run deploy` = build + `netlify deploy --prod --no-build --dir out --site f7f62ddb-…`. The repo is
not git-linked in Netlify (that needs the Netlify GitHub app in the Netlify UI), so pushes don't deploy.
