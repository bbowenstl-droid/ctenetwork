# CTE Network 2.0 maintenance

## Architecture and source
Static HTML/CSS/JavaScript retained. GitHub Pages remains the recorded production host at https://bbowenstl-droid.github.io/ctenetwork/ (HERMES.md). The active Pages source branch and deployment settings must still be verified before release. No new hosting provider is configured.

New public routes: `search.html`, `history-lab.html`, `playoff-war-room.html`, `media-hub.html`, `league-lounge.html`. Existing pages and article URLs remain. `commissioner-center.html` is an authenticated administration client; its noindex tag is not its security boundary.

The shared historical engine (`js/cte-history.js`) separates immutable franchise IDs from weekly owner identity. Stats include only paired completed games. Records default to regular season; the scope selector exposes championship, placement, consolation, and all paired games. The frozen State of the Union edition is unchanged.

## Data freshness and audit
History Lab retrieves matchups and provider completion boundaries from Sleeper on entry. Trade data loads on demand, with four concurrent requests, checking all 18 transaction weeks for both seasons. Completed trades are deduplicated by provider ID. Startup selections are attributed to Jeremy for franchise 7; draft pick origins come from the draft's `slot_to_roster_id`, not the current owner. Drops end continuous trade custody. Unresolved chains display explicit warnings.

`data/cte-player-labels.json` is a compact name lookup from the preserved research. Newly drafted players also use provider draft metadata. Unknown players show their provider ID rather than an invented name. This is a label fallback, not a current roster snapshot.

Run `node tools/audit-cte2-live.cjs` for read-only reconciliation. It compares historical games to the preserved reporting baseline, verifies regular-season PF, and replays transactions/drafts against current player rosters and changed picks. A historical score correction intentionally fails the baseline comparison: review the correction and update fixtures with provenance; never silently rewrite history.

Verified 2026-11-14 at 16:09:26 UTC: 152 paired completed games (138 regular), 300 draft selections, 21 completed trades, 11 supported trade connections, 265 current players, and 27 changed picks. All reconciled. No completed three-team transaction was returned at that time. Those numbers are a dated audit snapshot, not runtime constants.

## Analytics methodology
What If? Lab offers all-play and symmetric franchise schedule swaps. It keeps each franchise's actual weekly scores, exchanges the selected franchises' schedule positions, recomputes every affected H2H result, and leaves the weekly score distribution intact. Median outcomes therefore remain unchanged. Results are labeled hypothetical H2H records.

Playoff War Room runs 5,000 seeded score-bootstrap simulations (seed 2026). It uses completed current-season scores, samples with replacement, assigns H2H and median results, and accumulates points for. Four division winners and two wildcards qualify; the first two division winners get byes. Ranking: wins plus half ties, then PF; exact remaining ties use franchise ID solely for reproducibility. No injury, NFL bye, roster-strength or partial-live-score adjustments. Missing schedules or samples suppress probabilities. The UI explains these limitations and distinguishes conservative clinching bounds from simulations.

## Testing
Run the commands in `.github/workflows/cte-release-checks.yml`. Live audit is deliberately separate from deterministic CI. Security tests use a Firebase demo project and never write production. `npm ci --prefix tests/security` followed by `npm test --prefix tests/security` runs the database rules emulator.

Prepare the managed preview with `node tools/prepare-preview.cjs`. `.preview` is ignored and is not a production build. The local `.openai/hosting.json` is also ignored. No preview or emulator config changes production hosting.

Real iPhone Safari, full device/accessibility/performance checks, and deployed identity testing remain release gates. A source assertion or emulator test does not certify a real device or a production account.

## Publishing and rollback
1. Fetch current main and reconcile concurrent commits on the release branch.
2. Require passing CI, live reconciliation, browser regressions, and backend security checks.
3. Verify GitHub Pages configuration and record the last successful production deployment and main SHA. Initial inspected main: `c2ca5829aafdc4ef61e367cc7b257c3547dcdb7a`.
4. Merge the final release PR only when gates pass. Do not separately deploy stacked draft PRs.
5. Verify the resulting Pages workflow and live pages, including asset loading under `/ctenetwork/`.
6. Roll back by reverting the release merge through a new commit and verifying the Pages redeployment. Never force-push main. Backend rollback is separate: preserve a verified copy of existing database rules and avoid destructive schema migrations.
