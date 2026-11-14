'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const css=fs.readFileSync('css/cte-responsive.css','utf8');
const fixture=fs.readFileSync('tests/visual/responsive-fixture.html','utf8');
const checks=[
  ['mobile breakpoint',()=>assert.match(css,/@media\(max-width:640px\)/)],
  ['tablet breakpoint',()=>assert.match(css,/@media\(min-width:641px\)/)],
  ['desktop breakpoint',()=>assert.match(css,/@media\(min-width:1024px\)/)],
  ['grid minimum width',()=>assert.match(css,/minmax\(0,1fr\)/)],
  ['scrollable score rail',()=>assert.match(css,/\.cte2-score-rail\{[^}]*overflow-x:auto/)],
  ['safe area insets',()=>assert.match(css,/safe-area-inset-bottom/)],
  ['reduced motion',()=>assert.match(css,/prefers-reduced-motion:reduce/)],
  ['scoped CSS rules',()=>{const selectors=css.match(/(^|\})\s*[^@{}]+\{/gm)||[];assert.ok(selectors.length>10);assert.doesNotMatch(css,/(^|\})\s*(?:html|body|:root)\s*\{/m)}],
  ['viewport-fit cover',()=>assert.match(fixture,/viewport-fit=cover/)],
  ['no production integration',()=>assert.match(fixture,/\.\.\/\.\.\/css\/cte-responsive\.css/)],
  ['fixture contains key components',()=>{for(const s of ['fixture-score-rail','fixture-table','fixture-actions','cte2-dark-feature'])assert.ok(fixture.includes(s))}]
];
for(const [name,fn] of checks){fn();console.log('PASS '+name)}
console.log('11 responsive source checks passed; browser layout not yet verified');
