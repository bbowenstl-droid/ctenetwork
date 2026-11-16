#!/usr/bin/env bash
# Rebuild branch preview/site = current release branch + PREVIEW banner/noindex on every page.
# For the separate ctenetwork-preview repo only; never merge preview/site anywhere.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"
git diff --quiet && git diff --cached --quiet || { echo "Working tree not clean"; exit 1; }
git checkout -q -B preview/site release/cte-network-2-completion
cp tools/qa/preview-banner.js js/cte-preview-banner.js
python3 - <<'PY'
import glob
for f in glob.glob('*.html'):
    s = open(f).read()
    if '</head>' in s and 'cte-preview-banner.js' not in s:
        open(f, 'w').write(s.replace('</head>', '<script src="js/cte-preview-banner.js"></script></head>', 1))
# 404.html uses <base href="/ctenetwork/">; point it at the preview project path.
s = open('404.html').read().replace('<base href="/ctenetwork/">', '<base href="/ctenetwork-preview/">')
open('404.html', 'w').write(s)
PY
git add -A js/cte-preview-banner.js *.html
git commit -q -m "PREVIEW ONLY: banner and noindex for ctenetwork-preview (do not merge)"
echo "preview/site ready at $(git rev-parse --short HEAD); push with: git push preview preview/site:main"
git checkout -q release/cte-network-2-completion
