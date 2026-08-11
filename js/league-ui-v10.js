// CTE League UI v10 - team profiles + live sync
(function(){
'use strict';
const data=()=>window.CTE_LEAGUE_DATA;
function owner(id){return data()?.owners?.[id]||{id,name:id||'Unknown',currentTeamName:''}}
function divisionName(id){return data()?.divisions?.[id]?.name||id}
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))}
function nav(active){
 const items=[['index.html','HQ','home'],['scores.html','Scores','scores'],['standings.html','Standings','standings'],['teams.html','Teams','teams'],['transactions.html','Transactions','transactions'],['records.html','Records','records'],['league-history.html','History','history'],['draft-central.html','Draft','draft']];
 return `<nav class="league-nav"><div class="league-nav-inner">${items.map(([href,label,key])=>`<a href="${href}" class="${active===key?'active':''}">${label}</a>`).join('')}</div></nav>`;
}
function header(){return `<div class="league-shell"><header class="league-header"><img src="cte-league-logo.png" alt="CTE League logo"><div><div class="league-kicker">DYNASTY FANTASY FOOTBALL</div><h1 class="league-title">CTE LEAGUE HQ</h1><div class="muted">Year 2 • Established 2025</div></div></header></div>`}
function shellStart(active){document.write(header()+nav(active)+'<main class="league-shell">')}
function shellEnd(){document.write('</main><footer class="footer">CTE League HQ • Powered by Sleeper + CTE history</footer>')}
function mapForSeason(season,users,rosters){const cfg=data().league.seasons[season];return window.CTE_LeagueEngine.buildRosterLookup(users,rosters,cfg.sleeperUserMap||{},cfg.rosterOwnerMap||{})}
function standingsRows(rosters,lookup){return (rosters||[]).map(r=>{const m=lookup[String(r.roster_id)]||{};const o=owner(m.ownerId);return {ownerId:m.ownerId,name:o.name,team:m.sleeperTeamName||o.currentTeamName||m.sleeperDisplayName||'Unmapped',division:o.currentDivisionId,wins:Number(r.settings?.wins||0),losses:Number(r.settings?.losses||0),ties:Number(r.settings?.ties||0),pf:Number(r.settings?.fpts||0)+Number(r.settings?.fpts_decimal||0)/100,pa:Number(r.settings?.fpts_against||0)+Number(r.settings?.fpts_against_decimal||0)/100,unmapped:!m.ownerId}}).sort((a,b)=>b.wins-a.wins||a.losses-b.losses||b.pf-a.pf)}
function fmt(n){return Number(n||0).toFixed(2)}
function liveControls(buttonId='refreshLive',stampId='liveStamp'){
 return `<div class="live-controls"><span id="${stampId}" class="live-stamp">Updating…</span><button id="${buttonId}" class="refresh-btn" type="button" title="Pull fresh data from Sleeper">↻ Refresh</button></div>`;
}
function setLiveStamp(id='liveStamp',prefix='Updated'){
 const el=document.getElementById(id);if(!el)return;
 const when=window.CTE_Sleeper?.formatLastFetched?.()||new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit'});
 el.textContent=`${prefix} ${when}`;
}
window.CTE_UI={owner,divisionName,esc,nav,header,shellStart,shellEnd,mapForSeason,standingsRows,fmt,liveControls,setLiveStamp};
})();
