/* Shared, pure historical model. Owner identity is distinct from roster identity. */
(function(root){
'use strict';
function ownerAt(config,season,roster,week=1){
 const id=config.league.seasons[season]?.rosterOwnerMap[roster];
 if(!id)throw new Error('Unmapped franchise '+season+'/'+roster);
 return Number(season)===2025&&Number(roster)===7&&week<4?'jeremy':id;
}
function games(archives){
 const seen=new Set(),out=[];
 for(const a of archives)for(const g of a.games){
  const key=[g.season,g.week,g.matchupId].join(':');
  if(seen.has(key))throw new Error('Duplicate game '+key);seen.add(key);
  if(!Number.isFinite(g.scoreA)||!Number.isFinite(g.scoreB)||g.rosterA===g.rosterB)throw new Error('Invalid game '+key);
  out.push({...g,id:key,franchiseA:String(g.rosterA),franchiseB:String(g.rosterB)});
 }
 return out.sort((a,b)=>a.season-b.season||a.week-b.week||String(a.matchupId).localeCompare(String(b.matchupId)));
}
function records(list,identity='owner'){
 const out={};
 for(const g of list)for(const [id,opp,pf,pa] of identity==='franchise'?[[g.franchiseA,g.franchiseB,g.scoreA,g.scoreB],[g.franchiseB,g.franchiseA,g.scoreB,g.scoreA]]:[[g.ownerA,g.ownerB,g.scoreA,g.scoreB],[g.ownerB,g.ownerA,g.scoreB,g.scoreA]]){
  const r=out[id]||(out[id]={id,w:0,l:0,t:0,pf:0,pa:0,games:0,streak:0,longest:0,seasons:{}});
  r.games++;r.pf+=pf;r.pa+=pa;r[pf>pa?'w':pf<pa?'l':'t']++;
  r.streak=pf>pa?r.streak+1:0;r.longest=Math.max(r.longest,r.streak);
  const s=r.seasons[g.season]||(r.seasons[g.season]={w:0,l:0,t:0,pf:0,games:0});s[pf>pa?'w':pf<pa?'l':'t']++;s.pf+=pf;s.games++;
 }
 return out;
}
function allPlay(list){
 const weeks=new Map(),out={};
 for(const g of list.filter(x=>x.type==='regular')){const k=g.season+':'+g.week;const rows=weeks.get(k)||[];rows.push([g.ownerA,g.scoreA],[g.ownerB,g.scoreB]);weeks.set(k,rows);}
 for(const [key,rows] of weeks){if(rows.length!==12||new Set(rows.map(r=>r[0])).size!==12)throw new Error('Incomplete all-play week '+key);
  for(const [id,score] of rows){const r=out[id]||(out[id]={id,w:0,l:0,t:0,weeks:0});r.weeks++;for(const [other,q] of rows)if(id!==other)r[score>q?'w':score<q?'l':'t']++;}
 }
 return Object.values(out).map(r=>({...r,pct:(r.w+r.t/2)/(r.weeks*11)})).sort((a,b)=>b.pct-a.pct||a.id.localeCompare(b.id));
}
function swapSchedule(list,a,b){
 if(!a||!b||a===b)throw new Error('Choose two different franchises.');
 const regular=list.filter(g=>g.type==='regular'),weeks=new Map();
 for(const g of regular){const k=g.season+':'+g.week,m=weeks.get(k)||new Map();m.set(g.franchiseA,{owner:g.ownerA,score:g.scoreA});m.set(g.franchiseB,{owner:g.ownerB,score:g.scoreB});weeks.set(k,m);}
 const swap=id=>id===a?b:id===b?a:id;
 return regular.map(g=>{const m=weeks.get(g.season+':'+g.week),x=swap(g.franchiseA),y=swap(g.franchiseB);if(!m.has(x)||!m.has(y))throw new Error('Incomplete schedule week');return {...g,franchiseA:x,franchiseB:y,ownerA:m.get(x).owner,ownerB:m.get(y).owner,scoreA:m.get(x).score,scoreB:m.get(y).score,margin:Math.abs(m.get(x).score-m.get(y).score)};});
}
const pickKey=p=>'pick:'+p.season+':'+p.round+':'+p.roster_id;
function draftSelections(config,bundles){
 const out=[];
 for(const {season,draft,picks} of bundles)for(const p of picks){
  const original=draft.slot_to_roster_id?.[p.draft_slot]??null;
  out.push({id:draft.draft_id+':'+p.pick_no,season:Number(season),draftId:draft.draft_id,round:p.round,overall:p.pick_no,playerId:String(p.player_id),name:[p.metadata?.first_name,p.metadata?.last_name].filter(Boolean).join(' ')||String(p.player_id),roster:Number(p.roster_id),owner:ownerAt(config,season,p.roster_id,0),originalRoster:original==null?null:Number(original),asset:original==null?null:pickKey({season,round:p.round,roster_id:original}),time:Number(draft.start_time),source:'Sleeper draft selection'});
 }
 return out.sort((a,b)=>a.season-b.season||a.overall-b.overall);
}
function ledger(config,transactions,drafts){
 const seen=new Map(),trades=[],events=[],issues=[];
 for(const t of transactions){
  const id=String(t.transaction_id);if(seen.has(id)){if(JSON.stringify(seen.get(id))!==JSON.stringify(t))issues.push('Conflicting duplicate transaction '+id);continue;}seen.set(id,t);
  if(t.status!=='complete')continue;
  const time=Number(t.status_updated||t.created),season=Number(t.season),week=Number(t.leg||t.week||1),isTrade=t.type==='trade';
  if(!Number.isFinite(time)||!time){issues.push('Missing transaction time '+id);continue;}
  const transfers=[];
  if(isTrade){
   for(const [pid,to] of Object.entries(t.adds||{})){const from=t.drops?.[pid];const asset='player:'+pid;
    if(from==null){issues.push('Unresolved player sender '+id+'/'+pid);continue;}transfers.push({asset,from:Number(from),to:Number(to)});
   }
   for(const p of t.draft_picks||[]){if(p.previous_owner_id==null||p.owner_id==null){issues.push('Unresolved pick sender '+id);continue;}transfers.push({asset:pickKey(p),from:Number(p.previous_owner_id),to:Number(p.owner_id)});}
   trades.push({id,time,season,week,teams:[...new Set((t.roster_ids||[]).map(Number))],transfers,waiverBudget:t.waiver_budget||[]});
   transfers.forEach(x=>events.push({...x,type:'trade',trade:id,time,season,week}));
  }else{
   for(const [pid,from] of Object.entries(t.drops||{}))events.push({asset:'player:'+pid,from:Number(from),to:null,type:'drop',time,season,week});
   for(const [pid,to] of Object.entries(t.adds||{}))events.push({asset:'player:'+pid,from:null,to:Number(to),type:'pickup',time,season,week});
  }
 }
 for(const d of drafts){events.push({asset:'player:'+d.playerId,from:null,to:d.roster,type:'selection',time:d.time,season:d.season,week:0});if(d.asset)events.push({asset:d.asset,from:d.roster,to:d.roster,convertedTo:'player:'+d.playerId,type:'draft',time:d.time,season:d.season,week:0});else issues.push('Unresolved original pick '+d.id);}
 const order={selection:0,draft:1,drop:2,pickup:3,trade:4};events.sort((a,b)=>a.time-b.time||order[a.type]-order[b.type]||String(a.trade||'').localeCompare(String(b.trade||'')));
 const custody=new Map(),edges=[],histories={},current=new Map();
 for(const e of events){(histories[e.asset]||(histories[e.asset]=[])).push(e);const prev=custody.get(e.asset);
  if(e.type==='draft'){
   if(prev&&prev.to===e.to){custody.set(e.convertedTo,{...prev,via:e.asset});}else if(prev)issues.push('Pick conversion custody mismatch '+e.asset);
   custody.delete(e.asset);continue;
  }
  if(e.type==='trade'){
   if(current.has(e.asset)&&current.get(e.asset)!==e.from)issues.push('Custody gap '+e.asset+' at '+e.trade);
   if(prev&&prev.to===e.from&&prev.time<e.time)edges.push({from:prev.trade,to:e.trade,asset:e.asset,via:prev.via||null});
   else if(prev)issues.push('Unresolved chain '+e.asset+' at '+e.trade);
   custody.set(e.asset,e);
  }else custody.delete(e.asset);
  if(e.to==null)current.delete(e.asset);else current.set(e.asset,e.to);
 }
 return {trades:trades.sort((a,b)=>a.time-b.time||a.id.localeCompare(b.id)),events,edges,histories,issues,current:Object.fromEntries(current)};
}
async function pool(tasks,limit=4){let next=0;const out=Array(tasks.length);await Promise.all(Array.from({length:Math.min(limit,tasks.length)},async()=>{while(next<tasks.length){const i=next++;out[i]=await tasks[i]();}}));return out;}
async function loadAssets(api,config){
 const transactions=[],bundles=[];
 for(const [year,cfg] of Object.entries(config.league.seasons)){
  const lists=await pool(Array.from({length:18},(_,i)=>()=>api.getTransactions(cfg.sleeperLeagueId,i+1,{fresh:true})));
  for(let i=0;i<lists.length;i++){if(!Array.isArray(lists[i]))throw new Error('Incomplete transaction response '+year+'/'+(i+1));for(const t of lists[i])transactions.push({...t,season:Number(year)});}
  const ds=await api.getDrafts(cfg.sleeperLeagueId,{fresh:true});
  for(const d of ds.filter(x=>x.status==='complete')){const [draft,picks]=await Promise.all([api.getDraft(d.draft_id,{fresh:true}),api.getDraftPicks(d.draft_id,{fresh:true})]);if(picks.length!==Number(draft.settings.rounds)*Number(draft.settings.teams))throw new Error('Incomplete completed draft '+d.draft_id);bundles.push({season:Number(year),draft,picks});}
 }
 const drafts=draftSelections(config,bundles);return {...ledger(config,transactions,drafts),drafts,retrievedAt:new Date().toISOString(),coverage:'All transaction weeks 1–18, both seasons; completed trades only'};
}
const api={ownerAt,games,records,allPlay,swapSchedule,pickKey,draftSelections,ledger,loadAssets,pool};
if(typeof module==='object'&&module.exports)module.exports=api;else root.CTE2History=api;
})(typeof window==='undefined'?globalThis:window);
