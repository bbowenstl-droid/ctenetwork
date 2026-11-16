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
