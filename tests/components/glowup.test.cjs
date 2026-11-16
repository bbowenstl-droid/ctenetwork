'use strict';
// Glow-up (2026-11-16): Game Day model, head-to-head matrix, trophies, calendar, team identity, theme wiring.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');
const test = require('node:test');
const G = require('../../js/cte-gameday.js'), H = require('../../js/cte-h2h.js'), T = require('../../js/cte-trophies.js'), C = require('../../js/cte-calendar.js'), Teams = require('../../js/cte-teams.js');
const calendar = require('../../data/cte-calendar.js');
const raw = n => JSON.parse(fs.readFileSync('research/state-of-union/raw/' + n + '.json', 'utf8'));
const row = (roster, matchup, pts, starters) => ({ roster_id: roster, matchup_id: matchup, points: pts.reduce((a, b) => a + b, 0), starters, starters_points: pts, players_points: Object.fromEntries(starters.map((s, i) => [s, pts[i]])) });

test('season averages ignore weeks a player did not score', () => {
  const avg = G.averages([[{ players_points: { a: 10, b: 0 } }], [{ players_points: { a: 20, b: 8 } }]]);
  assert.equal(avg.a, 15); assert.equal(avg.b, 8);
});
test('live matchup: pending starters are projected from their averages and the outlook follows the projection', () => {
  const avg = { a1: 20, a2: 10, b1: 12, b2: 12 };
  const m = G.model([[row(1, 1, [25, 0], ['a1', 'a2']), row(2, 1, [5, 0], ['b1', 'b2'])]], { status: 'live', averages: avg, median: true });
  const g = m.games[0];
  assert.equal(g.state, 'live'); assert.equal(g.a.pending, 1); assert.equal(g.a.projected, 35); assert.equal(g.b.projected, 17);
  assert.ok(g.pA > 0.9 && g.pA <= 0.99, 'favourite is capped below certainty while starters remain');
  assert.equal(m.topTeam.rosterId, 1); assert.equal(m.topPlayer.playerId, 'a1'); assert.equal(m.median, 15);
});
test('an underdog ahead of the pace is an upset watch; a tight projection is too close to call', () => {
  const avg = { a1: 30, a2: 30, b1: 20, b2: 20 }; // A favoured by 20
  const g = G.model([[row(1, 1, [4, 0], ['a1', 'a2']), row(2, 1, [38, 0], ['b1', 'b2'])]], { status: 'live', averages: avg }).games[0];
  assert.deepEqual(g.tags, ['upset-watch']); assert.equal(g.favorite, 'A');
  const close = G.model([[row(1, 1, [20, 0], ['a1', 'a2']), row(2, 1, [28, 0], ['b1', 'b2'])]], { status: 'live', averages: avg }).games[0];
  assert.ok(close.tags.includes('close'));
});
test('alerts and the median line wait for enough football to be played', () => {
  const avg = { a1: 30, a2: 30, a3: 30, a4: 30, b1: 20, b2: 20, b3: 20, b4: 20 };
  const early = G.model([[row(1, 1, [1, 0, 0, 0], ['a1', 'a2', 'a3', 'a4']), row(2, 1, [38, 0, 0, 0], ['b1', 'b2', 'b3', 'b4'])], [row(3, 2, [0, 0], ['a1', 'a2']), row(4, 2, [0, 0], ['b1', 'b2'])]], { status: 'live', averages: avg, median: true });
  assert.deepEqual(early.games[0].tags, [], '6 of 8 starters still to play: too early for an upset watch');
  assert.equal(early.median, null, 'half the league has not scored yet');
});
test('a scored week is final: no projection, no outlook guesswork, ties are not wins', () => {
  const avg = { a1: 30, a2: 30, b1: 20, b2: 20 };
  const m = G.model([[row(1, 1, [10, 0], ['a1', 'a2']), row(2, 1, [12, 0], ['b1', 'b2'])], [row(3, 2, [9, 1], ['a1', 'a2']), row(4, 2, [10, 0], ['b1', 'b2'])]], { status: 'final', averages: avg });
  assert.equal(m.games[0].a.pending, 0); assert.equal(m.games[0].a.projected, 10); assert.equal(m.games[0].pA, 0);
  assert.deepEqual(m.games[0].tags.sort(), ['photo-finish', 'upset']);
  assert.equal(m.games[1].pA, 0.5); assert.deepEqual(m.games[1].tags, []);
});
test('before kickoff nothing is live and no alert fires; without averages there is no outlook', () => {
  const pre = G.model([[row(1, 1, [0, 0], ['a1', 'a2']), row(2, 1, [0, 0], ['b1', 'b2'])]], { status: 'live', averages: { a1: 9, a2: 9, b1: 9, b2: 9 } });
  assert.equal(pre.games[0].state, 'upcoming'); assert.deepEqual(pre.games[0].tags, []); assert.equal(pre.anyStarted, false); assert.equal(pre.topTeam, null);
  assert.equal(G.model([[row(1, 1, [5, 0], ['a1', 'a2']), row(2, 1, [0, 0], ['b1', 'b2'])]], { status: 'live' }).games[0].pA, null);
});
test('real capture: Week 10 rows produce six games', () => {
  const pairs = Object.values(raw('sleeper-matchups-2026-10').reduce((m, r) => ((m[r.matchup_id] = m[r.matchup_id] || []).push(r), m), {}));
  const weeks = Array.from({ length: 9 }, (_, i) => raw('sleeper-matchups-2026-' + (i + 1)));
  const m = G.model(pairs, { status: 'live', averages: G.averages(weeks), median: true });
  assert.equal(m.games.length, 6);
  for (const g of m.games) { assert.ok(g.pA === null || (g.pA >= 0.01 && g.pA <= 0.99)); assert.ok(g.a.projected >= g.a.points); }
});

test('head-to-head: franchise view merges manager changes, manager view splits them', () => {
  const games = [
    { season: 2025, week: 2, matchupId: 1, rosterA: 7, rosterB: 1, ownerA: 'jeremy', ownerB: 'brendan', scoreA: 100, scoreB: 90 },
    { season: 2025, week: 9, matchupId: 1, rosterA: 1, rosterB: 7, ownerA: 'brendan', ownerB: 'isaiah', scoreA: 120, scoreB: 80 },
    { season: 2026, week: 3, matchupId: 2, rosterA: 7, rosterB: 1, ownerA: 'isaiah', ownerB: 'brendan', scoreA: 70, scoreB: 70 }
  ];
  const f = H.matrix(games, 'franchise'), m = H.matrix(games, 'manager');
  assert.equal(H.record(f.cells['7']['1']), '1–1–1'); assert.equal(H.record(f.cells['1']['7']), '1–1–1');
  assert.equal(H.record(m.cells.jeremy.brendan), '1–0'); assert.equal(H.record(m.cells.isaiah.brendan), '0–1–1'); assert.equal(H.record(m.cells.brendan.isaiah), '1–0–1');
  assert.equal(f.cells['7']['1'].games.length, 3); assert.equal(f.cells['1']['7'].pf, 280);
  assert.equal(H.notes(f, ['1', '7', '9']).unmet.length, 2);
});
test('head-to-head: every 2025 regular-season game lands in exactly two cells', () => {
  const games = [];
  for (let w = 1; w <= 14; w++) { const by = {}; for (const r of raw('sleeper-matchups-2025-' + w)) (by[r.matchup_id] = by[r.matchup_id] || []).push(r); for (const [a, b] of Object.values(by)) games.push({ season: 2025, week: w, matchupId: a.matchup_id, rosterA: a.roster_id, rosterB: b.roster_id, ownerA: 'o' + a.roster_id, ownerB: 'o' + b.roster_id, scoreA: a.points, scoreB: b.points }); }
  const m = H.matrix(games, 'franchise');
  assert.equal(games.length, 84);
  assert.equal(Object.values(m.cells).flatMap(r => Object.values(r)).reduce((n, c) => n + c.games.length, 0), 168);
  assert.equal(Object.values(m.totals).reduce((n, t) => n + t.w, 0), Object.values(m.totals).reduce((n, t) => n + t.l, 0));
});

test('trophies: 2025 hardware from the frozen Sleeper capture', () => {
  const own = { 1: 'brendan', 2: 'jacob', 3: 'brett', 4: 'mike', 5: 'tyler', 6: 'dan', 7: 'isaiah', 8: 'cotton', 9: 'jerry', 10: 'jesse', 11: 'elijah', 12: 'troy' };
  const games = [];
  for (let w = 1; w <= 17; w++) { const by = {}; for (const r of raw('sleeper-matchups-2025-' + w)) { if (r.matchup_id == null) continue; (by[r.matchup_id] = by[r.matchup_id] || []).push(r); } for (const [a, b] of Object.values(by)) games.push({ season: 2025, week: w, rosterA: a.roster_id, rosterB: b.roster_id, ownerA: own[a.roster_id], ownerB: own[b.roster_id], scoreA: a.points, scoreB: b.points, type: w < 15 ? 'regular' : 'championship' }); }
  const input = { season: 2025, complete: true, games, rosters: raw('sleeper-rosters-2025'), ownerOf: r => own[r], winners: raw('sleeper-winners-2025'), losers: raw('sleeper-losers-2025'), playoffStart: 15, recorded: { championOwnerId: 'brendan', runnerUpOwnerId: 'jacob' } };
  const s = T.season(input), by = Object.fromEntries(s.trophies.map(t => [t.key, t.owner]));
  assert.deepEqual(by, { champion: 'brendan', 'toilet-bowl': 'tyler', 'last-place': 'jesse' });
  // Sleeper ran this consolation bracket with the LOSER advancing; "last" is whoever lost out.
  assert.equal(T.consolationLast(input.losers, games, 15).format, 'losers-advance');
  assert.equal(s.honors.find(h => h.key === 'third').owner, 'jerry');
  assert.equal(s.honors.find(h => h.key === 'best-record').owner, 'jerry');
  assert.equal(T.cabinet([s])[0].owner, 'brendan');
  assert.equal(T.season({ ...input, recorded: { ...input.recorded, lastPlaceOwnerId: 'cotton' } }).trophies.find(t => t.key === 'last-place').owner, 'cotton', 'commissioner record overrides the derivation');
  const live = T.season({ ...input, complete: false });
  assert.equal(live.trophies.length, 0, 'no hardware before the season is complete');
});

test('calendar: dates follow Sleeper settings and the reviewed week anchor', () => {
  const season = calendar.seasons[2026], list = C.events(2026, season), by = Object.fromEntries(list.map(e => [e.id.replace('cte-2026-', ''), e]));
  assert.equal(C.week(season, 7).sunday, '2026-10-25', 'matches the recorded Week 7 sportsbook lock');
  assert.equal(by['trade-deadline'].start, '2026-11-23');
  assert.deepEqual([by['playoffs-round-1'].start, by['playoffs-round-3'].start, by['playoffs-round-3'].end], ['2026-12-17', '2026-12-31', '2027-01-04']);
  assert.equal(C.events(2026, season, { trade_deadline: 12 }).find(e => e.id.endsWith('trade-deadline')).start, '2026-11-30', 'live setting wins');
  assert.equal(C.events(2026, season, { trade_deadline: 0 }).some(e => e.id.endsWith('trade-deadline')), false, 'no deadline set means no invented date');
  assert.equal(C.next(list, '2026-11-16').id, 'cte-2026-trade-deadline'); assert.equal(C.daysUntil(by['trade-deadline'], '2026-11-16'), 7);
  assert.equal(C.currentWeek(season, '2026-11-16'), 10); assert.equal(C.currentWeek(season, '2026-11-17'), 10); assert.equal(C.currentWeek(season, '2026-11-18'), 11);
  assert.ok(!list.some(e => /2027 rookie/i.test(e.title)), 'unknown dates are left out');
});
test('calendar: iCalendar output is valid enough for Apple/Google and the committed file is current', () => {
  const ics = C.ics(C.events(2026, calendar.seasons[2026]), { stamp: calendar.updated });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'));
  assert.equal((ics.match(/BEGIN:VEVENT/g) || []).length, (ics.match(/END:VEVENT/g) || []).length);
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, 'folded line: ' + line);
  assert.match(ics, /DTSTART;VALUE=DATE:20261123\r\nDTEND;VALUE=DATE:20261124/);
  assert.ok(!/[^\r]\n/.test(ics), 'CRLF only');
  execFileSync(process.execPath, ['tools/build-calendar.cjs', '--check']);
});

test('team identity: stable colours, franchise continuity, safe avatar sources', () => {
  assert.equal(Object.keys(Teams.COLORS).length, 12); assert.equal(new Set(Object.values(Teams.COLORS)).size, 12);
  assert.equal(Teams.color('jeremy'), Teams.color('isaiah')); assert.equal(Teams.color('tyler'), Teams.color('carter'));
  const lum = h => { const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(v => v <= .03928 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * c[0] + .7152 * c[1] + .0722 * c[2]; };
  for (const [id, hex] of Object.entries(Teams.COLORS)) assert.ok((lum(hex) + .05) / (lum('#1a1d23') + .05) >= 4.5, id + ' colour readable on dark surfaces');
  assert.equal(Teams.avatarUrl({ avatar: 'b3338675f635c2c1f42b469621d38ec6' }), 'https://sleepercdn.com/avatars/thumbs/b3338675f635c2c1f42b469621d38ec6');
  assert.equal(Teams.avatarUrl({ avatar: 'x', metadata: { avatar: 'https://sleepercdn.com/uploads/9ecf.jpg' } }), 'https://sleepercdn.com/uploads/9ecf.jpg');
  assert.equal(Teams.avatarUrl({ metadata: { avatar: 'https://evil.example/a.png' } }), null);
  assert.equal(Teams.avatarUrl({ avatar: '"><script>' }), null);
});

test('theme and page wiring', () => {
  execFileSync(process.execPath, ['tools/theme/build-glow-legacy.cjs', '--check']);
  const glow = fs.readFileSync('css/cte-glow.css', 'utf8'), bundle = fs.readFileSync('css/cte-theme.css', 'utf8');
  assert.ok(bundle.includes('.g-gd-card') && bundle.includes('html .n-topbar'), 'bundle holds both layers');
  assert.match(glow, /prefers-reduced-motion:no-preference/); assert.match(glow, /forced-colors:active/);
  assert.doesNotMatch(glow, /url\(\//, 'no root-absolute asset paths (GitHub Pages project site)');
  assert.ok(fs.existsSync('assets/fonts/big-shoulders-display-latin-800-normal.woff2'));
  const shell = fs.readFileSync('app-v29.js', 'utf8');
  for (const page of fs.readdirSync('.').filter(f => f.endsWith('.html'))) {
    const html = fs.readFileSync(page, 'utf8');
    if (!/<body class="n-(app|legacy)/.test(html)) continue;
    const b = html.indexOf('css/cte-theme.css');
    assert.ok(b > 0 && html.split('css/cte-theme.css').length === 2, page + ' loads the theme bundle once');
    assert.ok(b > html.lastIndexOf('rel="stylesheet" href="taste-v40.css'), page + ' theme loads after the legacy stack');
    assert.doesNotMatch(html, /(href|src)="\/(?!\/)/, page + ' has a root-absolute path');
  }
  assert.match(shell, /cteGlow\.before\(l\)/, 'late shell styles are inserted before the theme');
  const home = fs.readFileSync('index.html', 'utf8');
  for (const id of ['cteGameDayStats', 'cteGameDayAlerts', 'cteGameDayNote', 'cteGameDayState', 'cteHomeNext', 'homeScores']) assert.match(home, new RegExp('id="' + id + '"'));
  for (const href of ['head-to-head.html', 'trophy-room.html', 'calendar.html']) { assert.ok(home.includes('href="' + href + '"')); assert.equal((fs.readFileSync(href, 'utf8').match(/<h1[\s>]/g) || []).length, 1, href + ' has one h1'); }
  assert.match(fs.readFileSync('network-v29.js', 'utf8'), /CTE_GameDay\.render\(/);
});
