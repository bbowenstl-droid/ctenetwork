
(()=>{
  const file=(location.pathname.split('/').pop()||'index.html').toLowerCase();
  const pageMap={
    'index.html':['Home','CTE Network'], 'news.html':['News','CTE Bot'], 'article.html':['News','CTE Bot Article'],
    'scores.html':['Scores','Weekly Matchups'], 'schedule.html':['Schedule','Matchup Center'], 'matchup.html':['Matchup','Game Center'],
    'rivalries.html':['Rivalries','Annual Series'], 'standings.html':['Standings','League Table'], 'teams.html':['Teams','The 12'],
    'team.html':['Teams','Owner Profile'], 'transactions.html':['Transactions','Live from Sleeper'], 'records.html':['Records','CTE Record Book'],
    'league-history.html':['History','League Archive'], 'draft-central.html':['Draft Central','Rookie Draft']
  };
  const meta=pageMap[file]||['CTE Network','Official Home'];
  const header=document.createElement('header');header.className='app-mobile-header';header.innerHTML=`<a class="app-brand" href="index.html"><img src="cte-league-logo.png" alt="CTE"><div class="app-brand-copy"><strong>CTE NETWORK</strong><span id="appPageTitle">${meta[0]} • ${meta[1]}</span></div></a><button class="app-header-btn" id="appHeaderMore" aria-label="Open menu">☰</button>`;
  document.body.prepend(header);

  const group=(file==='index.html'||file==='')?'home':(['scores.html','schedule.html','matchup.html'].includes(file)?'scores':file==='standings.html'?'standings':(['news.html','article.html'].includes(file)?'news':'more'));
  const bottom=document.createElement('nav');bottom.className='app-bottom-nav';bottom.setAttribute('aria-label','Primary');bottom.innerHTML=`
    <a href="index.html" class="${group==='home'?'active':''}"><span class="nav-icon">⌂</span><span>Home</span></a>
    <a href="scores.html" class="${group==='scores'?'active':''}"><span class="nav-icon">🏈</span><span>Scores</span></a>
    <a href="standings.html" class="${group==='standings'?'active':''}"><span class="nav-icon">▤</span><span>Standings</span></a>
    <a href="news.html" class="${group==='news'?'active':''}"><span class="nav-icon">📰</span><span>News</span></a>
    <button type="button" id="appMoreBtn" class="${group==='more'?'active':''}"><span class="nav-icon">•••</span><span>More</span></button>`;
  document.body.append(bottom);

  const links=[
    ['teams.html','👥','Teams','Owners & rosters'],['schedule.html','📅','Schedule','Full matchup center'],['rivalries.html','🏆','Rivalries','Annual rivalry games'],['transactions.html','🔄','Transactions','Trades & waivers'],['records.html','📚','Record Book','All-time records'],['league-history.html','🕰️','History','Champions & archive'],['draft-central.html','🎙️','Draft Central','Rookie draft archive'],['sleeper-check.html','⚙️','System Check','Sleeper diagnostics']
  ];
  const back=document.createElement('div');back.className='app-more-backdrop';
  const sheet=document.createElement('section');sheet.className='app-more-sheet';sheet.setAttribute('aria-label','More CTE Network');sheet.innerHTML=`<div class="app-sheet-handle"></div><div class="app-sheet-title"><strong>CTE Network</strong><button class="app-sheet-close" aria-label="Close">×</button></div><div class="app-more-grid">${links.map(([href,icon,title,sub])=>`<a class="app-more-link ${file===href?'current':''}" href="${href}"><span class="i">${icon}</span><span><strong>${title}</strong><small>${sub}</small></span></a>`).join('')}</div><div class="app-install"><button id="appInstallBtn" style="display:none">Add CTE Network to Home Screen</button><div id="installHelp">Tip: add CTE Network to your phone's Home Screen for a full-screen app-style experience.</div></div>`;
  document.body.append(back,sheet);
  const open=()=>{back.classList.add('open');sheet.classList.add('open');document.body.style.overflow='hidden'};
  const close=()=>{back.classList.remove('open');sheet.classList.remove('open');document.body.style.overflow=''};
  document.getElementById('appMoreBtn')?.addEventListener('click',open);document.getElementById('appHeaderMore')?.addEventListener('click',open);back.addEventListener('click',close);sheet.querySelector('.app-sheet-close').addEventListener('click',close);
  addEventListener('keydown',e=>{if(e.key==='Escape')close()});

  let installPrompt=null;addEventListener('beforeinstallprompt',e=>{e.preventDefault();installPrompt=e;const b=document.getElementById('appInstallBtn');if(b)b.style.display='block'});
  document.getElementById('appInstallBtn')?.addEventListener('click',async()=>{if(!installPrompt)return;installPrompt.prompt();await installPrompt.userChoice;installPrompt=null;document.getElementById('appInstallBtn').style.display='none'});
  const isiOS=/iphone|ipad|ipod/i.test(navigator.userAgent); if(isiOS && !navigator.standalone){const h=document.getElementById('installHelp');if(h)h.textContent='iPhone: tap Share in Safari, then “Add to Home Screen” to launch CTE Network like an app.'}

  function tabs(items){const strip=document.createElement('nav');strip.className='app-tab-strip';strip.innerHTML=items.map((x,i)=>`<a href="${x[1]}" class="${i===0?'active':''}">${x[0]}</a>`).join('');header.after(strip);strip.addEventListener('click',e=>{const a=e.target.closest('a');if(!a)return;strip.querySelectorAll('a').forEach(x=>x.classList.remove('active'));a.classList.add('active')});}
  if(file==='standings.html'){
    const league=document.getElementById('content');if(league)league.id='leagueStandings';const power=document.querySelector('.power-rankings-section');if(power)power.id='powerRankings';tabs([['League','#leagueStandings'],['Power Rankings','#powerRankings']]);
  }
  if(file==='team.html'){
    tabs([['Overview','#profileOverview'],['Roster','#profileRoster'],['History','#profileHistory'],['Trades','#profileTrades']]);
    const box=document.getElementById('profile');if(box){const obs=new MutationObserver(()=>{const hero=box.querySelector('.profile-hero');if(hero)hero.id='profileOverview';const layout=box.querySelector('.profile-layout');if(layout)layout.id='profileRoster';const hist=box.querySelector('.profile-history-grid');if(hist)hist.id='profileHistory';const trades=box.querySelector('.profile-trades');if(trades)trades.id='profileTrades';const h1=box.querySelector('.profile-identity h1');if(h1)document.getElementById('appPageTitle').textContent=h1.textContent+' • Owner Profile'});obs.observe(box,{childList:true,subtree:true})}
  }
  if(file==='scores.html') tabs([['This Week','#content'],['Full Schedule','schedule.html']]);
  if(file==='schedule.html') tabs([['Schedule','#content'],['Weekly Scores','scores.html'],['Rivalries','rivalries.html']]);
  if(file==='rivalries.html') tabs([['Rivalries','.rival-grid'],['Schedule','schedule.html']]);
  if(file==='news.html') tabs([['Latest','#newsGrid'],['Standings','standings.html']]);

  if('serviceWorker' in navigator){addEventListener('load',()=>navigator.serviceWorker.register('./sw-v22.js').catch(()=>{}))}
})();
