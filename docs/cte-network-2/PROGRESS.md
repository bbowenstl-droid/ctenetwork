# CTE Network 2.0 — Progress

Updated: 2026-11-15

| Step | Status | Evidence |
|---|---|---|
| 1 — Site audit | Partial | Source review complete; browser/mobile/performance checks outstanding |
| 2 — Architecture | Proposed | Incremental static-site modernization recommended |
| 3 — Historical data audit | Live reconciled 2026-11-15 (152 games, 300 picks, 22 trades incl. three-team) | 2025: 84 regular-season games; 2026: 54 final games through Week 9; 300 draft selections; 21 completed trade events retrieved; see DATA_VALIDATION.md |

| 4 — Development infrastructure | Implemented; CI confirmation pending | Dedicated branch, documentation, Node validation harness, GitHub Actions workflow, draft PR |
| 5 — Brand and design system | Implemented, review pending | DESIGN_SYSTEM.md and scoped css/cte-tokens.css; no runtime page changes |

| 6 — Shared component library | Implemented, CI pending | Scoped component CSS, safe JS renderers, unit tests, CI workflow, component documentation |

| 7 — Responsive foundations | Implemented, browser QA pending | Responsive CSS, fixture, source checks, CI workflow, responsive QA documentation |

| 8 — Visual consistency and CSS consolidation | Partial migration, browser QA pending | Four representative pages opt in to scoped palette/typography bridge; no legacy CSS removed |

| 9 — Navigation redesign | Implemented, browser QA pending | Shared shell loads grouped searchable navigation, source tests, CI workflow |

| 10 — Homepage | Implemented; browser QA in progress | Draft PR #16; Site/Homepage/component/bridge GitHub checks passed; local Site suite passed; live Chromium loaded scores, standings and six playoff positions |

| 11 — Contextual homepage | Implemented; QA pending | Provider-boundary context model with offline, draft, recap and postseason tests; existing favorite-team preference retained |
| 12 — Search/linking | Implemented; QA pending | Search across pages, owners and all loaded stories; deep links validated |
| 13 — Normalize history | Implemented and live reconciled | New shared model; 152 games, 300 selections, 265 current players and 27 changed picks reconciled |
| 14 — Owner legacies | Implemented; partial browser QA | Owner/franchise tables, season records, championship/playoff history, rivalries, current roster, articles, drafts and trades; Jeremy browser verified |
| 15 — Rivalry Center | Implemented; partial browser QA | Scoped meetings, points, closest/largest margins, streaks; Brendan/Jacob browser verified |
| 16 — Record book | Implemented; QA pending | Scoped records, season leaders, streaks; paired games only |
| 17 — Fame/shame | Implemented; QA pending | Championships and score/margin extremes derived from actual results |
| 18 — Weekly awards | Existing system retained and hardened | Correct completion boundary; tied zero-score games no longer imply a win; tests pass |
| 19 — Pick’em | Source implemented; production blocked | Authenticated shared cards, server deadlines; disabled pending verified Firebase setup |
| 20 — Pick’em leaderboard | Source implemented; production blocked | Stored-card/result grading with tie pushes, pending outcomes and deterministic ranking |
| 21 — Polls | Source implemented; production blocked | One vote per owner, validated options, server deadline |
| 22 — Owner interactions | Source implemented; production blocked | Shared lounge messages/reactions and commissioner moderation |
| 23 — Trade engine | Implemented; live reconciled 2026-11-15 incl. completed Week 10 three-team trade | Completed provider events, all weeks, asset replay and explicit unresolved chains |
| 24 — Trade trees | Implemented; browser QA pending | Interactive connected trade histories, draft conversion and drop boundaries; three-team fixture tests |
| 25 — Playoff War Room | Implemented; browser QA pending | Seeded bootstrap simulations, schedule validation, four divisions/two wildcards/two byes; conservative proof bounds |
| 26 — What If? | Implemented; browser QA pending | All-play and symmetric schedule swaps, tested for reversibility and correct game coverage |
| 27 — Newsroom | Enhanced; browser QA pending | Existing article archive retained; shareable query/category filters |
| 28 — Media Hub | Implemented; browser QA pending | Carl/Anita archive filters, character pages and pick receipts |
| 29 — Commissioner Center | Source implemented; production blocked | Server-issued commissioner claim required; round/result/poll tools; no secrets in client |
| 30 — Performance/accessibility | Automated audit complete (axe clean, Lighthouse tracked); real-device check pending | Shared menu state/focus, reduced motion, forced colors, Sleeper preconnect and quality CI; full Lighthouse/axe/device audits outstanding |
| 31 — Regression | Automated 480-load Chromium/WebKit matrix in CI; real iPhone + authenticated pending | Combined-branch deterministic tests pass; security emulator and legacy-rule preservation passed GitHub CI at 7a58ca1; full device regression remains pending |
| 32 — Launch | Blocked by release gates | CTE 2.0 not deployed; isolated auth smoke page from main retained. Backend activation and full browser gates remain open |


## Release authorization and strategy
The commissioner authorized completing all remaining steps and deployment after release gates on 2026-11-14. Prior per-step stop instructions are superseded.
Preserve the stacked drafts as review history. Continue from Step 10 on a consolidated release branch, merge latest main before release, and open one final PR against main. Do not merge any draft into production early. Record main's SHA as rollback target before release.

## Verified this session
- Integration 8cb8399: GitHub Site check run 43571236363 successful.
- Step 10 b0e7d5d: Site check 43571980387 and homepage 43571981304 successful.
- Local link, syntax (114 scripts), history (134 frozen games), sportsbook (31 tests), awards, five component suites and identity checks passed.
- Browser Chromium: current Week 10, six live matchups, all six playoff positions loaded. Full viewport matrix remains pending.
- Fixed duplicate H1 detected during review.
- Firebase repository rules contain PASTE_DEVICE_ID; deployed authorization and account access remain unverified. Do not claim multi-user/admin readiness.

## Cross-chat reconciliation — 2026-11-14 (Central)
- Adopted `quality/cte-network-2-mobile-prep` at `7a58ca18ae0585db3d86a9b4df34f1997db62e47`, which includes this chat’s completed feature work plus the other chat’s quality, claims tooling and security hardening.
- Merged current main’s isolated auth check without conflicts, preserving both histories. No production branch or deployed Firebase rules changed.
- Confirmed GitHub runs 43639972604 (Site), 43639972579 (release/security), and 43639972608 (legacy-rule preservation) passed on that source commit.
- Combined local checks: links/assets, 126 JS/inline scripts, 10 component/data suites, history, 31 sportsbook tests, weekly awards, 8 commissioner-tool tests, 8 rules-composer tests, and isolated auth smoke test all passed.
- Chromium: homepage iframe widths 320/375/390/768/1024/1440 each have one H1 and no document-level horizontal overflow; full-page navigation search and Jeremy site search work; War Room loaded current standings, remaining schedule and simulations. Narrow-frame menu interaction was inconclusive and requires further testing. This is not iPhone Safari certification.
- Retained the other chat’s Monday November 16 desktop checkpoint for privileged authentication/role setup. Shared participation remains disabled until deployed-rule and end-to-end access tests pass.

## Explorer QA and corrections — 2026-11-15
- Tested six explorer pages at all six required widths in Chromium (36 combinations); no document overflow or duplicate H1 found. Detailed evidence and limits are in TESTING.md.
- Fixed trade-tree keyboard focus and return focus, stale asynchronous trade failures overwriting another history view, and the trade retry loading/error state. Added deferred-request regression tests.
- Corrected current team names in history profiles and search using Sleeper; retained recorded names as search aliases and clearly labeled offline fallback names. Historical ownership records are unchanged.
- Production remains gated by authenticated Firebase activation, actual iPhone Safari/touch checks, and remaining release audits.

## Claude session — 2026-11-15 (Central)
Handoff from the prior assistant accepted; work continues on `release/cte-network-2-completion` (PR #17, draft).

**Verified GitHub state.** PR #17 open/draft, 85 ahead / 0 behind `main` at `b80aa18` before this session. Every commit from PRs #9–#16, #18, #20 and #21 is contained in the release branch (no parallel work missing). CI green on handoff head `7e8c8d6`. GitHub Pages settings API is not reachable from this environment; Pages source must be confirmed in the repository settings at release time.

**New release-QA workflow** (`.github/workflows/cte-release-qa.yml`, read-only):
- `live-data`: Sleeper trade/status/team-name report, `tools/audit-cte2-live.cjs`, `validate-history.cjs --live`.
- `browsers`: all 35 pages plus 5 deep links × Chromium and WebKit × 320/375/390/768/1024/1440 (480 loads), served under `/ctenetwork/` to reproduce GitHub Pages asset paths. WebKit ≤390 uses iPhone UA + touch emulation (**not** a real device). Checks: HTTP, JS exceptions, broken same-origin requests/images, document overflow, h1 count, axe WCAG 2.1 AA at WebKit 390 and Chromium 1440, menu tap/Escape/focus return, content probes. Firebase/Google identity traffic is blocked so QA never touches the production database.
- Lighthouse mobile + desktop for 8 key pages with layout-shift, LCP and render-blocking detail.

**Live data (Sleeper, 2026-11-15 14:40 UTC).** 152 paired games (138 regular), 300 draft selections, **22 completed trades including one three-team trade** (transaction `1426706170696990720`, Week 10, rosters 1/4/6 — Brendan, Mike, Dan, status `complete`), 13 linked transfers, 266 current players and 27 changed picks reconciled, zero issues. No pending trades. `validate-history --live` now treats 2025's 7 trades as exact and 2026's 15 as a floor (in-season).
Current Sleeper team names changed since the handoff note (e.g. Carter → "The mahomo’s"; Brett, Mike, Dan have no custom team name). Site reads current names live; recorded names remain aliases/labelled fallbacks.

**Fixed from QA evidence**
- Rivalry timeline text was near-black on a dark row (1.04:1) — dates/scores invisible. Rows now light.
- ~20 shared colours below WCAG AA (shell greys, legacy gold/blue/green on light cards, sportsbook dark rail/footers, transaction status/pager). All overrides in `css/cte-quality.css` (colour only; removable). Axe now reports **no violations on any page in either engine** except the frozen State of the Union report (see below).
- Team-defense images (BAL, SF…) used player headshot URLs → Sleeper team logos.
- Rivalry detail page had no h1 (title promoted). Matchup detail overflowed 320px by ~40px.
- Draft admin/TV: `lang`, logo alt text, keyboard-focusable board, pick-button contrast.
- Performance: 13 inline-script-free pages now `defer` all scripts (order preserved); Geist font CSS non-blocking on 30 pages; Standings reserves measured heights (CLS was ~0.3).

**Firebase preparation (no production changes)**
- Gap found: only the commissioner could be provisioned. Added `tools/assign-owner-claims.py` (dry-run default, `--list`, second UID confirmation, active-owner allow-list, refuses former owners/duplicates/re-mapping/commissioner accounts) with 11 offline tests in CI.
- Emulator suite extended: former owners, string `"true"` commissioner claim, outsider/anonymous reads and writes on polls/votes/results/comments/reactions, backdated comments, invalid threads, one-option/past polls, past round locks. `CTE_RULES` lets it test the merged candidate. Passing in CI.
- `docs/cte-network-2/MONDAY_RUNBOOK.md` — admin checkpoint steps and rollback.

**Known exceptions / still open**
- `state-of-union.html` (frozen, generated): two h1 elements and one non-focusable scroll table. Left untouched by policy.
- `article.html` and `matchup.html` without query parameters render no h1 (not linked anywhere; deep links pass).
- `countdown.html`/`history.html` are redirect stubs; their aborted stylesheet requests are expected.
- Legacy `tools/test-quality-v41.cjs`, `test-sportsbook-ui.cjs`, `data-smoke-v24.cjs` fail identically before and after this session (network/stale sportsbook fixture); not part of CI.
- Real iPhone Safari pass, Monday Firebase activation, authenticated end-to-end tests, Pages settings confirmation, release merge.

## Claude session — 2026-11-16 (Central): additions from comparable-site review
Reviewed what similar Sleeper league sites and dynasty league homepages offer (Sleeper League Page template, League Pulse, Leagueyard, MFL/RT Sports dynasty league pages, Yahoo record book). CTE already had a record book, power rankings, history and head-to-head. Built the gaps that need no admin access:
- **Link previews.** Open Graph/Twitter tags on 25 public pages with a league-branded default card (`share/cte-network.jpg`). Every article gets `share/<id>.html` + a 1200×630 headline card built by `tools/share/build-share-cards.py`; article pages have a **Share story** button that shares that link. New articles on `main` get their preview built and committed by `.github/workflows/cte-share-cards.yml`. Post `share/<id>.html` links on Facebook; use Facebook's Sharing Debugger "Scrape Again" if an old preview is cached.
- **Draft Capital** (`draft-capital.html`, League menu): live Sleeper ownership of every future rookie pick (seasons +1…+3), first-round and acquired marks, traded-away list, capital ranking. QA: 12 teams, 48 picks for 2027, 9 acquired, both engines.
- **404.html** for any missing path (search + main links), fits 320px.
- `tools/qa/make-preview.sh` rebuilds the iPhone preview branch from the release branch.
Not built (suggested for after release): all-time 12×12 head-to-head grid, league key-dates calendar (.ics), trophy room.

## 2026-11-16 — Real iPhone Safari checklist
Brendan ran IPHONE_CHECKLIST.md items 1–17 on his iPhone against the ctenetwork-preview build (release c62e95b + PREVIEW banner): all passed. Items 18–19 wait for Firebase enablement.

## 2026-11-16 — Independent pre-release review fixes
An independent review (Claude Fable 5.2, read-only) found no merge blockers with cloud off. Fixed before rules publish:
- Lounge/Commissioner: server time offset now read with `onValue(..., {onlyOnce})` and falls back to 0 (a `get()` on `.info` could fail and blank the page); per-round fallback to own picks if a lock-boundary read is denied.
- Rules: comments and reactions restricted to the `lounge` thread; votes must be `a`–`d`. Security tests updated (lounge paths, other-thread and blank-vote denial).
- `assign-commissioner-claims.py`: refuses if another account already holds commissioner/`brendan`, or if the target is mapped to another owner (+2 tests).
- Former owners (Jeremy, Tyler) profile links redirect to History Lab instead of "Owner not found".
- Cache versions bumped (`app-v29.js`, `network-v29.js`, `cte-participation.js` → `?v=43`).
- Share-card workflow no longer uses `[skip ci]`.
- Runbook step 2 wording corrected (semantic, not byte-for-byte; `//` comments abort).

## 2026-11-16 — Firebase activation (MONDAY_RUNBOOK steps 1–8)
- 11:38 CT: live rules backed up (rollback copy kept by Brendan, outside git).
- Candidate built with `stage-v2-firebase-rules.py` (rooms/book identical to live, v2 added; fingerprint 91e00e5ffba3); emulator suite PASS in Cloud Shell against the merged file.
- Commissioner claim applied to Brendan's Google account and verified via Admin SDK.
- Owner claims: none yet (owners unavailable); to be added after release with `assign-owner-claims.py`. Unmapped accounts see the "not assigned" state.
- Rules published from the Firebase console; Draft Central and Sportsbook confirmed working afterwards.
- Live checks on the preview build (cloud on, real database), by Brendan: anonymous REST read of /v2 denied; signed-out Lounge shows sign-in only; commissioner session verified; round/poll creation, own pick, vote, lounge message and reaction save and persist across reload and a second device; commissioner moderation works. Not run live: pick-lock at deadline and cross-owner isolation (need a second mapped owner) — both covered by the emulator suite against the published file; re-check live when the first other owner is mapped.
- `CTE2_CLOUD_ENABLED = true` set for release.
## Claude session — 2026-11-16 (Central): site glow-up — looks and live features
Branch `feature/site-glowup` (from `release/cte-network-2-completion` at c62e95b). **Not merged, not deployed.** No Firebase rules, participation/security code, `data/cte-participation-config.js` or `tools/assign-*`/`stage-*` scripts were touched; sportsbook and draft central logic is unchanged.

**Looks (see DESIGN_SYSTEM.md, DECISIONS.md)**
- Black-and-gold, dark-only theme from the league crest on every shell page (28 pages). Old stylesheets are untouched: `tools/theme/build-glow-legacy.cjs` derives colour-only overrides from them and bundles `css/cte-theme.css` (one render-blocking file, 53 KB / 10 KB gzipped) with the hand-written `css/cte-glow.css`.
- Display type (Big Shoulders Display, self-hosted 14 KB) for titles, section heads, scores of record; gold wordmark; redesigned hero with the crest, "Presented by Show Me Industries" and the next key date.
- Team identity (`js/cte-teams.js`): one colour per franchise + Sleeper avatars (initials fallback, cached locally) on the home scoreboard, standings, playoff seeds, power rankings, weekly awards, the grid and the trophy room.
- Motion only under `prefers-reduced-motion: no-preference`.
- Power rankings: rank numerals, team bar + avatar, coloured movement chips, the editorial tagline now visible on phones. Weekly awards: team-coloured cards with avatars, two-up on phones.

**Features (all from Sleeper's league endpoints)**
- **Game Day on the home page** (`js/cte-gameday.js`): live scores with LIVE/FINAL/UPCOMING state, win-outlook bars, projected finals, starters left, upset-watch / too-close-to-call / photo-finish / upset alerts, top score, top starter, the league-median line and the tightest race; my-team matchup pinned first; quiet 60 s refresh while the week is live and the tab is visible. Projection = each starter still on 0 gets his own season average (CTE estimate, labelled; never shown once Sleeper scores the week). Alerts wait until half a matchup's starters have played.
- **Head-to-head grid** (`head-to-head.html`, `js/cte-h2h.js`): 12×12 all-time grid, tap/Enter a cell for the series (record, points, current run, every meeting linked to its box score). Franchise view by default (Isaiah's line includes Jeremy's 2025 Weeks 1–3, Carter's includes Tyler's 2025); Managers toggle splits them (14 people). Scope filter and shareable URL kept; older `?a=&b=` links stay person-to-person.
- **Trophy room** (`trophy-room.html`, `js/cte-trophies.js`): per season — CTE Champion, Toilet Bowl Trophy, Last Place Trophy — plus runner-up, third place, best record, scoring title, highest week, most weekly high scores, an all-time count and "how it's decided". Current season shows the live races, no hardware.
- **Key dates** (`calendar.html`, `js/cte-calendar.js`, `data/cte-calendar.js`): rookie draft, kickoff, trade deadline, regular-season finale, three playoff rounds; week strip; countdown; **Subscribe** (webcal) and **Download .ics** (`calendar/cte-league.ics`, built by `tools/build-calendar.cjs`). Dates are re-checked against live Sleeper settings; unknown dates are omitted.
- Navigation, search index and home tiles list the new pages. A home tile points at `state-of-union.html`; repoint it if the new State of the Union page ships under another name.

**Needs the commissioner's eye**
- 2025 trophies are *derived*: Toilet Bowl → **Tyler** (lost out of Sleeper's consolation bracket, which ran losers-advance), Last Place → **Jesse** (6–22, behind Cotton on points for). If the league ruled otherwise, record it in `CTE_LEAGUE_DATA.trophies` (see DECISIONS.md) and the page follows.
- Trade deadline is shown as **Mon Nov 23, 2026** (Sleeper closes trading when the last Week 11 game ends).
- The .ics subscription only changes when `data/cte-calendar.js` is edited and `node tools/build-calendar.cjs` is re-run.

**Verification (this sandbox cannot reach api.sleeper.app, so browsers were fed the frozen 2026-11-13 provider capture through `tools/qa/sleeper-fixtures.cjs`: as captured, simulated mid-Sunday, simulated final, and Sleeper down)**
- Repo checks: `check-site.py`, `check-syntax.cjs`, all `tests/components` + `tests/data` suites (14 new tests in `glowup.test.cjs`), history/sportsbook/awards tests, `validate-history.cjs`, State of the Union `verify.py` — all pass.
- axe (WCAG 2 A/AA) + overflow + single-h1 + JS-error sweep, Chromium, every shell page and detail deep links at 320/375/390/430/768/1280: clean except the long-standing `matchup.html` with no parameters (no h1).
- `tools/qa/browser-matrix.mjs` (now accepts `ENGINES=chromium` and `SLEEPER_FIXTURES=`): 264 loads, 44 pages, 6 widths — only the two known exceptions (`matchup.html` bare, frozen `state-of-union.html` h1×2); menu open/Escape/focus-return passes at 4 widths. A second run with Sleeper unreachable showed no overflow, exception or broken same-origin request anywhere.
- Interaction script: grid 12 rows/132 cells, totals 152 W = 152 L across 152 games, keyboard open + focus move, franchise vs manager split (Isaiah–Brendan 1–2 → 1–1 plus Jeremy 0–1), scope filter, old deep link, trophy holders, 7 calendar events, .ics download, webcal link, Game Day in four data states, avatar-blocked fallback, my-team pin, menu search.
- Lighthouse (local, uncompressed server, Sleeper unreachable): accessibility 100 on index, head-to-head, standings, trophy room, calendar (mobile + desktop). Mobile performance vs the base commit under the same conditions: index 73 (75), head-to-head 93 (93), standings 89 (95); new pages 93–96. The theme adds one stylesheet.

**Not done / limits**
- No WebKit or real-iPhone run here (WebKit build unavailable); CI's `cte-release-qa.yml` covers WebKit emulation against live Sleeper. Live Sleeper was not exercised from this sandbox.
- A starter who plays and scores exactly 0 is treated as "still to play" until Sleeper scores the week; the outlook is an estimate by design.
- `game-day.html` keeps its own scoreboard (no outlook bars); `admin.html`, `tv.html`, `404.html`, `offline.html` and `state-of-union.html` are outside the theme (the last three were already dark).
## Claude session — 2026-11-16 (Central): CTE State of the Union (live edition)
Branch `feature/state-of-the-union` (from `release/cte-network-2-completion`). Not merged, not deployed.

**What it is.** `state-of-the-union.html` — a black-and-gold special report that builds itself from the public Sleeper API on every visit, walking `previous_league_id` back through every season. The Nov 13 written edition (`state-of-union.html`) is untouched and linked from it.
- **CTE Bot's read** (`#state`): headline takes generated from the numbers (title holder, current race, luck, trade market, most lopsided deal, record book, draft steal) plus six league totals.
- **League history** (`#history`): per season champion, runner-up, third, regular-season winner, most points, Toilet Bowl (last in the consolation bracket) and last place (bottom of the standings); playoff results; standings with head-to-head and median shown separately; timeline (drafts, first trade, manager handoffs, titles).
- **Trade trees** (`#trades`): every completed trade with "points since" for each side and a verdict; an expandable tree per trade (where each asset went next and what came back for it; a traded pick becomes the player drafted with it); a tap-to-filter trade web; a finder that follows any player or pick through the league; sort by production, assets, lopsidedness or date. Three-team trades get three sides.
- **Team evolution** (`#franchises`): one card per franchise (roster_id) with managers over time, record/PF/PA/luck by season, weekly score bars, roster core with how each player was acquired, where the started points came from (startup draft / rookie draft / trade / waivers), best and worst seasons.
- **Record book** (`#records`): all-time standings by franchise or by manager, luck index, highest/lowest scores, blowouts, closest games, streaks, most active traders, best drafters and steals per draft.
- Deep links: `#history`, `#trade-<transaction_id>`, `#franchise-<roster_id>`, `#asset-player:<id>` / `#asset-pick:<season>:<round>:<roster>`. Share buttons post `sotu/<section>.html`, which carry their own Open Graph card (built by `tools/share/build-sotu-cards.py`, same renderer as article cards; kept out of `share/` so the article check is unaffected).

**Files.** `state-of-the-union.html`, `js/cte-sotu-engine.js` (pure, runs in Node), `js/cte-sotu.js` (loader + rendering), `css/cte-sotu.css`, `data/sotu/snapshot.json` + `players.json` (offline fallback and player names), `sotu/` (share pages and cards), `tools/sotu/build-snapshot.cjs`, `tools/sotu/qa-sotu.mjs`, `tools/share/build-sotu-cards.py`, `tests/data/sotu-engine.test.cjs`. Shared files touched: one line in `js/cte-navigation.js` (History group) and one card in `index.html`.

**Rules it follows.** Franchise history is continuous while manager records are separate (Jeremy→Isaiah in 2025 Week 4, Tyler→Carter for 2026, read from `data/league-data.js`); median results are never counted as head-to-head; postseason finish comes from the bracket, not the standings; unpaired postseason rows are not games; only weeks Sleeper has finished scoring count (`last_scored_leg`, and never the week `/state/nfl` says is being played), so nothing is clinched for a season in progress.

**Speed and failure behaviour.** About 85 small Sleeper requests on a first visit, eight at a time, trimmed and cached in `sessionStorage` (finished seasons for the whole session, the current season for five minutes; **Refresh** bypasses it). Sections render when scrolled near. If Sleeper has not answered in four seconds the saved copy is painted first and the live numbers replace it when they arrive; if Sleeper fails, the page stays on the saved copy and says which date it is from. Refresh the saved copy after big league events with `node tools/sotu/build-snapshot.cjs --live` (needs network), then commit `data/sotu/`.

**Verified.**
- `node --test tests/data/sotu-engine.test.cjs` (13 tests, no network): standings equal Sleeper's own roster records for 2025 (wins, losses, PF, PA); every one of 152 games, all 21 trades and their transfers, trade-to-trade links, all-play, both draft boards and original pick ownership equal the earlier research in `research/state-of-union/` (which was reconciled against a second provider) and `tools/fixtures/history-audit.json`; replaying every draft pick, trade, pickup and drop reproduces all 12 current rosters and every traded-pick owner with zero differences; record highs/lows and trade "points since" recomputed independently from the raw matchup files; champion/runner-up equal `data/league-data.js`.
- Live spot checks against api.sleeper.app on 2026-11-16: 2026 league settings (leg 10, last scored 9), all twelve 2025 roster records, the 2026 rookie draft's `slot_to_roster_id` (identical to the engine's derivation) and Week 10 transactions. Live now has a 22nd trade, the three-team deal completed after the snapshot; it is covered by a test and renders with three sides.
- `tools/sotu/qa-sotu.mjs` in Chromium at 320/375/390/430/768/1280: no horizontal overflow, one h1, no duplicate ids, no JS errors, axe WCAG 2.1 A/AA clean, in four modes (Sleeper answered from fixtures, Sleeper refused, Sleeper never answering, repeat visit served from cache). Keyboard: trade web nodes, filters, finder, tree and share all reachable and operable.
- Existing checks still pass: `node --test tests/components/*.test.cjs tests/data/*.test.cjs`, `tools/check-syntax.cjs`, `tools/check-site.py`, `tools/test-history.cjs`, both share-card checks; `tools/qa/browser-matrix.mjs` (Chromium, all pages × 6 widths) reports no problem on the new page or the homepage.

**Not verified here / open.**
- The build sandbox blocks api.sleeper.app, so the page's own live fetch path was exercised against recorded Sleeper responses, not the real network, and WebKit could not be installed (Chromium only). Run `MODE=live ENGINES=chromium,webkit node tools/sotu/qa-sotu.mjs` in CI or on a desktop, and check on a real iPhone.
- 2025 team names come from Sleeper's 2025 league as it stands now; the franchise Isaiah finished the year managing still shows the name Jeremy gave it.
- "Points since" only sees weeks a player was on a CTE roster, and a trade made mid-week counts that week only if the player was already on the new roster for it.
- Not added to `js/cte-search.js` or the service-worker list, to keep shared-file changes to the nav link and homepage card.
