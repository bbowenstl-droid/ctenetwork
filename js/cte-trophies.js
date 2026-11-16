/* CTE Network — trophy room model (glow-up, 2026-11-16).
 * Derives each season's hardware from Sleeper results; nothing is typed in by hand
 * except the commissioner's recorded champions in data/league-data.js, which win
 * any disagreement. Pure: exported for Node tests.
 *
 * League trophies (by-laws):
 *   Championship       winner of the championship game
 *   Toilet Bowl Trophy last place in the consolation bracket
 *   Last Place Trophy  last in the final regular-season standings
 */
(function (root) {
  'use strict';
  const pf = r => Number(r.settings?.fpts || 0) + Number(r.settings?.fpts_decimal || 0) / 100;
  const standing = (a, b) => Number(b.settings?.wins || 0) - Number(a.settings?.wins || 0) || Number(a.settings?.losses || 0) - Number(b.settings?.losses || 0) || pf(b) - pf(a);
  const recordOf = r => Number(r.settings?.wins || 0) + '–' + Number(r.settings?.losses || 0) + (Number(r.settings?.ties || 0) ? '–' + Number(r.settings.ties) : '');

  function scoreIn(games, week, roster) {
    const g = games.find(x => x.week === week && (Number(x.rosterA) === Number(roster) || Number(x.rosterB) === Number(roster)));
    return g ? (Number(g.rosterA) === Number(roster) ? g.scoreA : g.scoreB) : null;
  }
  /** Sleeper runs the consolation bracket either way round; read which from the scores. */
  function consolationLast(losers, games, playoffStart) {
    const list = (losers || []).filter(m => m.t1 != null && m.t2 != null && m.w != null && m.l != null);
    const final = list.find(m => Number(m.p) === 1);
    if (!final) return null;
    const opener = list.find(m => Number(m.r) === 1);
    if (!opener) return null;
    const w = scoreIn(games, playoffStart, opener.w), l = scoreIn(games, playoffStart, opener.l);
    if (w == null || l == null || w === l) return null;
    if (w < l) return { roster: Number(final.w), format: 'losers-advance', week: playoffStart + Number(final.r) - 1 };
    const bottom = list.filter(m => m.p != null).sort((a, b) => Number(b.p) - Number(a.p))[0];
    return { roster: Number(bottom.l), format: 'winners-advance', week: playoffStart + Number(bottom.r) - 1 };
  }
  /**
   * @param input {season, complete, games, rosters, ownerOf(rosterId), winners, losers, playoffStart, recorded:{championOwnerId,runnerUpOwnerId}}
   */
  function season(input) {
    const { games = [], rosters = [], ownerOf, playoffStart = 15 } = input, out = { season: input.season, complete: !!input.complete, trophies: [], honors: [] };
    const regular = games.filter(g => g.type === 'regular');
    const ranked = rosters.slice().sort(standing);
    if (input.complete) {
      const title = (input.winners || []).find(m => Number(m.p) === 1 && m.w != null), third = (input.winners || []).find(m => Number(m.p) === 3 && m.w != null);
      const champion = input.recorded?.championOwnerId || (title ? ownerOf(title.w) : null), runnerUp = input.recorded?.runnerUpOwnerId || (title ? ownerOf(title.l) : null);
      const titleGame = games.find(g => g.type === 'championship' && g.week === playoffStart + (title ? Number(title.r) - 1 : 2) && [g.ownerA, g.ownerB].includes(champion));
      if (champion) out.trophies.push({ key: 'champion', title: 'CTE Champion', owner: champion, detail: titleGame ? 'Won the title game ' + Math.max(titleGame.scoreA, titleGame.scoreB).toFixed(2) + '–' + Math.min(titleGame.scoreA, titleGame.scoreB).toFixed(2) + (runnerUp ? ' over ' + '{' + runnerUp + '}' : '') : 'League champion', basis: 'Championship game, Week ' + (playoffStart + (title ? Number(title.r) - 1 : 2)) });
      if (runnerUp) out.honors.push({ key: 'runner-up', title: 'Runner-up', owner: runnerUp, detail: 'Lost the championship game' });
      if (third) out.honors.push({ key: 'third', title: 'Third place', owner: ownerOf(third.w), detail: 'Won the third-place game' });
      const last = consolationLast(input.losers, games, playoffStart);
      const toilet = input.recorded?.toiletBowlOwnerId || (last ? ownerOf(last.roster) : null);
      if (toilet) out.trophies.push({ key: 'toilet-bowl', title: 'Toilet Bowl Trophy', owner: toilet, detail: 'Finished last in the consolation bracket', basis: input.recorded?.toiletBowlOwnerId ? 'Recorded by the commissioner' : 'Sleeper consolation bracket, decided Week ' + last.week });
      if (ranked.length) { const r = ranked[ranked.length - 1]; out.trophies.push({ key: 'last-place', title: 'Last Place Trophy', owner: input.recorded?.lastPlaceOwnerId || ownerOf(r.roster_id), detail: recordOf(r) + ' · ' + pf(r).toFixed(2) + ' points for — pays the engraving bill', basis: 'Final Sleeper standings: record, then points for' }); }
    }
    if (ranked.length && ranked.some(r => Number(r.settings?.wins || 0) > 0)) {
      const best = ranked[0], points = rosters.slice().sort((a, b) => pf(b) - pf(a))[0];
      out.honors.push({ key: 'best-record', title: input.complete ? 'Best record' : 'Best record so far', owner: ownerOf(best.roster_id), detail: recordOf(best) + ' (head-to-head + median)' });
      out.honors.push({ key: 'points', title: input.complete ? 'Scoring title' : 'Scoring leader', owner: ownerOf(points.roster_id), detail: pf(points).toFixed(2) + ' points for' });
    }
    const sides = games.flatMap(g => [{ owner: g.ownerA, score: g.scoreA, week: g.week }, { owner: g.ownerB, score: g.scoreB, week: g.week }]).sort((a, b) => b.score - a.score);
    if (sides[0]) out.honors.push({ key: 'high-score', title: 'Highest single week', owner: sides[0].owner, detail: sides[0].score.toFixed(2) + ' in Week ' + sides[0].week });
    const crowns = {};
    for (const week of new Set(regular.map(g => g.week))) {
      const top = regular.filter(g => g.week === week).flatMap(g => [[g.ownerA, g.scoreA], [g.ownerB, g.scoreB]]).sort((a, b) => b[1] - a[1]);
      if (top[0] && (!top[1] || top[0][1] > top[1][1])) crowns[top[0][0]] = (crowns[top[0][0]] || 0) + 1;
    }
    const most = Math.max(0, ...Object.values(crowns));
    if (most > 0) for (const id of Object.keys(crowns).filter(k => crowns[k] === most).sort()) out.honors.push({ key: 'weekly-crowns', title: 'Most weekly high scores', owner: id, detail: most + ' week' + (most === 1 ? '' : 's') + ' as the league’s top scorer' });
    return out;
  }
  /** Trophy counts per person across completed seasons. */
  function cabinet(seasons) {
    const out = {};
    for (const s of seasons) for (const t of s.trophies) { const c = out[t.owner] || (out[t.owner] = { owner: t.owner, champion: 0, 'toilet-bowl': 0, 'last-place': 0, seasons: {} }); c[t.key]++; (c.seasons[t.key] || (c.seasons[t.key] = [])).push(s.season); }
    return Object.values(out).sort((a, b) => b.champion - a.champion || a['last-place'] - b['last-place'] || a.owner.localeCompare(b.owner));
  }
  const api = { season, cabinet, consolationLast };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.CTE_Trophies = api;
})(typeof window === 'undefined' ? globalThis : window);
