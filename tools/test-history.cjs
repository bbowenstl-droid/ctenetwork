/* Frozen Sleeper audit plus boundary/failure regressions. No network or browser. */
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..'),fixture=require('./fixtures/history-audit.json');
global.window=global;global.document={getElementById:()=>null};
for(const f of ['data/league-data.js','js/league-engine.js','js/stats-engine.js','cte-network-core-v15.js','network-quality-v41.js','data/sportsbook-data.js','js/sportsbook-engine.js','js/sportsbook-live.js'])vm.runInThisContext(fs.readFileSync(path.join(root,f),'utf8'),{filename:f});
const E=CTE_LeagueEngine,S=CTE_StatsEngine,clone=x=>JSON.parse(JSON.stringify(x));
let source=clone(fixture.seasons),requested=[];
const year=id=>Object.entries(CTE_LEAGUE_DATA.league.seasons).find(([,c])=>c.sleeperLeagueId===id)[0];
global.CTE_Sleeper={getLeagueSnapshot:async id=>source[year(id)],getMatchups:async(id,w)=>{requested.push([year(id),w]);return source[year(id)].weeks[w];},getWinnersBracket:async id=>source[year(id)].winners,getLosersBracket:async id=>source[year(id)].losers};
const canonical=g=>{const sides=[[g.ownerA,g.scoreA],[g.ownerB,g.scoreB]].sort((a,b)=>a[0].localeCompare(b[0]));return JSON.stringify([g.season,g.week,g.matchupId,sides]);};
(async()=>{
 const archives=await S.loadAllSeasons(),result=S.calculateOwnerStats(archives),games=result.games;
 assert.equal(games.length,134);assert.deepEqual(games.map(canonical).sort(),fixture.expected.map(canonical).sort());
 const expected={};for(const g of fixture.expected)for(const [a,b,p,q] of [[g.ownerA,g.ownerB,g.scoreA,g.scoreB],[g.ownerB,g.ownerA,g.scoreB,g.scoreA]]){const k=a+'|'+b,r=expected[k]??={wins:0,losses:0,ties:0,pf:0,pa:0,games:0};r[p>q?'wins':p<q?'losses':'ties']++;r.pf+=p;r.pa+=q;r.games++;}
 const actual=S.headToHead(games);assert.equal(Object.keys(actual).length,150);for(const [k,r] of Object.entries(expected))for(const field of Object.keys(r))assert.ok(Math.abs(actual[k][field]-r[field])<1e-8,`${k} ${field}`);
 assert.deepEqual([actual['brendan|jesse'].wins,actual['brendan|jesse'].losses,actual['brendan|jesse'].ties],[2,1,0]);
 assert.equal(result.owners.mike.playoffWins,0);assert.equal(result.owners.mike.consolationWins,2);
 assert.equal(games.filter(g=>g.type==='consolation').length,7);assert.equal(games.filter(g=>g.type==='unknown').length,0);
 assert.equal(games.filter(g=>g.ownerA==='jeremy'||g.ownerB==='jeremy').length,3);
 assert.ok(!requested.some(([y,w])=>y==='2026'&&w>6));
 const a=archives.find(a=>a.season===2026),split=CTE_Quality.splitRecords(Object.values(source[2026].weeks).slice(0,6),a.lookup);
 for(const r of a.snapshot.rosters){const s=split[a.lookup[r.roster_id].ownerId];assert.equal(s.h2h.w+s.median.w,r.settings.wins);assert.equal(s.h2h.l+s.median.l,r.settings.losses);assert.equal(s.h2h.t+s.median.t,r.settings.ties);}
 assert.equal(E.completedWeek({settings:{leg:6,last_scored_leg:6}}),6);assert.equal(E.completedWeek({settings:{leg:7,last_scored_leg:6}}),6);assert.equal(E.completedWeek({settings:{leg:1,last_scored_leg:0}}),0);
 assert.equal(E.gameStatus({settings:{leg:6,last_scored_leg:5}},6),'live');assert.equal(E.gameStatus({settings:{leg:6,last_scored_leg:6}},6),'final');assert.equal(E.score({points:90,custom_points:0}),0);
 const ctx=await CTE_BookLive.load();assert.equal(ctx.completed,6);assert.equal(Object.keys(ctx.results).length,CTE_SPORTSBOOK.markets.length);assert.deepEqual(ctx.failures,[]);
 for(const m of CTE_SPORTSBOOK.markets)assert.equal(ctx.results[m.id].final,true,m.id);
 console.log('Bankrolls:',JSON.stringify(Object.keys(CTE_SPORTSBOOK.personalities).map(id=>{const l=CTE_BookEngine.bankrollLedger(CTE_SPORTSBOOK,id,ctx.results);return {id,current:l.current,weeks:l.weeks.map(w=>({week:w.week,status:w.status,issues:w.issues}))};})));
 source[2026].league.settings.last_scored_leg=5;assert.equal((await S.loadSeason(2026)).games.length,30);assert.ok(!Object.keys((await CTE_BookLive.load()).results).some(id=>id.startsWith('w6-')));
 source=clone(fixture.seasons);source[2026].weeks[1].pop();await assert.rejects(S.loadSeason(2026),/incomplete/i);
 source=clone(fixture.seasons);source[2026].weeks[1][0].matchup_id=null;await assert.rejects(S.loadSeason(2026),/Incomplete|missing/i);
 source=clone(fixture.seasons);source[2026].weeks[1].forEach(r=>r.points=0);assert.equal((await S.loadSeason(2026)).games.filter(g=>g.week===1&&g.scoreA===g.scoreB).length,6);
 for(const f of ['league-engine.js','stats-engine.js'])assert.equal(fs.readFileSync(path.join(root,f),'utf8'),fs.readFileSync(path.join(root,'js',f),'utf8'),'duplicate engines must stay synchronized');
 console.log('PASS: 134 games, 75 H2H pairs, median standings, ownership, postseason, finality, sportsbook and failure regressions');
})().catch(e=>{console.error(e);process.exitCode=1;});
