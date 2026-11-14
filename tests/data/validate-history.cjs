#!/usr/bin/env node
'use strict';
// CTE Network 2.0 — dependency-free integrity gate.
// Default is offline; --live reads the public Sleeper API and never writes.
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const root = path.resolve(__dirname, '../..');
const source = fs.readFileSync(path.join(root, 'data/league-data.js'), 'utf8');
const context = {window:{}};
vm.runInNewContext(source, context, {filename:'data/league-data.js', timeout:1000});
const config = context.window.CTE_LEAGUE_DATA;
const failures = [];
function check(name, fn) {
  try { fn(); console.log('PASS ' + name); }
  catch (error) { failures.push(name + ': ' + error.message); console.error('FAIL ' + name + ': ' + error.message); }
}
function same(a,b) { return JSON.stringify(a) === JSON.stringify(b); }
const seasons = config.league.seasons;
const owners = config.owners;
const periods = config.ownershipPeriods;
const expected = {
  2025: ['brendan','jacob','brett','mike','tyler','dan','isaiah','cotton','jerry','jesse','elijah','troy'],
  2026: ['brendan','jacob','brett','mike','carter','dan','isaiah','cotton','jerry','jesse','elijah','troy']
};
check('League has two verified seasons and 12 teams', () => {
  assert.equal(config.league.teamCount,12);
  assert.deepEqual(Object.keys(seasons).sort(), ['2025','2026']);
  assert.equal(seasons[2025].sleeperLeagueId,'1255586541745475584');
  assert.equal(seasons[2026].sleeperLeagueId,'1312109948305436672');
});
for (const year of [2025,2026]) check(year + ' unique roster-to-owner map', () => {
  const map = seasons[year].rosterOwnerMap;
  assert.equal(Object.keys(map).length,12);
  const actual = Array.from({length:12},(_,i)=>map[i+1]);
  assert.ok(same(actual,expected[year]),'roster identities differ from approved mapping');
  assert.equal(new Set(actual).size,12);
  for (const id of actual) assert.ok(owners[id], 'missing owner '+id);
});
check('Jeremy/Isaiah historical owner periods', () => {
  const jeremy = periods.find(p=>p.ownerId==='jeremy');
  const isaiah = periods.find(p=>p.ownerId==='isaiah');
  assert.ok(jeremy && isaiah);
  assert.equal(jeremy.start.season,2025); assert.equal(jeremy.start.week,1);
  assert.equal(jeremy.end.week,3); assert.equal(isaiah.start.week,4);
  assert.equal(owners.isaiah.tookOverFromOwnerId,'jeremy');
  assert.equal(owners.jeremy.replacedByOwnerId,'isaiah');
});
check('Tyler/Carter transition', () => {
  const tyler = periods.find(p=>p.ownerId==='tyler');
  const carter = periods.find(p=>p.ownerId==='carter');
  assert.ok(tyler && carter);
  assert.equal(tyler.start.season,2025);
  assert.equal(tyler.end.afterSeason,true);
  assert.equal(carter.start.season,2026);
  assert.equal(owners.carter.tookOverFromOwnerId,'tyler');
});
check('2025 champion and runner-up are distinct', () => {
  const c = config.championships.find(x=>x.season===2025);
  assert.equal(c.championOwnerId,'brendan');
  assert.equal(c.runnerUpOwnerId,'jacob');
  assert.notEqual(c.championOwnerId,c.runnerUpOwnerId);
});
async function getJson(url) {
  const response = await fetch(url,{headers:{'User-Agent':'CTE-Network-Audit/1.0'},signal:AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error('HTTP '+response.status+' '+url);
  return response.json();
}
async function live() {
  const base = 'https://api.sleeper.app/v1';
  for (const year of [2025,2026]) {
    const id = seasons[year].sleeperLeagueId;
    let league, rosters, draftList;
    try {
      [league,rosters,draftList] = await Promise.all([
        getJson(base+'/league/'+id),
        getJson(base+'/league/'+id+'/rosters'),
        getJson(base+'/league/'+id+'/drafts')
      ]);
    } catch(e) { failures.push(year+' provider connectivity: '+e.message); continue; }
    check(year+' provider identity and roster count',()=>{
      assert.equal(String(league.league_id),id);
      assert.equal(rosters.length,12);
      assert.equal(new Set(rosters.map(x=>x.roster_id)).size,12);
    });
    const draft = draftList.find(d=>d.status==='complete') || draftList[0];
    if (!draft) { failures.push(year+' missing provider draft'); continue; }
    try {
      const picks = await getJson(base+'/draft/'+draft.draft_id+'/picks');
      check(year+' draft selection count',()=>assert.equal(picks.length,year===2025?252:48));
    } catch(e) { failures.push(year+' draft fetch: '+e.message); }
    const lastWeek = year===2025?14:9;
    for(let week=1;week<=lastWeek;week++) {
      try {
        const rows=await getJson(base+'/league/'+id+'/matchups/'+week);
        check(year+' Week '+week+' matchup shape',()=>{
          assert.equal(rows.length,12);
          const groups=new Map();
          for(const row of rows) {
            assert.ok(Number.isInteger(row.roster_id));
            assert.ok(row.matchup_id != null,'missing matchup id');
            const key=String(row.matchup_id);
            groups.set(key,(groups.get(key)||0)+1);
          }
          assert.equal(groups.size,6);
          assert.ok([...groups.values()].every(n=>n===2));
        });
      } catch(e) { failures.push(year+' Week '+week+' provider fetch: '+e.message); }
    }
    // Sleeper can group preseason trades into week 1. Read all available weeks,
    // dedupe by transaction_id, and never treat pending transactions as completed.
    const tradeIds=new Set();
    const tradeWeeks=year===2025?18:12;
    for(let week=1;week<=tradeWeeks;week++) {
      try {
        const rows=await getJson(base+'/league/'+id+'/transactions/'+week);
        for(const t of rows) if(t.type==='trade' && t.status==='complete') tradeIds.add(String(t.transaction_id));
      } catch(e) { failures.push(year+' transaction week '+week+': '+e.message); }
    }
    console.log('INFO '+year+' unique completed trade IDs: '+tradeIds.size+' (audit reference '+(year===2025?7:14)+')');
    check(year+' trade count reference',()=>assert.equal(tradeIds.size,year===2025?7:14));
  }
}
(async()=>{
  if(process.argv.includes('--live')) await live();
  if(failures.length){ console.error('\n'+failures.length+' check(s) failed:\n'+failures.join('\n'));process.exitCode=1; }
  else console.log('\nAll selected checks passed.');
})().catch(e=>{console.error(e);process.exitCode=1;});
