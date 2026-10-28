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
