/**
 * CTE SPORTSBOOK — Sleeper bridge.
 * Turns real Sleeper data into what the book needs: records, points for,
 * live scores per market, and final results once Sleeper moves past the week.
 * Never invents a number; anything missing comes back null.
 */
(function () {
  'use strict';
  const E = () => window.CTE_BookEngine;
  const book = () => window.CTE_SPORTSBOOK;
  const cfgFor = season => window.CTE_LEAGUE_DATA.league.seasons[season];
  const pts = r => Number(r && r.points || 0);

  /** Core snapshot: owners, records, live/final scores for the book's week. */
  async function load(options = {}) {
    const B = book(), season = B.season, cfg = cfgFor(season);
    const snap = await window.CTE_Sleeper.getLeagueSnapshot(cfg.sleeperLeagueId, options);
    const lookup = window.CTE_UI.mapForSeason(season, snap.users, snap.rosters);
    const users = Object.fromEntries((snap.users || []).map(u => [String(u.user_id), u]));
    const standings = window.CTE_UI.standingsRows(snap.rosters, lookup);
    const pfOrder = [...standings].sort((a, b) => b.pf - a.pf).map(r => r.ownerId);
    const owners = {};
    for (const [rosterId, m] of Object.entries(lookup)) {
      if (!m.ownerId) continue;
      const row = standings.find(r => r.ownerId === m.ownerId) || {};
      const user = users[String(m.sleeperUserId)] || {};
      const avatar = user.metadata && user.metadata.avatar ? user.metadata.avatar
        : user.avatar ? `https://sleepercdn.com/avatars/thumbs/${encodeURIComponent(user.avatar)}` : null;
      owners[m.ownerId] = { ownerId: m.ownerId, rosterId: Number(rosterId), teamName: row.team || null, wins: row.wins, losses: row.losses,
        ties: row.ties, pf: row.pf, pfRank: pfOrder.indexOf(m.ownerId) + 1, avatar };
    }
    const leg = Math.max(0, Number(snap.league && snap.league.settings && snap.league.settings.leg || 0));
    const seasonComplete = snap.league && snap.league.status === 'complete';
    let rows = [];
    try { rows = await window.CTE_Sleeper.getMatchups(cfg.sleeperLeagueId, B.week, options); } catch (_) { rows = []; }
    const byRoster = Object.fromEntries((rows || []).map(r => [String(r.roster_id), r]));
    const sleeperFinal = seasonComplete || leg > Number(B.week);
    const live = {}, sleeperResults = {}, pairing = {};
    for (const m of E().weekMarkets(B)) {
      const [a, b] = m.sides, ra = byRoster[String(owners[a] && owners[a].rosterId)], rb = byRoster[String(owners[b] && owners[b].rosterId)];
      if (!ra || !rb) { pairing[m.id] = rows.length ? 'missing' : 'unposted'; continue; }
      if (ra.matchup_id == null || String(ra.matchup_id) !== String(rb.matchup_id)) { pairing[m.id] = 'mismatch'; continue; }
      pairing[m.id] = 'ok';
      const scores = { [a]: pts(ra), [b]: pts(rb) };
      live[m.id] = { scores, rows: { [a]: ra, [b]: rb }, started: scores[a] > 0 || scores[b] > 0 };
      if (sleeperFinal && live[m.id].started) sleeperResults[m.id] = { final: true, scores, source: 'sleeper' };
    }
    const results = { ...sleeperResults };
    for (const [id, r] of Object.entries(B.results || {})) if (r && r.scores) results[id] = { final: true, ...r, source: 'commissioner' };
    return { season, cfg, snap, lookup, owners, standings, leg, live, results, pairing, loadedAt: Date.now() };
  }

  /** Real weekly scores for this season before the book's week. */
  async function recentScores(ctx, options = {}) {
    const B = book(), last = Math.min(Number(B.week) - 1, ctx.leg || Number(B.week) - 1);
    const weeks = [];
    for (let w = 1; w <= last; w++) weeks.push(w);
    const data = await Promise.all(weeks.map(w => window.CTE_Sleeper.getMatchups(ctx.cfg.sleeperLeagueId, w, options).then(rows => ({ w, rows })).catch(() => ({ w, rows: null }))));
    const out = {};
    for (const { w, rows } of data) {
      if (!rows) continue;
      for (const r of rows) {
        const id = ctx.lookup[String(r.roster_id)] && ctx.lookup[String(r.roster_id)].ownerId;
        if (!id || pts(r) === 0) continue;
        (out[id] = out[id] || []).push({ week: w, points: pts(r), row: r });
      }
    }
    for (const list of Object.values(out)) list.sort((a, b) => a.week - b.week);
    return out;
  }

  /** All-time head-to-head from Sleeper history (every completed week, every season). */
  let h2hPromise = null;
  function headToHead() {
    if (h2hPromise) return h2hPromise;
    h2hPromise = (async () => {
      const L = window.CTE_LEAGUE_DATA.league, games = [];
      for (const season of Object.keys(L.seasons).map(Number).sort()) {
        const cfg = L.seasons[season];
        const snap = await window.CTE_Sleeper.getLeagueSnapshot(cfg.sleeperLeagueId);
        const lookup = window.CTE_UI.mapForSeason(season, snap.users, snap.rosters);
        const leg = Number(snap.league && snap.league.settings && snap.league.settings.leg || 0);
        const lastWeek = cfg.status === 'current' ? Math.min(leg - 1, Number(book().week) - 1) : 18;
        const weeks = [];
        for (let w = 1; w <= lastWeek; w++) weeks.push(w);
        const all = await Promise.all(weeks.map(w => window.CTE_Sleeper.getMatchups(cfg.sleeperLeagueId, w).then(rows => ({ w, rows })).catch(() => null)));
        for (const x of all) if (x) for (const g of window.CTE_LeagueEngine.resolveGames(x.rows, lookup, season, x.w)) if (g.scoreA || g.scoreB) games.push(g);
      }
      return games;
    })().catch(e => { h2hPromise = null; throw e; });
    return h2hPromise;
  }
  function seriesBetween(games, a, b) {
    const list = games.filter(g => (g.ownerA === a && g.ownerB === b) || (g.ownerA === b && g.ownerB === a));
    const rec = { [a]: 0, [b]: 0, ties: 0 };
    for (const g of list) { if (!g.winnerOwnerId) rec.ties++; else if (rec[g.winnerOwnerId] != null) rec[g.winnerOwnerId]++; }
    return { games: list.sort((x, y) => y.season - x.season || y.week - x.week), record: rec };
  }

  window.CTE_BookLive = { load, recentScores, headToHead, seriesBetween };
})();
