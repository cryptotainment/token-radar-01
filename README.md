# Token Radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/cryptotainment/token-radar-01/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/cryptotainment/token-radar-01/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A deterministic program that ranks the token launches most worth farming, built for the [make.fun bounty](https://make.fun/bounty/token-radar-01).

## What it does

`main.ts` (Node 22, standard library only) reads the sealed DefiLlama snapshot (`/input/snapshot.json`: 758 protocols, 40 watchlist, as of 2026-11-14), scores every rankable pre-token protocol, and writes a ranked board to `/output/board.json`, plus a static dashboard and a `dossier.json` summary the judge reads.

## The model — radar-2

Every row is scored from snapshot fields only:

```
implied_value_usd = round(TVL × comp(category) × 0.6 × growthMult × maturityMult × chainMult)
```

- **comp(category)** — median market-cap/TVL of live-token protocols in the same category, shrunk toward the global median, clamped to [0.08, 0.35]. The global median mcap/TVL among live-token protocols is 0.2138.
- **0.6** — not-yet-issued discount: a protocol with no token on record is worth less than the same TVL with a live token.
- **growthMult** — from the 7-day TVL change, weight 0.5.
- **maturityMult** — from the protocol's age, up to 3 years.
- **chainMult** — a small bonus per additional chain.

The comparable multiple and chain multiplier are rounded to 4 decimals before scoring, so the dashboard's recomputation of a row from `board.json` matches the board exactly.

## Coverage

226 rows: all 40 watchlist protocols plus 186 pre-token protocols below the $50M TVL floor. Ranks 1–226 contiguous, implied values non-increasing with rank, all distinct, all positive integers. Every row carries 7 farm steps that say what to do on-chain and what to do before and after a token issues; they never predict whether or when a token issues, and the board says a protocol "records no token", never "has no token".

Top 5:

1. Steakhouse Financial — $323,582,633
2. Gauntlet — $192,717,967
3. Veda — $185,284,200
4. USDD — $108,004,123
5. Upshift — $66,473,650

## Dashboard

Static, no network, no framework. A ranked board table with implied-value bars, a detail dialog per protocol (TVL, 7-day change, chains, category, implied value with the comparables behind it, farm steps), and filters: search, category, chain, minimum TVL, token status. Views are linkable through hash parameters (`#p=<slug>`, `#category=Dexs`, …).

## Screenshots

Real renders of the dashboard, taken with headless Chromium:

- `screenshots/1-board.jpg` — the board top
- `screenshots/2-detail.jpg` — Steakhouse Financial detail dialog
- `screenshots/3-filtered.jpg` — category Dexs (20 rows)

## Run it

```bash
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json
```

Run twice into separate directories: the outputs are byte-identical.

## Verification

- `main.ts` run twice into separate dirs: byte-identical (`diff -r` clean).
- board.json sha256 `094b54c82fd2c8350135ca4c2083f18ca25a57b3aff7c211ba371e9fd3f3cd3e` (361,929 bytes)
- 226 rows, watchlist fully covered (0 missing), ranks contiguous, implied values non-increasing, all distinct, every row has 7 farm steps.
