# Test and release process

## Commands
- `node tests/data/validate-history.cjs` — no network, no dependencies; validates identity config and ownership rules.
- `node tests/data/validate-history.cjs --live` — public Sleeper API; checks league identity, draft totals, schedule shape, and transactions. Network required.

## Merge gate
- Static checks pass.
- Live checks pass or their network failures are explicitly documented.
- Historical scores and owner attribution reconciled against site output before publishing all-time records.
- No changes to main or production without approval.

## Rollback
Work from a named feature branch. Open a draft pull request for review. Before merging, record the base commit SHA and verify checks. If a deployed change fails, revert the merge commit through a new PR and redeploy the previous known-good commit using the hosting provider's documented rollback procedure. Never force-push main.

## Known limitation
Static tests cannot prove live Sleeper accuracy. Live tests cannot alone prove the site renders matching statistics. A future reconciliation test must run site calculation functions against frozen provider fixtures.
