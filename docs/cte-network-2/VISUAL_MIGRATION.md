# Step 8 — Visual consistency and CSS consolidation

Status: **partial migration implemented**, browser regression and CI verification pending.

## Scope and decisions
- Retain the existing `network-v29.css`, `taste-v40.css`, and older page-specific styles. Deleting them now would risk breaking legacy pages.
- Add a narrowly scoped `css/cte-legacy-bridge.css` after the existing stylesheet stack.
- Opt in **four representative pages**: `index.html`, `news.html`, `standings.html`, `records.html`. This covers modern `n-app` and legacy `n-legacy` layouts.
- Align page palette aliases (`--n-*`, `--t-red`), keyboard focus, typography, and tabular numeric formatting to Step 5 tokens.
- No data processing, routing, or JavaScript changed. No changes to other pages.
- This is **not** full CSS consolidation. Old conflicting selectors remain and need page-by-page visual validation before cleanup.

## Files
- `css/cte-legacy-bridge.css` — minimal, opt-in compatibility layer.
- `css/cte-tokens.css` — shared semantic palette.
- `tests/components/legacy-bridge.test.cjs` — stylesheet ordering and scope assertions.
- `.github/workflows/cte-legacy-bridge.yml` — CI checks.

## Required verification before merge
1. Run `node tests/components/legacy-bridge.test.cjs` and existing component tests.
2. Compare 320, 375, 768, 1024, and 1440px screenshots for all four pages.
3. Test keyboard focus and contrast for links, primary buttons, badges, tables, and active navigation.
4. Verify `n-app` homepage/news/standings and `n-legacy` records layout, including loading/error states.
5. Test browser cache and CSS load order.
6. Check that article colors and dark feature blocks are unchanged unless intentionally overridden.
7. Check real iPhone Safari and desktop Chrome.
8. Expand the bridge to remaining pages **only after** passing these checks.

## Rollback
Each page has two added stylesheet links. Remove those links to revert its migration independently. Remove the bridge file only after all pages stop referencing it. Never remove the preexisting Taste stylesheet as part of this rollback.

## Known risks
- CSS variable inheritance and specificity may differ between old and new pages.
- Existing hardcoded colors are not automatically harmonized by tokens.
- Without rendered screenshots, visual parity is not certified.
- This PR stacks on unmerged Steps 4–7; merge order matters.
