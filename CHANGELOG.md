# CTE Network v35

- Commissioner panel opens from `sportsbook.html?commissioner` or `#commissioner` and scrolls into view.
- Sportsbook page files renamed to `sportsbook-app-v35.js` and `sportsbook-v35.css` so phones can't keep an old copy. The old `sportsbook-v32.js` / `sportsbook-v32.css` are no longer used and can be deleted.
- Sportsbook footer shows the version (SPORTSBOOK v35).

# CTE Network v34 — Shared picks, weekly parlays, weekly awards

- **Picks save to the website.** Owners sign in once per device with a league code from the commissioner; cards and parlays save online, follow them to any device, count on the leaderboard automatically, and stay hidden until kickoff. The board shows who's in.
- **Weekly parlay:** Board toggle (Weekly card | Parlay). 2–6 legs, one per matchup, CTE$100 flat; pushes drop a leg. New Parlay race on the Leaderboard.
- **Commissioner panel** at `sportsbook.html#commissioner`: make/reset league codes, set each week's lock time.
- **Weekly awards** on Home and Game Day: top score, biggest blowout, nail-biter, bad beat, bench points, basement.
- **This week in CTE history** on Home: the same week in past seasons.
- Newsroom: new Sportsbook filter.
- Setup: `SPORTSBOOK.md` and `database.rules.json` (Firebase rules; includes the draft room).

# CTE Network v32 — CTE Sportsbook

- New **Sportsbook** tab (mobile bar and menu). Week 4 board with six markets: spreads, moneylines, opening lines and line movement.
- League pick'em: build a card of 3 moneylines + 3 spreads at CTE$100 each, lock before Thursday kickoff, share the receipt.
- Carl vs Anita bankroll war: both start at CTE$1,000, all-in every week, no refills.
- Leaderboard ranked by CTE$ profit with weekly badges; Results tab grades from Sleeper once games are final.
- Live, locked and final states; Game Day cards show the line and who's covering; homepage teaser; launch article with reusable embeds.
- Fixes: mobile nav fits six tabs at 360px.
- New article: “The CTE Bankroll War” with Carl's and Anita's Week 4 tickets, now live in the Carl vs Anita tab (graded at the odds printed on each ticket).
- Official locked Week 4 final board applies to the league challenge and Carl/Anita. Bankroll War tickets, tables and max bankrolls regraded at those prices (Carl max CTE$1,513.36, Anita CTE$1,449.76).
- Fixed low-contrast intro text in Carl and Anita article heroes.
- See SPORTSBOOK.md for the weekly update workflow and backend plan.

# CTE Network v31 — ESPN meets Apple, finished

Built on the v29 redesign. Not published — deploy through your normal workflow.

## Look and feel
- Every secondary screen now matches the redesign: Teams, owner profiles, Scores, Schedule,
  Rivalries, Transactions, Activity feed, Records, League History, Carl and articles.
  Old dark/gold panels, gold labels, dark dropdowns and low-contrast grey text are gone.
- Page titles on older screens use the same headline style as Home, Standings and News.
- Articles: darker, more readable body text, cleaner lead paragraph, restyled tables;
  Anita's headline no longer appears twice.
- Automated contrast check passes on every screen at phone and desktop widths.

## Draft Central
- Rebuilt in the new design with a live 2026 draft board from Sleeper: every pick by round,
  position filters, first overall pick, biggest class, link to the draft autopsy.
- `countdown.html` and `history.html` now redirect to Draft Central and League History.
- The TV board is unchanged apart from its menu.

## Commissioner security (from v30)
- `admin.html` is no longer linked from Draft Central or the TV board and asks search
  engines not to index it. It shows a device ID so Firebase can lock draft edits to your
  phone — see SECURITY.md.

## Housekeeping
- Removed the nested v30 ZIP and ~35 unused or duplicate files (old CSS/JS versions,
  "(1)"/"(2)" copies, duplicate data files, outdated test tools and workflow).
- League logo: 3 MB PNG replaced with a 29 KB WebP.
- Cache version bumped to v31 so installed Home Screen apps pick up the changes.
- New GitHub check (`tools/check-site.py`) runs on every push: no broken links or assets,
  commissioner page stays private.
- Browser tests: `node tools/test-site.cjs` (needs Playwright) — 42 checks across 14 routes
  at 360/390/1440px, all passing with mocked Sleeper data.

## Deploy
Copy the CONTENTS of `ctenetwork-main` into the repo root. Also delete these files from the
repo, since copying won't remove them: the old CSS/JS versions listed above, `ctenetwork-v30.zip`,
`cte-league-logo.png`, `UPGRADE-v29.md`, and `.github/workflows/design-v23-review.yml`.
Easiest: delete everything except `.git`, then copy this folder in.
After deploying, reload online and reopen the Home Screen app.
