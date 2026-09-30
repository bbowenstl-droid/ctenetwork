/* CTE Network v33 — Weekly Awards + This Week in CTE History.
 * Pure Sleeper data, nothing invented. Renders on Home (index) and Game Day. */
(function () {
  'use strict';
  const view = document.body && document.body.dataset.view;
  const LE = window.CTE_LeagueEngine, SL = window.CTE_Sleeper, UI = window.CTE_UI, LD = window.CTE_LEAGUE_DATA;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const name = id => (UI && UI.owner ? UI.owner(id).name : id);
  const pts = n => Number(n).toFixed(2);

  /** Awards for one finished week. rows = Sleeper matchup rows, games = resolveGames output. */
  function computeAwards(rows, games, ownerOfRoster) {
    const real = games.filter(g => g.scoreA || g.scoreB);
    if (!real.length) return null;
    const scores = real.flatMap(g => [{ owner: g.ownerA, pts: g.scoreA, opp: g.ownerB, oppPts: g.scoreB, g }, { owner: g.ownerB, pts: g.scoreB, opp: g.ownerA, oppPts: g.scoreA, g }]);
    const by = (arr, f, dir = 1) => arr.slice().sort((a, b) => dir * (f(b) - f(a)))[0];
    const top = by(scores, s => s.pts), low = by(scores, s => s.pts, -1);
    const blowout = by(real, g => g.margin), decided = real.filter(g => g.margin > 0), close = decided.length ? by(decided, g => g.margin, -1) : null;
    const losers = scores.filter(s => s.pts < s.oppPts), badBeat = losers.length ? by(losers, s => s.pts) : null;
    let bench = null;
    for (const r of rows || []) {
      const starters = new Set((r.starters || []).map(String)), pp = r.players_points || {};
      const benchPts = Object.entries(pp).filter(([pid]) => !starters.has(String(pid))).reduce((t, [, v]) => t + Number(v || 0), 0);
      const owner = ownerOfRoster(r.roster_id);
      if (owner && (!bench || benchPts > bench.pts)) bench = { owner, pts: Math.round(benchPts * 100) / 100 };
    }
    const winner = g => (g.scoreA >= g.scoreB ? [g.ownerA, g.scoreA, g.ownerB, g.scoreB] : [g.ownerB, g.scoreB, g.ownerA, g.scoreA]);
    const out = [
      { key: 'top', label: 'Top score', icon: '\uD83D\uDC51', owner: top.owner, detail: `${pts(top.pts)} pts vs ${name(top.opp)}` },
      { key: 'blowout', label: 'Biggest blowout', icon: '\uD83D\uDCA5', owner: winner(blowout)[0], detail: `Beat ${name(winner(blowout)[2])} by ${pts(blowout.margin)}` }
    ];
    if (close) out.push({ key: 'close', label: 'Nail-biter', icon: '\uD83D\uDE2C', owner: winner(close)[0], detail: `Edged ${name(winner(close)[2])} by ${pts(close.margin)}` });
    if (badBeat) out.push({ key: 'badbeat', label: 'Bad beat', icon: '\uD83D\uDC94', owner: badBeat.owner, detail: `Lost with ${pts(badBeat.pts)} to ${name(badBeat.opp)}` });
    if (bench && bench.pts > 0) out.push({ key: 'bench', label: 'Bench warmer', icon: '\uD83E\uDE91', owner: bench.owner, detail: `${pts(bench.pts)} pts left on the bench` });
    out.push({ key: 'low', label: 'Basement', icon: '\uD83E\uDEA3', owner: low.owner, detail: `${pts(low.pts)} pts vs ${name(low.opp)}` });
    return out;
  }

  function seasons() {
    const s = (LD && LD.league && LD.league.seasons) || {};
    return Object.keys(s).map(Number).sort((a, b) => a - b).map(y => ({ season: y, ...s[y] }));
  }
  async function weekData(season, leagueId, week, fresh) {
    const [snap, rows] = await Promise.all([SL.getLeagueSnapshot(leagueId), SL.getMatchups(leagueId, week, fresh ? { fresh: true } : undefined)]);
    const lookup = UI.mapForSeason(season, snap.users, snap.rosters);
    const games = LE.resolveGames(rows, lookup, season, week);
    const ownerOfRoster = rid => { const m = lookup[String(rid)]; return m && m.ownerId ? LE.ownerForHistoricalWeek(m.ownerId, season, week) : null; };
    return { rows, games, ownerOfRoster, snap };
  }

  function awardsHTML(week, awards) {
    return `<section class="x-awards" aria-labelledby="xAwardsTitle"><div class="n-section-head"><h2 id="xAwardsTitle">Week ${week} awards</h2><span class="n-label">FROM SLEEPER</span></div>
      <div class="x-award-grid">${awards.map(a => `<a class="x-award" data-award="${a.key}" href="team.html?owner=${encodeURIComponent(a.owner)}"><span class="x-award-ico" aria-hidden="true">${a.icon}</span><small>${esc(a.label)}</small><strong>${esc(name(a.owner))}</strong><span>${esc(a.detail)}</span></a>`).join('')}</div></section>`;
  }
  function historyHTML(week, items) {
    return `<section class="x-history" aria-labelledby="xHistTitle"><div class="n-section-head"><h2 id="xHistTitle">This week in CTE history</h2><span class="n-label">WEEK ${week}</span></div>
      <div class="x-hist-list">${items.map(h => `<div class="x-hist"><b class="x-hist-year">${h.season}</b><div><p><strong>${esc(name(h.top.owner))}</strong> put up the week's best ${pts(h.top.pts)}.</p><p>${esc(name(h.blow.w))} beat ${esc(name(h.blow.l))} by ${pts(h.blow.m)}${h.blow.m >= 40 ? ' \u2014 a mercy-rule situation' : ''}.</p></div></div>`).join('')}</div></section>`;
  }
  function place(html, afterSel, beforeSel) {
    const after = afterSel && document.querySelector(afterSel), before = beforeSel && document.querySelector(beforeSel);
    if (after) after.insertAdjacentHTML('afterend', html); else if (before) before.insertAdjacentHTML('beforebegin', html);
  }

  async function run() {
    if (!LE || !SL || !UI || !LD) return;
    const all = seasons(), cur = all.find(s => s.status === 'current');
    if (!cur) return;
    let leg = 0;
    try { const snap = await SL.getLeagueSnapshot(cur.sleeperLeagueId); leg = Number(snap.league && snap.league.settings && snap.league.settings.leg || 0); } catch (_) { return; }
    const lastDone = leg - 1;
    // Weekly awards: last completed week of the current season.
    if (lastDone >= 1 && !document.querySelector('.x-awards')) {
      try {
        const d = await weekData(cur.season, cur.sleeperLeagueId, lastDone);
        const awards = computeAwards(d.rows, d.games, d.ownerOfRoster);
        if (awards && !document.querySelector('.x-awards')) {
          if (view === 'game-day') place(awardsHTML(lastDone, awards), '#readiness', '#scoreboard');
          else place(awardsHTML(lastDone, awards), '.bk-teaser', '.n-talent');
        }
      } catch (_) {}
    }
    // History: the current week in completed seasons (home only).
    if (view === 'index' && leg >= 1 && !document.querySelector('.x-history')) {
      const items = [];
      for (const s of all.filter(x => x.status === 'complete')) {
        try {
          const d = await weekData(s.season, s.sleeperLeagueId, leg);
          const real = d.games.filter(g => g.scoreA || g.scoreB); if (!real.length) continue;
          const sc = real.flatMap(g => [{ owner: g.ownerA, pts: g.scoreA }, { owner: g.ownerB, pts: g.scoreB }]).sort((a, b) => b.pts - a.pts)[0];
          const bg = real.slice().sort((a, b) => b.margin - a.margin)[0];
          items.push({ season: s.season, top: sc, blow: { w: bg.winnerOwnerId || bg.ownerA, l: bg.loserOwnerId || bg.ownerB, m: bg.margin } });
        } catch (_) {}
      }
      if (items.length) place(historyHTML(leg, items.reverse()), '.x-awards', '.n-talent');
    }
  }
  window.CTE_Extras = { computeAwards, run };
  if (view === 'index' || view === 'game-day') {
    if (document.readyState === 'complete') run(); else addEventListener('load', () => run());
  }
})();
