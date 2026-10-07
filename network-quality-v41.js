/* CTE Network quality components. Uses existing data; no writes to cards or odds. */
(()=>{'use strict';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function playoffField(rows){
 const divisions=['north','south','central','littleBabies'];
 const leaders=divisions.map(d=>rows.find(r=>r.division===d)).filter(Boolean);
 if(leaders.length!==4||leaders.some(r=>!r.ownerId))return [];
 const leaderIds=new Set(leaders.map(r=>r.ownerId));
 // Preserve the live table's ordering, rather than introduce a new tiebreaker.
 const winners=rows.filter(r=>leaderIds.has(r.ownerId));
 return [...winners,...rows.filter(r=>!leaderIds.has(r.ownerId)).slice(0,2)].map((r,i)=>({...r,seed:i+1,bye:i<2,wildcard:i>=4}));
}
function splitRecords(weeks,lookup){
 const out={};
 const get=id=>out[id]||(out[id]={h2h:{w:0,l:0,t:0},median:{w:0,l:0,t:0}});
 const tally=(rec,a,b)=>rec[Math.abs(a-b)<.000001?'t':a>b?'w':'l']++;
 for(const rows of weeks){
  // A missing roster makes the median invalid; show unavailable instead of guessing.
  if(!Array.isArray(rows)||rows.length!==12||new Set(rows.map(r=>String(r.roster_id))).size!==12||rows.some(r=>r.points==null||!Number.isFinite(Number(r.points))))return null;
  const scores=rows.map(r=>Number(r.points)).sort((a,b)=>a-b),median=(scores[5]+scores[6])/2;
  const groups={};for(const r of rows){const id=lookup[String(r.roster_id)]?.ownerId;if(!id)return null;tally(get(id).median,Number(r.points),median);if(r.matchup_id!=null)(groups[r.matchup_id]||(groups[r.matchup_id]=[])).push(r)}
  for(const pair of Object.values(groups)){if(pair.length!==2)return null;const [a,b]=pair;tally(get(lookup[String(a.roster_id)].ownerId).h2h,Number(a.points),Number(b.points));tally(get(lookup[String(b.roster_id)].ownerId).h2h,Number(b.points),Number(a.points))}
 }
 return out;
}
window.CTE_Quality={playoffField,splitRecords};
const article=document.getElementById('article');
if(article&&article.querySelector('.article-header')){
 const story=(window.CTE_NEWS||[]).find(s=>s.id===new URLSearchParams(location.search).get('id'));
 if(story){
  const name=story.author||'CTE Bot',carl=/carl/i.test(name),anita=/anita|holly/i.test(name),image=carl?'concussion-carl.webp':anita?'anita-headcheck.webp':null;
  const header=article.querySelector('.article-header'),byline=document.createElement('div');byline.className='n-byline';
  const authorLink=carl?'carl.html':anita?'anita.html':'news.html';
  const date=new Date(story.date+'T12:00:00').toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'});
  const minutes=Math.max(1,Math.ceil(article.textContent.trim().split(/\s+/).length/220));
  byline.innerHTML=(image?`<img src="${image}" alt="" width="44" height="44">`:'<span class="n-author-mark" aria-hidden="true">CTE</span>')+`<div><a href="${authorLink}"><strong>${esc(anita?'Anita Headcheck':name)}</strong></a><span>${date} · ${minutes} min read</span></div>`;
  header.querySelector('.news-meta')?.remove();header.append(byline);
  for(const table of article.querySelectorAll('.article-body table')){if(table.parentElement.classList.contains('n-table-scroll'))continue;const wrap=document.createElement('div');wrap.className='n-table-scroll';wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Article data table; scroll horizontally to see all columns');table.before(wrap);wrap.append(table)}
  const related=(window.CTE_NEWS||[]).filter(s=>s.id!==story.id).sort((a,b)=>Number(b.author===story.author)-Number(a.author===story.author)||b.date.localeCompare(a.date)).slice(0,3);
  const section=document.createElement('section');section.className='n-related';section.setAttribute('aria-labelledby','relatedHeading');section.innerHTML=`<div class="n-section-head"><h2 id="relatedHeading">Keep the receipts coming.</h2></div><div class="n-related-grid">${related.map(s=>`<a href="article.html?id=${encodeURIComponent(s.id)}"><span class="n-label">${esc(s.category)} · ${esc(s.date)}</span><h3>${esc(s.title)}</h3></a>`).join('')}</div>`;article.after(section);
 }
}
})();
