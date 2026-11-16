# Test and release process

## Commands
- `node tests/data/validate-history.cjs` — no network, no dependencies; validates identity config and ownership rules.
- `node tests/data/validate-history.cjs --live` — public Sleeper API; checks league identity, draft totals, schedule shape, and transactions. Network required.

## Merge gate
- Static checks pass.
- Live checks pass or their network failures are explicitly documented.
- Historical scores and owner attribution reconciled against site output before publishing all-time records.
- The commissioner has authorized production release after all release gates pass. Keep the release PR in draft while backend activation, actual-device checks or other required verification remain incomplete.

## Rollback
Work from a named feature branch. Open a draft pull request for review. Before merging, record the base commit SHA and verify checks. If a deployed change fails, revert the merge commit through a new PR and redeploy the previous known-good commit using the hosting provider's documented rollback procedure. Never force-push main.

## Known limitation
Static tests cannot prove live Sleeper accuracy, and live tests cannot alone prove rendered output. The historical model tests now run calculations against frozen provider fixtures; tools/audit-cte2-live.cjs separately reconciles fresh provider data. Both are required alongside browser checks.

## Explorer browser regression — 2026-11-14 Central

Source: consolidated release branch after e3f187c. The reproducible manual fixture is `tests/visual/explorer-matrix.html` (development only).

Actual Chromium checks at iframe widths **320, 375, 390, 768, 1024, 1440**:
- History Lab, Playoff War Room, Search, Media Hub, League Lounge and Commissioner Center: one H1 each, document scroll width equals client width at all 36 page/width combinations. Statistical tables retain their own horizontal scrolling.
- What If: current-season all-play results render; a schedule swap updates H2H totals; choosing the same franchise displays the expected instruction.
- Search: a nonexistent query renders zero results and a useful empty-state message.
- Media: selecting Anita filters the archive from 16 to 13 matching stories in this snapshot.
- Records: 2026 championship scope correctly shows no games; 2025 championship scope shows paired playoff results and Brendan's 3–0 title run.
- Trade trees: the current 21-trade ledger loads; opening a seven-trade connected history works. Keyboard focus now moves into the named tree region and returns to the initiating button when closed. Verified in Chromium after the fix.
- Lounge/commissioner checks cover the intentionally disabled state only; no authenticated writes or production database mutations occurred.

New behavioral regressions in `tests/components/history-page.test.cjs` use deferred requests to verify that late trade failures cannot overwrite another explorer's status, active failures stop displaying a loading message, and retry recovers without leaving a stale error button. These are deterministic tests, not browser network-disconnection tests.

Remaining: actual iPhone Safari and touch testing, full accessibility/performance audit, legacy page interaction coverage, and authenticated end-to-end testing after the desktop setup checkpoint. Iframe-width checks do not certify those gates.

## Current team-name correction — 2026-11-15
Browser review found that the legacy directory used current Sleeper names while new history profiles and search used recorded configuration names. History profiles now read the current season lookup; search refreshes owner labels from Sleeper, retains recorded names as searchable aliases, and labels its fallback explicitly. Chromium verified that “Strib” and the recorded “Likely A Dub” both find Jacob as “The Strib Club,” and Carter’s history profile matches the current directory while preserving separate 9-game owner and 23-game franchise records. Former owners remain identified as former owners. Pure tests cover current names, aliases and fallback attribution.
