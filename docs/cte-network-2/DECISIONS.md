# Architecture and commissioner decisions

- 2026-11-14: Keep existing HTML/CSS/JavaScript stack; do not rebuild in React or Next.js without new evidence.
- 2026-11-14: Preserve URLs and current functionality; consolidate shared components gradually.
- 2026-11-14: Individual **owner** and continuous **franchise** records are separate.
- 2026-11-14: Jeremy managed 2025 Weeks 1–3; Isaiah began Week 4, same franchise.
- 2026-11-14: Tyler managed roster 5 in 2025; Carter took over in 2026.
- 2026-11-14: Do not treat median wins as head-to-head wins.
- 2026-11-14: A standings rank is not a postseason finish.
- 2026-11-14: Unpaired postseason roster entries are not opponent matchups.
- 2026-11-14: Use feature branches; merging and deployment require separate authorization.
- 2026-11-14: Step 5 brand uses off-white editorial canvas, charcoal feature surfaces, Geist typography, and red accent; semantic tokens are scoped under `--cte2-` and not loaded until Step 6.
- 2026-11-14: Step 6 components are opt-in and scoped under `.cte2`; legacy pages stay unchanged. Renderers escape external text and require explicit game status.
- 2026-11-14: Step 7 uses mobile-first 640/1024px breakpoints, independently scrollable score rails and tables, and opt-in CSS only. Browser QA remains required.
- 2026-11-14: Step 8 introduces a narrow opt-in CSS compatibility bridge on four pages; no legacy stylesheet deletion until visual regression evidence exists.
- 2026-11-14: Step 9 preserves the existing shared navigation shell and dialog behaviors while progressively adding grouped searchable destinations. No route changes.

- 2026-11-14 Work handoff supersedes previous stop/approval rules: finish roadmap autonomously; production authorized only after passing release gates.
- Consolidate on a release branch descended from Step 10; preserve stacked drafts, review final diff against current main, and retain rollback SHA.
- Keep GitHub Pages hosting and existing Firebase architecture unless investigation establishes a reason to change. Firebase security configuration requires verified project access before release.
