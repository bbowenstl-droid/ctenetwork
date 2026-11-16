# Step 10 — Homepage Redesign

Status: implementation committed, runtime/browser QA pending.

## What changed
- Added editorial cover-style home hero with direct Game Center / Newsroom actions.
- Added a live Sleeper-based league pulse showing season, current week, completion boundary, and status. No fake scores or fabricated calendar information.
- Added four clear entry points for Owners, Transactions, Records, and Draft Central.
- Added a six-position playoff field strip powered by the existing `CTE_Quality.playoffField` logic (which uses league division and wildcard rules), with no assertion of clinching or probabilistic odds.
- Retained all existing live matchups, featured news, story list, top-five standings, talent cards, and rivalries.
- Added an offline/data-error fallback for both new live regions.
- Styles are scoped to `body[data-view="index"]` in `css/cte-homepage.css`; no other page templates were altered.

## Verification gate
1. Run source tests and global site-check CI.
2. Visually test at 320/375/390/768/1024/1440px.
3. Check iPhone Safari, Android Chromium, and desktop for hero, cards, scrolling, and contrast.
4. Verify actual Sleeper live/final/upcoming state, and disconnected network fallback.
5. Verify six playoff slots agree with standings, current owner mappings, byes, and wildcard rules.
6. Test keyboard navigation, touch target size, zoom at 200%, and reduced motion.
7. Confirm dark hero contrast and no duplicate H1 conflicts (`app-v29.js` only promotes H2 when no H1 exists; there is now an explicit H1).
8. Confirm PWA/offline cache behavior when the new stylesheet is first added.

## Rollback
Remove homepage CSS link, the new hero, shortcuts and playoff section from `index.html`, then remove `renderHomePulse` and `renderHomePlayoffs` plus their calls and fallback from `network-v29.js`. No backend/state migrations are necessary.

## Release status
Draft branch only. No merge or production deployment.
