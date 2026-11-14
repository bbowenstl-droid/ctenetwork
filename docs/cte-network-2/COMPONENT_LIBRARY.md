# Step 6 — Shared Component Library

**Status:** implemented on feature branch; not loaded by any live page.

## Files
- `css/cte-tokens.css` — prerequisite semantic tokens (Step 5).
- `css/cte-components.css` — opt-in scoped primitives.
- `js/cte-components.js` — dependency-free safe HTML renderers.
- `tests/components/components.test.cjs` — offline rendering and security assertions.
- `.github/workflows/cte-components.yml` — CI on component-related PRs.

## Available primitives
- Buttons: primary, secondary, text, disabled; links restricted to relative paths or HTTPS.
- Cards: standard, feature, stat, article.
- Status: FINAL, LIVE, UPCOMING, warning style; textual state mandatory.
- Scoreboard: explicit state, no score inferred for upcoming games, tabular score figures.
- Tables: horizontal scroll, numeric alignment, escaped cells.
- Article header: category, headline, dek, byline, date.
- Field styles: labels, inputs, errors.
- Layout: stack, row, responsive cards, dark-feature theme.

## Opt-in integration
Load in order on a future migrated page:
```html
<link rel="stylesheet" href="/css/cte-tokens.css">
<link rel="stylesheet" href="/css/cte-components.css">
<script defer src="/js/cte-components.js"></script>
```
Wrap component markup in a `class="cte2"` ancestor. The `cte2-dark-feature` class may be placed on the same ancestor to switch its semantic colors. No existing page has been modified to load these files.

For browser use, `CTE2Components.scoreboard({week:10,state:'live',home:{name:'A',score:100},away:{name:'B',score:99}})` returns escaped HTML. Callers should mount only into their own designated container; never mix provider-supplied HTML into component markup. API renderers intentionally do not fetch data.

## Known limitations
- This is a foundational library, not a completed migration of existing pages.
- The table renderer does not yet implement sorting or pagination.
- Forms have CSS but no validation or submission framework.
- The library does not implement interactive data updates or accessible live-region announcements; those belong to consuming views.
- Browser screenshots, cross-device tests, and CI execution still need verification.
- HTML output from renderers is escaped, but callers must not concatenate untrusted raw HTML around it.

## Verification
Run `node tests/components/components.test.cjs` and `node --check js/cte-components.js`. Confirm GitHub Actions results before merging. Preserve main and production until separately approved.
