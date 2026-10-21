(()=>{'use strict';
const $=id=>document.getElementById(id),esc=CTE_UI.esc,fmt=CTE_UI.fmt,LE=CTE_LeagueEngine,params=new URLSearchParams(location.search),years=Object.keys(CTE_LEAGUE_DATA.league.seasons).sort();let generation=0,refreshCurrent=false;
const saved=()=>{try{return localStorage.getItem('cte_my_team')||''}catch(_){return ''}};
$('gameSeason').innerHTML=years.map(y=>`<option value="${y}">${y}</option>`).join('');$('gameWeek').innerHTML=Array.from({length:18},(_,i)=>`<option value="${i+1}">Week ${i+1}</option>`).join('');
$('gameOwner').innerHTML='<option value="">All owners</option>'+Object.values(CTE_LEAGUE_DATA.owners).map(o=>`<option value="${o.id}">${esc(o.name)}${o.status==='former'?' (former)':''}</option>`).join('');
$('gameSeason').value=years.includes(params.get('season'))?params.get('season'):String(CTE_LEAGUE_DATA.league.currentSeason);$('gameOwner').value=params.get('owner')||'';
function syncURL(){const u=new URL(location.href);u.searchParams.set('season',$('gameSeason').value);u.searchParams.set('week',$('gameWeek').value);if($('gameOwner').value)u.searchParams.set('owner',$('gameOwner').value);else u.searchParams.delete('owner');history.replaceState(null,'',u);}
async function render(fresh=false){
 const request=++generation,season=Number($('gameSeason').value),week=Number($('gameWeek').value),filter=$('gameOwner').value,cfg=CTE_LEAGUE_DATA.league.seasons[season];syncURL();$('previousWeek').disabled=week<=1;$('nextWeek').disabled=week>=18;
 $('scoreboard').innerHTML='<p role="status">Loading matchups…</p>'; $('gameStats').innerHTML='';$('readiness').innerHTML='';
 try{
  const [snap,rows]=await Promise.all([CTE_Sleeper.getLeagueSnapshot(cfg.sleeperLeagueId,{fresh}),CTE_Sleeper.getMatchups(cfg.sleeperLeagueId,week,{fresh})]);if(request!==generation)return;
  const lookup=CTE_UI.mapForSeason(season,snap.users,snap.rosters),owner=r=>LE.ownerForHistoricalWeek(lookup[r.roster_id]?.ownerId,season,week),state=LE.gameStatus(snap.league,week),label={final:'Final',live:'Live / current week',upcoming:'Upcoming'}[state];
  refreshCurrent=season===Number(CTE_LEAGUE_DATA.league.currentSeason)&&week===Number(snap.league.settings?.leg);
  const all=LE.groupMatchups(rows).filter(p=>p.length===2),pairs=all.filter(p=>!filter||p.some(r=>owner(r)===filter)).sort((a,b)=>Number(b.some(r=>owner(r)===saved()))-Number(a.some(r=>owner(r)===saved()))||a[0].matchup_id-b[0].matchup_id);
  $('weekLabel').textContent=`${season} / WEEK ${week}`;$('gameHeading').textContent=`${season} Week ${week} matchups`;
  $('liveStamp').textContent=`${label} · Results through Week ${LE.completedWeek(snap.league)} · Updated ${new Date().toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'})} CT`;
  const scored=all.flat(),high=scored.length?Math.max(...scored.map(LE.score)):null,closest=all.length?Math.min(...all.map(([a,b])=>Math.abs(LE.score(a)-LE.score(b)))):null;
  $('gameStats').innerHTML=`<div><span class="n-label">Week high</span><strong>${state==='upcoming'||high==null?'—':fmt(high)}</strong></div><div><span class="n-label">Closest margin</span><strong>${state==='upcoming'||closest==null?'—':fmt(closest)}</strong></div><div><span class="n-label">Matchups</span><strong>${pairs.length}</strong><small>${label}</small></div>`;
  $('scoreboard').innerHTML=pairs.length?pairs.map(pair=>`<a class="n-match-card" href="matchup.html?season=${season}&week=${week}&matchup=${pair[0].matchup_id}" data-owners="${pair.map(owner).join(',')}"><div class="n-match-meta"><span>Week ${week} · Game ${pair[0].matchup_id}</span><span>${label}${pair.some(r=>owner(r)===saved())?' · My team':''}</span></div>${pair.map(r=>`<div class="n-score-team"><span class="n-avatar" aria-hidden="true">${esc(CTE_UI.owner(owner(r)).name.slice(0,2))}</span><span class="n-score-name"><strong>${esc(CTE_UI.owner(owner(r)).name)}</strong><small data-entering="${owner(r)}">Loading entering H2H record…</small></span><b class="n-score-value">${state==='upcoming'||LE.score(r)==null?'—':fmt(LE.score(r))}</b></div>`).join('')}<div class="n-match-foot"><span>Starters and completed series</span><span>View matchup →</span></div></a>`).join(''):'<p>No posted matchups for this selection. Postseason pairings may not be finalized.</p>';
  const needed=(snap.league.roster_positions||[]).filter(p=>!['BN','IR','TAXI'].includes(p)).length;
  $('readiness').innerHTML=pairs.flat().map(r=>`<a class="n-ready" href="team.html?owner=${owner(r)}"><span>${esc(CTE_UI.owner(owner(r)).name)}</span><b>${(r.starters||[]).filter(id=>id&&id!=='0').length}/${needed}</b></a>`).join('');
  $('lineupHeading').textContent=state==='final'?'Starting slots for this game week':'Starting slots';
  // Historical owner records are calculated as of the selected week, not today's roster totals.
  CTE_StatsEngine.loadSeason(season).then(a=>{if(request!==generation)return;const prior={...a,games:a.games.filter(g=>g.week<week)},stats=CTE_StatsEngine.calculateOwnerStats([prior]).owners;document.querySelectorAll('[data-entering]').forEach(el=>{const s=stats[el.dataset.entering];el.textContent=`Entering H2H: ${s?.wins||0}–${s?.losses||0}${s?.ties?'–'+s.ties:''}`;});}).catch(()=>{if(request===generation)document.querySelectorAll('[data-entering]').forEach(el=>el.textContent='Entering record unavailable');});
 }catch(_){if(request!==generation)return;$('liveStamp').textContent='Data unavailable — retry to reconnect';$('scoreboard').innerHTML='<p class="n-error">Could not load the selected week. Use Refresh to retry.</p>';}
}
$('previousWeek').onclick=()=>{$('gameWeek').value=Number($('gameWeek').value)-1;render();};$('nextWeek').onclick=()=>{$('gameWeek').value=Number($('gameWeek').value)+1;render();};$('gameWeek').onchange=()=>render();$('gameOwner').onchange=()=>render();
$('gameSeason').onchange=async()=>{$('gameWeek').value='1';render();};$('gameRefresh').onclick=()=>{CTE_Sleeper.clearCache();render(true);};
$('copyGameLink').onclick=async()=>{try{await navigator.clipboard.writeText(location.href);$('gameFeedback').textContent='Link copied';}catch(_){$('gameFeedback').textContent='Copy the page address to share these filters.';}};
addEventListener('cte:my-team',()=>render());
setInterval(()=>{if(refreshCurrent&&!document.hidden)render(true);},60000);
(async()=>{let week=Number(params.get('week'));if(!Number.isInteger(week)||week<1||week>18){try{const lg=await CTE_Sleeper.getLeague(CTE_LEAGUE_DATA.league.seasons[$('gameSeason').value].sleeperLeagueId,{fresh:true});week=Math.max(1,Number(lg.settings?.leg||1));}catch(_){week=1;}}$('gameWeek').value=String(week);render();})();
})();
