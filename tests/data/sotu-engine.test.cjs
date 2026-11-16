'use strict';
/* State of the Union engine: reconciled against raw Sleeper responses, the earlier
 * hand-verified research (research/state-of-union/analysis.json, itself checked against
 * a second provider) and the frozen history fixture. No network. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const read = p => JSON.parse(fs.readFileSync(path.join(root, p), 'utf8'));
global.window = global.window || {};
require(path.join(root, 'data', 'league-data.js'));
const config = global.window.CTE_LEAGUE_DATA;
const E = require(path.join(root, 'js', 'cte-sotu-engine.js'));
const snap = read('data/sotu/snapshot.json');
const players = read('data/sotu/players.json');
const names = {}, positions = {};
for (const [k, v] of Object.entries(players)) { names[k] = v[0]; positions[k] = v[1]; }
const currentId = config.league.seasons[config.league.currentSeason].sleeperLeagueId;
const m = E.build({ ...E.assemble(snap.responses, currentId), config, names, positions });
const analysis = read('research/state-of-union/analysis.json');
const RAW = 'research/state-of-union/raw/';
const season = y => m.seasons.find(s => s.year === y);
const close = (a, b) => Math.abs(a - b) < 0.011;

test('walks previous_league_id through every season', () => {
  assert.deepEqual(m.seasons.map(s => s.year), [2025, 2026]);
  assert.equal(m.seasons[0].leagueId, config.league.seasons[2025].sleeperLeagueId);
  assert.equal(m.issues.length, 0, m.issues.join('; '));
});

test('standings equal Sleeper’s own roster records (raw API files)', () => {
  const raw = read(RAW + 'sleeper-rosters-2025.json');
  for (const r of raw) {
    const t = season(2025).table.find(x => x.rid === r.roster_id);
    assert.equal(t.w, r.settings.wins); assert.equal(t.l, r.settings.losses);
    assert.ok(close(t.pf, r.settings.fpts + r.settings.fpts_decimal / 100));
    assert.ok(close(t.pa, r.settings.fpts_against + r.settings.fpts_against_decimal / 100));
  }
  assert.ok(m.audit.length >= 12 && m.audit.every(a => a.ok !== false));
});

test('season tables equal the earlier verified research', () => {
  for (const y of [2025, 2026]) for (const t of season(y).table) {
    const r = analysis.stats[y][t.rid];
    assert.deepEqual(t.h2h, r.h2h); assert.deepEqual(t.med, r.median); assert.deepEqual(t.allPlay, r.allplay);
    assert.ok(close(t.pf, r.pf) && close(t.pa, r.pa)); assert.equal(t.manager, r.owner);
  }
});

test('every game matches research and the frozen history fixture, with manager attribution', () => {
  assert.equal(m.games.length, analysis.games.length);
  const key = (y, w, id) => [y, w, id].join(':');
  const mine = Object.fromEntries(m.games.map(g => [key(g.year, g.week, g.mid), g]));
  for (const g of analysis.games) {
    const x = mine[key(g.season, g.week, g.matchupId)];
    assert.ok(x && x.a === g.rosterA && x.sa === g.scoreA && x.sb === g.scoreB && x.ma === g.ownerA && x.mb === g.ownerB, 'game ' + key(g.season, g.week, g.matchupId));
  }
  for (const g of read('tools/fixtures/history-audit.json').expected) {
    const x = mine[key(g.season, g.week, g.matchupId)];
    assert.ok(x && x.ma === g.ownerA && x.mb === g.ownerB && x.sa === g.scoreA && x.sb === g.scoreB, 'fixture game ' + key(g.season, g.week, g.matchupId));
  }
});

test('postseason comes from the bracket, not the standings', () => {
  const f = season(2025).finish, who = rid => m.managerAt(2025, rid, 99);
  assert.equal(who(f.champion), config.championships[0].championOwnerId);
  assert.equal(who(f.runnerUp), config.championships[0].runnerUpOwnerId);
  assert.equal(String(f.champion), read(RAW + 'sleeper-league-2026.json').metadata.latest_league_winner_roster_id);
  assert.equal(who(f.third), 'jerry');
  assert.equal(who(f.regularSeason.rid), 'jerry'); // best record was not the champion
  assert.deepEqual(f.playoffTeams, [1, 2, 3, 9, 11, 12]);
  assert.equal(who(f.toiletBowl), 'mike'); assert.equal(who(f.lastPlace.rid), 'jesse');
  const cur = season(2026).finish;
  assert.equal(cur.champion, null); assert.deepEqual(cur.playoffTeams, []); // in progress: nothing clinched
  assert.equal(m.allTime.manager.find(r => r.id === 'brendan').playoff.join('-'), '3-0');
});

test('franchise history is continuous; manager records are separate', () => {
  const mgr = id => m.allTime.manager.find(r => r.id === id);
  assert.equal(mgr('jeremy').games, 3); assert.equal(mgr('tyler').games, 14);
  assert.equal(mgr('isaiah').games, 11 + 9); assert.equal(mgr('carter').games, 9);
  assert.equal(m.allTime.franchise.find(r => r.rid === 7).games, 23);
  assert.equal(m.allTime.franchise.find(r => r.rid === 5).games, 23);
  assert.deepEqual(m.franchises.find(f => f.rid === 7).managers.map(x => x.id), ['jeremy', 'isaiah']);
  assert.deepEqual(m.franchises.find(f => f.rid === 5).managers.map(x => x.id), ['tyler', 'carter']);
  for (const [id, o] of Object.entries(analysis.ownerStats)) {
    const r = mgr(id);
    assert.deepEqual([r.h2h[0], r.h2h[1], r.playoff[0], r.playoff[1], r.titles], [o.regularWins, o.regularLosses, o.playoffWins, o.playoffLosses, o.championships], id);
  }
});

test('trade ledger equals raw Sleeper transactions and the verified research', () => {
  const rawIds = [];
  for (const [y, last] of [[2025, 18], [2026, 10]]) for (let w = 1; w <= last; w++) for (const t of read(`${RAW}sleeper-transactions-${y}-${w}.json`)) if (t.type === 'trade' && t.status === 'complete') rawIds.push(t.transaction_id);
  assert.deepEqual(m.trades.map(t => t.id).sort(), rawIds.sort());
  analysis.trades.forEach((t, i) => {
    const x = m.trades[i];
    assert.equal(x.id, t.providerId); assert.equal(x.ref, t.id);
    assert.equal(x.moves.map(v => `${v.asset}:${v.from}>${v.to}`).sort().join('|'), t.transfers.map(v => `${v.asset}:${v.from}>${v.to}`).sort().join('|'));
  });
  assert.equal(m.links.map(l => m.tradeById[l.from].ref + '>' + m.tradeById[l.to].ref).sort().join(), analysis.links.map(l => l.from + '>' + l.to).sort().join());
});

test('replaying every draft, trade, pickup and drop reproduces today’s rosters and pick ownership', () => {
  const held = {};
  for (const [asset, list] of Object.entries(m.histories)) if (asset.startsWith('player:')) { const last = list[list.length - 1]; if (last.to != null) held[asset.slice(7)] = last.to; }
  let n = 0;
  for (const r of read(RAW + 'sleeper-rosters-2026.json')) for (const pid of r.players) { assert.equal(held[pid], r.roster_id, 'player ' + pid); n++; }
  assert.equal(Object.keys(held).length, n);
  for (const p of read(RAW + 'sleeper-picks-2026.json')) {
    const list = (m.histories[E.pickKey(p.season, p.round, p.roster_id)] || []).filter(e => e.type === 'trade');
    if (Number(p.season) > 2026) assert.equal(list.length ? list[list.length - 1].to : p.roster_id, p.owner_id, 'pick ' + JSON.stringify(p));
  }
});

test('draft boards and original pick ownership match the second provider', () => {
  for (const y of [2025, 2026]) {
    const d = m.drafts.find(x => x.year === y), other = read(`${RAW}flaim-draft-${y}.json`).data.picks;
    assert.equal(d.picks.length, other.length);
    for (const p of other) { const x = d.picks[p.overallPick - 1]; assert.deepEqual([x.pid, x.rid, x.orig], [String(p.playerId), p.selectionTeamId, p.originalTeamId]); }
  }
  assert.equal(m.drafts[0].startup, true); assert.equal(m.drafts[1].startup, false);
});

test('records and “points since” recomputed independently from raw matchup files', () => {
  let high = 0, low = 1e9; const pts = {};
  for (const [y, last] of [[2025, 17], [2026, 9]]) for (let w = 1; w <= last; w++) for (const r of read(`${RAW}sleeper-matchups-${y}-${w}.json`)) {
    if (r.matchup_id != null) { high = Math.max(high, r.points); low = Math.min(low, r.points); }
    for (const [pid, v] of Object.entries(r.players_points || {})) (pts[pid] || (pts[pid] = [])).push({ y, w, rid: r.roster_id, v });
  }
  assert.equal(m.records.high[0].pf, high); assert.equal(m.records.low[0].pf, low);
  // T01 (2025 Week 3): Jacob got Chase Brown; Mike got DJ Moore and Javonte Williams.
  const t = m.trades[0];
  const since = (pid, rid) => Math.round(pts[pid].filter(x => x.y > t.year || x.w > t.week || (x.w === t.week && x.rid === rid)).reduce((a, x) => a + x.v, 0) * 100) / 100;
  for (const s of t.sides) for (const g of s.gets) assert.ok(close(g.value.pts, since(g.pid, s.rid)), g.label);
  assert.equal(m.name(t.sides.find(s => s.rid === t.leader).manager), 'Mike');
  // A traded pick is valued as the player drafted with it.
  const pick = m.trades.flatMap(x => x.sides.flatMap(s => s.gets)).find(g => g.kind === 'pick' && g.used && g.value.pts > 0);
  assert.ok(close(pick.value.pts, Math.round(pts[pick.used.pid].filter(x => x.y >= pick.season).reduce((a, x) => a + x.v, 0) * 100) / 100));
});

test('summary, tree and journey are generated without unresolved names', () => {
  assert.ok(m.summary.lines.length >= 5);
  for (const l of m.summary.lines) assert.ok(!/Player \d|undefined|NaN|roster\d/.test(l.text), l.text);
  const tree = m.tradeTree(m.trades[2].id);
  assert.equal(tree.sides.length, 2);
  assert.ok(tree.sides.every(s => s.nodes.length && s.nodes.every(n => n.steps.length)));
  const j = m.journey('player:' + m.drafts[1].picks.find(p => p.orig !== p.rid).pid);
  assert.ok(j.events.some(e => e.type === 'trade') && j.events.some(e => e.type === 'selection'));
});

test('trim keeps the engine’s answer unchanged', () => {
  const again = {};
  for (const [p, d] of Object.entries(snap.responses)) again[p] = E.trim(p, d);
  const m2 = E.build({ ...E.assemble(again, currentId), config, names: { ...names }, positions: { ...positions } });
  assert.equal(JSON.stringify(m2.allTime), JSON.stringify(m.allTime));
  assert.equal(m2.trades.map(t => t.totalPts).join(), m.trades.map(t => t.totalPts).join());
});

test('a three-team trade (live since the snapshot) gets three sides and sender-accurate transfers', () => {
  // Shape copied from the live Sleeper response for 2026 Week 10 (transaction 1426706170696990720).
  const three = { type: 'trade', status: 'complete', transaction_id: '1426706170696990720', created: 1794700000000, status_updated: 1794700000000, leg: 10, roster_ids: [1, 4, 6],
    adds: { 11625: 6, 13301: 4, 7588: 1 }, drops: { 11625: 1, 13301: 6, 7588: 4 }, draft_picks: [{ season: '2027', round: 1, roster_id: 2, owner_id: 4, previous_owner_id: 1 }], waiver_budget: [] };
  const responses = { ...snap.responses }, p = `/league/${currentId}/transactions/10`;
  responses[p] = [...responses[p], three];
  const m3 = E.build({ ...E.assemble(responses, currentId), config, names: { ...names }, positions: { ...positions } });
  assert.equal(m3.trades.length, m.trades.length + 1); assert.equal(m3.issues.length, 0);
  const t = m3.tradeById[three.transaction_id];
  assert.deepEqual(t.sides.map(x => x.rid), [1, 4, 6]);
  assert.deepEqual(t.sides.map(x => x.gets.map(g => g.key).sort()), [['player:7588'], ['pick:2027:1:2', 'player:13301'], ['player:11625']]);
  assert.equal(t.sides[1].gets.find(g => g.kind === 'pick').from, 1);
  assert.ok(t.linksIn >= 1); // the 2027 first came to Brendan in an earlier trade
  assert.equal(m3.tradeTree(t.id).sides.length, 3);
});
