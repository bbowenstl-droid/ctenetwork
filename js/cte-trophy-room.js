/* Trophy room page: Sleeper results -> CTE_Trophies -> cards. */
(async () => {
  'use strict';
  const $ = id => document.getElementById(id), UI = CTE_UI, T = CTE_Teams, esc = UI.esc, LD = CTE_LEAGUE_DATA;
  const ICON = {
    champion: '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M14 6h20v6h8c0 9-4 14-10 15-2 3-4 5-6 6v5h7v4H15v-4h7v-5c-2-1-4-3-6-6C10 26 6 21 6 12h8zm-4 10c1 4 3 6 5 7-1-2-1-5-1-7zm28 0h-4c0 2 0 5-1 7 2-1 4-3 5-7z"/></svg>',
    'toilet-bowl': '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M12 4h12v16h14c0 8-4 13-9 15l2 9H13l3-9c-4-2-7-6-7-11h3zm4 4v12h4V8z"/></svg>',
    'last-place': '<svg viewBox="0 0 48 48" aria-hidden="true"><path d="M24 4c5 0 8 5 8 11s-3 11-6 12v15a2 2 0 0 1-4 0V27c-3-1-6-6-6-12S19 4 24 4z"/></svg>'
  };
  const person = id => UI.owner(id).name + (LD.owners[id]?.status === 'former' ? ' (former owner)' : '');
  const fill = text => esc(text).replace(/\{(\w+)\}/g, (_, id) => esc(UI.owner(id).name));
  const link = (id, inner) => UI.isActiveOwner(id) ? '<a href="' + UI.profileHref(id) + '">' + inner + '</a>' : inner;
  function trophy(t, year) {
    return '<article class="g-trophy g-trophy--' + t.key + '" style="--team:' + T.color(t.owner) + '"><div class="g-trophy-icon">' + ICON[t.key] + '</div><p class="g-kicker">' + year + ' · ' + esc(t.title) + '</p><h3>' + link(t.owner, T.avatar(t.owner, { size: 'lg' }) + '<span>' + esc(person(t.owner)) + '</span>') + '</h3><p>' + fill(t.detail) + '</p><small>' + esc(t.basis) + '</small></article>';
  }
  const honor = h => '<li style="--team:' + T.color(h.owner) + '"><span>' + esc(h.title) + '</span><strong>' + T.avatar(h.owner, { size: 'sm' }) + esc(person(h.owner)) + '</strong><small>' + fill(h.detail) + '</small></li>';
  function render(seasons) {
    const done = seasons.filter(s => s.complete), live = seasons.filter(s => !s.complete);
    $('trophySeasons').innerHTML = [...live, ...done.slice().reverse()].map(s => '<section class="g-season" aria-labelledby="season' + s.season + '"><header class="g-season-head"><h2 id="season' + s.season + '">' + s.season + '</h2><span class="g-tag ' + (s.complete ? 'is-final' : 'is-live') + '">' + (s.complete ? 'In the books' : '<i aria-hidden="true"></i>Season in progress') + '</span></header>' +
      (s.complete ? '<div class="g-trophy-grid">' + s.trophies.map(t => trophy(t, s.season)).join('') + '</div>' : '<p class="g-season-note">The ' + s.season + ' hardware is handed out after the championship game. These are the races as they stand through the last completed week.</p>') +
      (s.honors.length ? '<h3 class="g-subhead">' + (s.complete ? 'Season honors' : 'Current leaders') + '</h3><ul class="g-honors">' + s.honors.map(honor).join('') + '</ul>' : '') + '</section>').join('');
    const cab = CTE_Trophies.cabinet(done);
    $('trophyCabinet').innerHTML = cab.length ? '<div class="cte-table-wrap g-table-wrap" tabindex="0" role="region" aria-label="All-time trophy count"><table class="g-table"><thead><tr><th scope="col">Owner</th><th scope="col">Championships</th><th scope="col">Toilet Bowl</th><th scope="col">Last Place</th></tr></thead><tbody>' + cab.map(c => '<tr><th scope="row">' + T.chip(c.owner, person(c.owner)) + '</th>' + ['champion', 'toilet-bowl', 'last-place'].map(k => '<td>' + (c[k] ? c[k] + ' <small>(' + c.seasons[k].join(', ') + ')</small>' : '—') + '</td>').join('') + '</tr>').join('') + '</tbody></table></div>' : '<p class="n-empty">No completed seasons yet.</p>';
  }
  async function load() {
    $('trophyStatus').textContent = 'Opening the trophy case…'; $('trophyRetry').hidden = true;
    try {
      const archives = await CTE_StatsEngine.loadAllSeasons();
      const current = archives.find(a => a.season === LD.league.currentSeason); if (current) T.learn(current.snapshot.users, current.snapshot.rosters, current.lookup);
      const seasons = [];
      for (const a of archives) {
        const complete = a.snapshot.league?.status === 'complete';
        const [winners, losers] = complete ? await Promise.all([CTE_Sleeper.getWinnersBracket(a.cfg.sleeperLeagueId), CTE_Sleeper.getLosersBracket(a.cfg.sleeperLeagueId)]) : [[], []];
        const recorded = { ...(LD.championships || []).find(c => c.season === a.season), ...(LD.trophies?.[a.season] || {}) };
        seasons.push(CTE_Trophies.season({ season: a.season, complete, games: a.games, rosters: a.snapshot.rosters, ownerOf: r => a.lookup[String(r)]?.ownerId, winners, losers, playoffStart: a.playoffStartWeek, recorded }));
      }
      render(seasons);
      $('trophyStatus').textContent = archives.map(a => a.season + ' through Week ' + a.completedWeek).join(' · ') + ' · Source: Sleeper';
    } catch (_) {
      $('trophySeasons').innerHTML = '<div class="n-error"><strong>The trophy case is locked.</strong><p>Sleeper could not be reached, so results cannot be verified right now. The recorded champion' + ((LD.championships || []).length === 1 ? ' is ' : 's are ') + (LD.championships || []).map(c => esc(UI.owner(c.championOwnerId).name) + ' (' + c.season + ')').join(', ') + '.</p></div>';
      $('trophyCabinet').innerHTML = ''; $('trophyStatus').textContent = 'Sleeper connection unavailable.'; $('trophyRetry').hidden = false;
    }
  }
  $('trophyRetry').onclick = load; load();
})();
