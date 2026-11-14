# Step 30 — Performance and accessibility

## Implemented in this branch (partial; audit remains open)

- The shared league menu now synchronizes `aria-expanded` across its launch buttons on open and close, and only attempts to restore focus to an attached trigger. Native `dialog.showModal()` retains Escape and focus trapping.
- Added `css/cte-quality.css` for consistent high-visibility keyboard focus, minimum 44px dialog controls, reduced motion, forced-colors visibility, and layout containment. This is appended by the shared shell and targets the current `n-app` and `n-legacy` layouts.
- Added resource preconnect to `https://api.sleeper.app` for homepage, newsroom, History Lab and Playoff War Room (verified Sleeper API origin).
- Homepage noncritical media talent portraits retain lazy loading and decode asynchronously.
- Added source regression checks for menu state, reduced motion, four core page landmarks and duplicate IDs, and a dedicated PR workflow.

## What remains before Step 30 can be called fully complete
- Browser-based accessibility audit with axe/Lighthouse across new and legacy pages.
- Color contrast evaluation with actual computed styles, screen reader testing, forced-colors testing, 200% zoom, and keyboard-only navigation.
- Full Core Web Vitals measurements (LCP, CLS, INP) on desktop and emulated mobile, plus JS/CSS request profiling.
- Performance budget and safe lazy-loading/asset bundling strategy. The multiple blocking newsroom JS files remain in place because changing their loading order without browser coverage risks regressions.
- Validate offline/PWA caching of `css/cte-quality.css` and new production assets.
- Test 320px, 375px, 390px, 768px, 1024px and 1440px layouts, critical forms, tables, dialogs and all new dashboard features.
- Release still blocked by unverified Firebase security/deployed configuration; no production deployment.

## How to verify
```
node --check app-v29.js
node tests/components/quality.test.cjs
node tests/components/navigation.test.cjs
python tools/check-site.py
```

**Tests for code structure are not substitutes for browser and assistive-technology audits.**
