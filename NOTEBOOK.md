# Blackjack Bot — Notebook

> **Status:** Active · kept on the Mac (slimmed)  
> **Notebook updated:** 2026-11-01

| | |
|---|---|
| **What** | iPhone-first blackjack trainer ("Duolingo for blackjack"): daily lessons, drills, strategy chart, play-money practice table |
| **Repo** | [teel23/blackjack-bot](https://github.com/teel23/blackjack-bot) (public) |
| **Live** | https://blackjack.c2tbuilds.com (Netlify site `c2t-blackjack-bot`, deploy with `npm run deploy`; pushing does NOT deploy) |
| **Local** | `~/dev/blackjack-bot` (code) · `~/blackjack-bot-data/` (home-server save, certs, logs, site builds) |
| **Stack** | Next.js 16 static export, TypeScript, Tailwind 4, zustand + versioned localStorage, Vitest, Playwright WebKit (pinned 1.58.2) |
| **Started / last** | 2026-10-12 → 2026-10-28 |

## Where it stands

- Phase 1 shipped: game engine, rule-driven strategy charts, EV calculator, lessons, drills, stats.
- 2026-10-27: approved one exception to "no backend" — a small HTTPS **home server on the Mac**
  (mkcert cert, LaunchAgent `com.c2tbuilds.blackjack`, port 8443) that serves the app on home Wi-Fi
  and keeps a copy of the save in `~/blackjack-bot-data/save.json`. The phone still saves to
  localStorage after every action and works offline anywhere.
- iCloud `Projects/BlackJack Bot/data/save.json` is only a best-effort mirror the server writes; it was
  left in place during the cleanup.
- Next up (as last discussed): review the design and add more lessons.

## Rules that matter

- Not a gambling app: no real money, purchases, casino links or ads. Counting is taught as theory.
- No accounts, no third-party services. Ask before adding anything hosted.
- Code stays off iCloud (spaces in iCloud paths break builds; iCloud evicts files).
- Don't upgrade Playwright without checking `npx playwright install webkit` works on this Mac (macOS 14).

## Getting back in

```bash
cd ~/dev/blackjack-bot
npm install            # node_modules was removed in the 2026-11-01 cleanup
npm run dev            # or: npm test / npm run deploy
npm run home:status    # home server status (see NOTES.md → "Run from my Mac")
```

The full spec is `MASTER.md`, the running log is `NOTES.md`, the short version is `AI_CONTEXT.md` —
all included below.

## Timeline (git history, newest first)

```text
2026-10-28  c79de0a  home:setup: cert also covers the Mac's Wi-Fi IPv4, for phones that can't resolve .local
2026-10-27  a1f0ad1  Next.js 16.4.0 → 16.4.3 (security patch); lint ignores .netlify/
2026-10-27  583bb2a  Docs: Mac sync approved (2026-10-27), Run from my Mac, iPhone checklist
2026-10-27  fdd5ea9  a11y e2e: run axe in legacy mode (fixes a hang, not just slowness)
2026-10-27  38a6740  Mac sync e2e against the real home server; npm home:* scripts
2026-10-27  993c927  Mac sync client: push/pull/conflict on top of localStorage; SW never caches /api
2026-10-27  a85c10b  Home server: HTTPS on this Mac, save API, setup/deploy/status/uninstall
2026-10-27  682067d  Surrender opt-in: off by default, hidden when the table doesn't offer it
2026-10-13  60b3103  NOTES: date
2026-10-13  2d63534  Phase 8: Netlify deploy config, lesson-meta split for smaller bundles, docs updated with live URLs
2026-10-13  7f1af85  Phase 7: iPhone hardening — relaunch/resume/corrupt-data/safe-area e2e, double-tap guard, manual checklist
2026-10-13  d2377bf  Phase 6: lessons 11-30, Hi-Lo counting drill, launch screens, offline, Dynamic Type, landscape, a11y fixes
2026-10-12  1f31ba2  Phase 5: drills library, interactive strategy chart, stats, mistake review, settings, about
2026-10-12  1e6fcd2  Phase 4: lessons 1-10, one-per-day unlocks, daily drill, streaks, Today screen
2026-10-12  3e0a41b  Sessions: no impure Date.now() in render
2026-10-12  13ba175  Phase 3: sessions history, bankroll chart, logged resets
2026-10-12  e1ce371  Phase 2: practice table with coach mode, hints, take-back, sessions lobby
2026-10-12  bd162b5  Phase 1: blackjack engine, rule-driven strategy charts, EV calculator, unit tests
2026-10-12  9dc7254  Initial commit from Create Next App
```

## Code layout

```text
.gitignore
AGENTS.md
AI_CONTEXT.md
CLAUDE.md
MASTER.md
NOTES.md
README.md
app/about/page.tsx
app/chart/page.tsx
app/count/page.tsx
app/drill/page.tsx
app/drills/page.tsx
app/error.tsx
app/global-error.tsx
app/globals.css
app/layout.tsx
app/learn/page.tsx
app/lesson/[id]/page.tsx
app/manifest.ts
app/page.tsx
app/play/page.tsx
app/sessions/page.tsx
app/settings/page.tsx
app/stats/page.tsx
components/AppProvider.tsx
components/AppScreen.tsx
components/BankrollChart.tsx
components/BottomSheet.tsx
components/CountPad.tsx
components/DynamicType.tsx
components/ErrorBoundary.tsx
components/Footer.tsx
components/HandView.tsx
components/Icons.tsx
components/InstallTip.tsx
components/MacSyncCard.tsx
components/NoticeBanner.tsx
components/PlayingCard.tsx
components/ServiceWorker.tsx
components/SyncBanner.tsx
components/TabBar.tsx
components/Toggle.tsx
components/learn/Bits.tsx
components/learn/DrillPlayer.tsx
components/learn/LessonPlayer.tsx
components/table/Lobby.tsx
components/table/Table.tsx
content/lessons/index.ts
content/lessons/meta.ts
content/lessons/types.ts
content/lessons/unit-01-basics.ts
content/lessons/unit-02-flow.ts
content/lessons/unit-03-hard.ts
content/lessons/unit-04-doubling.ts
content/lessons/unit-05-soft.ts
content/lessons/unit-06-pairs.ts
content/lessons/unit-07-surrender.ts
content/lessons/unit-08-rules.ts
content/lessons/unit-09-variance.ts
content/lessons/unit-10-counting.ts
content/lessons/units.ts
eslint.config.mjs
lib/audio.ts
lib/count.ts
lib/engine/cards.ts
lib/engine/hand.ts
lib/engine/index.ts
lib/engine/rng.ts
lib/engine/round.ts
lib/engine/rules.ts
lib/engine/shoe.ts
lib/hooks.ts
lib/learn.ts
lib/progress/dates.ts
lib/progress/drillPicker.ts
lib/progress/streak.ts
lib/progress/unlock.ts
lib/state/drills.ts
lib/state/learn.ts
lib/state/progress.ts
lib/state/sessions.ts
lib/state/stats.ts
lib/state/store.ts
lib/state/table.ts
lib/storage/backup.ts
lib/storage/persist.ts
lib/storage/schema.ts
lib/strategy/chart.ts
lib/strategy/deviations.ts
lib/strategy/ev.ts
lib/strategy/index.ts
lib/strategy/reasons.ts
lib/strategy/tables.ts
lib/sync/api.ts
lib/sync/decide.ts
lib/sync/engine.ts
lib/sync/format.ts
lib/sync/hash.ts
lib/sync/meta.ts
netlify.toml
next-env.d.ts
next.config.ts
package-lock.json
package.json
playwright.config.ts
playwright.home.config.ts
scripts/build-sw.mjs
scripts/compare-chart.ts
scripts/exact-check.ts
scripts/gen-lesson-meta.ts
scripts/home-server.mjs
scripts/home.mjs
scripts/icon.svg
scripts/make-icons.mjs
scripts/make-splash.mjs
scripts/print-lesson-answers.ts
scripts/serve-out.mjs
scripts/sw-template.js
tests/e2e/a11y.spec.ts
tests/e2e/chart-stats.spec.ts
… 30 more files
```

## Original notes

Every doc that existed for this project, verbatim (duplicates removed, secrets redacted). Click to expand.

<details>
<summary><b>AI_CONTEXT.md</b> · repo · 5.3 KB</summary>

# AI_CONTEXT — Blackjack Bot

Read this first in any new session. It is the short version. `MASTER.md` is the full spec,
`NOTES.md` is the running log.

## What this is

An iPhone-first blackjack **trainer**. "Duolingo for blackjack": short daily lessons, drills, a
strategy chart, and a practice table with a play-money bankroll. A C2T Builds app.

## What this is NOT

- Not a gambling app. No real money, no chip purchases, no casino/sportsbook links or ads.
- Not multi-user. No accounts, no auth, no third-party services or hosted backend, no Supabase (ask
  Carson before adding any). **One approved exception (2026-10-27):** a small HTTPS home server on
  Carson's own Mac (`scripts/home-server.mjs`, mkcert cert) that serves the app on the LAN and keeps a
  copy of the save in a file. Netlify is unchanged and doesn't sync.
- Not a card-counting "beat the casino" tool. Counting is taught as theory, framed educationally.

## Owner

Carson Teel (`teel23` on GitHub). Solo dev. Prefers casual, brief updates and being asked
before assumptions about anything outside this repo.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind 4, **static export** (`output: 'export'`) → `out/`.
- State: zustand with a hand-rolled versioned localStorage layer (`lib/storage`).
- Tests: Vitest (`tests/unit`), Playwright WebKit on iPhone profiles (`tests/e2e`).
- Hosting: **Netlify** (site `c2t-blackjack-bot`, id `f7f62ddb-caff-4442-b929-b742555c1035`, account
  `teel23`), domain `blackjack.c2tbuilds.com` (Namecheap CNAME → `c2t-blackjack-bot.netlify.app`).
  Deploy with `npm run deploy` (CLI, not git-linked — pushing to GitHub does NOT deploy).
- **Mac sync (home server):** `https://Carsons-MacBook-Air.local:8443` (or `https://192.168.0.83:8443`; the cert covers the Wi-Fi IPv4 too), LaunchAgent
  `com.c2tbuilds.blackjack`, data in `~/blackjack-bot-data/` (save.json, history/, conflicts/, site/,
  certs/, logs/) — outside the repo and outside iCloud (iCloud evicts files → "Resource deadlock
  avoided"); iCloud `Projects/BlackJack Bot/data/save.json` is only a best-effort mirror. The client
  (`lib/sync`) sits on top of localStorage, which still saves after every action; sync stays hidden when
  `/api/ping` is missing (Netlify, `npm start`). Details: NOTES.md → "Run from my Mac".
- Playwright is pinned to **1.58.2**: this Mac runs macOS 14 and newer Playwright WebKit builds don't
  run here. Don't upgrade it without checking `npx playwright install webkit` works.
- Repo: `github.com/teel23/blackjack-bot` (public). Code lives in `~/dev/blackjack-bot`, NOT iCloud
  (iCloud paths with spaces break builds). The iCloud `Projects/BlackJack Bot/` folder only holds a
  dashboard-format copy of NOTES.md.

## Layout

```
lib/engine     pure TS game engine (no UI imports, JSON-serializable state)
lib/strategy   chart tables + rule deviations + EV calculator + coach reasons
lib/storage    versioned save/migrate/export/import
lib/state      zustand store
lib/progress   dates, streaks, unlocks, drill picking
lib/sync       Mac sync: decide (pure rules), engine (push/pull/conflict), meta (bjbot:sync key)
content/lessons  lesson data (add lessons here)
app/           routes (Today, Learn, Play, Chart, Stats, Settings, About, …)
components/    UI pieces
scripts/       build-sw (service worker), serve-out, compare-chart (strategy vs EV check),
               home-server (Mac HTTPS server + save API), home (setup/deploy/status/uninstall)
```

## Hard rules

1. iPhone first. 375px wide is the design target; check 393 and 430 too. Stability > features.
2. Play money only. Responsible-gambling framing stays in the footer and About page.
3. Save after every hand action and lesson step; resuming must restore the exact state.
4. Never crash on old/corrupt saved data — migrate, or back it up and start fresh with a notice.
5. The strategy chart must come from the rules (`buildChart(rules)`). Default-rules chart is
   tested cell-by-cell against the published chart; other rule sets against the EV calculator.
6. Never commit certs, the mkcert CA key (`rootCA-key.pem` — never print or copy it), or save data.
   The service worker must never cache `/api/*`. Sync must never silently drop either side of a conflict.
7. Ask Carson before touching other repos (portfolio, mini-games, ai-dashboard), DNS, or adding services.

## Commands

```
npm run dev          # local dev
npm test             # Vitest
npm run e2e          # Playwright WebKit (builds must exist: npm run build first)
npm run build        # static export + sw.js
npm start            # serve out/ on :4173
npm run check:chart -- 1 1 1 1 1   # decks h17 das peek ls — compare chart vs EV calculator
npm run deploy       # build + Netlify production deploy
BASE_URL=https://c2t-blackjack-bot.netlify.app npm run e2e   # run e2e against production
SCREENS=1 npx playwright test   # screenshot tour → .screens/
npm run e2e:home     # Mac sync e2e against the real home server (temp data dir, self-signed cert)

# Run from Carson's Mac (home server)
npm run home:setup      # one time, safe to rerun: mkcert, cert, folders, deploy, LaunchAgent
npm run home:deploy     # build + atomic swap into ~/blackjack-bot-data/site + restart
npm run home:status     # running?, URL, last save/revision, paths, recent logs
npm run home:uninstall  # remove the LaunchAgent, keep the data
```

</details>


<details>
<summary><b>MASTER.md</b> · repo · 7.1 KB</summary>

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

</details>


<details>
<summary><b>NOTES.md</b> · repo · 21.0 KB</summary>

# Blackjack Bot — Project Notes
> iPhone-first blackjack trainer: daily lessons, drills, strategy chart, and a play-money practice table.
> Reference for jumping back into this project.
> Last updated: October 27, 2026 (Mac sync — runs from my Mac)

---

## Live URL
🌐 **https://blackjack.c2tbuilds.com** (once the DNS record is added) · works now at **https://c2t-blackjack-bot.netlify.app**
🏠 **https://Carsons-MacBook-Air.local:8443** — served from my Mac on home Wi-Fi, progress synced to the Mac
(iPhone says "can't find the server"? Use **https://192.168.0.83:8443**, the Mac's Wi-Fi address)

## GitHub
📁 **https://github.com/teel23/blackjack-bot**

## Local Path
`~/dev/blackjack-bot` (code) · `~/blackjack-bot-data/` (home server data) · `iCloud/COMPUTER/AI/Projects/BlackJack Bot/` (docs copy + `data/save.json` mirror)

## Tech Stack
Next.js 16 · TypeScript · Tailwind 4 · zustand · localStorage · Vitest · Playwright (WebKit) · Netlify · home server (Node + mkcert)

## Status
✅ Live (beta) on Netlify — deploy with `npm run deploy` (not git-linked)
✅ Also runs from my Mac — `npm run home:deploy` after changes (see "Run from my Mac")

---

## Run from my Mac
My Mac serves the app over HTTPS on home Wi-Fi and keeps a copy of my progress in a file. No accounts,
no cloud, no third-party anything. The phone still saves to its own storage after every move and works
offline anywhere; when it can reach the Mac it copies its save there automatically, and catches up next
time when it can't. Netlify is unchanged (no sync there — the Mac sync card is hidden).

| What | Where |
|---|---|
| URL | `https://Carsons-MacBook-Air.local:8443` (from `scutil --get LocalHostName`) |
| URL by address | `https://192.168.0.83:8443`: the Mac's Wi-Fi IPv4, also in the cert. For when the phone can't resolve `.local`. If the address changes, `home:status` warns: rerun `home:setup`. A DHCP reservation in the router keeps it fixed |
| Save | `~/blackjack-bot-data/save.json` (+ `history/` hourly, newest 200 · `conflicts/` never auto-deleted) |
| Deployed site | `~/blackjack-bot-data/site` → symlink to the current build in `site-builds/` |
| Cert | `~/blackjack-bot-data/certs/` (mkcert) · CA for the iPhone: `$(mkcert -CAROOT)/rootCA.pem` |
| Logs | `~/blackjack-bot-data/logs/server.log`, `server.err.log` |
| Service | LaunchAgent `~/Library/LaunchAgents/com.c2tbuilds.blackjack.plist` (starts at login, restarts if it dies) |
| iCloud mirror | `iCloud/…/Projects/BlackJack Bot/data/save.json` — best-effort copy only; failures are just logged |

```
npm run home:setup      # one time; safe to rerun (also regenerates the cert if the Mac's name changes)
npm run home:deploy     # after code changes: build, swap the site in atomically, restart the server
npm run home:status     # is it running, URL, last save + revision, paths, recent log lines
npm run home:uninstall  # remove the LaunchAgent; data stays in ~/blackjack-bot-data
curl --cacert "$(mkcert -CAROOT)/rootCA.pem" https://Carsons-MacBook-Air.local:8443/api/ping
```

- Why not keep the data in iCloud: iCloud evicts files to save space and then reads fail with "Resource
  deadlock avoided". The real copy lives in `~/blackjack-bot-data`; iCloud only gets a mirror.
- Optional: `mkcert -install` makes Safari **on the Mac** trust the cert too (asks for the Mac password).
  The iPhone doesn't need it — it trusts the CA profile instead.
- Restore an old save: stop the server (`npm run home:uninstall`), copy a file from `history/` over
  `save.json` (bump `revision` above the current one so phones pick it up), `npm run home:setup`.
- Conflicts: if the phone and the Mac both changed, the app shows "Your Mac has different progress from
  [time]. Keep this phone's / Use the Mac's". The copy you don't keep is saved in `conflicts/`.
- Sync rules: pushes ~5 s after a change, on launch, when the app comes back to the front, when the
  network comes back, on close, and from Settings → Mac sync → Sync now. 3 s timeouts, so away from home
  costs nothing. A fresh install with no progress takes the Mac's copy. A newer Mac copy is only loaded
  when this device has no unsynced changes, and never mid-hand, mid-lesson or mid-drill.

### Moving my current progress over (Netlify → Mac app)
The Netlify app and the Mac app are different websites, so their storage doesn't carry over. Do this
**only after the iPhone checklist steps 1–4 pass**:
1. Open the Netlify app (blackjack.c2tbuilds.com / c2t-blackjack-bot.netlify.app) → Settings → **Export
   backup** → Save to Files.
2. Open the Mac app from the Home Screen → Settings → **Import backup** → pick that file → Replace.
3. Settings → Mac sync → **Sync now** → "Copied to Mac". (`npm run home:status` shows the new revision.)

### iPhone checklist — Mac sync
1. [ ] AirDrop `rootCA.pem` to the iPhone. Then go to Settings → General → VPN & Device Management and
   install the profile. Then go to Settings → General → About → Certificate Trust Settings and turn on
   full trust for it. If iOS doesn't recognize the file, rename it to `.crt`.
2. [ ] On home Wi-Fi, open `https://Carsons-MacBook-Air.local:8443` in Safari. It should load with no
   warning. Add it to the Home Screen. If Safari says it can't find the server, use
   `https://192.168.0.83:8443` instead. Stick with one URL: each one keeps its own copy of progress on the phone.
3. [ ] Open the Home Screen app and play a hand. Settings → Mac sync should say "Copied to Mac".
4. [ ] Turn on Airplane Mode. Every tab still works, and so does playing a hand. Turn Airplane Mode off
   and tap Sync now. It catches up.
5. [ ] Only after 1–4 pass: export a backup from the Netlify app and import it into the Mac app.


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

### 2026-10-28 — iPhone: "can't find the server" → URL by IP address
- The iPhone couldn't resolve `Carsons-MacBook-Air.local`, but the Mac, the server and the Wi-Fi were fine:
  the phone (192.168.0.81) is on the same network and pings back.
- `home:setup` now also puts the Mac's private Wi-Fi IPv4 addresses in the cert, so
  `https://192.168.0.83:8443` works with no name lookup. Setup and status print that URL, and status warns
  when the name or address no longer matches the cert. Cert reissued; both URLs verified with curl against
  the mkcert CA. The phone's CA trust is unchanged (same CA, new server cert).

### 2026-10-27 — Next.js 16.4.0 → 16.4.3 (security patch)
- `npm audit` listed three Next.js 16.0–16.4.0 advisories: RCE in the image optimizer with SVGs, DoS via
  Server Actions, RCE in `use cache`. None reach this app: it's a static export (`images.unoptimized`,
  no Server Actions, no `use cache`), served as files by Netlify and the home server. Bumped anyway
  (patch release): `next` and `eslint-config-next` pinned to 16.4.3.
- Lint now ignores `.netlify/**` (the Netlify CLI's cached build was producing 11 false errors).
- Tests: unit 212/212; static e2e 83 passed, 4 skipped; home e2e 18/18. `home:deploy` run (build
  75a6d42ab705). Netlify not redeployed: it's static, so it isn't affected.
- Still open: Vitest 3 / tinypool advisories are dev-only (they run only during tests on the Mac); the fix
  is Vitest 5, a major upgrade.

### 2026-10-27 — Mac sync: run from my Mac, progress saved on my Mac
- Approved change to the "no backend / no sync" rule, for one thing only: a small HTTPS server on my own
  Mac (plus mkcert). No third-party services. Netlify unchanged; `npm run deploy` not run.
- `scripts/home-server.mjs` (plain Node): HTTPS :8443, serves `~/blackjack-bot-data/site` with the
  netlify.toml headers; `/api/ping`, `/api/save` (GET/PUT with revisions, 409 + current copy on
  mismatch), `/api/conflict`. Atomic writes (temp → fsync → rename), serialized PUTs, 5 MB cap, numeric
  `version` required, LAN/loopback + same-subnet IPv6 only, same-origin `Origin` for writes. Hourly
  history (newest 200), conflicts archived forever, best-effort iCloud mirror.
- `scripts/home.mjs`: `home:setup` (mkcert via Homebrew or release download, cert for
  `<LocalHostName>.local` regenerated when the name changes, folders, deploy, LaunchAgent with the
  absolute node path, prints iPhone steps, reveals `rootCA.pem` in Finder), `home:deploy` (build → copy →
  atomic symlink swap → `launchctl kickstart -k`), `home:status`, `home:uninstall`.
- Client `lib/sync`: separate `bjbot:sync` metadata (device id, last synced revision + hash, local change
  time, last sync), pure decision rules (`decide.ts`), engine with debounced/launch/visible/online/
  pagehide-keepalive/Sync-now pushes, conflict banner (Keep this phone's / Use the Mac's — loser archived
  first), Settings → Mac sync card. Save path and save-after-every-action unchanged; `SAVE_VERSION` not
  bumped for sync. Reset all data keeps the sync metadata so the reset syncs instead of being undone.
- **Service worker fix:** `/api/*` is never intercepted or cached (before, any GET fell through to
  cache-first, so `/api/save` would have been cached).
- Also committed: surrender is opt-in (off by default, save v2 migration switches it off; Surrender
  button/drill/legend/stats only when the rules offer it).
- Tests: 212 unit (27 new: sync decisions + engine, home server API/static) · static e2e 83 passed / 4 skipped
  (new: sync hidden on the web version) · home-server e2e 18/18 (`npm run e2e:home`, 6 tests ×3 iPhones: hand reaches save.json,
  offline play + catch-up, fresh install adopts, conflict banner + conflicts/, `/api/save` never from SW cache).
- Fixed a flaky a11y e2e: axe's default mode hung in WebKit's `newPage()` under a full run → legacy mode.
- `home:setup` run on this Mac: mkcert via Homebrew, cert for Carsons-MacBook-Air.local, LaunchAgent running.
  `curl --cacert "$(mkcert -CAROOT)/rootCA.pem" https://Carsons-MacBook-Air.local:8443/api/ping` → ok; also
  answers on the Wi-Fi IPv4 and IPv6 addresses. macOS firewall is off, so no node prompt.

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
- [ ] **Mac sync iPhone checklist** (above) — trust the CA, install from the Mac URL, test offline, then move progress over
- [ ] Optional: Vitest 3 → 5 to clear the dev-only Vitest/tinypool audit findings (major upgrade)
- [ ] **Add DNS:** Namecheap → c2tbuilds.com → Advanced DNS → CNAME `blackjack` → `c2t-blackjack-bot.netlify.app.` (then Netlify issues SSL automatically)
- [ ] Run the manual iPhone checklist (above) in Safari and as an installed app
- [ ] Optional: switch portfolio `demoUrl` to https://blackjack.c2tbuilds.com once SSL is live
- [ ] Optional: connect the GitHub repo in the Netlify UI for auto-deploys on push
- [ ] Ask Carson: games.c2tbuilds.com tile (teel23/mini-games) — not approved yet
- [ ] Ask Carson: AI Dashboard entry (add `'BlackJack Bot': 'blackjack-bot'` to ai-dashboard sync-notes folder map, run sync, journal note) — not approved yet

</details>


<details>
<summary><b>README.md</b> · repo · 1.0 KB</summary>

# Blackjack Bot

An iPhone-first blackjack trainer from C2T Builds: daily lessons, drills, an interactive
basic-strategy chart, and a practice table with a play-money bankroll.

**Educational trainer. Play money only. Basic strategy reduces the house edge but doesn't eliminate it.**

- Live: https://blackjack.c2tbuilds.com
- Docs: `AI_CONTEXT.md` (start here), `MASTER.md` (spec), `NOTES.md` (log)

```bash
npm install
npm run dev        # http://localhost:3000
npm test           # unit tests
npm run build && npm run e2e   # WebKit tests on iPhone profiles
```

## Run from my Mac

The same build can be served from a Mac on the home network, with progress synced to a file there
(no third-party services). See `NOTES.md` → "Run from my Mac".

```bash
npm run home:setup    # one time: mkcert cert, LaunchAgent, deploy → https://<LocalHostName>.local:8443 (also https://<Wi-Fi IP>:8443)
npm run home:deploy   # after changes
npm run home:status
npm run e2e:home      # sync e2e against the real home server
```

</details>


<details>
<summary><b>AGENTS.md</b> · repo · 0.8 KB</summary>

<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

Project docs: read `AI_CONTEXT.md` first, then `MASTER.md` (spec) and `NOTES.md` (log).

</details>


<details>
<summary><b>BlackJack Bot/PROMPT-home-server.md</b> · iCloud · 10.1 KB</summary>

Read AI_CONTEXT.md, MASTER.md and NOTES.md first. Then build the feature below end to end in one pass. Use a todo list, don't stop for approval between steps, and keep going until everything is built, tested, documented, committed and pushed.

## Goal: run Blackjack Bot from my Mac, with progress saved on my Mac

I want my Mac to be the app's home. No third-party services, accounts, databases or hosting for this. This prompt is my approval to change the "no backend / no sync" rule for one thing only: a small server that runs on my own Mac, plus mkcert for local HTTPS. Netlify stays as it is. Do NOT run `npm run deploy`.

How it should work:
- My Mac runs a small HTTPS server. It serves the static app and saves my progress to a file on the Mac.
- On my iPhone I open `https://<mac-name>.local:8443` and add it to the Home Screen. It installs as a real app with the service worker, offline mode and all existing PWA behavior.
- The phone keeps saving to localStorage after every action, exactly like today. It must work offline anywhere, including away from home.
- When the phone can reach the Mac (home Wi-Fi, Mac awake, server running), it copies its save to the Mac automatically. When it can't, nothing breaks and nothing nags me. It catches up next time.
- The same build must still work on Netlify. If `/api/ping` isn't there, the sync feature stays hidden and inactive.

## Server (`scripts/home-server.mjs`, plain Node, no new runtime deps)

- Leave `scripts/serve-out.mjs` alone. Playwright and `npm start` use it.
- HTTPS on port 8443, bound to the LAN. Use a cert made with mkcert for `<LocalHostName>.local` (from `scutil --get LocalHostName`), `localhost` and `127.0.0.1`.
- Serve the static site from a deployed copy, not from the repo's `out/`, so a build in progress never breaks the live app. Use the same headers as `netlify.toml`: `sw.js` no-cache, `_next/static` immutable, and the security headers.
- API, JSON only:
  - `GET /api/ping` returns `{ ok, app: "blackjack-bot", serverTime }`.
  - `GET /api/save` returns `{ revision, updatedAt, deviceId, data }`, or 404 if nothing is saved yet.
  - `PUT /api/save` takes `{ baseRevision, updatedAt, deviceId, data }`. If `baseRevision` matches the current revision, write it and bump the revision. Otherwise return 409 with the current server copy, so the client can resolve.
  - `POST /api/conflict` stores the losing copy of a conflict as a file. Never auto-delete these.
- Writes are atomic: write a temp file, fsync, then rename. Cap the body size (about 5 MB). Reject anything that isn't an object with a numeric `version`. Only accept requests from private/LAN or loopback addresses, with a same-origin `Origin` header. Don't build more auth than that.
- Keep snapshots in `history/`: at most one per hour, keep the newest 200. Never lose a save.
- Data lives OUTSIDE the repo and OUTSIDE iCloud at `~/blackjack-bot-data/`, with folders `save.json`, `history/`, `conflicts/`, `site/`, `certs/` and `logs/`. iCloud evicts files and then reads fail with "Resource deadlock avoided", so iCloud is only a mirror. After each successful write, best-effort copy `save.json` to `~/Library/Mobile Documents/com~apple~CloudDocs/COMPUTER/AI/Projects/BlackJack Bot/data/save.json`. Ignore mirror errors and log them.
- Never put certs, the mkcert CA key, or save data in git. Never print or copy `rootCA-key.pem` anywhere.

## Setup scripts (npm)

- `home:setup` (one time, safe to rerun):
  - Find mkcert. If it's missing, install it with `brew install mkcert`. If there's no Homebrew, download the right mkcert release binary for this Mac into `~/blackjack-bot-data/bin/`.
  - Generate the cert into `~/blackjack-bot-data/certs/`. `mkcert -install` is NOT needed for the iPhone. Only offer it as an optional command for me to run if I want Safari on the Mac to trust the cert too, since it asks for my password.
  - Create the data folders and do a first `home:deploy`.
  - Install a LaunchAgent (`~/Library/LaunchAgents/com.c2tbuilds.blackjack.plist`) with RunAtLoad and KeepAlive, and logs to `~/blackjack-bot-data/logs/`. Use the absolute path to node, because launchd doesn't load my shell PATH and I may use nvm.
  - Print the URL and the iPhone steps, and open the mkcert CA folder in Finder so I can AirDrop `rootCA.pem`.
- `home:deploy`: run `npm run build`, swap `out/` into `~/blackjack-bot-data/site/` atomically, then `launchctl kickstart -k` the agent.
- `home:status`: show whether it's running, the URL, the last save time and revision, file paths, and the last few log lines.
- `home:uninstall`: remove the LaunchAgent but keep the data.
- If my Mac's hostname changes, rerunning `home:setup` must regenerate the cert.

## Client sync (`lib/sync/`, plus small hooks into the store and Settings)

- Do not change the localStorage save path or the save-after-every-action behavior. Sync sits on top.
- Keep sync metadata in its own key, `bjbot:sync`: `deviceId`, `lastSyncedRevision`, `lastSyncedHash`, `localChangedAt` and `lastSyncAt`. Don't bump `SAVE_VERSION` unless you truly need to. If you do, add a migration plus tests.
- **Service worker:** `scripts/sw-template.js` must never cache or intercept `/api/*`. Right now any GET falls through to cache-first, so it would cache `/api/save`. Fix that, and keep the existing "Update ready, never mid-hand" behavior.
- Pushes:
  - Debounced about 5 s after a local change.
  - Also on launch, on visibilitychange to visible, on `online`, on `pagehide` (use `fetch` with keepalive), and from a "Sync now" button.
  - Short timeouts (about 3 s), so being away from home costs nothing.
  - Skip the push if the hash hasn't changed since the last sync.
- Pulls and conflicts:
  - **Device that has never synced and has no real progress** (no hands, lessons, drills or sessions). This happens on a fresh install, and note that iOS gives the Home Screen app separate storage from Safari tabs. Adopt the Mac copy automatically via `replaceData`.
  - **Mac copy is newer and this device has no unsynced changes.** Adopt it, but only when no round is in progress (`roundInProgress`) and never in the middle of a lesson or drill. Otherwise wait until it's safe.
  - **Both sides changed (409).** Never silently lose data. Show a small banner: "Your Mac has different progress from [time]. Keep this phone's / Use the Mac's". Archive the copy I don't keep through `/api/conflict`. Until I choose, keep playing on the local copy.
- UI: add a "Mac sync" card near the top of Settings, next to backup. It shows:
  - the status: "Copied to Mac 2 min ago" / "Mac not reachable — progress is safe on this phone" / "Not set up (web version)"
  - the Mac's file path
  - a Sync now button
  
  No toasts or nags when the Mac is unreachable. Keep it iPhone-first: 375 px, 44 pt targets, inputs at least 16 px, matching the existing styles.

## Moving my current progress over

My current progress lives on the Netlify version on my phone, which is a different origin, so localStorage won't carry over. Use the existing flow: Settings → Export backup on the Netlify app, then Import in the Mac-hosted app, which then syncs it to the Mac. Write these as steps in NOTES.md. Don't build anything new for this.

## Tests (all must be green, existing ones included)

- **Vitest:** sync decision logic (empty device adopts, unsynced local vs newer Mac copy, 409 conflict path, hash skip, never adopts mid-round) and the server (temp dir plus a throwaway self-signed cert: PUT/GET, revision mismatch 409, atomic write, history rotation, oversize/invalid rejected, non-LAN origin rejected, iCloud mirror failure doesn't fail the save).
- **Playwright** (WebKit, iPhone profiles, `ignoreHTTPSErrors`, against the home server on a temp data dir):
  - Play a hand and see it reach `save.json`.
  - Stop the server, keep playing and navigating offline from the service worker, restart the server, and see it catch up.
  - A fresh browser context adopts the Mac copy.
  - Create a conflict and check that the banner appears and the other copy lands in `conflicts/`.
  - Check that `/api/save` is never served from the SW cache.
- Run the existing full suite against a normal `npm run build` + `npm start` to prove the Netlify/static behavior is unchanged and sync stays hidden.
- Playwright stays pinned at 1.58.2 (macOS 14). Don't upgrade it.
- Actually run `home:setup` on this Mac and confirm with `curl --cacert "$(mkcert -CAROOT)/rootCA.pem" https://<name>.local:8443/api/ping`.

## Stop only if

- A command needs my Mac password, or a macOS prompt needs a click (for example the firewall "allow incoming connections" prompt for node). Give me the exact command or click, then continue when I say done.
- Something only my iPhone can do. Don't wait on that: finish everything else and put it in the checklist.

## Docs and wrap-up

- Update AI_CONTEXT.md, which currently says "no backend / no sync": the home server on Carson's Mac is approved, with no third-party services and Netlify unchanged. Add the new commands.
- Update MASTER.md: move sync out of "out of scope", dated 2026-10-27.
- Update NOTES.md: a build log entry, a "Run from my Mac" section, and the iPhone checklist below. Update README.md.
- Copy the updated NOTES.md, AI_CONTEXT.md and MASTER.md into the iCloud `Projects/BlackJack Bot/` folder, per the existing convention.
- Commit in logical chunks and push to GitHub.

Put this iPhone checklist in NOTES.md and in your final message:
1. AirDrop `rootCA.pem` to the iPhone. Then go to Settings → General → VPN & Device Management and install the profile. Then go to Settings → General → About → Certificate Trust Settings and turn on full trust for it. If iOS doesn't recognize the file, rename it to `.crt`.
2. On home Wi-Fi, open `https://<name>.local:8443` in Safari. It should load with no warning. Add it to the Home Screen.
3. Open the Home Screen app and play a hand. Settings → Mac sync should say "Copied to Mac".
4. Turn on Airplane Mode. Every tab still works, and so does playing a hand. Turn Airplane Mode off and tap Sync now. It catches up.
5. Only after 1–4 pass: export a backup from the Netlify app and import it into the Mac app.

End with a short summary: what was built, the URL, the test counts, and anything I need to do.

</details>
