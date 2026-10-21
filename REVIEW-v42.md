# CTE v42 fixes — October 21, 2026

Status: local, uncommitted, unpublished. Base: 7650ba186bbaa5fb09561e12f9771026b100a207.

## Implemented

- Shared completed-week boundary based on Sleeper last_scored_leg. Live/future games do not enter historical records or settle wagers. Completed zero-zero games remain legitimate ties. Commissioner score overrides are respected.
- Historical ownership transitions preserved. Incomplete or malformed historical responses fail visibly instead of producing partial records.
- Championship, placement and consolation games classified from Sleeper brackets. All-games career totals retained pending league policy.
- Matchup histories use the shared archive, eliminating future phantom ties. Scores render independently of optional history/player details.
- Game Center combines scores and schedule with season/week/owner selection, previous/next navigation, shareable URLs, entering-week opponent records and current-week refresh. Old Scores/Schedule links redirect while retaining query parameters.
- Added an owner-to-owner comparison page, postseason filters, completed-game timeline and links from records/profiles/rivalries.
- Added My Team menu preference and homepage/Game Center prioritization. Improved secondary-text size, focus visibility, touch controls and desktop score grid.
- Standings splits and weekly awards use the same completion boundary. Archived power rankings are labeled as archived.
- Sportsbook loads results for every market week, preserves accepted prices/stakes and commissioner overrides, and identifies settlement/data gaps. Existing Week 4–5 personality cards settle without ledger issues; Week 6 has no cards.
- Optional transaction/draft/trade failures no longer prevent profile rendering.
- Synchronized duplicate league/stats engines; updated asset versions and service-worker cache; added automated syntax/history/settlement checks to CI.

## Verification

Story: selecting a season/week or owner pair loads Sleeper snapshots, maps historical owners, applies finality and bracket rules, then displays completed records and links to individual matchups.

| Boundary | Result | Evidence |
|---|---|---|
| Historical data → records | Pass | Frozen October 20 Sleeper audit: all 134 games and 75 unique H2H pairs match the independent reconstruction |
| Current standings | Pass | All 12 H2H + median records reconcile with the six completed weeks |
| Finality and failures | Pass | Tests cover rollover, live scores, missing rows, malformed pairings, score overrides and genuine zero-zero ties |
| Sportsbook math | Pass | 31 engine tests; accepted quotes unchanged; all market-week results loaded |
| Weekly awards | Pass | Award winners and shared completed-week wiring checked |
| Source integration | Pass | 95 JavaScript/inline scripts parse; local links/assets resolve; git diff --check clean |
| Browser → unpublished UI | Blocked | Browser cannot reach local preview: ERR_CONNECTION_REFUSED |
| Production deployment | Not performed | HERMES.md requires explicit publication authorization |

These checks do not constitute visual/mobile or authenticated end-to-end verification. Production UI was inspected during the earlier audit, but that does not verify this unpublished revision. Existing Playwright browser suites were not successfully run; the available shell browser executable is missing. No production account, Firebase entry, card or wager was changed.

Run the non-browser checks:

```sh
node tools/check-syntax.cjs
python tools/check-site.py
node tools/test-history.cjs
node tools/test-sportsbook.cjs
node tools/test-weekly-awards.cjs
git diff --check
```

## Decisions remaining

1. Authorize publication or provide a reachable preview for browser/mobile verification. Before publishing, reconcile latest main, review the diff, run checks, commit/push only with explicit approval, then verify the live deployment.
2. Decide whether default career/H2H totals include placement and consolation. Current behavior is preserved and explained; filters allow separate views.
3. If Carl/Anita Week 6 cards were actually accepted, provide their original receipts (picks, prices, stakes and acceptance time). Otherwise retain no-card status. Do not reconstruct bets after results.

Noindex is not authentication: the link checker explicitly labels its commissioner-page check as indexing only.
