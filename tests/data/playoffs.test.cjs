const assert=require('node:assert/strict'),P=require('../../js/cte-playoffs.js');
const rows=Array.from({length:12},(_,i)=>({id:String(i+1),division:'d'+Math.floor(i/3),w:12-i,l:i,t:0,pf:1000-i}));
const schedule=[{week:14,pairs:[['1','2'],['3','4'],['5','6'],['7','8'],['9','10'],['11','12']]}],samples=Object.fromEntries(rows.map((r,i)=>[r.id,[100+i,120+i,90+i]]));
const a=P.simulate(rows,schedule,samples,1000,42),b=P.simulate(rows,schedule,samples,1000,42);assert.deepEqual(a,b,'seeded simulations reproduce');assert.equal(a.reduce((n,r)=>n+r.playoffs,0),6000);assert.equal(a.reduce((n,r)=>n+r.division,0),4000);assert.equal(a.reduce((n,r)=>n+r.bye,0),2000);assert.deepEqual(rows.map(r=>r.w),Array.from({length:12},(_,i)=>12-i),'input unchanged');
assert.throws(()=>P.simulate(rows,[{week:14,pairs:[['1','2']]}],samples),/Incomplete/);assert.throws(()=>P.simulate(rows,schedule,{}),/samples/);
const done=P.simulate(rows,[],samples,10);assert.equal(done.filter(r=>r.playoffPct===100).length,6);assert.equal(P.bounds(rows,0).find(r=>r.id==='1').divisionClinched,true);assert.equal(P.bounds(rows,5).find(r=>r.id==='1').divisionClinched,false);
console.log('PASS seeded simulations, qualification/bye totals, completed seasons, conservative bounds and incomplete-data rejection');
