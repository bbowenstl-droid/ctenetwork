/* CTE Sportsbook engine tests — run: node tools/test-sportsbook.cjs (no dependencies) */
const assert = require('assert');
const path = require('path');
const E = require(path.join(__dirname, '..', 'js', 'sportsbook-engine.js'));
global.window = {};
require(path.join(__dirname, '..', 'data', 'sportsbook-data.js'));
const LIVE = window.CTE_SPORTSBOOK;
/* Math scenarios run on a pinned price fixture so they don't change when the board is repriced. */
const PINNED = {
  'w4-brendan-jacob': { spread: { brendan: -105, jacob: -115 }, ml: { brendan: 525, jacob: -750 } },
  'w4-brett-carter': { spread: { brett: -120, carter: 100 }, ml: { brett: -475, carter: 350 } },
  'w4-mike-jerry': { spread: { mike: -105, jerry: -115 }, ml: { mike: 450, jerry: -625 } },
  'w4-dan-isaiah': { spread: { dan: -115, isaiah: -105 }, ml: { dan: 170, isaiah: -210 } },
  'w4-cotton-troy': { spread: { cotton: 105, troy: -125 }, ml: { cotton: 310, troy: -400 } },
  'w4-jesse-elijah': { spread: { jesse: -110, elijah: -110 }, ml: { jesse: 260, elijah: -325 } }
};
const BOOK = JSON.parse(JSON.stringify(LIVE));
for (const m of BOOK.markets) { const x = PINNED[m.id]; if (!x) continue; for (const k in x.spread) m.spread[k].odds = x.spread[k]; Object.assign(m.moneyline, x.ml); }
const clone = o => JSON.parse(JSON.stringify(o));
let passed = 0;
const test = (name, fn) => { try { fn(); passed++; } catch (e) { console.error('FAIL', name, '\n ', e.message); process.exitCode = 1; } };

/* The official locked Week 4 final board */
const EXPECTED = {
  'w4-brendan-jacob': { spread: { brendan: [16.5, -105], jacob: [-16.5, -115] }, ml: { brendan: 525, jacob: -750 }, open: ['jacob', 12.5], final: ['jacob', 16.5] },
  'w4-brett-carter': { spread: { brett: [-12.5, -120], carter: [12.5, 100] }, ml: { brett: -475, carter: 350 }, open: ['brett', 8.5], final: ['brett', 12.5] },
  'w4-mike-jerry': { spread: { mike: [14.5, -105], jerry: [-14.5, -115] }, ml: { mike: 450, jerry: -625 }, open: ['jerry', 10.5], final: ['jerry', 14.5] },
  'w4-dan-isaiah': { spread: { dan: [4.5, -115], isaiah: [-4.5, -105] }, ml: { dan: 170, isaiah: -210 }, open: ['isaiah', 6.5], final: ['isaiah', 4.5] },
  'w4-cotton-troy': { spread: { cotton: [9.5, 105], troy: [-9.5, -125] }, ml: { cotton: 310, troy: -400 }, open: ['troy', 7.5], final: ['troy', 9.5] },
  'w4-jesse-elijah': { spread: { jesse: [7.5, -110], elijah: [-7.5, -110] }, ml: { jesse: 260, elijah: -325 }, open: ['elijah', 5.5], final: ['elijah', 7.5] }
};
test('six Week 4 markets with exact lines, juice, moneylines, open and final', () => {
  const ms = E.weekMarkets(LIVE, 4);
  assert.strictEqual(ms.length, 6);
  for (const m of ms) {
    const x = EXPECTED[m.id]; assert.ok(x, 'unexpected market ' + m.id);
    for (const [side, [line, odds]] of Object.entries(x.spread)) { assert.strictEqual(m.spread[side].line, line); assert.strictEqual(m.spread[side].odds, odds); }
    for (const [side, odds] of Object.entries(x.ml)) assert.strictEqual(m.moneyline[side], odds);
    const mv = E.lineMovement(m);
    assert.deepStrictEqual([mv.open.fav, mv.open.points], x.open);
    assert.deepStrictEqual([mv.current.fav, mv.current.points], x.final);
    // Both sides of a spread must mirror each other.
    assert.strictEqual(m.spread[m.sides[0]].line, -m.spread[m.sides[1]].line);
  }
});
test('every owner in a market is an active CTE owner', () => {
  require(path.join(__dirname, '..', 'data', 'league-data.js'));
  const owners = window.CTE_LEAGUE_DATA.owners, seen = new Set();
  for (const m of E.weekMarkets(BOOK, 4)) for (const s of m.sides) { assert.strictEqual(owners[s]?.status, 'active', s); assert.ok(!seen.has(s), s + ' twice'); seen.add(s); }
  assert.strictEqual(seen.size, 12);
});

/* Odds math */
test('positive American odds: profit = stake × odds / 100', () => {
  assert.strictEqual(E.profit(100, 525), 525); assert.strictEqual(E.totalReturn(100, 525), 625);
  assert.strictEqual(E.profit(100, 100), 100); assert.strictEqual(E.profit(250, 170), 425);
  assert.strictEqual(E.profit(37.5, 310), 116.25);
});
test('negative American odds: profit = stake × 100 / |odds|', () => {
  assert.strictEqual(E.profit(100, -750), 13.33); assert.strictEqual(E.totalReturn(100, -750), 113.33);
  assert.strictEqual(E.profit(100, -110), 90.91); assert.strictEqual(E.profit(110, -110), 100);
  assert.strictEqual(E.profit(100, -105), 95.24); assert.strictEqual(E.totalReturn(100, -105), 195.24);
  assert.strictEqual(E.profit(500, -400), 125);
});
test('implied probability', () => {
  assert.strictEqual(E.impliedProbability(100).toFixed(4), '0.5000');
  assert.strictEqual(E.impliedProbability(-750).toFixed(4), '0.8824');
  assert.strictEqual(E.impliedProbability(525).toFixed(4), '0.1600');
});
test('invalid odds are rejected', () => { assert.throws(() => E.profit(100, 50)); assert.throws(() => E.profit(100, 'x')); assert.throws(() => E.profit(-5, 110)); });
test('formatting', () => {
  assert.strictEqual(E.formatOdds(-750), '\u2212750'); assert.strictEqual(E.formatOdds(100), '+100');
  assert.strictEqual(E.formatLine(16.5), '+16.5'); assert.strictEqual(E.formatLine(-4.5), '\u22124.5');
  assert.strictEqual(E.formatMoney(1000), 'CTE$1,000'); assert.strictEqual(E.formatMoney(1340.5), 'CTE$1,340.50');
  assert.strictEqual(E.formatMoney(-120), '\u2212CTE$120'); assert.strictEqual(E.formatMoney(95.24, { sign: true }), '+CTE$95.24');
});

/* Grading */
test('spread grading incl. push', () => {
  assert.strictEqual(E.gradeSpread(-16.5, 140, 120), 'won');   // Jacob by 20
  assert.strictEqual(E.gradeSpread(16.5, 120, 140), 'lost');   // Brendan +16.5 loses by 20
  assert.strictEqual(E.gradeSpread(16.5, 125, 140), 'won');    // Brendan loses by 15, covers
  assert.strictEqual(E.gradeSpread(-4, 104, 100), 'push');
  assert.strictEqual(E.gradeSpread(-9.5, 104.6, 91.2), 'won');  // Troy example
  // float trap: 0.1+0.2 style margins must not create phantom wins
  assert.strictEqual(E.gradeSpread(-0.3, 100.3, 100), 'push');
});
test('moneyline grading incl. tie push', () => {
  assert.strictEqual(E.gradeMoneyline(100, 99.99), 'won'); assert.strictEqual(E.gradeMoneyline(99, 100), 'lost'); assert.strictEqual(E.gradeMoneyline(100, 100), 'push');
});
test('live status never settles', () => {
  const sel = E.selection(BOOK, 'w4-cotton-troy:ats:troy');
  const live = E.liveStatus(sel, { troy: 88.4, cotton: 74.1 });
  assert.strictEqual(live.status, 'covering'); assert.strictEqual(live.margin, 14.3);
  assert.strictEqual(E.settle(sel, 100, {}).status, 'pending');
  assert.strictEqual(E.settle(sel, 100, { 'w4-cotton-troy': { final: false, scores: { troy: 88.4, cotton: 74.1 } } }).status, 'pending');
  const ml = E.liveStatus(E.selection(BOOK, 'w4-cotton-troy:ml:cotton'), { troy: 88.4, cotton: 74.1 });
  assert.strictEqual(ml.status, 'losing');
});
test('settlement payouts', () => {
  const r = { 'w4-brendan-jacob': { final: true, scores: { brendan: 130, jacob: 120 } } };
  const dog = E.settle(E.selection(BOOK, 'w4-brendan-jacob:ml:brendan'), 100, r);
  assert.deepStrictEqual([dog.status, dog.profit, dog.returned], ['won', 525, 625]);
  const fav = E.settle(E.selection(BOOK, 'w4-brendan-jacob:ml:jacob'), 100, r);
  assert.deepStrictEqual([fav.status, fav.profit, fav.returned], ['lost', -100, 0]);
  const push = E.settle(E.selection(BOOK, 'w4-brendan-jacob:ats:jacob', { line: -10 }), 100, r); // pinned number
  assert.strictEqual(push.status, 'lost');
  const p2 = E.settle(E.selection(BOOK, 'w4-brendan-jacob:ats:jacob', { line: 10 }), 100, r);
  assert.deepStrictEqual([p2.status, p2.profit, p2.returned], ['push', 0, 100]);
});

/* Line movement */
test('line movement direction and size', () => {
  const mv = id => E.lineMovement(E.market(BOOK, id));
  assert.deepStrictEqual([mv('w4-brendan-jacob').points, mv('w4-brendan-jacob').toward], [4, 'jacob']);
  assert.deepStrictEqual([mv('w4-dan-isaiah').points, mv('w4-dan-isaiah').toward], [2, 'dan']);
  assert.deepStrictEqual([mv('w4-cotton-troy').points, mv('w4-cotton-troy').toward], [2, 'troy']);
  const flip = { sides: ['a', 'b'], lineHistory: [{ fav: 'a', points: 1.5 }, { fav: 'b', points: 2.5 }] };
  const f = E.lineMovement(flip); assert.deepStrictEqual([f.points, f.toward, f.favoriteChanged], [4, 'b', true]);
  const multi = { sides: ['a', 'b'], lineHistory: [{ fav: 'a', points: 3 }, { fav: 'a', points: 6 }, { fav: 'a', points: 5 }] };
  assert.strictEqual(E.lineMovement(multi).steps.length, 3); assert.strictEqual(E.lineMovement(multi).points, 2);
});

/* Challenge card rules */
test('card enforces exactly 3 ML + 3 ATS', () => {
  let ids = [];
  const add = id => { const r = E.toggleSelection(ids, id, BOOK); ids = r.ids; return r; };
  add('w4-brendan-jacob:ml:jacob'); add('w4-brett-carter:ml:brett');
  assert.strictEqual(E.validateCard(ids, BOOK).valid, false);
  add('w4-mike-jerry:ml:jerry');
  const blocked = add('w4-dan-isaiah:ml:dan');
  assert.strictEqual(blocked.action, 'blocked'); assert.strictEqual(E.cardCounts(ids).ml, 3);
  add('w4-dan-isaiah:ats:dan'); add('w4-cotton-troy:ats:troy');
  assert.deepStrictEqual(E.cardCounts(ids), { ml: 3, ats: 2, total: 5 });
  assert.strictEqual(E.validateCard(ids, BOOK).valid, false);
  add('w4-jesse-elijah:ats:jesse');
  const v = E.validateCard(ids, BOOK); assert.ok(v.valid, v.errors.join(', ')); assert.strictEqual(v.counts.total, 6);
  assert.strictEqual(add('w4-brendan-jacob:ats:brendan').action, 'blocked');
});
test('toggle removes, and picking the other side swaps', () => {
  let r = E.toggleSelection([], 'w4-brendan-jacob:ats:jacob', BOOK);
  r = E.toggleSelection(r.ids, 'w4-brendan-jacob:ats:brendan', BOOK);
  assert.strictEqual(r.action, 'swapped'); assert.deepStrictEqual(r.ids, ['w4-brendan-jacob:ats:brendan']);
  r = E.toggleSelection(r.ids, 'w4-brendan-jacob:ats:brendan', BOOK);
  assert.strictEqual(r.action, 'removed'); assert.deepStrictEqual(r.ids, []);
  // ML and ATS on the same game are separate markets
  r = E.toggleSelection(['w4-brendan-jacob:ats:brendan'], 'w4-brendan-jacob:ml:jacob', BOOK);
  assert.strictEqual(r.ids.length, 2);
});
test('validation rejects both sides and unknown ids', () => {
  const v = E.validateCard(['w4-brendan-jacob:ml:jacob', 'w4-brendan-jacob:ml:brendan', 'nope:ml:x'], BOOK);
  assert.ok(!v.valid); assert.ok(v.errors.some(e => /Both sides/.test(e))); assert.ok(v.errors.some(e => /Unknown/.test(e)));
});
test('entry line round trip', () => {
  const ids = ['w4-brendan-jacob:ml:jacob', 'w4-cotton-troy:ats:troy'];
  const line = E.entryLine('brendan', 4, ids);
  assert.deepStrictEqual(E.parseEntryLine(line), { week: 4, ownerId: 'brendan', ids });
});

/* Carl / Anita bankroll */
function w5Book() {
  const b = clone(BOOK);
  // A fictional Week 5 slate for carry-forward tests (test fixture only)
  const pairs = [['brendan', 'troy'], ['jacob', 'mike'], ['brett', 'jesse'], ['carter', 'isaiah'], ['dan', 'jerry'], ['cotton', 'elijah']];
  for (const [a, c] of pairs) b.markets.push({ id: `w5-${a}-${c}`, week: 5, sides: [a, c], spread: { [a]: { line: -3.5, odds: -110 }, [c]: { line: 3.5, odds: -110 } },
    moneyline: { [a]: -150, [c]: 130 }, lineHistory: [{ fav: a, points: 3.5 }] });
  b.week = 5;
  return b;
}
const W4 = ['w4-brendan-jacob', 'w4-brett-carter', 'w4-mike-jerry', 'w4-dan-isaiah', 'w4-cotton-troy', 'w4-jesse-elijah'];
const allFinal = scores => Object.fromEntries(W4.map((id, i) => [id, { final: true, scores: scores[i] }]));
test('bankroll starts at CTE$1,000 with no card', () => {
  const b = JSON.parse(JSON.stringify(BOOK)); b.personalities.carl.cards = {};
  const L = E.bankrollLedger(b, 'carl', {});
  assert.strictEqual(L.current, 1000); assert.strictEqual(L.thisWeek.status, 'no-card'); assert.strictEqual(L.thisWeek.start, 1000);
});
test('board favorites match the tickets Carl and Anita bet', () => {
  for (const id of ['carl', 'holly']) for (const w of LIVE.personalities[id].cards[4].wagers) {
    const m = E.market(LIVE, w.market);
    assert.strictEqual(w.type === 'ml' ? m.moneyline[w.side] : m.spread[w.side].odds, w.odds, `${id} ${w.market} ${w.type} ${w.side}`);
  }
});
test('Week 4 Carl/Anita tickets use final board prices and match the published max returns', () => {
  for (const [id, max] of [['carl', 1513.36], ['holly', 1449.76]]) {
    const w = E.bankrollLedger(LIVE, id, {}).thisWeek;
    assert.strictEqual(w.staked, 1000); assert.deepStrictEqual(w.issues, []);
    assert.strictEqual(Math.round((1000 + w.wagers.reduce((a, x) => a + E.profit(x.stake, x.sel.odds), 0)) * 100) / 100, max);
  }
});
test('bankroll carries forward — no refill — and next week must stake it all', () => {
  const b = w5Book();
  b.personalities.carl.cards[4] = { wagers: [
    { market: 'w4-brendan-jacob', type: 'ml', side: 'brendan', stake: 100 },   // +525 win → +525
    { market: 'w4-brett-carter', type: 'ml', side: 'brett', stake: 200 },      // lose → −200
    { market: 'w4-mike-jerry', type: 'ml', side: 'jerry', stake: 100 },        // −625 win → +16
    { market: 'w4-dan-isaiah', type: 'ats', side: 'dan', stake: 200 },         // push? no: see scores
    { market: 'w4-cotton-troy', type: 'ats', side: 'troy', stake: 250, lock: true }, // cover → +200
    { market: 'w4-jesse-elijah', type: 'ats', side: 'jesse', stake: 150 }      // lose → −150
  ] };
  const results = allFinal([
    { brendan: 130, jacob: 120 }, { brett: 90, carter: 110 }, { mike: 100, jerry: 120 },
    { dan: 100, isaiah: 104.5 }, { cotton: 80, troy: 100 }, { jesse: 90, elijah: 110 }
  ]);
  let L = E.bankrollLedger(b, 'carl', results);
  const w4 = L.weeks.find(w => w.week === 4);
  assert.strictEqual(w4.start, 1000); assert.strictEqual(w4.staked, 1000); assert.deepStrictEqual(w4.issues, []);
  // returns: 625 + 0 + 116 + 200 (push on +4.5 when losing by 4.5) + 450 + 0 = 1391
  assert.strictEqual(w4.wagers[3].status, 'push');
  assert.strictEqual(w4.end, 1391); assert.strictEqual(w4.pnl, 391);
  const w5 = L.weeks.find(w => w.week === 5);
  assert.strictEqual(w5.start, 1391, 'Week 5 bankroll = Week 4 ending bankroll');
  assert.strictEqual(L.current, 1391); assert.strictEqual(L.seasonPnl, 391);
  assert.deepStrictEqual(L.records.locks, { w: 1, l: 0, p: 0 });
  assert.deepStrictEqual(L.records.upsets, { w: 1, l: 0, p: 0 });
  assert.strictEqual(L.biggestWin.sel.side, 'brendan');
  // Week 5 card that stakes only the old CTE$1,000 is flagged
  b.personalities.carl.cards[5] = { wagers: b.markets.filter(m => m.week === 5).map((m, i) => ({ market: m.id, type: i < 3 ? 'ml' : 'ats', side: m.sides[0], stake: 1000 / 6 })) };
  L = E.bankrollLedger(b, 'carl', results);
  assert.ok(L.weeks.find(w => w.week === 5).issues.some(x => /bankroll is CTE\$1,391/.test(x)));
  // Staking the full 1,391 is valid
  const stakes = [231.83, 231.83, 231.83, 231.83, 231.84, 231.84];
  b.personalities.carl.cards[5].wagers.forEach((w, i) => { w.stake = stakes[i]; });
  L = E.bankrollLedger(b, 'carl', results);
  assert.deepStrictEqual(L.weeks.find(w => w.week === 5).issues, []);
});
test('losing bankroll carries forward too', () => {
  const b = w5Book();
  b.personalities.holly.cards[4] = { wagers: W4.map((id, i) => ({ market: id, type: i < 3 ? 'ml' : 'ats', side: b.markets.find(m => m.id === id).sides[1], stake: [100, 100, 100, 300, 200, 200][i] })) };
  const results = allFinal(W4.map((id, i) => { const m = b.markets.find(x => x.id === id); return { [m.sides[0]]: 150, [m.sides[1]]: i === 0 ? 170 : 100 }; }));
  const L = E.bankrollLedger(b, 'holly', results);
  // only Jacob ML (-750, stake 100) wins → returns 113.33
  assert.strictEqual(L.weeks[0].end, 113.33); assert.strictEqual(L.weeks[1].start, 113.33); assert.strictEqual(L.current, 113.33);
});
test('pending week leaves later bankroll unknown, not guessed', () => {
  const b = w5Book();
  b.personalities.carl.cards[4] = { wagers: W4.map((id, i) => ({ market: id, type: i < 3 ? 'ml' : 'ats', side: b.markets.find(m => m.id === id).sides[0], stake: 1000 / 6 })) };
  const L = E.bankrollLedger(b, 'carl', { 'w4-brendan-jacob': { final: true, scores: { brendan: 1, jacob: 2 } } });
  assert.strictEqual(L.weeks[0].status, 'pending'); assert.strictEqual(L.weeks[1].start, null); assert.strictEqual(L.current, 1000);
});

/* Leaderboard */
test('leaderboard ranks by profit, not win %', () => {
  const b = clone(BOOK);
  b.leagueChallenge.cards[4] = {
    // 4–2 on chalk
    brendan: ['w4-brendan-jacob:ml:jacob', 'w4-brett-carter:ml:brett', 'w4-mike-jerry:ml:jerry', 'w4-dan-isaiah:ats:isaiah', 'w4-cotton-troy:ats:troy', 'w4-jesse-elijah:ats:elijah'],
    // 2–4 but hits a +525 dog
    jacob: ['w4-brendan-jacob:ml:brendan', 'w4-brett-carter:ml:carter', 'w4-mike-jerry:ml:mike', 'w4-dan-isaiah:ats:dan', 'w4-cotton-troy:ats:cotton', 'w4-jesse-elijah:ats:jesse']
  };
  const results = allFinal([
    { brendan: 130, jacob: 120 }, { brett: 120, carter: 100 }, { mike: 90, jerry: 120 },
    { dan: 90, isaiah: 110 }, { cotton: 80, troy: 100 }, { jesse: 125, elijah: 110 }
  ]);
  const rows = E.leaderboard(b, results);
  const by = Object.fromEntries(rows.map(r => [r.ownerId, r]));
  assert.strictEqual(E.recordText(by.brendan.total), '4\u20132'); assert.strictEqual(E.recordText(by.jacob.total), '2\u20134');
  assert.strictEqual(rows[0].ownerId, 'jacob', 'profit beats win %');
  assert.strictEqual(by.jacob.bestHit.profit, 525);
  assert.strictEqual(by.brendan.profit, E.round2(-100 + 21.05 + 16 + 95.24 + 80 - 100));
  assert.strictEqual(by.jacob.roi.toFixed(4), (by.jacob.profit / 600).toFixed(4));
});

/* Parlays */
test('parlay price multiplies decimal odds', () => {
  const legs = [E.selection(BOOK, 'w4-brendan-jacob:ml:jacob'), E.selection(BOOK, 'w4-cotton-troy:ats:troy')]; // -750, -125
  const p = E.parlayPrice(legs);
  assert.strictEqual(p.decimal.toFixed(4), ((1 + 100 / 750) * (1 + 100 / 125)).toFixed(4));
  assert.deepStrictEqual(E.parlayPayout(100, legs), { profit: 104, returned: 204 });
  assert.strictEqual(E.americanFromDecimal(2.04), 104); assert.strictEqual(E.americanFromDecimal(1.5), -200);
});
test('parlay validation: 2–6 legs, one per matchup, this week only', () => {
  assert.ok(!E.validateParlay(['w4-brendan-jacob:ml:jacob'], BOOK).valid);
  assert.ok(E.validateParlay(['w4-brendan-jacob:ml:jacob', 'w4-mike-jerry:ats:mike'], BOOK).valid);
  assert.ok(!E.validateParlay(['w4-brendan-jacob:ml:jacob', 'w4-brendan-jacob:ats:brendan'], BOOK).valid, 'same game blocked');
  let ids = []; for (const m of W4) ids = E.toggleParlayLeg(ids, m + ':ml:' + E.market(BOOK, m).sides[0], BOOK).ids;
  assert.strictEqual(ids.length, 6); assert.ok(E.validateParlay(ids, BOOK).valid);
  const swap = E.toggleParlayLeg(ids, 'w4-brendan-jacob:ats:jacob', BOOK);
  assert.strictEqual(swap.action, 'swapped'); assert.strictEqual(swap.ids.length, 6);
});
test('parlay settlement: loss kills it, push drops a leg, pending waits', () => {
  const ids = ['w4-brendan-jacob:ml:jacob', 'w4-cotton-troy:ats:troy', 'w4-dan-isaiah:ats:dan'];
  const base = { 'w4-brendan-jacob': { final: true, scores: { brendan: 90, jacob: 120 } }, 'w4-cotton-troy': { final: true, scores: { cotton: 80, troy: 100 } } };
  assert.strictEqual(E.settleParlay(ids, BOOK, 100, base).status, 'pending');
  const push = E.settleParlay(ids, BOOK, 100, { ...base, 'w4-dan-isaiah': { final: true, scores: { dan: 100, isaiah: 104.5 } } });
  assert.strictEqual(push.status, 'won'); assert.strictEqual(push.legsPaid, 2); assert.strictEqual(push.profit, 104);
  const lost = E.settleParlay(ids, BOOK, 100, { ...base, 'w4-dan-isaiah': { final: true, scores: { dan: 90, isaiah: 110 } } });
  assert.deepStrictEqual([lost.status, lost.profit], ['lost', -100]);
});
test('cloud submissions merge over the ledger and feed both leaderboards', () => {
  const card = ['w4-brendan-jacob:ml:jacob', 'w4-brett-carter:ml:brett', 'w4-mike-jerry:ml:jerry', 'w4-dan-isaiah:ats:isaiah', 'w4-cotton-troy:ats:troy', 'w4-jesse-elijah:ats:elijah'];
  const b = E.withSubmissions(BOOK, 4, { mike: { ids: card, lockedAt: 'x' } }, { mike: { ids: ['w4-brendan-jacob:ml:jacob', 'w4-cotton-troy:ats:troy'] } });
  assert.deepStrictEqual(b.leagueChallenge.cards[4].mike, card);
  assert.ok(!BOOK.leagueChallenge.cards[4], 'original book untouched');
  const results = allFinal([{ brendan: 90, jacob: 120 }, { brett: 120, carter: 100 }, { mike: 90, jerry: 120 }, { dan: 90, isaiah: 110 }, { cotton: 80, troy: 100 }, { jesse: 90, elijah: 110 }]);
  const pl = E.parlayLeaderboard(b, results);
  assert.strictEqual(pl[0].ownerId, 'mike'); assert.strictEqual(pl[0].hits, 1); assert.strictEqual(pl[0].profit, 104);
  assert.strictEqual(E.leaderboard(b, results).find(r => r.ownerId === 'mike').total.w, 6);
});
test('book phases: open → live at lock → final only when results are final', () => {
  const lock = E.lockTime(BOOK);
  assert.strictEqual(E.bookPhase(BOOK, lock - 1, {}), 'open');
  assert.strictEqual(E.bookPhase(BOOK, lock + 1, {}), 'live');
  const results = allFinal(W4.map(() => ({})));
  assert.strictEqual(E.bookPhase(BOOK, lock + 1, results), 'final');
});

console.log(process.exitCode ? `\n${passed} passed, some FAILED` : `PASS: ${passed} sportsbook engine tests`);
