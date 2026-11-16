# Step 7 — Responsive foundations

Status: implemented in isolated feature branch, **browser verification pending**.

## Deliverables
- `css/cte-responsive.css`: opt-in mobile-first layout utilities scoped to `.cte2`.
- `tests/visual/responsive-fixture.html`: standalone fixture with illustrative matchup cards, table, buttons, and dark feature.
- `tests/components/responsive.test.cjs`: source-level breakpoint and overflow checks.
- `.github/workflows/cte-responsive.yml`: CI checks on relevant pull requests.

## Breakpoints
| Width | Behavior |
|---|---|
| 320–640px | One-column layout; swipeable score rail; full-width actions; 16px card padding |
| 641–1023px | Two-column grids; score rail cards at 280px; wrap actions |
| 1024px and up | Three-column option; 300px score cards; desktop-only content enabled |

No viewport-specific hard-coded body widths. Components use `minmax(0,1fr)`, `min-width:0`, and scroll containers to avoid accidental page-wide horizontal overflow.

## Testing checklist
1. Open `tests/visual/responsive-fixture.html` on a local server.
2. Test 320, 375, 390, 640, 641, 768, 1024, 1280, and 1440 CSS-pixel widths.
3. Verify there is no document-level horizontal overflow; the scoreboard rail and wide table must scroll **within their own regions**.
4. Verify long team names wrap; numeric scores do not clip.
5. Verify buttons and form fields have >=44px touch targets.
6. Verify keyboard focus, table scroll with keyboard, reduced-motion behavior, and zoom to 200%.
7. Verify iOS safe-area padding in portrait and landscape.
8. Capture screenshots and compare after Step 8 integration.

## Loading order for future migrated pages
```html
<link rel="stylesheet" href="/css/cte-tokens.css">
<link rel="stylesheet" href="/css/cte-components.css">
<link rel="stylesheet" href="/css/cte-responsive.css">
```
Do not load these files globally before reviewing each page's layout. The current production pages are unchanged.

## Limits
Source tests cannot prove actual rendered layout. No browser screenshot testing or cross-device execution has been performed in this step. Existing legacy pages still use their own responsive CSS until migrated.
