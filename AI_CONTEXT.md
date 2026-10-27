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
- **Mac sync (home server):** `https://Carsons-MacBook-Air.local:8443`, LaunchAgent
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
