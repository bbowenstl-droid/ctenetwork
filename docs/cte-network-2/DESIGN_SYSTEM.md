# CTE Network 2.0 — Brand & Design System (Step 5)

Status: specification approved for implementation review; **not globally applied**.
Source audit: `network-v29.css`, `taste-v40.css`, `design-v23.css`.

## Identity
CTE Network is an independent, editorial-first dynasty fantasy sports publication. Aim for the clarity of a sports newsroom, the utility of a scoreboard, and the irreverence of the league's actual reporting. Avoid neon gradients, gratuitous glassmorphism, generic AI sports art, heavy glow, and excessive card nesting.

## Color
Use semantic tokens rather than literal hex values in new components.

| Token | Light | Dark feature | Purpose |
|---|---|---|---|
| canvas | #f5f5f7 | #0e1013 | Page background |
| surface | #ffffff | #191d22 | Cards and content |
| ink | #14161a | #f5f3ee | Primary text |
| muted | #626770 | #bac2cc | Secondary text |
| border | #d9dce1 | #343d47 | Dividers |
| accent | #b8222f | #f06b78 | Links, emphasis, focus |
| accent-strong | #a11d2a | #ff9ca5 | High-contrast interactive accents |
| positive | #16794a | #8bd9a4 | Wins and verified positive status |
| caution | #825300 | #f2c46b | Warnings and unresolved data |

Brand red should never mean both “live” and “loss.” Live = positive green plus explicit LIVE label; loss = text/record semantics. Do not rely on color alone.

## Typography
- Display/UI: `Geist`, system UI fallback. No network font requirement.
- Numbers: `Geist Mono`, monospace fallback; always use `font-variant-numeric: tabular-nums`.
- Headline weight 750–850; tight tracking (-0.035em), 1.05–1.15 line-height.
- Body 16px / 1.6; longform max 68ch.
- Score labels 12–13px; supporting metadata minimum 12px unless decorative/nonessential.
- Headline scale: 48/40/32/24/20px desktop; clamp for mobile. Do not use giant display text on small devices.
- Sentence case for navigation and actions; uppercase only for brief kicker labels.

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

## Components (Step 6 implementation contract)
Buttons: primary (brand red), secondary (neutral), text; disabled state; minimum 44x44px hit target.
Scoreboard: matchup state explicitly FINAL/LIVE/UPCOMING; no inferred result from incomplete data.
Cards: standard, feature, statistic, article; consistent radius and border.
Tables: numeric alignment, tabular figures, sticky header only when useful.
Badges: reserved for actual statuses; no decorative badge overload.
Links: visible affordance, underlined in longform.
Forms: explicit labels and errors; accessible focus ring.
Articles: eyebrow, headline, dek, author/date, body, sources, related stories.

## Interaction and accessibility
- Visible keyboard focus: 3px accent outline with 3px offset.
- Contrast targets: WCAG AA (4.5:1 body, 3:1 large text and nontext UI). Test actual combinations before release.
- Minimum 44px interactive targets; touch-first navigation.
- Honor `prefers-reduced-motion`; avoid hover-only functionality.
- Do not convey win/loss/live solely through color.
- Respect dynamic text sizes and safe-area insets.

## Editorial imagery
Real team/owner imagery and verified league artifacts take priority. Major feature artwork may be expressive, but must not fabricate match results or owner likenesses. No watermarked stock photos. Keep article imagery consistent in aspect ratio and captioning.

## Migration and guardrails
1. Keep `network-v29.css` and `taste-v40.css` active until page-by-page migration.
2. New `css/cte-tokens.css` defines a scoped `cte2-` token namespace and is **not yet loaded**.
3. Do not globally replace `--gold`, `--silver`, `--bg` or other legacy tokens; TV/admin and older views may rely on them.
4. Step 6 creates components using the new tokens; Step 8 removes redundant overrides only after visual regression testing.
5. Changes to brand palette or typography require an entry in DECISIONS.md.

## QA checklist for Step 6/8
- Desktop and mobile screenshots of homepage, news, standings, team profiles, rivalries, records, sportsbook.
- Color contrast check for every status, button, link, and muted text.
- Keyboard tab order and focus visibility.
- 320px, 375px, 768px, 1024px, 1440px viewport checks.
- Reduced motion and high zoom.
- No unintentional dark/gold styling inherited from older pages.
