# Historical data integrity — verification ledger

Audit date: 2026-11-14. Provider: connected Sleeper league data.

| Season | Sleeper league ID | Verified scope |
|---|---|---|
| 2025 | 1255586541745475584 | Weeks 1–14: six final paired games/week (84); startup draft 252 picks; champion Brendan, runner-up Jacob, third Jerry |
| 2026 | 1312109948305436672 | Weeks 1–9: six final paired games/week (54); Week 10 live, Week 11 upcoming; rookie draft 48 picks; 12 current roster mappings |

Transactions: seven completed trade events retrieved from 2025 Weeks 1–18; fourteen completed events from 2026 Weeks 1–12. Preseason trades are included under 2026 Week 1. Provider trade event IDs must be deduplicated. These counts are provider-retrieval observations, not site-vs-provider equality certification.

## Open verification gaps
- D-01 HIGH: provider reports 2026 `playoffs_in_progress` while Week 10 is in progress and Week 11 upcoming; do not drive UI from this field alone.
- D-02 MEDIUM: `sleeperUserMap` objects are empty. Match verified user IDs before filling them.
- D-03 HIGH: 2025 `rosterOwnerMap[7]` is Isaiah for the season; historical Jeremy Weeks 1–3 attribution must explicitly override it using `ownershipPeriods`. Franchise mapping must remain roster 7.
- D-04 HIGH: transaction event details, asset chains, and site ledger have not been reconciled event-by-event.
- D-05 HIGH: all 300 draft selections were returned, but selecting-roster attribution vs site display is unverified.
- D-06 HIGH: matchup pairings and scores retrieved; site-rendered record totals and score equality not yet automatically compared.
- D-07 HIGH: 2025 postseason Weeks 15 and 17 include four unpaired entries each; Week 18 has 12 unpaired records. Do not count as H2H or infer byes. Need winners bracket classification.
- D-08 MEDIUM: 2026 future pick ownership returned as changed-picks-only; do not assume it is a full ownership inventory.

## Required reconciliation
Run `node tests/data/validate-history.cjs` for local static checks. Run `node tests/data/validate-history.cjs --live` to fetch public Sleeper API data and validate the expected schedule/draft/transaction coverage. Live mode does not yet prove equality to rendered site stats. Save or publish raw provider fixtures only after reviewing their provenance and update cadence.
