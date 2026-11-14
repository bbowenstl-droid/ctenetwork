'use strict';
const fs=require('node:fs');
const assert=require('node:assert/strict');
const bridge=fs.readFileSync('css/cte-legacy-bridge.css','utf8');
const tokens=fs.readFileSync('css/cte-tokens.css','utf8');
const pages=['index.html','news.html','standings.html','records.html'];
assert.match(bridge,/body:is\(\.n-app,\.n-legacy\)/);
assert.match(bridge,/--n-red:var\(--cte2-accent\)/);
assert.match(bridge,/prefers-reduced-motion:reduce/);
assert.doesNotMatch(bridge,/(^|\})\s*(?:html|body|\*|:root)\s*\{/m);
for(const page of pages){
  const html=fs.readFileSync(page,'utf8');
  const a=html.indexOf('taste-v40.css');
  const b=html.indexOf('css/cte-tokens.css');
  const c=html.indexOf('css/cte-legacy-bridge.css');
  assert.ok(a>=0&&b>a&&c>b,page+' stylesheet order');
  assert.equal(html.split('css/cte-legacy-bridge.css').length-1,1,page+' duplicate bridge');
  assert.match(html,/class="n-(?:app|legacy)"/,page+' missing body scope');
  console.log('PASS '+page+' opt-in order and scope');
}
assert.match(tokens,/--cte2-accent:/);
console.log('PASS bridge selector and token guardrails');
