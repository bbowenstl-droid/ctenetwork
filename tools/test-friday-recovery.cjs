const assert = require('node:assert/strict');
const E = require('../js/sportsbook-engine.js');
global.window = {};
require('../data/sportsbook-data.js');
require('../news-2026-10-09-friday-recovery.js');
const B = window.CTE_SPORTSBOOK, story = window.CTE_NEWS[0];
const results = Object.fromEntries(Object.entries(B.results).map(([id,r])=>[id,{...r,final:true}]));
assert.ok(Date.parse(B.updatedAt) < Date.parse(B.lockAt));
assert.equal(B.lockAt, '2026-10-11T12:00:00-05:00');
assert.equal(E.weekMarkets(B).length, 6);
for (const m of E.weekMarkets(B)) {
  for (const side of m.sides) {
    const t = B.recovery.teams[side];
    assert.equal(Math.round((t.scored+t.players.reduce((s,p)=>s+(p.remainingEstimate||0),0))*100)/100,t.fullWeekEstimate);
    for (const type of ['ml','ats']) {
      const id=E.selectionId(m.id,type,side),old=m.previousQuote;
      const legacy=E.ticketSelection(B,id,{});
      assert.equal(legacy.odds,type==='ml'?old.moneyline[side]:old.spread[side].odds);
      if(type==='ats')assert.equal(legacy.line,old.spread[side].line);
      const pinned=E.ticketSelection(B,id,{quotes:E.quoteSnapshot(B,[id])});
      assert.equal(pinned.odds,type==='ml'?m.moneyline[side]:m.spread[side].odds);
      if(type==='ats')assert.equal(pinned.line,m.spread[side].line);
    }
  }
  assert.ok(m.spread[m.sides[0]].line === -m.spread[m.sides[1]].line);
}
for (const [id,balance] of [['carl',918.91],['holly',1259.02]]) {
  const card=B.personalities[id].cards[5],led=E.bankrollLedger(B,id,results);
  assert.ok(!card.lateRelease && Date.parse(card.postedAt)<Date.parse(B.lockAt));
  assert.equal(led.thisWeek.start,balance);assert.equal(led.thisWeek.staked,balance);
  assert.deepEqual(led.thisWeek.issues,[]);assert.equal(led.thisWeek.status,'pending');
  assert.equal(led.records.total.w,4);assert.equal(led.records.total.l,2);
  assert.equal(card.wagers.filter(w=>w.type==='ml').length,3);
  assert.equal(card.wagers.filter(w=>w.type==='ats').length,3);
  assert.equal(new Set(card.wagers.map(w=>w.market)).size,6);
  assert.equal(led.thisWeek.wagers.filter(w=>w.status==='pending').length,6);
}
assert.equal(story.publishedAt,B.updatedAt);
assert.ok(story.body.includes('138.90–113.00')&&story.body.includes('126.90–116.00'));
assert.ok(story.body.includes('Dan 125.00, Carter 118.00'));
assert.ok(story.body.includes('not Lamar Jackson'));
assert.equal(E.bookPhase(B,Date.parse(B.updatedAt),results),'open');
assert.equal(E.bookPhase(B,Date.parse(B.lockAt)-1,results),'open');
assert.equal(E.bookPhase(B,Date.parse(B.lockAt),results),'live');
assert.ok(!story.body.includes('submission audit') && !story.body.includes('commissioner must'));
assert.equal(B.lineSchedule.openingDay,'Wednesday');
assert.equal(B.lineSchedule.refreshDay,'Friday');
for (const m of E.weekMarkets(B)) for (const side of m.sides) {
 const id=E.selectionId(m.id,'ats',side);
 assert.equal(E.ticketSelection(B,id,{lockedAt:'2026-10-08T10:00:00-05:00'}).line,m.previousQuote.spread[side].line);
 assert.equal(E.ticketSelection(B,id,{lockedAt:'2026-10-09T12:00:00-05:00'}).line,m.spread[side].line);
}
console.log('PASS: Sunday cutoff, Friday estimates, bankroll carryover and accepted-price protection');
