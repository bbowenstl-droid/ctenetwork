# CTE Sportsbook

Fictional entertainment only. CTE$ has no cash value; no real-money wagering.

## Files
| File | Purpose |
|---|---|
| `data/sportsbook-data.js` | The book: week, lock time, markets, line history, Carl/Holly cards, league cards, result overrides. **The only file you edit weekly.** |
| `js/sportsbook-engine.js` | Pure math: odds, payouts, grading, 3 ML + 3 ATS validation, bankroll ledger, leaderboard. No DOM. |
| `js/sportsbook-store.js` | Where picks are saved. Device-only (localStorage) today; swap the adapter for a backend. |
| `js/sportsbook-live.js` | Pulls records, scores and head-to-head from Sleeper. |
| `sportsbook.html`, `sportsbook-v32.js`, `sportsbook-v32.css` | The page. |
| `sportsbook-embeds-v32.js` | Homepage teaser, Game Day line strips, article embeds. |
| `tools/test-sportsbook.cjs`, `tools/test-sportsbook-ui.cjs` | Engine and browser tests. |

## Weekly workflow (commissioner)
1. **Open a new week:** set `week`, `lockAt` (ISO with offset, e.g. `2026-10-08T19:15:00-05:00`) and add six markets. Each market needs `sides`, `spread`, `moneyline`, and a `lineHistory` entry with the opener. Add later entries to `lineHistory` whenever the line moves; the movement graphics read it automatically.
2. **Record owner cards:** owners lock on their phone and share a line like `CTE-BOOK W4 brendan w4-...:ml:brendan,...`. Paste the IDs into `leagueChallenge.cards[week][owner]`.
3. **Carl and Holly:** add their six picks and stakes to `personalities.<id>.cards[week]`. Stakes must add up to their current bankroll exactly. The page shows a warning if they don't.
4. **Grading:** automatic from Sleeper once the week is final. To force a result (stat correction, ruling), set `results[marketId] = { scores: { ownerA: 101.2, ownerB: 99.4 } }`.
5. **Deploy:** bump `?v=` on the sportsbook files if browsers cache aggressively.

Run `node tools/test-sportsbook.cjs` after editing the data file.

## Persistence limits
Picks live on the owner's device until the commissioner adds them to the data file. Clearing browser data or switching phones loses an unposted card. The site's current anonymous Firebase login can't prove which owner is submitting, so a shared online store would let anyone post as anyone.

## Backend plan (real multi-user submissions)
1. Firebase Auth email-link sign-in, with an allow-list mapping each email to an owner ID.
2. Firestore collection `book/{season}/weeks/{week}/cards/{ownerId}`.
3. Security rules:
   - a user may write only the card for their own owner ID
   - writes must happen before `lockAt`
   - a card must contain exactly 3 ML + 3 ATS selections from the published markets
4. Carl/Holly cards and results are writable by the commissioner only.
5. Implement a `CTE_BookStore.use({...})` adapter backed by Firestore. The page and engine need no changes.
