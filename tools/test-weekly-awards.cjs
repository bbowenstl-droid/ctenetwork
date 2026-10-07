const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const root=path.resolve(__dirname,'..');const w={};const dataContext={window:w};
vm.runInNewContext(fs.readFileSync(path.join(root,'data/league-data.js'),'utf8'),dataContext);
vm.runInNewContext(fs.readFileSync(path.join(root,'data/sportsbook-data.js'),'utf8'),dataContext);
const context={window:{CTE_LEAGUE_DATA:w.CTE_LEAGUE_DATA,CTE_UI:{owner:id=>({name:id})}},document:{body:{dataset:{}}}};
vm.runInNewContext(fs.readFileSync(path.join(root,'league-extras-v33.js'),'utf8'),context);
const X=context.window.CTE_Extras,book=w.CTE_SPORTSBOOK;
// Frozen final scores, independent of future weekly sportsbook repricing.
const pairs=[['brendan',163.62,'jacob',205.92],['brett',125.66,'carter',95.20],['mike',106.18,'jerry',142.36],['dan',138.08,'isaiah',138.78],['cotton',136.28,'troy',148.62],['jesse',95.42,'elijah',90.38]];
const fixture={season:2026,week:5,markets:pairs.map(([a,,b])=>({id:a+'-'+b,week:4,sides:[a,b]})),results:Object.fromEntries(pairs.map(([a,ap,b,bp])=>[a+'-'+b,{scores:{[a]:ap,[b]:bp}}]))};
assert.equal(X.completedWeek(4,2026,fixture),4,'confirmed finals advance awards despite stale leg');
assert.equal(X.completedWeek(5,2026,fixture),4);
assert.equal(X.completedWeek(6,2026,fixture),5,'Sleeper advancement still works');
assert.equal(X.completedWeek(4,2025,fixture),3,'other season finals ignored');
for(const change of [f=>delete f.results['brendan-jacob'],f=>f.results['brendan-jacob'].final=false,f=>f.results['brendan-jacob'].scores.brendan=null,f=>f.markets.pop()]){const f=JSON.parse(JSON.stringify(fixture));change(f);assert.equal(X.completedWeek(4,2026,f),3,'incomplete/non-final weeks ignored')}
const games=pairs.map(([a,ap,b,bp])=>({ownerA:a,scoreA:ap,ownerB:b,scoreB:bp,margin:Math.abs(ap-bp)}));
const awards=X.computeAwards([],games,()=>null);const winners=Object.fromEntries(awards.map(a=>[a.key,a.owner]));
assert.deepEqual(winners,{top:'jacob',blowout:'jacob',close:'isaiah',badbeat:'brendan',low:'elijah'});
console.log('Weekly awards: stale-leg, finality, season isolation, rollover and award winners passed.');
