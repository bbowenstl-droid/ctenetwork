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
