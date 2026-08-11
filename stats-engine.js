/**
 * CTE League HQ - historical stats engine
 * Builds owner-based records from Sleeper weekly matchup data.
 */
(function(){
'use strict';

const owners=()=>window.CTE_LEAGUE_DATA.owners;

function emptyOwnerStats(ownerId){
  return {
    ownerId,
    games:0,wins:0,losses:0,ties:0,
    regularWins:0,regularLosses:0,regularTies:0,
    playoffWins:0,playoffLosses:0,playoffTies:0,
    pointsFor:0,pointsAgainst:0,
    highScore:null,lowScore:null,
    biggestWin:null,biggestLoss:null,closestWin:null,
    currentStreakType:null,currentStreak:0,longestWinStreak:0,longestLossStreak:0,
    seasons:new Set(),
    championships:0,titleAppearances:0
  };
}

function applyGame(stats, game, playoffStartWeek){
  const isPlayoff=Number(game.week)>=Number(playoffStartWeek||99);
  const sides=[
    {id:game.ownerA,pf:game.scoreA,pa:game.scoreB,opp:game.ownerB},
    {id:game.ownerB,pf:game.scoreB,pa:game.scoreA,opp:game.ownerA}
  ];
  for(const side of sides){
    if(!stats[side.id]) stats[side.id]=emptyOwnerStats(side.id);
    const s=stats[side.id];
    s.games++; s.pointsFor+=side.pf; s.pointsAgainst+=side.pa; s.seasons.add(game.season);
    s.highScore=s.highScore==null?side.pf:Math.max(s.highScore,side.pf);
    s.lowScore=s.lowScore==null?side.pf:Math.min(s.lowScore,side.pf);
    let result='T';
    if(side.pf>side.pa) result='W'; else if(side.pf<side.pa) result='L';
    if(result==='W'){
      s.wins++; if(isPlayoff)s.playoffWins++; else s.regularWins++;
      const margin=side.pf-side.pa;
      if(!s.biggestWin||margin>s.biggestWin.margin)s.biggestWin={margin,season:game.season,week:game.week,opponentId:side.opp,score:side.pf,oppScore:side.pa};
      if(!s.closestWin||margin<s.closestWin.margin)s.closestWin={margin,season:game.season,week:game.week,opponentId:side.opp,score:side.pf,oppScore:side.pa};
      s.currentStreak=s.currentStreakType==='W'?s.currentStreak+1:1; s.currentStreakType='W'; s.longestWinStreak=Math.max(s.longestWinStreak,s.currentStreak);
    }else if(result==='L'){
      s.losses++; if(isPlayoff)s.playoffLosses++; else s.regularLosses++;
      const margin=side.pa-side.pf;
      if(!s.biggestLoss||margin>s.biggestLoss.margin)s.biggestLoss={margin,season:game.season,week:game.week,opponentId:side.opp,score:side.pf,oppScore:side.pa};
      s.currentStreak=s.currentStreakType==='L'?s.currentStreak+1:1; s.currentStreakType='L'; s.longestLossStreak=Math.max(s.longestLossStreak,s.currentStreak);
    }else{
      s.ties++; if(isPlayoff)s.playoffTies++; else s.regularTies++;
      s.currentStreakType='T'; s.currentStreak=0;
    }
  }
}

function finalizeStats(stats){
  const champs=window.CTE_LEAGUE_DATA.championships||[];
  for(const c of champs){
    if(stats[c.championOwnerId]){stats[c.championOwnerId].championships++;stats[c.championOwnerId].titleAppearances++;}
    if(stats[c.runnerUpOwnerId])stats[c.runnerUpOwnerId].titleAppearances++;
  }
  for(const s of Object.values(stats)){
    s.winPct=s.games?(s.wins+s.ties*0.5)/s.games:0;
    s.avgScore=s.games?s.pointsFor/s.games:0;
    s.pointDiff=s.pointsFor-s.pointsAgainst;
    s.seasonCount=s.seasons.size;
    s.seasons=[...s.seasons].sort();
  }
  return stats;
}

async function loadSeason(season, options={}){
  const cfg=window.CTE_LEAGUE_DATA.league.seasons[season];
  if(!cfg) throw new Error(`Unknown CTE season ${season}`);
  const snapshot=await window.CTE_Sleeper.getLeagueSnapshot(cfg.sleeperLeagueId, options);
  const lookup=window.CTE_LeagueEngine.buildRosterLookup(snapshot.users,snapshot.rosters,cfg.sleeperUserMap||{},cfg.rosterOwnerMap||{});
  const unmatched=Object.values(lookup).filter(x=>!x.ownerId);
  if(unmatched.length) throw new Error(`${season} has ${unmatched.length} unmapped roster(s).`);
  const playoffStartWeek=Number(snapshot.league?.settings?.playoff_week_start||15);
  const currentLeg=Math.max(1, Number(snapshot.league?.settings?.leg||1));
  const maxWeek=cfg.status==='current' ? Math.min(18,currentLeg) : Math.max(18, playoffStartWeek+3);
  // Stats only need matchup scores. Do not fetch transactions here; that would
  // double the number of Sleeper calls on the Record Book page for no benefit.
  const weeks=await Promise.all(Array.from({length:maxWeek},(_,i)=>
    window.CTE_Sleeper.getMatchups(cfg.sleeperLeagueId,i+1,options).then(matchups=>({week:i+1,matchups}))
  ));
  const games=[];
  for(const w of weeks){
    const resolved=window.CTE_LeagueEngine.resolveGames(w.matchups,lookup,season,w.week);
    // Avoid preseason / empty matchup rows where every score is zero.
    for(const g of resolved){
      if(g.scoreA===0&&g.scoreB===0) continue;
      games.push(g);
    }
  }
  return {season:Number(season),cfg,snapshot,lookup,playoffStartWeek,games};
}

async function loadAllCompleteSeasons(options={}){
  const seasons=Object.entries(window.CTE_LEAGUE_DATA.league.seasons)
    .filter(([,cfg])=>cfg.status==='complete')
    .map(([year])=>Number(year)).sort();
  const out=[];
  for(const season of seasons) out.push(await loadSeason(season,options));
  return out;
}


async function loadAllSeasons(options={}){
  const seasons=Object.keys(window.CTE_LEAGUE_DATA.league.seasons)
    .map(Number).sort();
  const out=[];
  for(const season of seasons) out.push(await loadSeason(season,options));
  return out;
}

function calculateOwnerStats(seasonArchives){
  const stats={};
  for(const id of Object.keys(owners())) stats[id]=emptyOwnerStats(id);
  const allGames=[];
  for(const archive of seasonArchives){
    for(const game of archive.games){applyGame(stats,game,archive.playoffStartWeek);allGames.push(game);}
  }
  return {owners:finalizeStats(stats),games:allGames};
}

function calculateLeagueRecords(result){
  const games=result.games||[];
  const ownerStats=Object.values(result.owners||{}).filter(s=>s.games>0);
  const withOwner=(id)=>owners()[id]?.name||id;
  const highestGameSide=[];
  for(const g of games){highestGameSide.push({ownerId:g.ownerA,score:g.scoreA,season:g.season,week:g.week,opponentId:g.ownerB});highestGameSide.push({ownerId:g.ownerB,score:g.scoreB,season:g.season,week:g.week,opponentId:g.ownerA});}
  const highScore=highestGameSide.sort((a,b)=>b.score-a.score)[0]||null;
  const lowScore=[...highestGameSide].sort((a,b)=>a.score-b.score)[0]||null;
  const biggestBlowout=[...games].sort((a,b)=>b.margin-a.margin)[0]||null;
  const closestGame=[...games].filter(g=>g.margin>0).sort((a,b)=>a.margin-b.margin)[0]||null;
  const mostPoints=[...ownerStats].sort((a,b)=>b.pointsFor-a.pointsFor)[0]||null;
  const bestPct=[...ownerStats].sort((a,b)=>b.winPct-a.winPct||b.wins-a.wins)[0]||null;
  const longestWin=[...ownerStats].sort((a,b)=>b.longestWinStreak-a.longestWinStreak)[0]||null;
  return {highScore,lowScore,biggestBlowout,closestGame,mostPoints,bestPct,longestWin,ownerName:withOwner};
}

function headToHead(games){
  const map={};
  for(const g of games){
    for(const [a,b,sa,sb] of [[g.ownerA,g.ownerB,g.scoreA,g.scoreB],[g.ownerB,g.ownerA,g.scoreB,g.scoreA]]){
      const key=`${a}|${b}`; if(!map[key])map[key]={ownerId:a,opponentId:b,wins:0,losses:0,ties:0,pf:0,pa:0,games:0};
      const r=map[key];r.games++;r.pf+=sa;r.pa+=sb;if(sa>sb)r.wins++;else if(sa<sb)r.losses++;else r.ties++;
    }
  }
  return map;
}

window.CTE_StatsEngine={loadSeason,loadAllCompleteSeasons,loadAllSeasons,calculateOwnerStats,calculateLeagueRecords,headToHead};
})();
