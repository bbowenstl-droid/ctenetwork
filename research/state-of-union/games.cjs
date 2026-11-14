const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve(__dirname,'../..'); global.window=global;
for(const f of ['data/league-data.js','js/league-engine.js','js/stats-engine.js'])vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'));
const read=n=>JSON.parse(fs.readFileSync(path.join(__dirname,'raw',n+'.json')));
const archives=[];
for(const season of [2025,2026]){
 const league=read('sleeper-league-'+season), cfg=CTE_LEAGUE_DATA.league.seasons[season];
 const lookup=CTE_LeagueEngine.buildRosterLookup(read('sleeper-users-'+season),read('sleeper-rosters-'+season),{},cfg.rosterOwnerMap);
 const games=[];
 for(let w=1;w<=league.settings.last_scored_leg;w++){
  const rows=read(`sleeper-matchups-${season}-${w}`), other=read(`flaim-matchups-${season}-${w}`).data.matchups;
  for(const m of other)for(const side of [m.home,m.away].filter(Boolean)){const r=rows.find(x=>x.roster_id===side.rosterId);if(CTE_LeagueEngine.score(r)!==side.points)throw Error('Score mismatch');}
  for(const g of CTE_LeagueEngine.resolveGames(rows,lookup,season,w)){g.type=CTE_LeagueEngine.gameType(w,league,g.rosterA,g.rosterB,read('sleeper-winners-'+season),read('sleeper-losers-'+season));games.push(g);}
 }
 archives.push({season,games});
}
const result=CTE_StatsEngine.calculateOwnerStats(archives);
fs.writeFileSync(path.join(__dirname,'games.json'),JSON.stringify({config:CTE_LEAGUE_DATA,...result},null,2));
console.log(result.games.length,'verified games');
