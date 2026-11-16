# CTE Network 2.0 — Brand & Design System (Step 5)

Status: **applied site-wide on `feature/site-glowup` (2026-11-16 glow-up)** to every shell page (`body.n-app` / `body.n-legacy`). Not applied to `admin.html`, `tv.html`, `404.html`, `offline.html`, the redirect stubs or the generated `state-of-union.html`.
Source audit: `network-v29.css`, `taste-v40.css`, `design-v23.css`. Theme files: `css/cte-glow.css` (hand-written) and `css/cte-glow-legacy.css` (generated).

## Identity
CTE Network is an independent, editorial-first dynasty fantasy sports publication. Aim for the clarity of a sports newsroom, the utility of a scoreboard, and the irreverence of the league's actual reporting. The look comes from the league crest: **black, gold and brushed steel under stadium lights**. Avoid neon gradients, gratuitous glassmorphism, generic AI sports art and excessive card nesting. Gold glow is reserved for the hero, the champion's trophy and "next/now" states — not every card.

## Color
Dark-first and dark-only: there is one theme, so every screenshot, share and phone looks the same. Use the semantic `--g-*` tokens in new components; the older `--n-*`, `--t-*`, `--cte2-*`, `--gold/--bg/--panel` families are re-pointed to them inside the shell, so existing components follow automatically.

| Token | Value | Purpose |
|---|---|---|
| `--g-canvas` | #0a0b0d | Page background |
| `--g-surface` | #131519 | Cards and content |
| `--g-raised` | #1a1d23 | Controls, table heads, hover |
| `--g-sunken` | #0e1013 | Footnotes, rules panels |
| `--g-ink` | #f4f1ea | Primary text (16.2:1 on surface) |
| `--g-muted` | #aab0ba | Secondary text (8.4:1) |
| `--g-faint` | #8f96a1 | Labels and metadata (6.1:1) — minimum for text |
| `--g-line` / `--g-line-strong` | #2a2e36 / #3a3f49 | Dividers / control borders |
| `--g-gold` | #e6b84a | Brand accent, links, primary buttons (9.9:1) |
| `--g-gold-bright` | #f6d57a | Focus ring, emphasis on gold-washed areas |
| `--g-gold-deep` | #b98b24 | Button borders, gradients (never text) |
| `--g-gold-wash` | rgba(230,184,74,.12) | Selected / alert backgrounds |
| `--g-win` / `--g-live` | #62d896 | Wins, LIVE (with a text label) |
| `--g-loss` | #ff7a85 | Losses, movement down (with text/arrow) |
| `--g-warn` | #f2c46b | Unresolved data |

Text on gold is always `#171204`. Gold never means both "brand" and "win" in the same component: results carry W/L text, arrows or a record. Do not rely on color alone. The sportsbook keeps its own `--bk-*` palette (it was already dark) and its red brand mark.

### Team colors
`js/cte-teams.js` assigns each franchise one fixed color (12 hues, each ≥4.5:1 on `--g-raised`) and shows the owner's Sleeper avatar inside a ring of that color (`CTE_Teams.avatar(ownerId)`, initials underneath when the image is missing or blocked). A franchise keeps its color through a manager change (Jeremy→Isaiah, Tyler→Carter). Sleeper has no team colors; these are CTE's. Use the color for rings, 3–4px accent bars and chart segments — never as text on a team-colored background.

## Typography
- Display: **Big Shoulders Display 800** (self-hosted, 14 KB, `assets/fonts/`, OFL) for page titles, section heads, the Game Day header, season numerals and countdowns. Always uppercase, line-height .9–1.0. Fallback `Arial Narrow`/Impact; `font-display:swap`.
- UI/body: `Geist`, system UI fallback (unchanged).
- Numbers: `Geist Mono`; always `font-variant-numeric: tabular-nums`. Live scores 22–25px.
- Body 16px / 1.6; longform max 68ch; article headlines keep the reading face, not the display face.
- Supporting metadata minimum 10.5px **bold uppercase** (tags/kickers) or 11.5px regular; never below `--g-faint` contrast.
- Sentence case for navigation and actions; uppercase only for display type and brief kicker labels.

## Spacing and shape
- 4px base grid: 4, 8, 12, 16, 24, 32, 48, 64.
- Compact rows: 8–12px internal gaps; cards: 16–24px padding.
- Borders: 1px solid semantic border.
- Radius: 8px controls, 12px small cards, 16px standard cards, 22px feature cards.
- Shadows: very subtle, never substitute for clear borders.

## Layout
- Content max 1260px; editorial text max 68ch.
- Mobile <= 640px: one column, horizontal scoreboard rail, 16px gutters.
- Tablet 641–1023px: flexible two-column only when content allows.
- Desktop >= 1024px: navigation + main, 24–42px gutters.
- Never truncate essential scores or owners; provide accessible horizontal scroll for wide tables.

## Components
Buttons: primary (gold gradient, dark text), secondary (raised neutral), text; minimum 44x44px hit target.
Scoreboard / Game Day card (`.g-gd-card`): state tag is explicit FINAL / LIVE / UPCOMING; leader marked by a caret and brighter score; win-outlook bar is two team-colored segments with the percentages in text and an `aria-label`.
Tags (`.g-tag`): status only — `is-live`, `is-final`, `is-alert` (gold fill), `is-close`, `is-mine`.
Stat tile (`.g-gd-stat`): kicker, value, detail, 4px team/gold bar.
Cards: surface + 1px line + faint top highlight; champion/next cards may add a gold border and corner glow.
Tables: `.g-table` in a `.g-table-wrap` scroll region (keyboard focusable); numeric alignment, tabular figures.
Grid cell (`.g-h2h-cell`): 48x44px button; gold = winning record, soft red = losing, neutral = even, outlined dot = never met; the record text carries the meaning.
Avatars: `.g-avatar` (26 / 36 / 56px).
Forms: explicit labels; dark `color-scheme` controls; accessible focus ring.
Articles: eyebrow, headline, dek, author/date, body, sources, related stories.

## Motion
Short and purposeful, and only inside `@media (prefers-reduced-motion: no-preference)`: Game Day cards rise in once (not on every score poll), the LIVE dot pulses, a changed score bumps, outlook bars ease to their new width, the champion card gets one sheen pass, the hero crest breathes. No scroll-jacking, no parallax, nothing that hides content until it animates.

## Interaction and accessibility
- Visible keyboard focus: 3px `--g-gold-bright` outline with 3px offset.
- Contrast targets: WCAG AA (4.5:1 body, 3:1 large text and nontext UI). Test actual combinations before release.
- Minimum 44px interactive targets; touch-first navigation.
- Honor `prefers-reduced-motion`; avoid hover-only functionality.
- Do not convey win/loss/live solely through color.
- Respect dynamic text sizes and safe-area insets.

## Editorial imagery
Real team/owner imagery and verified league artifacts take priority. Major feature artwork may be expressive, but must not fabricate match results or owner likenesses. No watermarked stock photos. Keep article imagery consistent in aspect ratio and captioning.

## How the theme is applied (and rolled back)
1. The older stylesheets stay in place and untouched. `css/cte-glow-legacy.css` is **generated** from them by `node tools/theme/build-glow-legacy.cjs`: for each rule that hard-codes a light-shell color it emits the same selector with only that color moved onto the dark scale. Re-run it after editing any source sheet; `--check` (run by the tests) fails if it is stale.
2. `css/cte-glow.css` loads last: tokens, shell, shared components, the new pages and motion.
3. Both are linked in every shell page's `<head>` (no flash of the old theme); `app-v29.js` inserts its late sheets *before* them and adds them itself if a page forgot.
4. Rollback: remove the two `<link>` tags and the fallback injection in `app-v29.js`; the light shell returns unchanged.
5. Changes to brand palette or typography require an entry in DECISIONS.md.

## QA checklist
- Desktop and mobile screenshots of homepage, news, standings, team profiles, rivalries, records, sportsbook.
- Color contrast check for every status, button, link, and muted text.
- Keyboard tab order and focus visibility.
- 320, 375, 390, 430, 768, 1280px viewport checks (axe + overflow), via `tools/qa/sleeper-fixtures.cjs` when Sleeper is unreachable.
- Reduced motion and high zoom.
- No light-shell surface left behind on a themed page (white panels, grey-on-black text).
