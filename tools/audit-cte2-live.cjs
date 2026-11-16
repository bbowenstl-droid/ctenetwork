/* Read-only live reconciliation. Does not rewrite the frozen editorial edition. */
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
global.window=global;global.document={getElementById:()=>null};global.localStorage={getItem:()=>null,setItem:()=>{}};
for(const f of ['data/league-data.js','sleeper-api-v16.js','js/league-engine.js','js/stats-engine.js'])vm.runInThisContext(fs.readFileSync(f,'utf8'),{filename:f});
const H=require('../js/cte-history.js');
(async()=>{
 const archives=await CTE_StatsEngine.loadAllSeasons({fresh:true});const games=H.games(archives),baseline=JSON.parse(fs.readFileSync('research/state-of-union/games.json','utf8')).games;
 const canon=g=>JSON.stringify([g.season,g.week,g.matchupId,g.ownerA,g.ownerB,g.scoreA,g.scoreB,g.type]);
 const actual=new Map(games.map(g=>[g.id,canon(g)]));for(const g of baseline)assert.equal(actual.get([g.season,g.week,g.matchupId].join(':')),canon(g),'Historical score/classification drift; review provider correction');
 for(const a of archives){const rows=H.records(games.filter(g=>g.season===a.season&&g.type==='regular'),'franchise');for(const r of a.snapshot.rosters){const calc=rows[r.roster_id];if(!calc)continue;const pf=Number(r.settings.fpts||0)+Number(r.settings.fpts_decimal||0)/100;assert.ok(Math.abs(calc.pf-pf)<.02,'Regular PF differs from provider '+a.season+'/'+r.roster_id);}}
 const assets=await H.loadAssets(CTE_Sleeper,CTE_LEAGUE_DATA);assert.equal(assets.drafts.length,300);assert.deepEqual(assets.issues,[]);
 const frozen=JSON.parse(fs.readFileSync('research/state-of-union/analysis.json','utf8'));const ids=new Set(assets.trades.map(t=>t.id));for(const t of frozen.trades)assert.ok(ids.has(t.providerId),'Missing historical trade '+t.providerId);
 const current=archives.find(a=>a.season===CTE_LEAGUE_DATA.league.currentSeason);let playerCount=0;
 for(const r of current.snapshot.rosters)for(const p of r.players||[]){assert.equal(assets.current['player:'+p],r.roster_id,'Player custody mismatch '+p);playerCount++;}
 const actualPlayers=new Set(current.snapshot.rosters.flatMap(r=>(r.players||[]).map(p=>'player:'+p)));for(const k of Object.keys(assets.current).filter(k=>k.startsWith('player:')))assert.ok(actualPlayers.has(k),'Replay retains dropped player '+k);
 const picks=await CTE_Sleeper.getTradedPicks(current.cfg.sleeperLeagueId,{fresh:true});for(const p of picks)assert.equal(assets.current[H.pickKey(p)]??p.roster_id,p.owner_id,'Pick custody mismatch '+H.pickKey(p));
 console.log(JSON.stringify({retrievedAt:assets.retrievedAt,games:games.length,regularGames:games.filter(g=>g.type==='regular').length,draftSelections:assets.drafts.length,trades:assets.trades.length,threeTeamTrades:assets.trades.filter(t=>t.teams.length===3).length,linkedTransfers:assets.edges.length,currentPlayersReconciled:playerCount,changedPicksReconciled:picks.length,issues:assets.issues},null,2));
})().catch(e=>{console.error(e);process.exitCode=1;});
