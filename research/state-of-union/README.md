# CTE State of the Union — published edition

Prepared November 13, 2026. **Publication authorized November 13, 2026.** The standalone `../../state-of-union.html` is the complete interactive edition; `complete-edition.md` combines the feature, all twelve franchise files and all 21 trade entries for reading/export.

## Frozen reporting scope

- Sleeper snapshot completed **November 13, 2026, 11:20 a.m. Central**. Flaim cross-checks collected in the same research session.
- 2025 scores through Week 17; 2026 scores through Week 9. Week 10 remains live and is excluded from performance records.
- Transactions: 2025 weeks 1–18 and 2026 weeks 1–10, including offseason activity under Week 1.
- 21 completed trades; the announced three-team agreement is sourced separately to `news-2026-11-13-three-team-trade.js` and is pending in this edition.
- Ownership periods come from `data/league-data.js`, with Jeremy/Isaiah and Tyler/Carter kept distinct.

## Deliverables

- `feature.md`: flagship reported feature.
- `franchise-profiles.md`: twelve franchise narratives, season comparisons, rosters, drafts and future pick inventory.
- `trade-ledger.md` and `trade-ledger.csv`: all completed trades, transfers and commentary.
- `analysis.json`: calculated records, trade connections, every asset event, franchise summaries and draft boards.
- `raw/`: preserved Flaim/Sleeper responses and retrieval manifest. `players-used.json` retains identities used in this investigation; the much larger full NFL player catalog is ignored.
- `template.html`, `style.css`, `app.js`: self-contained interactive edition source.

## Rebuild and verify

From the repository root:

```sh
node research/state-of-union/games.cjs
python research/state-of-union/analyze.py
python research/state-of-union/verify.py
python research/state-of-union/build.py
node --check research/state-of-union/app.js
```

`collect.py` refreshes raw Sleeper snapshots and therefore changes the reporting cutoff; do not run it casually against this frozen edition. Flaim cross-checks must also be refreshed for a new edition. No external dependencies are needed for the frozen rebuild.

## Verification performed

- Each weekly completed trade inventory reconciled between Flaim and raw Sleeper records.
- Both draft boards reconciled for player, overall slot and selecting roster.
- Weekly game scores checked between Flaim and Sleeper.
- Head-to-head plus median wins/losses and regular-season points reconciled to both seasons’ standings.
- All current player ownership reconstructed from the startup draft, rookie draft, completed trades, pickups and drops, with **zero differences** from the current roster snapshots.
- All 27 changed draft-pick ownership entries reconstructed from trades with **zero differences** from the current pick ledger.
- Browser: section switching, London search (two deals), Mike-origin first → Price → Jacob timeline, Brendan–Jacob 2–1 filter, and Carter’s inherited franchise attribution.
- Phone-width (390px iframe viewport) visual check: readable hero, horizontally scrollable section navigation and responsive page layout.

## Publication handoff

Review the narrative and explorer first. Before publication, decide whether to preserve the 11:20 a.m. snapshot or refresh pending-trade status. Refreshing only the trade status requires updating the affected current rosters, pick inventories, counts, timelines, narratives and audit together.

The standalone page is linked as the lead feature on the homepage and newsroom. The article route also contains the full main feature and links to each interactive section. All underlying research files are included.

## Limits

No private negotiations, rejected offers or unrecorded commissioner actions are asserted to be captured. Current bracket placeholders are not clinched playoff berths. A drop ends continuous trade custody. Multi-asset packages are not allocated invented one-for-one return values. Startup roster overlap includes reacquisitions. Future slots are unknown. Started points measure submitted lineup contributions, not causal wins gained. The article is a historical league investigation, not an NFL status report or current dynasty-market valuation.
