#!/usr/bin/env bash
# Lighthouse (mobile + desktop) for key CTE pages. QA only. Expects serve-pages.cjs on :8080.
# Firebase hosts are blocked so no audit touches the production database.
set -u
OUT="${OUT:-qa-out}/lighthouse"; mkdir -p "$OUT"
BASE="${BASE:-http://localhost:8080/ctenetwork/}"
PAGES="${LH_PAGES:-index.html news.html history-lab.html playoff-war-room.html sportsbook.html standings.html search.html media-hub.html}"
BLOCK='*firebaseio.com*,*firebasedatabase.app*,*identitytoolkit.googleapis.com*,*securetoken.googleapis.com*,*accounts.google.com*'
echo "| Page | Form | Perf | A11y | Best | SEO | LCP | CLS | TBT |" > "$OUT/summary.md"
echo "|---|---|---|---|---|---|---|---|---|" >> "$OUT/summary.md"
for p in $PAGES; do
  for form in mobile desktop; do
    extra=""; [ "$form" = desktop ] && extra="--preset=desktop"
    name="${p%.html}-$form"
    npx --yes lighthouse@12 "$BASE$p" $extra --quiet --chrome-flags="--headless=new --no-sandbox" \
      --blocked-url-patterns="$BLOCK" --output=json --output-path="$OUT/$name.json" >/dev/null 2>&1 || { echo "| $p | $form | error |||||||" >> "$OUT/summary.md"; continue; }
    node -e '
      const r=require(process.argv[1]);const c=r.categories,a=r.audits;const s=k=>c[k]?Math.round(c[k].score*100):"-";
      console.log(`| ${process.argv[2]} | ${process.argv[3]} | ${s("performance")} | ${s("accessibility")} | ${s("best-practices")} | ${s("seo")} | ${a["largest-contentful-paint"].displayValue} | ${a["cumulative-layout-shift"].displayValue} | ${a["total-blocking-time"].displayValue} |`);
    ' "$PWD/$OUT/$name.json" "$p" "$form" >> "$OUT/summary.md"
  done
done
cat "$OUT/summary.md"
