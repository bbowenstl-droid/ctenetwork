# CTE Network v41 — Opus update, completed

This package contains the full site source and assets, with Opus’s taste update integrated and repaired. Files sit at the archive root so they can be reviewed or applied to the existing repository. Publication was authorized after the completed package was reviewed.

## What changed

- One shared header/navigation on the main site pages; mobile navigation has five controls. The league menu includes Newsroom and Anita’s archive. TV draft/admin controls stay independent.
- Current-week home dashboard with direct sportsbook/game-center actions, six matchup cards, and an editorial feature without an empty mobile artwork stage.
- Surface-scoped brand colors. The dark TV page retains readable silver/gold tokens; win/loss/live colors retain their meaning.
- Sportsbook personal summary uses the actual merged ledger, selected/saved/submitted card state, pending grading count, season rank, and card profit where available.
- Carl/Anita wallets show confirmed bankrolls, season records, last settled-week profit/loss, and settlement-pending labels. Initial placeholders no longer claim CTE$1,000.
- Narrow-screen bet slips, duel balances, forms, game-center cards, and team-profile tables fit their containers. Data tables scroll within the page.
- Permanent Anita author archive, initially filtered to her stories, with her latest report and a bankroll/picks link.
- Article author portraits/bylines, reading-time estimates, related stories, and keyboard-accessible table scrolling. The article stylesheet stack is consolidated into one local bundle plus the shared quality stylesheet.
- Playoff field derived from live standings: four division leaders followed by two wildcards; the top two division leaders receive byes. The cutoff and next teams are shown. It is labeled as a current snapshot, not a projection or clinching declaration.
- Completed-week H2H and league-median record splits. Incomplete historical data is labeled unavailable rather than guessed.
- Public sportsbook startup errors show a concise retry state. Technical diagnostics stay in the console.
- Updated resource/cache versions.

Existing odds, personality picks, grading math, card storage adapters, Firebase rules, and historical data are unchanged.

## Validation

`tools/test-quality-v41.cjs` checks the current board, bankroll carryover, qualifier selection, record splits, responsive rendering, navigation, article components, and card persistence with synthetic Sleeper data and blocked Firebase requests. Screenshots are fixture previews, not current league standings.

The main run passed 433 checks across 126 page/viewport combinations at widths 320, 360, 390, 430, 820, and 1440. An additional 390px run passed 89 checks and verifies actual local submission, reload persistence, and historical leaderboard rendering. See `quality-preview/qa-report.json` and `quality-preview/card-qa-report.json`.

The repository’s older `tools/test-sportsbook.cjs` returns 24 passes and seven failures on the untouched baseline as well as this update. Its Week 4 fixture assumptions conflict with the current Week 5 board and settled ledger. These existing failures are recorded in `quality-preview/baseline-test.log`; they were not hidden by changing production odds or the grading engine.

Run the new checks from the repository root with Playwright installed:

```sh
node tools/test-quality-v41.cjs
```

An existing Chrome executable can be selected with `CTE_CHROME`. Optional `CTE_QA_WIDTHS` limits viewport widths and `CTE_QA_OUTPUT` selects the report directory.

Regenerate article CSS after changing its source stylesheets:

```sh
node tools/build-article-css.cjs
```

## Publishing

Review and apply the package to the existing repository, reconcile newer changes if any, and publish only when explicitly authorized. The release is published through the existing GitHub Pages repository after authorization.
