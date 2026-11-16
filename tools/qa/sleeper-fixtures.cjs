/*
 * QA only: answer api.sleeper.app requests from the frozen provider capture in
 * research/state-of-union/raw (retrieved 2026-11-13: 2025 complete, 2026 Week 10
 * in progress). Lets browser checks run where Sleeper is unreachable and makes
 * screenshots reproducible. Never shipped to the site.
 *
 * Usage (Playwright): await require('./sleeper-fixtures.cjs').route(pageOrContext, {mode})
 *   mode 'capture' (default)  the capture as retrieved (Thursday night of Week 10)
 *   mode 'sunday'             Week 10 mid-slate: deterministic partial scores
 *   mode 'final'              Week 10 scored and final
 *   mode 'down'               every Sleeper request fails
 */
const fs = require('node:fs');
const path = require('node:path');
const raw = path.resolve(__dirname, '..', '..', 'research', 'state-of-union', 'raw');
const index = new Map(JSON.parse(fs.readFileSync(path.join(raw, 'retrieved.json'), 'utf8')).requests.map(([name, p]) => [p, name]));
const read = name => JSON.parse(fs.readFileSync(path.join(raw, name + '.json'), 'utf8'));
const CURRENT = '1312109948305436672';

function averages() {
  const sum = {}, n = {};
  for (let w = 1; w <= 9; w++) for (const r of read('sleeper-matchups-2026-' + w)) for (const [id, pts] of Object.entries(r.players_points || {})) if (pts > 0) { sum[id] = (sum[id] || 0) + pts; n[id] = (n[id] || 0) + 1; }
  return id => (n[id] ? sum[id] / n[id] : 0);
}
function simulate(rows, share) {
  const avg = averages();
  return rows.map(r => {
    const starters_points = (r.starters || []).map((id, i) => {
      const done = share >= 1 || ((Number(r.roster_id) * 7 + i * 3) % 10) / 10 < share;
      const swing = 0.55 + (((Number(r.roster_id) * 13 + i * 17) % 11) / 10);
      return done ? Math.round(avg(id) * swing * 100) / 100 : (r.starters_points || [])[i] || 0;
    });
    const players_points = { ...(r.players_points || {}) };
    (r.starters || []).forEach((id, i) => { players_points[id] = starters_points[i]; });
    return { ...r, starters_points, players_points, points: Math.round(starters_points.reduce((a, b) => a + b, 0) * 100) / 100 };
  });
}
function body(p, mode) {
  if (mode === 'down') return null;
  if (p === 'state/nfl') return { week: 10, leg: 10, season: '2026', season_type: 'regular', display_week: 10, league_season: '2026' };
  if (p === 'players/nfl') return Object.fromEntries(Object.entries(read('players-used')).map(([id, v]) => [id, { player_id: id, ...v }]));
  const m = p.match(/^draft\/(\d+)$/);
  if (m) for (const y of [2025, 2026]) { const d = read('sleeper-drafts-' + y).find(x => x.draft_id === m[1]); if (d) return d; }
  if (/^draft\/\d+\/traded_picks$/.test(p)) return [];
  const name = index.get(p);
  let data = name ? read(name) : (/\/(matchups|transactions)\/\d+$/.test(p) ? [] : undefined);
  if (data === undefined) return undefined;
  if (mode === 'sunday' && p === `league/${CURRENT}/matchups/10`) data = simulate(data, 0.6);
  if (mode === 'final') {
    if (p === `league/${CURRENT}/matchups/10`) data = simulate(data, 1);
    if (p === `league/${CURRENT}`) data = { ...data, settings: { ...data.settings, last_scored_leg: 10 } };
  }
  return data;
}
const AVATAR = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><rect width="96" height="96" fill="#2b2f36"/><circle cx="48" cy="38" r="17" fill="#8d95a1"/><path d="M14 96c2-22 16-32 34-32s32 10 34 32z" fill="#8d95a1"/></svg>';
async function route(target, { mode = 'capture', avatars = 'stub' } = {}) {
  await target.route(/^https:\/\/api\.sleeper\.app\/v1\//, r => {
    const p = new URL(r.request().url()).pathname.replace(/^\/v1\//, '');
    const data = body(p, mode);
    if (data === null) return r.abort('failed');
    if (data === undefined) return r.fulfill({ status: 404, contentType: 'application/json', body: 'null', headers: { 'access-control-allow-origin': '*' } });
    return r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data), headers: { 'access-control-allow-origin': '*' } });
  });
  await target.route(/^https:\/\/sleepercdn\.com\//, r => avatars === 'fail' ? r.abort('failed') : r.fulfill({ status: 200, contentType: 'image/svg+xml', body: AVATAR }));
}
module.exports = { route, body };
