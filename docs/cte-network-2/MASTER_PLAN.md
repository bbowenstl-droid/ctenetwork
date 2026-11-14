# CTE Network 2.0 — Master Plan

Complete remaining steps under the 2026-11-14 Work handoff authorization. Production requires passing all release gates.

| Phase | Steps | Scope |
|---|---|---|
| Audit and architecture | 1–4 | Audit, architecture, data integrity, development infrastructure |
| Design | 5–8 | Brand, components, responsiveness, cleanup |
| Homepage and navigation | 9–12 | Navigation, homepage, contextual content, links |
| History and profiles | 13–17 | Historical data, owners, rivalries, records, honors |
| Engagement | 18–22 | Awards, pick'em, leaderboards, polls, reactions |
| Analytics | 23–26 | Trade ledger, trade trees, playoffs, what-if |
| Media and admin | 27–29 | Newsroom, media hub, commissioner tools |
| QA and release | 30–32 | Accessibility, regression, launch |

## Release policy
1. Read PROGRESS.md and DECISIONS.md before starting.
2. Work on a dedicated branch, not main.
3. Add tests for any changed calculation.
4. Report what changed, test evidence, and remaining limitations.
5. Commissioner release authorization is recorded; merge/deploy only after all release gates pass.

## Source-of-truth order
Sleeper provider data for transactions, drafts, matchups, standings; CTE-specific owner attribution and editorial facts from reviewed configuration; computed statistics from reproducible algorithms. Preserve raw source IDs and distinguish franchise vs person.
