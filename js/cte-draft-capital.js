/* CTE Draft Capital — who owns every future rookie pick. Read-only, live from Sleeper.
 * Sources: /league/{id} (season), /league/{id}/drafts (rounds of the latest rookie draft),
 * /league/{id}/rosters + /users (current team names), /league/{id}/traded_picks (ownership).
 * A pick with no traded_picks entry belongs to its original roster. */
(function () {
  'use strict';
  const API = 'https://api.sleeper.app/v1';
  const cfg = window.CTE_LEAGUE_DATA && window.CTE_LEAGUE_DATA.league;
  const owners = (window.CTE_LEAGUE_DATA && window.CTE_LEAGUE_DATA.owners) || {};
  const root = document.getElementById('capitalBoard');
  const stamp = document.getElementById('capitalStamp');
  const tabs = document.getElementById('capitalSeasons');
  if (!root || !cfg) return;
  const season = String(cfg.currentSeason);
  const leagueId = cfg.seasons[season].sleeperLeagueId;
  const rosterOwner = cfg.seasons[season].rosterOwnerMap;
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const ord = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
  const ownerName = rid => (owners[rosterOwner[rid]] && owners[rosterOwner[rid]].name) || ('Team ' + rid);

  async function get(path) {
    const r = await fetch(API + path, { cache: 'no-store' });
    if (!r.ok) throw new Error(path + ' → HTTP ' + r.status);
    return r.json();
  }

  function build(traded, rounds, seasons) {
    const key = (s, r, orig) => s + ':' + r + ':' + orig;
    const moved = new Map(traded.map(p => [key(String(p.season), Number(p.round), Number(p.roster_id)), p]));
    const board = {};
    for (const s of seasons) {
      const teams = {};
      for (let rid = 1; rid <= cfg.teamCount; rid++) teams[rid] = [];
      for (let r = 1; r <= rounds; r++) for (let orig = 1; orig <= cfg.teamCount; orig++) {
        const t = moved.get(key(s, r, orig));
        const holder = t ? Number(t.owner_id) : orig;
        teams[holder].push({ round: r, orig, own: holder === orig });
      }
      board[s] = teams;
    }
    return board;
  }

  function render(board, s, teamNames, rounds) {
    const teams = board[s];
    const rows = Object.entries(teams).map(([rid, picks]) => ({
      rid: Number(rid), picks: picks.sort((a, b) => a.round - b.round || a.orig - b.orig),
      firsts: picks.filter(p => p.round === 1).length,
      score: picks.reduce((t, p) => t + (rounds + 1 - p.round), 0)
    })).sort((a, b) => b.score - a.score || b.firsts - a.firsts || a.rid - b.rid);
    const most = rows[0];
    const fewest = rows[rows.length - 1];
    let html = `<p class="cap-summary"><strong>${esc(ownerName(most.rid))}</strong> holds the most ${esc(s)} draft capital (${most.picks.length} pick${most.picks.length === 1 ? '' : 's'}, ${most.firsts} first${most.firsts === 1 ? '' : 's'}). <strong>${esc(ownerName(fewest.rid))}</strong> holds the least (${fewest.picks.length} pick${fewest.picks.length === 1 ? '' : 's'}, ${fewest.firsts} first${fewest.firsts === 1 ? '' : 's'}).</p>`;
    html += '<div class="cap-grid">';
    for (const row of rows) {
      const owner = rosterOwner[row.rid];
      const chips = row.picks.map(p => `<li class="cap-pick${p.own ? '' : ' cap-acquired'}${p.round === 1 ? ' cap-first' : ''}"><span class="cap-round">${ord(p.round)}</span>${p.own ? '' : `<span class="cap-via">via ${esc(ownerName(p.orig))}</span>`}</li>`).join('');
      const traded = [];
      for (const [rid, picks] of Object.entries(teams)) for (const p of picks) if (p.orig === row.rid && Number(rid) !== row.rid) traded.push(`${ord(p.round)} → ${esc(ownerName(rid))}`);
      html += `<article class="cap-team"><header><h3><a href="team.html?owner=${encodeURIComponent(owner)}">${esc(ownerName(row.rid))}</a></h3><span class="cap-team-name">${esc(teamNames[row.rid] || '')}</span></header>
        <p class="cap-count"><strong>${row.picks.length}</strong> pick${row.picks.length === 1 ? '' : 's'} · <strong>${row.firsts}</strong> first${row.firsts === 1 ? '' : 's'}</p>
        <ul class="cap-picks" aria-label="${esc(ownerName(row.rid))} ${esc(s)} picks">${chips || '<li class="cap-none">No picks</li>'}</ul>
        ${traded.length ? `<p class="cap-out">Traded away: ${traded.join(' · ')}</p>` : ''}</article>`;
    }
    html += '</div>';
    root.innerHTML = html;
  }

  async function load() {
    root.setAttribute('aria-busy', 'true');
    try {
      const [league, drafts, rosters, users, traded] = await Promise.all([
        get('/league/' + leagueId), get('/league/' + leagueId + '/drafts'), get('/league/' + leagueId + '/rosters'), get('/league/' + leagueId + '/users'), get('/league/' + leagueId + '/traded_picks')
      ]);
      const rookie = drafts.filter(d => d.settings && d.settings.rounds).sort((a, b) => Number(b.season) - Number(a.season))[0];
      const rounds = Number((rookie && rookie.settings.rounds) || 4);
      const base = Number(league.season || season);
      const seasons = [...new Set([String(base + 1), String(base + 2), String(base + 3), ...traded.map(p => String(p.season))])]
        .filter(s => Number(s) > base || (Number(s) === base && league.status === 'pre_draft')).sort();
      const byUser = Object.fromEntries(users.map(u => [u.user_id, u]));
      const teamNames = Object.fromEntries(rosters.map(r => { const u = byUser[r.owner_id] || {}; return [r.roster_id, (u.metadata && u.metadata.team_name) || u.display_name || '']; }));
      const board = build(traded, rounds, seasons);
      let current = seasons[0];
      tabs.innerHTML = seasons.map(s => `<button type="button" data-season="${esc(s)}" aria-pressed="${s === current}"${s === current ? ' class="selected"' : ''}>${esc(s)}</button>`).join('');
      tabs.onclick = e => {
        const b = e.target.closest('button[data-season]'); if (!b) return;
        current = b.dataset.season;
        tabs.querySelectorAll('button').forEach(x => { const on = x === b; x.classList.toggle('selected', on); x.setAttribute('aria-pressed', String(on)); });
        render(board, current, teamNames, rounds);
      };
      render(board, current, teamNames, rounds);
      const movedCount = traded.filter(p => Number(p.owner_id) !== Number(p.roster_id)).length;
      stamp.textContent = `Live from Sleeper · ${rounds} rounds per draft · ${movedCount} pick${movedCount === 1 ? '' : 's'} have changed hands · updated ${new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}`;
    } catch (err) {
      root.innerHTML = `<p class="n-error">Couldn't reach Sleeper for draft picks right now. <button type="button" class="n-button" data-capital-retry>Try again</button></p>`;
      stamp.textContent = 'Sleeper unavailable';
      console.warn('Draft capital', err);
    } finally { root.removeAttribute('aria-busy'); }
  }
  root.addEventListener('click', e => { if (e.target.closest('[data-capital-retry]')) load(); });
  document.addEventListener('click', e => { if (e.target.closest('[data-capital-refresh]')) load(); });
  load();
})();
