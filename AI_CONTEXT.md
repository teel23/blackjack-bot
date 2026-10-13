# AI_CONTEXT — Blackjack Bot

Read this first in any new session. It is the short version. `MASTER.md` is the full spec,
`NOTES.md` is the running log.

## What this is

An iPhone-first blackjack **trainer**. "Duolingo for blackjack": short daily lessons, drills, a
strategy chart, and a practice table with a play-money bankroll. A C2T Builds app.

## What this is NOT

- Not a gambling app. No real money, no chip purchases, no casino/sportsbook links or ads.
- Not multi-user. No accounts, no auth, no backend, no Supabase (ask Carson before adding any).
- Not a card-counting "beat the casino" tool. Counting is taught as theory, framed educationally.

## Owner

Carson Teel (`teel23` on GitHub). Solo dev. Prefers casual, brief updates and being asked
before assumptions about anything outside this repo.

## Stack

- Next.js 16 (App Router) + TypeScript + Tailwind 4, **static export** (`output: 'export'`) → `out/`.
- State: zustand with a hand-rolled versioned localStorage layer (`lib/storage`).
- Tests: Vitest (`tests/unit`), Playwright WebKit on iPhone profiles (`tests/e2e`).
- Hosting: **Netlify** (site `c2t-blackjack-bot`, account `teel23`), domain `blackjack.c2tbuilds.com`
  (Namecheap CNAME → `c2t-blackjack-bot.netlify.app`). Deploy with `npm run deploy` (CLI, not git-linked).
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
content/lessons  lesson data (add lessons here)
app/           routes (Today, Learn, Play, Chart, Stats, Settings, About, …)
components/    UI pieces
scripts/       build-sw (service worker), serve-out, compare-chart (strategy vs EV check)
```

## Hard rules

1. iPhone first. 375px wide is the design target; check 393 and 430 too. Stability > features.
2. Play money only. Responsible-gambling framing stays in the footer and About page.
3. Save after every hand action and lesson step; resuming must restore the exact state.
4. Never crash on old/corrupt saved data — migrate, or back it up and start fresh with a notice.
5. The strategy chart must come from the rules (`buildChart(rules)`). Default-rules chart is
   tested cell-by-cell against the published chart; other rule sets against the EV calculator.
6. Ask Carson before touching other repos (portfolio, mini-games, ai-dashboard), DNS, or adding services.

## Commands

```
npm run dev          # local dev
npm test             # Vitest
npm run e2e          # Playwright WebKit (builds must exist: npm run build first)
npm run build        # static export + sw.js
npm start            # serve out/ on :4173
npm run check:chart -- 1 1 1 1 1   # decks h17 das peek ls — compare chart vs EV calculator
npm run deploy       # build + Netlify production deploy
```
