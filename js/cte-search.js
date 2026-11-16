(function(){
 'use strict';
 const e=CTE_UI.esc,host=document.getElementById('searchResults'),input=document.getElementById('siteSearch'),status=document.getElementById('searchStatus');
 const pages=[['Head-to-head grid','head-to-head.html','all-time series every team versus franchise manager rivalry record'],['Trophy room','trophy-room.html','champion toilet bowl last place trophy awards honors hardware'],['Key dates','calendar.html','calendar trade deadline playoffs championship rookie draft ics subscribe'],['League Lounge','league-lounge.html','pickem polls leaderboard owners'],['Media Hub','media-hub.html','Carl Anita coverage'],['History Lab','history-lab.html','owner legacy trade trees records fame shame what if'],['Playoff War Room','playoff-war-room.html','playoff odds simulation clinch division wildcard'],['Game Center','game-day.html','scores matchups live'],['Standings','standings.html','division playoff median'],['Record book','records.html','history records'],['Draft Central','draft-central.html','draft picks rookies'],['Trade history','transactions.html','transactions moves'],['Rivalries','rivalries.html','head to head history'],['State of the Union','state-of-union.html','trade trees league history special report'],['Carl’s office','carl.html','Concussion Carl picks media'],['Anita’s sideline','anita.html','Anita Headcheck media']].map(([title,href,keywords])=>({title,href,keywords,category:'League page'}));
 let owners=CTE2Context.ownerSearchItems(CTE_LEAGUE_DATA);
 const stories=(window.CTE_NEWS||[]).map(s=>({...s,href:s.id==='2026-state-of-the-union'?'state-of-union.html':'article.html?id='+encodeURIComponent(s.id)}));
 let items=[...pages,...owners,...stories];input.value=new URLSearchParams(location.search).get('q')||'';
 function render(){const result=CTE2Context.search(items,input.value);status.textContent=result.length+' results';host.innerHTML=result.length?result.map(x=>'<a class="cte-explore-result" href="'+e(x.href)+'"><small>'+e(x.category||'Story')+'</small><h2>'+e(x.title)+'</h2><p>'+e(x.excerpt||x.keywords||'')+'</p></a>').join(''):'<p>No matches. Try an owner, a player name, or “trade”.</p>';const u=new URL(location.href);if(input.value)u.searchParams.set('q',input.value);else u.searchParams.delete('q');history.replaceState(null,'',u);}
 input.addEventListener('input',render);render();
 const freshness=document.getElementById('searchFreshness');freshness.textContent='Refreshing current team names… Search is ready.';
 const cfg=CTE_LEAGUE_DATA.league.seasons[CTE_LEAGUE_DATA.league.currentSeason];
 CTE_Sleeper.getLeagueSnapshot(cfg.sleeperLeagueId,{fresh:true}).then(snapshot=>{
  const lookup=CTE_LeagueEngine.buildRosterLookup(snapshot.users,snapshot.rosters,cfg.sleeperUserMap||{},cfg.rosterOwnerMap||{});
  owners=CTE2Context.ownerSearchItems(CTE_LEAGUE_DATA,lookup);items=[...pages,...owners,...stories];render();
  freshness.textContent='Team names refreshed from Sleeper. Recorded names remain searchable.';
 }).catch(()=>{freshness.textContent='Current team names are unavailable. Search still includes recorded team names and the article archive.';});
})();
