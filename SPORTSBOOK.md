# CTE Sportsbook

Fictional entertainment only. CTE$ has no cash value; no real-money wagering.

## Files
| File | Purpose |
|---|---|
| `data/sportsbook-data.js` | The book: week, lock time, markets, line history, Carl/Anita cards, league cards, result overrides. **The only file you edit weekly.** |
| `js/sportsbook-engine.js` | Pure math: odds, payouts, grading, 3 ML + 3 ATS validation, bankroll ledger, leaderboard. No DOM. |
| `js/sportsbook-store.js` | Where picks are saved. Device-only (localStorage) today; swap the adapter for a backend. |
| `js/sportsbook-live.js` | Pulls records, scores and head-to-head from Sleeper. |
| `js/sportsbook-cloud.js` | Shared picks: league codes, saving cards/parlays to Firebase. |
| `database.rules.json` | Firebase Realtime Database rules (draft room + Sportsbook). |
| `sportsbook.html`, `sportsbook-app-v35.js`, `sportsbook-v35.css` | The page. |
| `sportsbook-embeds-v32.js` | Homepage teaser, Game Day line strips, article embeds. |
| `tools/test-sportsbook*.cjs` | Engine, browser and shared-picks tests. |

## Weekly line schedule

- Wednesday: publish the weekly opening lines.
- Friday morning: refresh all six lines after Thursday, including points already scored in the full-matchup estimate. Keep the Friday prices until lock.
- Sunday: close all cards and parlays at 12:00 PM America/Chicago, even if an earlier game is played. Use the correct CDT/CST offset for that date.
- Save every accepted ticket’s quotes. New or relocked entries use the current board; price changes never rewrite saved receipts. Archive each revision with a timestamp.
- Sync the Sunday deadline with Firebase using the authorized commissioner device.

## Weekly workflow (commissioner)
1. **Open a new week:** set `week`, `lockAt` (ISO with offset, e.g. `2026-10-11T12:00:00-05:00`) and add six markets. Each market needs `sides`, `spread`, `moneyline`, and a `lineHistory` entry with the opener. Add later entries to `lineHistory` whenever the line moves; the movement graphics read it automatically.
2. **Record owner cards:** owners lock on their phone and share a line like `CTE-BOOK W4 brendan w4-...:ml:brendan,...`. Paste the IDs into `leagueChallenge.cards[week][owner]`.
3. **Carl and Anita:** add their six picks and stakes to `personalities.<id>.cards[week]`. Stakes must add up to their current bankroll exactly. The page shows a warning if they don't.
4. **Grading:** automatic from Sleeper once the week is final. To force a result (stat correction, ruling), set `results[marketId] = { scores: { ownerA: 101.2, ownerB: 99.4 } }`.
5. **Deploy:** bump `?v=` on the sportsbook files if browsers cache aggressively.

Run `node tools/test-sportsbook.cjs` after editing the data file.

## Shared picks (saved on the website)

Owners sign in once per device with a 6-character league code, then their card and parlay save to the
Sportsbook database. They show up on any device they sign in on, count on the leaderboard automatically,
and stay hidden from everyone else until Sunday noon Central (the board only shows who's in).

### One-time setup (about 5 minutes, works from an iPhone)
1. Open `sportsbook.html#commissioner` on the live site, on the phone you'll run the league from.
   Copy **This device's ID**. (It's the same ID the draft admin page shows.)
2. Firebase console → project **cte-draft-central** → **Realtime Database → Rules**.
3. Replace everything with the contents of `database.rules.json`, then replace every `PASTE_DEVICE_ID`
   with your device ID (it appears 7 times; the draft-room rule is included, so the draft keeps working).
   Tap **Publish**.
4. Back on `sportsbook.html#commissioner`: tap **Set Week 4 lock time**, then **Make new codes for everyone**.
5. **Copy codes** and text each owner their own code privately. Codes are only shown once; tap
   **New code** next to someone if they lose theirs.

### Every week
- After updating `data/sportsbook-data.js` for the new week, open `#commissioner` and tap
  **Set Week N lock time**. Until you do, that week's picks can't be saved (the database needs the deadline).
- Nothing else. Cards and parlays grade automatically once Sleeper finalizes the week.

### How it's protected
- Codes are never stored; the database keeps a SHA-256 hash it can compare but nobody can read.
- A device can only save picks for the owner whose code it entered, only before that week's lock time.
- Picks can't be read by other owners until lock. The commissioner device can read and fix anything.
- If the database is unreachable, the page falls back to saving on the device with a shareable entry line.

## Weekly parlay
One parlay per owner per week, separate from the 6-pick card. 2–6 legs, one leg per matchup,
flat CTE$100 (set in `parlay:` in the data file). A losing leg loses it; a push drops that leg and
the rest still pays. Parlays have their own **Parlay race** on the Leaderboard tab.

## Persistence limits
Picks live on the owner's device until the commissioner adds them to the data file. Clearing browser data or switching phones loses an unposted card. The site's current anonymous Firebase login can't prove which owner is submitting, so a shared online store would let anyone post as anyone.

## Backend plan (real multi-user submissions)
1. Firebase Auth email-link sign-in, with an allow-list mapping each email to an owner ID.
2. Firestore collection `book/{season}/weeks/{week}/cards/{ownerId}`.
3. Security rules:
   - a user may write only the card for their own owner ID
   - writes must happen before `lockAt`
   - a card must contain exactly 3 ML + 3 ATS selections from the published markets
4. Carl/Anita cards and results are writable by the commissioner only.
5. Implement a `CTE_BookStore.use({...})` adapter backed by Firestore. The page and engine need no changes.
