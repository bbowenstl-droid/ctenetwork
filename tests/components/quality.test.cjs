'use strict';
const assert=require('node:assert/strict');
const fs=require('node:fs');
const shell=fs.readFileSync('app-v29.js','utf8');
const css=fs.readFileSync('css/cte-quality.css','utf8');
assert.match(shell,/menuButtons\.forEach\(el=>el\.setAttribute\('aria-expanded','true'\)\)/,'menu announces open state');
assert.match(shell,/menuButtons\.forEach\(el=>el\.setAttribute\('aria-expanded','false'\)\)/,'menu announces closed state');
assert.match(shell,/focusBack\?\.isConnected/,'restore focus only to mounted trigger');
assert.match(shell,/css\/cte-quality\.css\?v=\d+/,'shared stylesheet loaded');
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
// 2026-11-15 contrast regressions found by axe in release QA.
const lum=h=>{const c=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:((v+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]};
const ratio=(a,b)=>{const [x,y]=[lum(a),lum(b)].sort((p,q)=>q-p);return (x+.05)/(y+.05)};
for(const [sel,fg,bg] of [['--n-muted:#','686b71','f5f5f7'],['.matchup-week { color:#','8a6414','ffffff'],['.rivalry-meeting .winner { color:#','1f7a43','ffffff'],['.bk-colhead { color:#','8d94a0','14171d'],['.tx-card .tx-status { color:#','9aa0aa','11161d']]){
  assert.ok(css.includes(sel+fg),'contrast override present: '+sel+fg);
  assert.ok(ratio(fg,bg)>=4.5,'AA contrast '+fg+' on '+bg);
}
assert.match(css,/\.rivalry-meeting \{ background:#ffffff/,'rivalry timeline rows no longer dark-on-dark');
assert.match(fs.readFileSync('rivalry.html','utf8'),/<h1 class="cte-detail-title">/,'rivalry detail has a page h1');
for(const f of ['admin.html','tv.html'])assert.match(fs.readFileSync(f,'utf8'),/<html lang="en">/,f+' declares language');
console.log('PASS: navigation accessibility, reduced-motion, four page landmarks, unique IDs, resource hints, AA contrast overrides and detail h1');
