#!/usr/bin/env node
/*
 * Builds data/sotu/snapshot.json — the State of the Union's offline fallback.
 * The page always tries live Sleeper first; this file is only read when Sleeper
 * is slow or down, and the page says so on screen.
 *
 *   node tools/sotu/build-snapshot.cjs            # from research/state-of-union/raw (frozen 2026-11-13)
 *   node tools/sotu/build-snapshot.cjs --live     # refetch everything from the public Sleeper API
 *
 * Responses are trimmed with the same function the page uses (CTESotuEngine.trim),
 * keyed by API path, so the page's loader can treat the snapshot as a cache.
 * Also writes data/sotu/players.json (id -> [name, position]) for the players seen.
 */
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..', '..');
const { trim } = require(path.join(root, 'js', 'cte-sotu-engine.js'));
const RAW = path.join(root, 'research', 'state-of-union', 'raw');
const OUT = path.join(root, 'data', 'sotu');
const API = 'https://api.sleeper.app/v1';
const live = process.argv.includes('--live');
const read = name => JSON.parse(fs.readFileSync(path.join(RAW, name + '.json'), 'utf8'));
const has = name => fs.existsSync(path.join(RAW, name + '.json'));

async function get(p) {
  const r = await fetch(API + p, { headers: { 'User-Agent': 'CTE-Network-QA/1.0' }, signal: AbortSignal.timeout(30000) });
  if (!r.ok) throw new Error(p + ' HTTP ' + r.status);
  return r.json();
}

(async () => {
  const responses = {};
  const put = (p, data) => { responses[p] = trim(p, data); };
  let capturedAt, source;
  const players = fs.existsSync(path.join(OUT, 'players.json')) ? JSON.parse(fs.readFileSync(path.join(OUT, 'players.json'), 'utf8')) : {};

  if (live) {
    // Start at the configured current league and walk previous_league_id back.
    const cfg = fs.readFileSync(path.join(root, 'data', 'league-data.js'), 'utf8');
    const season = cfg.match(/currentSeason:\s*(\d+)/)[1];
    let id = cfg.match(new RegExp(season + ':\\s*\\{[^}]*?sleeperLeagueId:\\s*"(\\d+)"', 's'))[1];
    put('/state/nfl', await get('/state/nfl'));
    while (id && id !== '0') {
      const lg = await get('/league/' + id); put('/league/' + id, lg);
      for (const leaf of ['users', 'rosters', 'drafts', 'traded_picks', 'winners_bracket', 'losers_bracket']) put(`/league/${id}/${leaf}`, await get(`/league/${id}/${leaf}`));
      const last = Number(lg.settings.last_scored_leg || 0);
      for (let w = 1; w <= last; w++) put(`/league/${id}/matchups/${w}`, await get(`/league/${id}/matchups/${w}`));
      for (let w = 1; w <= 18; w++) put(`/league/${id}/transactions/${w}`, await get(`/league/${id}/transactions/${w}`));
      for (const d of responses[`/league/${id}/drafts`]) { put('/draft/' + d.draft_id, await get('/draft/' + d.draft_id)); put(`/draft/${d.draft_id}/picks`, await get(`/draft/${d.draft_id}/picks`)); }
      id = lg.previous_league_id;
    }
    const all = await get('/players/nfl');
    const need = new Set();
    for (const [p, data] of Object.entries(responses)) {
      if (/matchups/.test(p)) for (const r of data) for (const x of r.players) need.add(String(x));
      if (/transactions/.test(p)) for (const t of data) for (const x of [...Object.keys(t.adds || {}), ...Object.keys(t.drops || {})]) need.add(x);
      if (/rosters$/.test(p)) for (const r of data) for (const x of r.players) need.add(String(x));
    }
    for (const pid of need) { const v = all[pid]; if (v) players[pid] = [v.full_name || [v.first_name, v.last_name].filter(Boolean).join(' '), v.position || '']; }
    capturedAt = new Date().toISOString(); source = 'Sleeper API (live refetch)';
  } else {
    for (const year of [2025, 2026]) {
      const lg = read('sleeper-league-' + year), id = lg.league_id;
      put('/league/' + id, lg);
      put(`/league/${id}/users`, read('sleeper-users-' + year));
      put(`/league/${id}/rosters`, read('sleeper-rosters-' + year));
      put(`/league/${id}/drafts`, read('sleeper-drafts-' + year));
      put(`/league/${id}/traded_picks`, read('sleeper-picks-' + year));
      put(`/league/${id}/winners_bracket`, read('sleeper-winners-' + year));
      put(`/league/${id}/losers_bracket`, read('sleeper-losers-' + year));
      for (let w = 1; w <= 18; w++) {
        if (has(`sleeper-matchups-${year}-${w}`) && w <= Number(lg.settings.last_scored_leg || 0)) put(`/league/${id}/matchups/${w}`, read(`sleeper-matchups-${year}-${w}`));
        put(`/league/${id}/transactions/${w}`, has(`sleeper-transactions-${year}-${w}`) ? read(`sleeper-transactions-${year}-${w}`) : []);
      }
      for (const d of read('sleeper-drafts-' + year)) {
        const f = fs.readdirSync(RAW).find(n => n.startsWith(`sleeper-draft-picks-${year}-${d.draft_id}`));
        if (f) put(`/draft/${d.draft_id}/picks`, JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8')));
      }
    }
    for (const [pid, v] of Object.entries(read('players-used'))) players[pid] = [v.full_name || pid, v.position || ''];
    capturedAt = read('retrieved').retrieved_at; source = 'research/state-of-union/raw (Sleeper API responses)';
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'snapshot.json'), JSON.stringify({ capturedAt, source, responses }));
  fs.writeFileSync(path.join(OUT, 'players.json'), JSON.stringify(players));
  console.log(`snapshot: ${Object.keys(responses).length} responses, ${(fs.statSync(path.join(OUT, 'snapshot.json')).size / 1024).toFixed(0)} KB; players: ${Object.keys(players).length}; captured ${capturedAt}`);
})().catch(e => { console.error(e.message); process.exit(1); });
