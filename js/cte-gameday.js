/* CTE Network — live Game Day (glow-up, 2026-11-16).
 * Home-page scoreboard built only from Sleeper's league endpoints:
 *   scores            this week's matchup rows (live)
 *   projection        a starter still on 0 is assumed yet to play and is given his
 *                     own season average from the completed weeks (CTE estimate,
 *                     NOT a Sleeper projection — the UI says so)
 *   win outlook       normal model on the projected margin; spread grows with the
 *                     number of starters still to play
 * Nothing is inferred once Sleeper has scored the week: finals show finals.
 * Pure functions (model, averages, ...) are exported for Node tests.
 */
(function (root) {
  'use strict';
  const PER_STARTER_SD = 6.5;          // points of uncertainty per starter still to play
  const UPSET_GAP = 6, CLOSE_GAP = 8, PHOTO_FINISH = 5;
  const ALERT_MAX_PENDING = 0.5;       // alerts wait until at least half of a matchup's starters have played
  const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const round2 = v => Math.round(v * 100) / 100;

  /** Season average per player from completed weeks; only weeks he actually scored count. */
  function averages(weeks) {
    const sum = new Map(), n = new Map();
    for (const rows of weeks || []) for (const r of rows || []) for (const [id, pts] of Object.entries(r.players_points || {})) {
      if (!(num(pts) > 0)) continue;
      sum.set(id, (sum.get(id) || 0) + num(pts)); n.set(id, (n.get(id) || 0) + 1);
    }
    const out = {};
    for (const [id, total] of sum) out[id] = total / n.get(id);
    return out;
  }
  function phi(z) { // standard normal CDF (Abramowitz–Stegun 7.1.26)
    const t = 1 / (1 + 0.3275911 * Math.abs(z) / Math.SQRT2), y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-z * z / 2);
    return z >= 0 ? (1 + y) / 2 : (1 - y) / 2;
  }
  function side(row, avg, status) {
    const starters = (row.starters || []).map(String);
    let pending = 0, remaining = 0, baseline = 0, best = null;
    starters.forEach((id, i) => {
      if (!id || id === '0') return;
      const pts = num(row.starters_points?.[i] ?? row.players_points?.[id]), mean = num(avg?.[id]);
      baseline += mean;
      if (status !== 'final' && pts === 0 && mean > 0) { pending++; remaining += mean; }
      if (pts > 0 && (!best || pts > best.points)) best = { playerId: id, points: pts };
    });
    const points = num(row.custom_points ?? row.points);
    return { rosterId: row.roster_id, points, pending, projected: round2(points + remaining), baseline: round2(baseline), best, starters: starters.filter(id => id && id !== '0').length };
  }
  /**
   * @param pairs  [[rowA,rowB],...] this week's paired Sleeper rows
   * @param opts   {status:'live'|'final'|'upcoming', averages:{playerId:avg}|null, median:boolean}
   */
  function model(pairs, opts = {}) {
    const status = opts.status || 'live', avg = opts.averages || null;
    const games = (pairs || []).filter(p => p.length === 2).map(([a, b]) => {
      const A = side(a, avg, status), B = side(b, avg, status);
      const started = A.points > 0 || B.points > 0, final = status === 'final';
      const pending = A.pending + B.pending, margin = A.projected - B.projected;
      let pA = null;
      if (final) pA = A.points === B.points ? 0.5 : A.points > B.points ? 1 : 0;
      else if (avg) pA = pending ? phi(margin / (PER_STARTER_SD * Math.sqrt(pending))) : started ? (margin === 0 ? 0.5 : margin > 0 ? 1 : 0) : null;
      if (pA != null && !final && pending) pA = Math.min(0.99, Math.max(0.01, pA));
      const tags = [];
      const fav = avg && Math.abs(A.baseline - B.baseline) >= UPSET_GAP ? (A.baseline > B.baseline ? 'A' : 'B') : null;
      if (final) {
        if (A.points !== B.points && Math.abs(A.points - B.points) < PHOTO_FINISH) tags.push('photo-finish');
        if (fav && (fav === 'A' ? B.points > A.points : A.points > B.points)) tags.push('upset');
      } else if (started && pA != null && pending <= (A.starters + B.starters) * ALERT_MAX_PENDING) {
        if (fav && (fav === 'A' ? pA < 0.4 : pA > 0.6)) tags.push('upset-watch');
        if (Math.abs(margin) < CLOSE_GAP) tags.push('close');
      }
      return { matchupId: a.matchup_id, a: A, b: B, started, final, pending, pA, favorite: fav, tags, state: final ? 'final' : started ? 'live' : 'upcoming' };
    });
    const sides = games.flatMap(g => [g.a, g.b]);
    const scored = sides.filter(s => s.points > 0);
    const top = scored.slice().sort((x, y) => y.points - x.points)[0] || null;
    const star = scored.filter(s => s.best).map(s => ({ rosterId: s.rosterId, ...s.best })).sort((x, y) => y.points - x.points)[0] || null;
    let median = null;
    if (opts.median && scored.length >= sides.length * 0.75 && sides.length % 2 === 0) { // a median of mostly zeros says nothing
      const sorted = sides.map(s => s.points).sort((x, y) => x - y), mid = sorted.length / 2;
      median = round2((sorted[mid - 1] + sorted[mid]) / 2);
    }
    const live = games.filter(g => g.state === 'live');
    const tightest = (status === 'final' ? games : live).slice().sort((x, y) => Math.abs((status === 'final' ? x.a.points - x.b.points : x.a.projected - x.b.projected)) - Math.abs((status === 'final' ? y.a.points - y.b.points : y.a.projected - y.b.projected)))[0] || null;
    return { status, games, topTeam: top, topPlayer: star, median, tightest, anyStarted: scored.length > 0, hasOutlook: !!avg };
  }

  if (typeof module === 'object' && module.exports) { module.exports = { averages, model, phi, side }; return; }

  // ---------------------------------------------------------------- browser
  const doc = root.document, UI = () => root.CTE_UI, T = () => root.CTE_Teams;
  const esc = v => UI().esc(v), fmt = v => Number(v || 0).toFixed(2);
  const TAGS = { 'upset-watch': ['Upset watch', 'is-alert'], upset: ['Upset', 'is-alert'], close: ['Too close to call', 'is-close'], 'photo-finish': ['Photo finish', 'is-close'] };
  let ctx = null, avgCache = null, labels = null, timer = null, last = new Map();
  const col = id => (T() ? T().color(id) : '#aab0ba');
  // Only touch the DOM when the markup really changed: keeps animations and screen readers quiet between polls.
  const set = (el, html) => { if (!el || el.__gd === html) return false; el.innerHTML = html; el.__gd = html; return true; };

  async function loadAverages(c) {
    const done = Math.min(root.CTE_LeagueEngine.completedWeek(c.league), c.week - 1);
    if (done < 1) return {};
    const key = 'cte_gd_avg_' + c.season + '_' + done;
    try { const saved = JSON.parse(root.sessionStorage.getItem(key) || 'null'); if (saved) return saved; } catch (_) {}
    const weeks = await Promise.all(Array.from({ length: done }, (_, i) => root.CTE_Sleeper.getMatchups(c.leagueId, i + 1)));
    const out = averages(weeks);
    for (const id of Object.keys(out)) out[id] = round2(out[id]);
    try { root.sessionStorage.setItem(key, JSON.stringify(out)); } catch (_) {}
    return out;
  }
  async function loadLabels() {
    if (labels) return labels;
    try { const r = await root.fetch('data/cte-player-labels.json'); labels = r.ok ? await r.json() : {}; } catch (_) { labels = {}; }
    return labels;
  }
  const owner = rosterId => ctx.lookup[String(rosterId)]?.ownerId;
  const ownerName = rosterId => UI().owner(owner(rosterId)).name;
  const myTeam = () => { try { return root.localStorage.getItem('cte_my_team') || ''; } catch (_) { return ''; } };

  function teamRow(s, lead, g) {
    const id = owner(s.rosterId), o = UI().owner(id), team = ctx.lookup[String(s.rosterId)]?.sleeperTeamName || o.currentTeamName || '';
    const rec = ctx.records?.[id];
    const bump = last.has(s.rosterId) && last.get(s.rosterId) !== s.points ? ' g-bump' : '';
    return '<div class="g-gd-team' + (lead ? ' is-leading' : '') + '" style="--team:' + (T() ? T().color(id) : '#aab0ba') + '">' +
      (T() ? T().avatar(id) : '<span class="n-avatar" aria-hidden="true">' + esc(o.name.slice(0, 2).toUpperCase()) + '</span>') +
      '<span class="g-gd-name"><strong>' + esc(o.name) + '</strong><small>' + esc(team) + (rec ? ' · ' + esc(rec) : '') + '</small></span>' +
      '<span class="g-gd-score' + bump + '">' + (g.state === 'upcoming' ? '<span class="g-gd-dash">–</span>' : fmt(s.points)) + '</span></div>';
  }
  function card(g) {
    const A = g.a, B = g.b, nameA = ownerName(A.rosterId), nameB = ownerName(B.rosterId);
    const leadA = g.state !== 'upcoming' && A.points > B.points, leadB = g.state !== 'upcoming' && B.points > A.points;
    const mine = [owner(A.rosterId), owner(B.rosterId)].includes(myTeam()) && myTeam();
    const tags = g.tags.map(t => '<span class="g-tag ' + TAGS[t][1] + '">' + TAGS[t][0] + '</span>').join('');
    const state = g.state === 'final' ? '<span class="g-tag is-final">Final</span>' : g.state === 'live' ? '<span class="g-tag is-live"><i aria-hidden="true"></i>Live</span>' : '<span class="g-tag">Upcoming</span>';
    let outlook = '';
    if (g.pA != null && !g.final) {
      const a = Math.round(g.pA * 100), b = 100 - a;
      outlook = '<div class="g-gd-outlook"><div class="g-gd-bar" role="img" aria-label="Win outlook: ' + esc(nameA) + ' ' + a + ' percent, ' + esc(nameB) + ' ' + b + ' percent">' +
        '<span style="width:' + a + '%;--team:' + col(owner(A.rosterId)) + '"></span><span style="width:' + b + '%;--team:' + col(owner(B.rosterId)) + '"></span></div>' +
        '<div class="g-gd-outlook-row"><span><b>' + a + '%</b> ' + esc(nameA) + '</span><span class="g-gd-outlook-label">Win outlook</span><span>' + esc(nameB) + ' <b>' + b + '%</b></span></div>' +
        '<div class="g-gd-proj"><span>Proj ' + fmt(A.projected) + (A.pending ? ' · ' + A.pending + ' left' : ' · all in') + '</span><span>' + (B.pending ? B.pending + ' left · ' : 'all in · ') + 'Proj ' + fmt(B.projected) + '</span></div></div>';
    } else if (g.final) {
      const diff = Math.abs(A.points - B.points);
      outlook = '<div class="g-gd-proj is-final"><span>' + (diff ? esc(leadA ? nameA : nameB) + ' by ' + fmt(diff) : 'Tied') + '</span><span>Box score ↗</span></div>';
    } else {
      outlook = '<div class="g-gd-proj is-final"><span>' + (ctx.outlookState === 'loading' ? 'Building the win outlook…' : 'Scores appear at kickoff') + '</span><span>Matchup ↗</span></div>';
    }
    return '<a class="g-gd-card' + (mine ? ' is-mine' : '') + (g.tags.length ? ' has-alert' : '') + '" href="matchup.html?season=' + ctx.season + '&week=' + ctx.week + '&matchup=' + encodeURIComponent(g.matchupId) + '" data-owners="' + esc(owner(A.rosterId) || '') + ',' + esc(owner(B.rosterId) || '') + '">' +
      '<div class="g-gd-meta">' + state + tags + (mine ? '<span class="g-tag is-mine">My team</span>' : '') + '</div>' +
      teamRow(A, leadA, g) + teamRow(B, leadB, g) + outlook + '</a>';
  }
  function headline(m) {
    const items = [];
    if (m.topTeam) items.push(['Top score', ownerName(m.topTeam.rosterId), fmt(m.topTeam.points), owner(m.topTeam.rosterId)]);
    if (m.topPlayer) { const label = labels?.[m.topPlayer.playerId]; items.push(['Top starter', label || 'Starter for ' + ownerName(m.topPlayer.rosterId), fmt(m.topPlayer.points) + (label ? ' · ' + ownerName(m.topPlayer.rosterId) : ''), owner(m.topPlayer.rosterId)]); }
    if (m.median != null) { const over = m.games.flatMap(g => [g.a, g.b]).filter(s => s.points > m.median).length; items.push(['Median line', fmt(m.median), over + ' of ' + m.games.length * 2 + ' teams above it', null]); }
    if (m.tightest && m.anyStarted) { const g = m.tightest, d = Math.abs(m.status === 'final' ? g.a.points - g.b.points : g.a.projected - g.b.projected); items.push([m.status === 'final' ? 'Closest finish' : 'Tightest race', ownerName(g.a.rosterId) + ' vs ' + ownerName(g.b.rosterId), (m.status === 'final' ? 'Decided by ' : 'Projected gap ') + fmt(d), null]); }
    return items.map(([k, v, d, id]) => '<div class="g-gd-stat"' + (id && T() ? ' style="--team:' + T().color(id) + '"' : '') + '><span>' + esc(k) + '</span><strong>' + esc(v) + '</strong><small>' + esc(d) + '</small></div>').join('');
  }
  function alerts(m) {
    const out = [];
    for (const g of m.games) {
      const a = ownerName(g.a.rosterId), b = ownerName(g.b.rosterId), dog = g.favorite === 'A' ? b : a, fav = g.favorite === 'A' ? a : b;
      if (g.tags.includes('upset-watch')) out.push('<li class="is-alert"><b>Upset watch</b> ' + esc(dog) + ' is ahead of the pace against ' + esc(fav) + '.</li>');
      if (g.tags.includes('upset')) out.push('<li class="is-alert"><b>Upset</b> ' + esc(dog) + ' knocked off ' + esc(fav) + '.</li>');
      if (g.tags.includes('close')) out.push('<li class="is-close"><b>Too close to call</b> ' + esc(a) + ' and ' + esc(b) + ' project within ' + fmt(Math.abs(g.a.projected - g.b.projected)) + '.</li>');
      if (g.tags.includes('photo-finish')) out.push('<li class="is-close"><b>Photo finish</b> ' + esc(a) + ' vs ' + esc(b) + ' was decided by ' + fmt(Math.abs(g.a.points - g.b.points)) + '.</li>');
    }
    return out.join('');
  }
  function paint() {
    const host = doc.getElementById('homeScores'); if (!host || !ctx) return;
    const m = model(ctx.pairs, { status: ctx.status, averages: avgCache, median: Number(ctx.league?.settings?.league_average_match) === 1 });
    ctx.model = m;
    if (!host.__gd) { host.classList.add('is-fresh'); root.setTimeout(() => host.classList.remove('is-fresh'), 1400); }
    set(host, m.games.length ? m.games.map(card).join('') : '<p class="n-empty">This week’s matchups haven’t been posted yet.</p>');
    for (const g of m.games) for (const s of [g.a, g.b]) last.set(s.rosterId, s.points);
    const stats = doc.getElementById('cteGameDayStats'); if (stats) { const h = headline(m); set(stats, h); stats.hidden = !h; }
    const list = doc.getElementById('cteGameDayAlerts'); if (list) { const h = alerts(m); set(list, h); list.hidden = !h; }
    const badge = doc.getElementById('cteGameDayState');
    if (badge) { const live = m.status === 'live' && m.anyStarted; badge.className = 'g-tag ' + (m.status === 'final' ? 'is-final' : live ? 'is-live' : ''); badge.innerHTML = m.status === 'final' ? 'Final' : live ? '<i aria-hidden="true"></i>Live' : 'Kickoff pending'; }
    const note = doc.getElementById('cteGameDayNote');
    if (note) note.textContent = m.status === 'final' ? 'Week ' + ctx.week + ' is scored and final in Sleeper.' : m.hasOutlook ? 'Win outlook and projections are CTE estimates: every starter still on 0 is given his season average. They are not Sleeper projections.' : ctx.outlookState === 'failed' ? 'Live scores from Sleeper. The win outlook is unavailable right now.' : 'Live scores from Sleeper.';
    try { root.dispatchEvent(new Event('cte:my-team')); } catch (_) {}
  }
  /** Called by network-v29.js once the week's rows are in. */
  function render(input) {
    const first = !ctx || ctx.week !== input.week || ctx.season !== input.season;
    ctx = { ...input, pairs: input.groups, status: root.CTE_LeagueEngine.gameStatus(input.league, input.week), outlookState: avgCache ? 'ready' : 'loading' };
    ctx.records = Object.fromEntries((input.standings || []).map(r => [r.ownerId, r.wins + '–' + r.losses + (r.ties ? '–' + r.ties : '')]));
    if (first) { avgCache = null; ctx.outlookState = 'loading'; last = new Map(); }
    paint();
    loadLabels().then(() => { if (ctx?.model?.topPlayer) paint(); });
    if (!avgCache && ctx.status !== 'final') {
      const mine = ctx;
      loadAverages(ctx).then(a => { if (ctx.week !== mine.week) return; avgCache = a; ctx.outlookState = 'ready'; paint(); }).catch(() => { if (ctx.week === mine.week) { ctx.outlookState = 'failed'; paint(); } });
    }
    schedule();
  }
  async function poll() {
    if (!ctx || doc.hidden || ctx.status !== 'live') return;
    try {
      const rows = await root.CTE_Sleeper.getMatchups(ctx.leagueId, ctx.week, { fresh: true });
      ctx.pairs = root.CTE_LeagueEngine.groupMatchups(rows).filter(p => p.length === 2);
      paint();
      const stamp = doc.getElementById('homeStamp'); if (stamp) stamp.textContent = 'Week ' + ctx.week + ' · Updated ' + new Date().toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) + ' · Sleeper';
    } catch (_) { /* keep the last good scores on screen */ }
  }
  function schedule() {
    if (timer) root.clearInterval(timer);
    timer = ctx && ctx.status === 'live' ? root.setInterval(poll, 60000) : null;
  }
  doc?.addEventListener('visibilitychange', () => { if (!doc.hidden) poll(); });
  root.CTE_GameDay = { render, model, averages, poll };
})(typeof window === 'undefined' ? globalThis : window);
