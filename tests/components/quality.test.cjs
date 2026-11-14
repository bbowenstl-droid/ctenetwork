'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const shell=fs.readFileSync('app-v29.js','utf8');
const css=fs.readFileSync('css/cte-quality.css','utf8');
assert.match(shell,/menuButtons\.forEach\(el=>el\.setAttribute\('aria-expanded','true'\)\)/,'menu announces open state');
assert.match(shell,/menuButtons\.forEach\(el=>el\.setAttribute\('aria-expanded','false'\)\)/,'menu announces closed state');
assert.match(shell,/focusBack\?\.isConnected/,'restore focus only to mounted trigger');
assert.match(shell,/css\/cte-quality\.css\?v=1/,'shared stylesheet loaded');
assert.match(shell,/menu\.showModal\(\)/,'native modal focus trapping retained');
assert.match(css,/prefers-reduced-motion:reduce/);
assert.match(css,/forced-colors:active/);
assert.match(css,/min-height:44px/);
assert.match(css,/:focus-visible/);
for(const name of ['index.html','history-lab.html','playoff-war-room.html','news.html']){
 const html=fs.readFileSync(name,'utf8');
 assert.match(html,/<html lang="en">/,'language on '+name);
 assert.match(html,/<meta name="viewport"/,'viewport on '+name);
 assert.match(html,/href="https:\/\/api\.sleeper\.app"/,'preconnect on '+name);
 assert.match(html,/<main\b/,'main landmark on '+name);
 const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
 assert.equal(ids.length,new Set(ids).size,'duplicate IDs in '+name);
}
const index=fs.readFileSync('index.html','utf8');
assert.match(index,/loading="lazy" decoding="async"/,'noncritical images async decode');
console.log('PASS: navigation accessibility, reduced-motion, four page landmarks, unique IDs, and resource hints');
