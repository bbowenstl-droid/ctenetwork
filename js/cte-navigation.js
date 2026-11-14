/* CTE Network 2.0 — Step 9 progressive navigation enhancement.
   Runs after app-v29.js creates the shared menu. No routing/data changes. */
(function(global){
'use strict';
const groups=[
 {title:'Game day',items:[['index.html','Home'],['game-day.html','Game Center'],['scores.html','Scores'],['schedule.html','Schedule'],['standings.html','Standings'],['sportsbook.html','Sportsbook']]},
 {title:'League',items:[['teams.html','Owners & teams'],['head-to-head.html','Head-to-head'],['rivalries.html','Rivalries'],['transactions.html','Transactions'],['changes.html','Activity feed']]},
 {title:'History',items:[['records.html','Record book'],['league-history.html','League history'],['draft-central.html','Draft central']]},
 {title:'Media',items:[['news.html','Newsroom'],['carl.html',"Carl’s office"],['anita.html',"Anita’s sideline"]]}
];
const safe=s=>String(s).replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const current=()=>{const name=global.location.pathname.split('/').pop()||'index.html';return name==='article.html'?'news.html':name};
function init(doc=global.document){
 const menu=doc.getElementById('networkMenu');
 if(!menu||menu.dataset.cteNavEnhanced)return false;
 const container=menu.querySelector('.n-menu-links');
 if(!container)return false;
 const selected=current();
 container.classList.add('cte-nav-directory');
 container.innerHTML=groups.map((group,i)=>'<section class="cte-nav-group" aria-labelledby="cte-nav-heading-'+i+'"><h3 id="cte-nav-heading-'+i+'">'+safe(group.title)+'</h3><div class="cte-nav-group-links">'+group.items.map(([href,label])=>'<a href="'+safe(href)+'"'+(href===selected?' aria-current="page"':'')+'>'+safe(label)+'</a>').join('')+'</div></section>').join('');
 const head=menu.querySelector('.n-menu-head');
 const search=doc.createElement('div');search.className='cte-nav-search';
 const label=doc.createElement('label');label.setAttribute('for','cte-nav-query');label.textContent='Find a league page';
 const input=doc.createElement('input');input.id='cte-nav-query';input.type='search';input.placeholder='Search pages…';input.autocomplete='off';
 const empty=doc.createElement('p');empty.className='cte-nav-empty';empty.textContent='No matching pages.';empty.hidden=true;empty.setAttribute('role','status');
 search.append(label,input,empty);head.after(search);
 const sections=[...container.querySelectorAll('.cte-nav-group')];
 function filter(){
  const query=input.value.trim().toLocaleLowerCase();
  let any=false;
  for(const section of sections){
   let count=0;
   for(const a of section.querySelectorAll('a')){const match=a.textContent.toLocaleLowerCase().includes(query)||section.querySelector('h3').textContent.toLocaleLowerCase().includes(query);a.hidden=!match;if(match)count++}
   section.hidden=!count;any ||= !!count;
  }
  empty.hidden=any;
 }
 input.addEventListener('input',filter);
 menu.addEventListener('close',()=>{input.value='';filter()});
 menu.addEventListener('click',e=>{if(e.target.closest('.cte-nav-group a'))menu.close()});
 menu.dataset.cteNavEnhanced='true';
 return true;
}
if(typeof module==='object'&&module.exports)module.exports={groups,safe};
else init();
})(typeof window!=='undefined'?window:globalThis);
