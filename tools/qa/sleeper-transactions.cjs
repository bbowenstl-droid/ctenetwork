#!/usr/bin/env node
/*
 * Read-only Sleeper report: current team names and every trade transaction in
 * the configured seasons, including non-complete statuses and multi-team deals.
 * Writes JSON to the path given as argv[2] (default: stdout only).
 * No writes to the site, history fixtures or Firebase.
 */
const fs = require('node:fs');
const LEAGUES = { 2025: '1255586541745475584', 2026: '1312109948305436672' };
const base = 'https://api.sleeper.app/v1';

async function get(path) {
  const r = await fetch(base + path, { headers: { 'User-Agent': 'CTE-Network-QA/1.0' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(path + ' HTTP ' + r.status);
  return r.json();
}

(async () => {
  const out = { retrievedAt: new Date().toISOString(), state: await get('/state/nfl'), seasons: {} };
  for (const [season, id] of Object.entries(LEAGUES)) {
    const [league, users, rosters] = await Promise.all([get('/league/' + id), get('/league/' + id + '/users'), get('/league/' + id + '/rosters')]);
    const byUser = Object.fromEntries(users.map(u => [u.user_id, u]));
    const teams = rosters.map(r => {
      const u = byUser[r.owner_id] || {};
      return { roster_id: r.roster_id, owner_display: u.display_name || null, team_name: (u.metadata && u.metadata.team_name) || null, wins: r.settings.wins, losses: r.settings.losses, ties: r.settings.ties };
    }).sort((a, b) => a.roster_id - b.roster_id);
    const lastWeek = Number(league.settings.playoff_week_start || 15) + 3;
    const trades = [];
    for (let week = 0; week <= lastWeek; week++) {
      let tx;
      try { tx = await get(`/league/${id}/transactions/${week}`); } catch (e) { trades.push({ week, error: e.message }); continue; }
      for (const t of tx) {
        if (t.type !== 'trade') continue;
        trades.push({
          id: t.transaction_id, week, status: t.status, roster_ids: t.roster_ids, teams: (t.roster_ids || []).length,
          created: t.created ? new Date(t.created).toISOString() : null,
          status_updated: t.status_updated ? new Date(t.status_updated).toISOString() : null,
          adds: t.adds, drops: t.drops, draft_picks: (t.draft_picks || []).map(p => ({ season: p.season, round: p.round, roster_id: p.roster_id, from: p.previous_owner_id, to: p.owner_id }))
        });
      }
    }
    out.seasons[season] = {
      league: { name: league.name, status: league.status, season: league.season, total_rosters: league.total_rosters, previous_league_id: league.previous_league_id },
      teams,
      tradeSummary: {
        total: trades.filter(t => !t.error).length,
        complete: trades.filter(t => t.status === 'complete').length,
        notComplete: trades.filter(t => t.status && t.status !== 'complete').map(t => ({ id: t.id, week: t.week, status: t.status, teams: t.teams })),
        multiTeam: trades.filter(t => t.teams >= 3).map(t => ({ id: t.id, week: t.week, status: t.status, roster_ids: t.roster_ids })),
        fetchErrors: trades.filter(t => t.error)
      },
      trades
    };
  }
  const json = JSON.stringify(out, null, 2);
  if (process.argv[2]) fs.writeFileSync(process.argv[2], json);
  const brief = Object.fromEntries(Object.entries(out.seasons).map(([s, v]) => [s, { status: v.league.status, teams: v.teams.map(t => `${t.roster_id}:${t.owner_display}/${t.team_name}`), tradeSummary: { ...v.tradeSummary } }]));
  console.log(JSON.stringify({ retrievedAt: out.retrievedAt, nflState: { season: out.state.season, week: out.state.week, season_type: out.state.season_type }, seasons: brief }, null, 2));
})().catch(e => { console.error(e); process.exitCode = 1; });
