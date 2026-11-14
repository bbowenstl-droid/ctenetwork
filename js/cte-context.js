/* Pure context rules: provider completion boundaries, never calendar guesses. */
(function(root){
 'use strict';
 function context(league){
  if(!league) return {kind:'offline',title:'The league, unfiltered.',copy:'Live league context is unavailable. The newsroom and archives remain open.',href:'news.html',action:'Read the newsroom'};
  const s=league.settings||{},week=Number(s.leg||0),done=Number(s.last_scored_leg??Math.max(0,week-1)),start=Number(s.playoff_week_start||15);
  if(league.status==='complete')return {kind:'offseason',title:'The next chapter starts here.',copy:'Explore the season archives, draft history and the moves shaping the next contender.',href:'draft-central.html',action:'Explore Draft Central'};
  if(!week||league.status==='pre_draft'||league.status==='drafting')return {kind:'draft',title:'Build the next contender.',copy:'Draft season. Follow the board and get to know the league’s rosters.',href:'draft-central.html',action:'Follow the draft'};
  if(week>=start)return {kind:'postseason',title:'Every matchup matters.',copy:'Follow the postseason matchups. Bracket positions are verified separately from the league status label.',href:'game-day.html',action:'Open Game Center'};
  if(done>=week)return {kind:'recap',title:'The scores are final. The receipts aren’t.',copy:'Catch up on the latest reporting and see how the standings changed.',href:'news.html',action:'Read the latest coverage'};
  return {kind:'live',title:'Every week has a story.',copy:'Follow the current matchups, check the title race, and keep the receipts.',href:'game-day.html',action:'Follow the matchups'};
 }
 function search(items,query){const terms=String(query||'').toLowerCase().trim().split(/\s+/).filter(Boolean);return items.filter(x=>terms.every(t=>[x.title,x.excerpt,x.author,x.category,x.keywords].join(' ').toLowerCase().includes(t)));}
 const api={context,search};if(typeof module==='object'&&module.exports)module.exports=api;else root.CTE2Context=api;
})(typeof window==='undefined'?globalThis:window);
