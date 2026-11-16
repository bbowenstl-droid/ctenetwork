/* Head-to-head page: all-time grid + series history. Franchise view by default. */
(async () => {
  'use strict';
  const $ = id => document.getElementById(id), UI = CTE_UI, T = CTE_Teams, esc = UI.esc, fmt = UI.fmt, LD = CTE_LEAGUE_DATA, H = CTE_H2H;
  const params = new URLSearchParams(location.search), owners = LD.owners;
  const currentMap = LD.league.seasons[LD.league.currentSeason].rosterOwnerMap;           // roster -> current owner
  const rosterOf = Object.fromEntries(Object.entries(currentMap).map(([r, o]) => [o, r])); // current owner -> roster
  const divisionOrder = Object.keys(LD.divisions);
  const active = Object.values(owners).filter(o => o.status === 'active').sort((a, b) => divisionOrder.indexOf(a.currentDivisionId) - divisionOrder.indexOf(b.currentDivisionId) || a.name.localeCompare(b.name));
  const former = Object.values(owners).filter(o => o.status !== 'active');
  let archives = null, mode = ['manager', 'franchise'].includes(params.get('mode')) ? params.get('mode') : (params.get('a') || params.get('b')) ? 'manager' : 'franchise'; // older deep links are person-to-person
  let selA = owners[params.get('a')] ? params.get('a') : null, selB = owners[params.get('b')] ? params.get('b') : null;
  if ([...$('historyScope').options].some(o => o.value === params.get('scope'))) $('historyScope').value = params.get('scope');

  const people = () => mode === 'franchise' ? active : [...active, ...former];
  const key = id => mode === 'franchise' ? rosterOf[id] : id;                    // owner id -> matrix key
  const predecessor = id => mode === 'franchise' && owners[id]?.tookOverFromOwnerId ? owners[owners[id].tookOverFromOwnerId] : null;
  const label = id => owners[id].name + (owners[id].status === 'former' ? ' (former)' : '');
  const games = () => CTE_StatsEngine.filterArchives(archives, $('historyScope').value).flatMap(a => a.games);

  function syncSelects() {
    const options = people().map(o => '<option value="' + o.id + '">' + esc(label(o.id)) + '</option>').join('');
    for (const [id, value] of [['ownerA', selA], ['ownerB', selB]]) { $(id).innerHTML = '<option value="">Choose…</option>' + options; $(id).value = value && people().some(o => o.id === value) ? value : ''; }
    for (const b of document.querySelectorAll('[data-mode]')) { const on = b.dataset.mode === mode; b.classList.toggle('selected', on); b.setAttribute('aria-pressed', String(on)); }
    $('h2hModeNote').textContent = mode === 'franchise' ? 'Franchise view: each team keeps one line through a manager change. Isaiah’s line includes Jeremy’s 2025 Weeks 1–3; Carter’s includes Tyler’s 2025 season.' : 'Manager view: every person owns only the games he managed. Jeremy and Tyler appear as former owners.';
  }
  function url() {
    const u = new URL(location.href), q = new URLSearchParams();
    if (selA) q.set('a', selA); if (selB) q.set('b', selB);
    if ($('historyScope').value !== 'all') q.set('scope', $('historyScope').value);
    q.set('mode', mode);
    u.search = q; history.replaceState(null, '', u);
  }
  function grid(m) {
    const list = people();
    const head = list.map(o => '<th scope="col" style="--team:' + T.color(o.id) + '"><span class="g-h2h-col">' + T.avatar(o.id, { size: 'sm' }) + '<abbr title="' + esc(label(o.id)) + '">' + esc(o.name.slice(0, 4)) + '</abbr></span></th>').join('');
    const rows = list.map(a => {
      const total = m.totals[key(a.id)];
      return '<tr><th scope="row" style="--team:' + T.color(a.id) + '">' + T.avatar(a.id, { size: 'sm' }) + '<span>' + esc(a.name) + (a.status === 'former' ? '<small>former</small>' : predecessor(a.id) ? '<small>+ ' + esc(predecessor(a.id).name) + '</small>' : '') + '</span></th>' + list.map(b => {
        if (a.id === b.id) return '<td class="is-self" aria-hidden="true"></td>';
        const c = m.cells[key(a.id)]?.[key(b.id)], state = !c ? 'is-none' : c.w > c.l ? 'is-up' : c.w < c.l ? 'is-down' : 'is-even', on = (selA === a.id && selB === b.id);
        return '<td><button type="button" class="g-h2h-cell ' + state + '" data-a="' + a.id + '" data-b="' + b.id + '" aria-pressed="' + on + '" aria-label="' + esc(a.name + ' versus ' + b.name + ': ' + (c ? H.record(c) + ' in ' + c.games.length + (c.games.length === 1 ? ' game' : ' games') : 'no meetings')) + '">' + (c ? H.record(c) : '·') + '</button></td>';
      }).join('') + '<td class="g-h2h-total">' + (total ? H.record(total) : '—') + '</td></tr>';
    }).join('');
    $('h2hGrid').innerHTML = '<div class="g-table-wrap g-h2h-wrap" tabindex="0" role="region" aria-label="All-time head-to-head grid, scrolls sideways"><table class="g-h2h"><caption class="g-sr">Rows are the team whose record is shown; columns are opponents. Select a cell for the series history.</caption><thead><tr><td></td>' + head + '<th scope="col" class="g-h2h-total">All</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
    const n = H.notes(m, list.map(o => key(o.id))), who = k => esc(mode === 'franchise' ? owners[currentMap[k]].name : owners[k].name), items = [];
    if (n.lopsided) items.push(['Most lopsided', who(n.lopsided.a) + ' over ' + who(n.lopsided.b), H.record(n.lopsided.c)]);
    if (n.streak && n.streak.c.streak > 1) items.push(['Longest active run', who(n.streak.a) + ' vs ' + who(n.streak.b), n.streak.c.streak + ' straight wins']);
    if (n.most) items.push(['Most-played series', who(n.most.a) + ' vs ' + who(n.most.b), n.most.c.games.length + ' meetings']);
    items.push(['Yet to meet', n.unmet.length ? n.unmet.length + ' pairing' + (n.unmet.length === 1 ? '' : 's') : 'Nobody', n.unmet.length ? 'in this filter' : 'everyone has played everyone']);
    $('h2hNotes').innerHTML = items.map(([k, v, d]) => '<div class="g-gd-stat"><span>' + k + '</span><strong>' + v + '</strong><small>' + esc(d) + '</small></div>').join('');
  }
  function series(m) {
    const host = $('comparison');
    if (!selA || !selB) { host.innerHTML = '<p class="g-h2h-hint">Tap any cell in the grid — or pick two teams — to open the full series history.</p>'; return; }
    if (selA === selB) { host.innerHTML = '<p class="g-h2h-hint">Choose two different teams.</p>'; return; }
    const c = m.cells[key(selA)]?.[key(selB)], a = owners[selA], b = owners[selB];
    const side = (o, cls) => '<div class="g-series-side ' + cls + '" style="--team:' + T.color(o.id) + '">' + T.avatar(o.id, { size: 'lg' }) + '<strong>' + esc(label(o.id)) + '</strong><small>' + esc(o.status === 'active' ? T.teamName(o.id) : 'Former owner') + '</small></div>';
    let body = '<p class="g-h2h-hint">No completed meetings in this filter.</p>';
    if (c) {
      const lead = c.w > c.l ? a.name + ' leads' : c.w < c.l ? b.name + ' leads' : 'Series tied', streakName = c.streakType === 'w' ? a.name : c.streakType === 'l' ? b.name : null;
      const rows = c.games.slice().reverse().map(g => {
        const aFirst = mode === 'franchise' ? String(g.rosterA) === key(selA) : g.ownerA === selA, sa = aFirst ? g.scoreA : g.scoreB, sb = aFirst ? g.scoreB : g.scoreA, ma = aFirst ? g.ownerA : g.ownerB, mb = aFirst ? g.ownerB : g.ownerA;
        const note = mode === 'franchise' && (ma !== selA || mb !== selB) ? '<small>' + esc(owners[ma].name + ' vs ' + owners[mb].name) + ' managed</small>' : '';
        return '<a class="g-series-row ' + (sa > sb ? 'is-up' : sa < sb ? 'is-down' : 'is-even') + '" href="matchup.html?season=' + g.season + '&week=' + g.week + '&matchup=' + encodeURIComponent(g.matchupId) + '"><span class="g-series-when">' + g.season + ' · Wk ' + g.week + '<small>' + esc(CTE_LeagueEngine.typeLabels[g.type] || '') + '</small>' + note + '</span><span class="g-series-score"><b>' + fmt(sa) + '</b><i>' + (sa > sb ? 'W' : sa < sb ? 'L' : 'T') + '</i><b>' + fmt(sb) + '</b></span></a>';
      }).join('');
      body = '<div class="g-series-stats"><div><span>Series</span><strong>' + H.record(c) + '</strong><small>' + esc(lead) + '</small></div><div><span>Points</span><strong>' + fmt(c.pf) + '–' + fmt(c.pa) + '</strong><small>Avg margin ' + fmt(Math.abs(c.pf - c.pa) / c.games.length) + '</small></div><div><span>Current run</span><strong>' + (streakName ? c.streak + ' straight' : '—') + '</strong><small>' + esc(streakName || 'Last game tied') + '</small></div></div><div class="g-series-list" aria-label="Every meeting, newest first"><p class="g-series-legend"><span>' + esc(a.name) + '</span><span>Result for ' + esc(a.name) + '</span><span>' + esc(b.name) + '</span></p>' + rows + '</div>';
    }
    host.innerHTML = '<div class="g-series-head">' + side(a, 'is-a') + '<span class="g-series-vs">vs</span>' + side(b, 'is-b') + '</div>' + body;
  }
  function render(focus) {
    if (!archives) return;
    syncSelects();
    const m = H.matrix(games(), mode);
    grid(m); series(m); url();
    if (focus) { const h = $('seriesHeading'); h.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); h.focus({ preventScroll: true }); }
  }
  async function load() {
    archives = null; $('h2hGrid').innerHTML = '<div class="n-skeleton">Loading every game ever played…</div>'; $('comparison').innerHTML = ''; $('h2hNotes').innerHTML = '';
    try {
      $('historyStatus').textContent = 'Loading complete history…';
      archives = await CTE_StatsEngine.loadAllSeasons({ fresh: true });
      const current = archives.find(a => a.season === LD.league.currentSeason); if (current) T.learn(current.snapshot.users, current.snapshot.rosters, current.lookup);
      $('historyStatus').textContent = archives.map(a => a.season + ' through Week ' + a.completedWeek).join(' · ') + ' · Median results excluded · Source: Sleeper';
      render();
    } catch (_) {
      $('historyStatus').textContent = 'Complete history unavailable. Retry to reconnect.';
      $('h2hGrid').innerHTML = '<div class="n-error"><strong>We couldn’t connect to Sleeper.</strong><p>The grid needs every completed game. Nothing is shown rather than a partial history.</p></div>';
    }
  }
  $('h2hGrid').addEventListener('click', e => { const b = e.target.closest('.g-h2h-cell'); if (!b) return; selA = b.dataset.a; selB = b.dataset.b; render(true); });
  for (const b of document.querySelectorAll('[data-mode]')) b.onclick = () => { mode = b.dataset.mode; if (mode === 'franchise') { if (owners[selA]?.status !== 'active') selA = null; if (owners[selB]?.status !== 'active') selB = null; } render(); };
  $('ownerA').onchange = () => { selA = $('ownerA').value || null; render(); };
  $('ownerB').onchange = () => { selB = $('ownerB').value || null; render(); };
  $('historyScope').onchange = () => render();
  $('historyRefresh').onclick = load;
  $('historyCopy').onclick = async () => { try { await navigator.clipboard.writeText(location.href); $('copyStatus').textContent = 'Link copied'; } catch (_) { $('copyStatus').textContent = 'Copy this page address to share the comparison.'; } };
  syncSelects(); load();
})();
