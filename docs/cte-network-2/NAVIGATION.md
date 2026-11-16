# Step 9 — Navigation redesign

Status: implemented in shared shell, browser and CI verification pending.

## Changes
- Existing topbar, desktop rail, modal dialog, skip link, owner preference, and install workflow are retained.
- Shared `app-v29.js` progressively loads `css/cte-navigation.css` and `js/cte-navigation.js`.
- Modal links are grouped into Game day, League, History, and Media, with a search input filtering destinations.
- Active page gets `aria-current="page"`; buttons and menu links retain 44px touch targets.
- On narrow screens, the directory becomes one column. Keyboard search is native input; Escape and focus restoration remain handled by the existing dialog.
- No URL routes, live data, or league logic changed.

## Regression checklist
1. Open/close menu from topbar and sidebar on iPhone Safari and desktop browsers.
2. Search for Records, Carl, Game Center; verify filtering and empty state.
3. Navigate to an active link; verify current-page highlighting.
4. Escape, outside-click close, and focus restoration.
5. Verify owner selection and install prompt remain usable.
6. Check navigation on modern and legacy pages, including 320px width and 200% zoom.
7. Confirm no duplicate navigation or horizontal overflow.

## Rollback
Remove the two progressive resource injections from `app-v29.js`. The previous menu links remain in its original template and will be displayed again. New CSS and JS may remain unreferenced.

## Caveats
CI and real browser checks are not yet confirmed. Existing menu dialog styling may require follow-up visual tuning. No production merge or deployment authorized.
