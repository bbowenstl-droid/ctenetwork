/* CTE State of the Union — page controller.
 * Loads every season from the public Sleeper API (following previous_league_id),
 * caches trimmed responses for the session, hands them to CTESotuEngine and renders.
 * If Sleeper is slow or down it falls back to data/sotu/snapshot.json and says so.
 * Read-only: nothing here writes to Sleeper, Firebase or the site.
 */
(function () {
  'use strict';
  const E = window.CTESotuEngine, CONFIG = window.CTE_LEAGUE_DATA;
  const hero = document.getElementById('sotuTakes');
  if (!E || !CONFIG || !hero) return;

  const API = 'https://api.sleeper.app/v1';
  const SITE = 'https://bbowenstl-droid.github.io/ctenetwork/';
  const CACHE = 'cte_sotu_v1:';
  const CURRENT_TTL = 5 * 60 * 1000;
  const REQUEST_TIMEOUT = 9000, OVERALL_TIMEOUT = 25000;
  const season = String(CONFIG.league.currentSeason);
  const currentLeagueId = CONFIG.league.seasons[season].sleeperLeagueId;
  const $ = id => document.getElementById(id);
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const f1 = n => Number(n).toFixed(1), f2 = n => Number(n).toFixed(2);
  const signed = n => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n).toFixed(1);
  const day = t => new Date(t).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'America/Chicago' });
  const rec = a => a[0] + '–' + a[1] + (a[2] ? '–' + a[2] : '');
  const plural = (n, w) => n + ' ' + w + (n === 1 ? '' : 's');
  const icon = { trophy: '<svg class="sotu-ico" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 3h10v3h3v2a5 5 0 0 1-4.4 5A5 5 0 0 1 13 15.9V18h3v3H8v-3h3v-2.1A5 5 0 0 1 8.4 13 5 5 0 0 1 4 8V6h3V3Zm0 5H6a3 3 0 0 0 1.4 2.5A9 9 0 0 1 7 8Zm10 0a9 9 0 0 1-.4 2.5A3 3 0 0 0 18 8h-1Z" fill="currentColor"/></svg>' };

  let model = null, mode = 'loading', snapshotMeta = null;
  const names = {}, positions = {};
  const rendered = new Set();
  const ui = { tradeTeam: 'all', tradeSort: 'points', standings: 'franchise', draft: null, openTrees: new Set() };

  /* ------------------------------------------------------------------ data */
  function cacheGet(path, maxAge) {
    try { const v = JSON.parse(sessionStorage.getItem(CACHE + path) || 'null'); if (v && (maxAge == null || Date.now() - v.t < maxAge)) return v; } catch (_) { /* private mode */ }
    return null;
  }
  function cacheSet(path, d) { try { sessionStorage.setItem(CACHE + path, JSON.stringify({ t: Date.now(), d })); } catch (_) { /* quota: carry on uncached */ } }
  async function fetchJson(url, timeout) {
    const ctl = new AbortController(); const timer = setTimeout(() => ctl.abort(), timeout);
    try { const r = await fetch(url, { signal: ctl.signal }); if (!r.ok) throw new Error('HTTP ' + r.status); return await r.json(); }
    finally { clearTimeout(timer); }
  }
  let fetchedAt = 0;
  async function sleeper(path, maxAge) {
    const hit = cacheGet(path, maxAge);
    if (hit) { fetchedAt = Math.max(fetchedAt, hit.t); return hit.d; }
    let data;
    try { data = await fetchJson(API + path, REQUEST_TIMEOUT); }
    catch (_) { data = await fetchJson(API + path, REQUEST_TIMEOUT); } // one retry
    const slim = E.trim(path, data);
    cacheSet(path, slim); fetchedAt = Date.now();
    return slim;
  }
  async function pool(tasks, limit) { let i = 0; await Promise.all(Array.from({ length: Math.min(limit, tasks.length) }, async () => { while (i < tasks.length) await tasks[i++](); })); }

  function progress(done, total) {
    const bar = $('sotuProgress'); if (!bar) return;
    bar.hidden = done >= total; bar.firstElementChild.style.width = Math.round(done / Math.max(1, total) * 100) + '%';
    if (done < total) $('sotuStatus').textContent = `Reading Sleeper… ${done} of ${total}`;
  }

  async function loadLive(fresh) {
    const responses = {}; let done = 0, total = 4;
    const take = async (path, maxAge) => { const d = await sleeper(path, maxAge); responses[path] = d; progress(++done, total); return d; };
    const age = i => (i === 0 ? (fresh ? 0 : CURRENT_TTL) : null); // finished seasons never change: keep for the session
    try { await take('/state/nfl', fresh ? 0 : CURRENT_TTL); } catch (_) { done++; }
    const chain = [];
    for (let id = currentLeagueId; id && id !== '0' && chain.length < 30;) { const lg = await take('/league/' + id, age(chain.length)); chain.push(lg); id = lg.previous_league_id; }
    const tasks = [];
    chain.forEach((lg, i) => {
      const id = lg.league_id, a = age(i);
      for (const leaf of ['users', 'rosters', 'drafts', 'traded_picks', 'winners_bracket', 'losers_bracket']) tasks.push(() => take(`/league/${id}/${leaf}`, a));
      for (let w = 1; w <= Number(lg.settings.last_scored_leg || 0); w++) tasks.push(() => take(`/league/${id}/matchups/${w}`, a));
      for (let w = 1; w <= 18; w++) tasks.push(() => take(`/league/${id}/transactions/${w}`, a));
    });
    total = done + tasks.length + chain.length * 2; progress(done, total);
    await pool(tasks, 8);
    const draftTasks = [];
    for (const lg of chain) for (const d of responses[`/league/${lg.league_id}/drafts`] || []) {
      draftTasks.push(() => take('/draft/' + d.draft_id, null).catch(() => { done++; })); // optional detail (slot ownership); engine can derive it
      draftTasks.push(() => take(`/draft/${d.draft_id}/picks`, d.status === 'complete' ? null : CURRENT_TTL));
    }
    total = done + draftTasks.length; await pool(draftTasks, 6); progress(total, total);
    return responses;
  }
  const deadline = (p, ms) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(new Error('Sleeper took too long')), ms))]);

  async function loadNames() {
    try { const p = await fetchJson('data/sotu/players.json?v=1', 8000); for (const [id, v] of Object.entries(p)) { names[id] = v[0]; positions[id] = v[1]; } } catch (_) { /* draft metadata still names most players */ }
    try { const extra = JSON.parse(sessionStorage.getItem(CACHE + 'names') || '{}'); for (const [id, v] of Object.entries(extra)) { names[id] = v[0]; positions[id] = v[1]; } } catch (_) { /* ignore */ }
  }
  /* Players added to the league after data/sotu/players.json was built: resolve once per session. */
  async function resolveUnknownNames() {
    const unknown = new Set();
    const note = id => { if (!names[id] && !/^[A-Z]{2,3}$/.test(id)) unknown.add(id); };
    for (const t of model.trades) for (const s of t.sides) for (const g of s.gets) { if (g.pid) note(g.pid); }
    for (const f of model.franchises) for (const s of f.seasons) for (const c of s.core) note(c.pid);
    if (!unknown.size || mode !== 'live') return;
    try {
      const all = await fetchJson(API + '/players/nfl', 30000); const add = {};
      for (const id of unknown) { const v = all[id]; if (v) add[id] = [v.full_name || [v.first_name, v.last_name].filter(Boolean).join(' '), v.position || '']; }
      if (!Object.keys(add).length) return;
      for (const [id, v] of Object.entries(add)) { names[id] = v[0]; positions[id] = v[1]; }
      try { sessionStorage.setItem(CACHE + 'names', JSON.stringify({ ...JSON.parse(sessionStorage.getItem(CACHE + 'names') || '{}'), ...add })); } catch (_) { /* ignore */ }
      build(lastResponses); rerender();
    } catch (_) { /* names stay as ids; numbers are unaffected */ }
  }

  let lastResponses = null;
  function build(responses) {
    lastResponses = responses;
    model = E.build({ ...E.assemble(responses, currentLeagueId), config: CONFIG, names, positions });
    window.CTESotu = { model, mode }; // for QA probes
  }

  async function start(fresh) {
    mode = 'loading'; $('sotuNotice').innerHTML = ''; $('sotuStatus').textContent = 'Connecting to Sleeper…';
    await loadNames();
    let responses;
    try { responses = await deadline(loadLive(fresh), OVERALL_TIMEOUT); mode = 'live'; }
    catch (err) {
      console.warn('State of the Union: live load failed, using saved snapshot', err);
      try { const snap = await fetchJson('data/sotu/snapshot.json?v=1', 20000); responses = snap.responses; snapshotMeta = snap; mode = 'snapshot'; }
      catch (err2) { return fail(); }
    }
    $('sotuProgress').hidden = true;
    try { build(responses); } catch (err) { console.error('State of the Union: build failed', err); return fail(); }
    paintStatus(); renderHero(); rerender(true); observe(); route(true);
    resolveUnknownNames();
  }
  function fail() {
    mode = 'error'; $('sotuProgress').hidden = true; $('sotuStatus').textContent = 'Sleeper unavailable';
    $('sotuNotice').innerHTML = '<p class="sotu-alert">Couldn’t reach Sleeper or the saved copy right now. <button type="button" class="sotu-btn" data-retry>Try again</button> In the meantime the <a href="state-of-union.html">November 13 written edition</a> is still open.</p>';
    document.querySelectorAll('.sotu-skeleton').forEach(el => { el.textContent = 'Waiting on Sleeper.'; el.classList.add('is-stopped'); });
  }
  function paintStatus() {
    const st = $('sotuStatus');
    if (mode === 'live') {
      st.innerHTML = `<span class="sotu-dot" aria-hidden="true"></span>Live from Sleeper · ${esc(new Date(fetchedAt || Date.now()).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }))} <button type="button" class="sotu-link" data-refresh>Refresh</button>`;
    } else {
      st.textContent = 'Saved copy';
      $('sotuNotice').innerHTML = `<p class="sotu-alert">Sleeper isn’t answering right now, so this is the saved copy from ${esc(day(snapshotMeta.capturedAt))}. Numbers stop there. <button type="button" class="sotu-btn" data-refresh>Try live again</button></p>`;
    }
    const a = model.audit, ok = a.filter(x => x.ok === true).length, bad = a.filter(x => x.ok === false).length;
    $('sotuAudit').textContent = `Data check: ${ok} of ${a.length} season records match Sleeper’s own standings exactly${bad ? `; ${bad} do not and are flagged for review` : ''}${a.some(x => x.ok === null) ? '; the rest include a week still being played' : ''}.`;
  }

  /* ------------------------------------------------------------ small parts */
  const M = id => esc(model.name(id));
  const F = rid => esc(model.franchiseLabel(rid));
  const team = (year, rid) => { const s = model.seasons.find(x => x.year === year); return s && s.teams[rid] ? esc(s.teams[rid].teamName) : ''; };
  const scroller = (label, html) => `<div class="sotu-scroll" role="region" tabindex="0" aria-label="${esc(label)}">${html}</div>`;
  const gameType = t => (t === 'playoff' ? 'Playoffs' : t === 'placement' ? 'Placement game' : t === 'consolation' ? 'Consolation' : '');
  const wk = x => `${x.year} Wk ${x.week}${x.type && x.type !== 'regular' ? ' · ' + gameType(x.type) : ''}`;
  const how = { startup: 'Startup draft', rookie: 'Rookie draft', trade: 'Trade', waiver: 'Waivers', unknown: 'Other' };

  /* ------------------------------------------------------------------ hero */
  function renderHero() {
    const s = model.summary;
    $('sotuHeadline').textContent = s.headline + ' Every champion, every trade and what became of it, every franchise’s story.';
    $('sotuTiles').innerHTML = s.tiles.map(t => `<div class="sotu-tile"><dt>${esc(t.label)}</dt><dd>${esc(t.n)}</dd></div>`).join('');
    $('sotuThrough').textContent = `Counted through ${s.through}. Generated from the numbers, not the group chat.`;
    hero.innerHTML = s.lines.map(l => `<li><span class="sotu-tag">${esc(l.tag)}</span><p>${esc(l.text)}</p><a href="#${esc(l.anchor)}" class="sotu-more">See the receipts<span aria-hidden="true"> ↓</span><span class="sotu-vh"> for ${esc(l.tag)}</span></a></li>`).join('');
  }

  /* --------------------------------------------------------------- history */
  function standingsTable(s) {
    const rows = s.table.map(t => `<tr><td class="num">${t.rank}</td><th scope="row">${M(t.manager)}<small>${team(s.year, t.rid)}</small></th><td class="num"><strong>${t.w}–${t.l}${t.t ? '–' + t.t : ''}</strong></td><td class="num">${rec(t.h2h)}</td><td class="num">${s.median ? rec(t.med) : '—'}</td><td class="num">${f2(t.pf)}</td><td class="num">${f2(t.pa)}</td><td class="num">${signed(t.luck)}</td></tr>`).join('');
    return scroller(`${s.year} standings`, `<table class="sotu-table"><caption class="sotu-vh">${s.year} regular-season standings${s.complete ? '' : ' through Week ' + s.lastFinal}</caption><thead><tr><th scope="col" class="num">#</th><th scope="col">Manager</th><th scope="col" class="num">Overall</th><th scope="col" class="num">H2H</th><th scope="col" class="num">Median</th><th scope="col" class="num">PF</th><th scope="col" class="num">PA</th><th scope="col" class="num">Luck</th></tr></thead><tbody>${rows}</tbody></table>`);
  }
  function renderHistory() {
    const cards = model.seasons.map(s => {
      const f = s.finish, row = rid => s.table.find(t => t.rid === rid);
      const who = (rid, extra) => { const t = row(rid); return `<strong>${M(t.manager)}</strong><small>${team(s.year, rid)} · ${t.w}–${t.l}${extra ? ' · ' + extra : ''}</small>`; };
      const item = (label, body, cls) => `<div class="sotu-honor ${cls || ''}"><dt>${label}</dt><dd>${body}</dd></div>`;
      let top, list = '';
      if (s.complete && f.champion != null) {
        top = `<div class="sotu-champ"><span class="sotu-champ-ico">${icon.trophy}</span><p class="sotu-champ-label">${s.year} champion</p><p class="sotu-champ-name">${M(row(f.champion).manager)}</p><p class="sotu-champ-sub">${team(s.year, f.champion)} · ${ordinal(row(f.champion).rank)} in the regular season at ${row(f.champion).w}–${row(f.champion).l}</p></div>`;
        list += item('Runner-up', who(f.runnerUp));
        if (f.third != null) list += item('Third place', who(f.third));
        list += item('Regular-season winner', who(f.regularSeason.rid, rec(f.regularSeason.h2h) + ' head-to-head'));
        list += item('Most points', who(f.pointsLeader.rid, f2(f.pointsLeader.pf) + ' PF'));
        if (f.toiletBowl != null) list += item('Toilet Bowl', who(f.toiletBowl, 'last in the consolation bracket'), 'is-low');
        list += item('Last place', who(f.lastPlace.rid, 'bottom of the standings'), 'is-low');
      } else {
        const a = f.regularSeason;
        top = `<div class="sotu-champ is-open"><p class="sotu-champ-label">${s.year} · through Week ${s.lastFinal}</p><p class="sotu-champ-name">${a ? M(a.manager) : 'TBD'}</p><p class="sotu-champ-sub">${a ? `leads at ${a.w}–${a.l}. The banner is decided in Week ${s.start + 2}.` : ''}</p></div>`;
        if (s.table[1]) list += item('Chasing', who(s.table[1].rid));
        if (f.pointsLeader) list += item('Most points', who(f.pointsLeader.rid, f2(f.pointsLeader.pf) + ' PF'));
        if (f.lastPlace) list += item('Bringing up the rear', who(f.lastPlace.rid), 'is-low');
      }
      const po = model.games.filter(g => g.year === s.year && (g.type === 'playoff' || g.type === 'placement'));
      const road = po.length ? `<details class="sotu-details"><summary>${s.year} playoff results</summary><ul class="sotu-games">${po.map(g => { const aw = g.sa >= g.sb; return `<li><span class="sotu-when">Wk ${g.week}${g.place === 1 ? ' · Final' : g.place ? ' · ' + ordinal(g.place) + '-place game' : ''}</span><span><strong>${M(aw ? g.ma : g.mb)}</strong> ${f2(aw ? g.sa : g.sb)} def. ${M(aw ? g.mb : g.ma)} ${f2(aw ? g.sb : g.sa)}</span></li>`; }).join('')}</ul></details>` : '';
      return `<article class="sotu-season${s.complete ? '' : ' is-live'}" aria-label="${s.year} season"><header><span class="sotu-year">${s.year}</span><span class="sotu-chip">${s.complete ? 'Final' : 'In progress'}</span></header>${top}<dl class="sotu-honors">${list}</dl>${road}<details class="sotu-details"><summary>${s.year} standings</summary>${standingsTable(s)}</details></article>`;
    }).join('');
    const tl = model.timeline.map(e => `<li class="is-${esc(e.kind)}"><span class="sotu-when">${e.time ? esc(day(e.time)) : e.year + (e.week ? ' · Week ' + e.week : '')}</span><h4>${esc(e.title)}</h4><p>${esc(e.text)}${e.trade ? ` <a href="#trade-${esc(e.trade)}">Open the trade</a>` : ''}</p></li>`).join('');
    $('sotuHistory').innerHTML = `<div class="sotu-seasons">${cards}</div><h3 class="sotu-h3">Timeline</h3><ol class="sotu-timeline">${tl}</ol>`;
  }
  const ordinal = n => E.ord(n);

  /* ---------------------------------------------------------------- trades */
  function tradeWeb() {
    const n = model.rids.length, R = 118, C = 170;
    const pos = {}; model.rids.forEach((rid, i) => { const a = -Math.PI / 2 + i * 2 * Math.PI / n; pos[rid] = { x: C + R * Math.cos(a), y: C + R * Math.sin(a), a }; });
    const count = Object.fromEntries(model.traderStats.map(t => [t.rid, t.trades]));
    const edges = model.pairs.map(p => `<line x1="${pos[p.a].x.toFixed(1)}" y1="${pos[p.a].y.toFixed(1)}" x2="${pos[p.b].x.toFixed(1)}" y2="${pos[p.b].y.toFixed(1)}" stroke-width="${1 + p.n * 1.6}" data-a="${p.a}" data-b="${p.b}"/>`).join('');
    const nodes = model.rids.map(rid => {
      const p = pos[rid], lx = C + (R + 20) * Math.cos(p.a), ly = C + (R + 20) * Math.sin(p.a);
      const anchor = Math.abs(Math.cos(p.a)) < 0.3 ? 'middle' : Math.cos(p.a) > 0 ? 'start' : 'end';
      return `<g class="sotu-web-node" data-team="${rid}" role="button" tabindex="0" aria-pressed="${String(ui.tradeTeam) === String(rid)}" aria-label="${F(rid)}: ${plural(count[rid] || 0, 'trade')}. Filter the list."><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="22" class="sotu-web-hit"/><circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${7 + Math.min(10, (count[rid] || 0) * 1.1)}"/><text x="${p.x.toFixed(1)}" y="${(p.y + 3.5).toFixed(1)}" text-anchor="middle" class="sotu-web-n">${count[rid] || 0}</text><text x="${lx.toFixed(1)}" y="${(ly + 4).toFixed(1)}" text-anchor="${anchor}">${F(rid)}</text></g>`;
    }).join('');
    return `<svg class="sotu-web" viewBox="-30 0 400 340" role="group" aria-label="Trade web: every franchise, sized by number of trades, joined to each trade partner">${edges ? `<g class="sotu-web-edges">${edges}</g>` : ''}${nodes}</svg>`;
  }
  function verdict(t) {
    if (t.verdict === 'early') return ['Too early to call', 'is-early'];
    if (t.verdict === 'even') return ['Too close to call', 'is-even'];
    const w = t.sides.find(s => s.rid === t.leader);
    return t.verdict === 'won' ? [`${M(w.manager)} won by ${f1(t.margin)}`, 'is-won'] : [`${M(w.manager)} leads by ${f1(t.margin)} · picks pending`, 'is-leading'];
  }
  function assetLine(g) {
    const v = g.value;
    const label = g.kind === 'pick' ? `<span class="sotu-asset-name">${esc(g.label)}</span><small>${esc(g.sub)}${g.used ? ` · became <strong>${esc(g.used.label)}</strong>` : ''}</small>` : `<span class="sotu-asset-name">${esc(g.label)}</span>${g.pos ? `<small>${esc(g.pos)}</small>` : ''}`;
    return `<li><button type="button" class="sotu-asset" data-asset="${esc(g.key)}" aria-label="Follow ${esc(g.kind === 'pick' ? g.label + ', ' + g.sub : g.label)} through the league">${label}</button><span class="sotu-pts">${v.pending ? '<abbr title="Pick not used yet">pending</abbr>' : f1(v.pts)}</span></li>`;
  }
  function tradeCard(t) {
    const [vText, vCls] = verdict(t);
    const max = Math.max(1, ...t.sides.map(s => s.pts));
    const sides = t.sides.map(s => `<div class="sotu-side${t.leader === s.rid && (t.verdict === 'won' || t.verdict === 'leading') ? ' is-ahead' : ''}"><h4>${M(s.manager)} <small>got</small></h4><ul>${s.gets.map(assetLine).join('') || '<li class="sotu-none">Nothing recorded</li>'}${s.faabIn ? `<li><span>$${s.faabIn} FAAB</span><span class="sotu-pts">—</span></li>` : ''}</ul><div class="sotu-meter" aria-hidden="true"><span style="width:${Math.round(s.pts / max * 100)}%"></span></div><p class="sotu-total"><strong>${f1(s.pts)}</strong> points since${s.pending ? ` · ${plural(s.pending, 'pick')} pending` : ''}</p></div>`).join('');
    const open = ui.openTrees.has(t.id);
    const linked = t.linksIn + t.linksOut;
    return `<article class="sotu-trade" id="trade-${esc(t.id)}" aria-labelledby="th-${esc(t.id)}"><header><h3 id="th-${esc(t.id)}"><span class="sotu-ref">${esc(t.ref)}</span> ${t.sides.map(s => M(s.manager)).join(' ↔ ')}</h3><p class="sotu-trade-meta"><time datetime="${new Date(t.time).toISOString().slice(0, 10)}">${esc(day(t.time))}</time> · ${t.year} Week ${t.week} · ${plural(t.assets, 'asset')}</p><p class="sotu-verdict ${vCls}">${vText}</p></header><div class="sotu-sides sotu-sides-${Math.min(3, t.sides.length)}">${sides}</div><footer><button type="button" class="sotu-btn" data-tree="${esc(t.id)}" aria-expanded="${open}" aria-controls="tree-${esc(t.id)}">${open ? 'Close trade tree' : 'Open trade tree'}</button>${linked ? `<span class="sotu-linked">Connected to ${plural(linked, 'other trade')}</span>` : ''}<button type="button" class="sotu-share" data-share-hash="trade-${esc(t.id)}" data-share-title="CTE trade ${esc(t.ref)}">Share</button></footer><div class="sotu-tree-wrap" id="tree-${esc(t.id)}" ${open ? '' : 'hidden'}>${open ? treeHtml(t.id) : ''}</div></article>`;
  }
  function stepHtml(st) {
    switch (st.type) {
      case 'held': return `<li class="is-end">On ${F(st.rid)}’s roster today</li>`;
      case 'gone': return '<li class="is-end">No longer on a CTE roster</li>';
      case 'unused': return `<li class="is-end">Not used yet · held by ${F(st.rid)}</li>`;
      case 'drop': return `<li class="is-end">Dropped by ${F(st.rid)}, ${st.year} Week ${st.week}</li>`;
      case 'pickup': return `<li>Picked up by ${F(st.rid)}</li>`;
      case 'used': return `<li>Used by ${M(st.pick.manager)} at pick ${st.pick.round}.${String(st.pick.no - (st.pick.round - 1) * model.rids.length).padStart(2, '0')} on <strong>${esc(model.pname(st.pick.pid))}</strong></li>`;
      case 'trade': return `<li class="is-trade">Traded to ${F(st.to)} in <button type="button" class="sotu-link" data-goto-trade="${esc(st.trade)}">${esc(st.ref)}</button> (${esc(day(st.time))})${st.back.length ? `<span class="sotu-back">${F(st.from)} got back</span><ul class="sotu-tree">${st.back.map(nodeHtml).join('')}</ul>` : ''}</li>`;
      default: return '';
    }
  }
  function nodeHtml(nd) {
    const v = nd.value;
    return `<li><div class="sotu-node"><span>${esc(nd.label)}${nd.kind === 'pick' ? ` <small>${esc(nd.sub)}</small>` : nd.pos ? ` <small>${esc(nd.pos)}</small>` : ''}</span><span class="sotu-pts">${v.pending ? 'pending' : f1(v.pts) + ' pts'}</span></div><ul class="sotu-steps">${nd.steps.map(stepHtml).join('')}</ul></li>`;
  }
  function treeHtml(id) {
    const tree = model.tradeTree(id);
    return `<div class="sotu-branches">${tree.sides.map(s => `<section class="sotu-branch" aria-label="What ${M(s.manager)} got and where it went"><h4>${M(s.manager)}’s side</h4><ul class="sotu-tree">${s.nodes.map(nodeHtml).join('') || '<li>Nothing recorded</li>'}</ul></section>`).join('')}</div><p class="sotu-fine">Follow any branch: each traded asset shows where it went next and what came back for it.</p>`;
  }
  function tradeList() {
    let list = model.trades.filter(t => ui.tradeTeam === 'all' || t.teams.includes(Number(ui.tradeTeam)));
    const by = { points: (a, b) => b.totalPts - a.totalPts || b.assets - a.assets, assets: (a, b) => b.assets - a.assets || b.totalPts - a.totalPts, lopsided: (a, b) => b.margin - a.margin, newest: (a, b) => b.time - a.time, oldest: (a, b) => a.time - b.time };
    list = list.slice().sort(by[ui.tradeSort] || by.points);
    if (!list.length) return `<p class="sotu-empty">${ui.tradeTeam === 'all' ? 'No trades yet. Somebody make a call.' : F(ui.tradeTeam) + '’s franchise has never made a trade. The phone works both ways.'}</p>`;
    return list.map(tradeCard).join('');
  }
  function journeyHtml(key) {
    const j = model.journey(key), a = j.info;
    const title = a.kind === 'pick' ? `${esc(a.label)} <small>${esc(a.sub)}</small>` : `${esc(a.label)}${a.pos ? ` <small>${esc(a.pos)}</small>` : ''}`;
    const ev = j.events.map(e => {
      const when = `<span class="sotu-when">${esc(day(e.time))}</span>`;
      if (e.type === 'selection') return `<li>${when}Drafted by <strong>${M(e.pick.manager)}</strong>, ${e.pick.startup ? 'startup draft' : e.pick.year + ' rookie draft'}, pick ${e.pick.no}${e.pick.asset && e.pick.orig !== e.pick.rid ? ` (with ${F(e.pick.orig)}’s original ${ordinal(e.pick.round)}-rounder)` : ''}</li>`;
      if (e.type === 'used') return `<li>${when}Used by <strong>${M(e.pick.manager)}</strong> on <strong>${esc(model.pname(e.pick.pid))}</strong> (pick ${e.pick.no})</li>`;
      if (e.type === 'trade') { const t = model.tradeById[e.trade]; const pk = e.asset.startsWith('pick:') && a.kind === 'player' ? 'As a draft pick: ' : ''; return `<li class="is-trade">${when}${pk}${F(e.from)} traded ${a.kind === 'pick' || pk ? 'it' : 'him'} to <strong>${F(e.to)}</strong> in <button type="button" class="sotu-link" data-goto-trade="${esc(t.id)}">${esc(t.ref)}</button></li>`; }
      if (e.type === 'drop') return `<li>${when}Dropped by ${F(e.from)}</li>`;
      return `<li>${when}Picked up by <strong>${F(e.to)}</strong></li>`;
    }).join('');
    const now = a.kind === 'pick' && !a.used ? `Held by <strong>${F(j.holder)}</strong>, not used yet` : j.holder != null ? `Now on <strong>${F(j.holder)}</strong>’s roster` : 'Not on a CTE roster right now';
    return `<div class="sotu-journey-card"><div class="sotu-journey-head"><h4>${title}</h4><button type="button" class="sotu-link" data-journey-close>Close</button></div><p class="sotu-now">${now}</p><ol class="sotu-journey-list">${ev || '<li>Never moved. Still with the original franchise.</li>'}</ol></div>`;
  }
  function renderTrades() {
    const teams = model.rids.map(rid => `<option value="${rid}"${String(ui.tradeTeam) === String(rid) ? ' selected' : ''}>${F(rid)}</option>`).join('');
    const sorts = [['points', 'Biggest: most production since'], ['assets', 'Biggest: most assets moved'], ['lopsided', 'Most lopsided'], ['newest', 'Newest first'], ['oldest', 'Oldest first']].map(([v, l]) => `<option value="${v}"${ui.tradeSort === v ? ' selected' : ''}>${l}</option>`).join('');
    const c = model.counts;
    $('sotuTrades').innerHTML = `
      <div class="sotu-trade-top">
        <figure class="sotu-web-card"><figcaption><h3 class="sotu-h3">The trade web</h3><p>${plural(c.trades, 'trade')}; ${c.linkedTrades} of them share an asset with another deal. Tap a franchise to see only its trades.</p></figcaption>${tradeWeb()}</figure>
        <div class="sotu-finder"><h3 class="sotu-h3">Follow a player or a pick</h3><p>Type a name (or “2027”) to see how it moved through the league.</p>
          <label class="sotu-vh" for="sotuAssetQuery">Find a player or pick</label><input type="search" id="sotuAssetQuery" class="sotu-input" placeholder="Search players and picks…" autocomplete="off" autocapitalize="off" spellcheck="false">
          <ul class="sotu-suggest" id="sotuSuggest" aria-label="Matching players and picks"></ul>
          <div id="sotuJourney" aria-live="polite" tabindex="-1"></div>
        </div>
      </div>
      <div class="sotu-controls"><label>Franchise<select id="sotuTradeTeam" class="sotu-select"><option value="all">All franchises</option>${teams}</select></label><label>Order<select id="sotuTradeSort" class="sotu-select">${sorts}</select></label></div>
      <p class="sotu-fine" id="sotuTradeCount" role="status"></p>
      <div class="sotu-trades" id="sotuTradeList"></div>`;
    paintTrades(); suggest('');
  }
  function paintTrades() {
    $('sotuTradeList').innerHTML = tradeList();
    const n = $('sotuTradeList').querySelectorAll('.sotu-trade').length;
    $('sotuTradeCount').textContent = `Showing ${plural(n, 'trade')}${ui.tradeTeam === 'all' ? '' : ' involving ' + model.franchiseLabel(ui.tradeTeam) + '’s franchise'}. Points since = what each side’s haul has scored on CTE rosters after the deal.`;
    document.querySelectorAll('.sotu-web-node').forEach(g => { const on = String(ui.tradeTeam) === g.dataset.team; g.setAttribute('aria-pressed', String(on)); });
    document.querySelectorAll('.sotu-web-edges line').forEach(l => l.classList.toggle('is-on', ui.tradeTeam !== 'all' && (l.dataset.a === String(ui.tradeTeam) || l.dataset.b === String(ui.tradeTeam))));
    const web = document.querySelector('.sotu-web'); if (web) web.classList.toggle('has-pick', ui.tradeTeam !== 'all');
    const sel = $('sotuTradeTeam'); if (sel) sel.value = String(ui.tradeTeam);
  }
  function suggest(q) {
    const box = $('sotuSuggest'); if (!box) return;
    const terms = q.toLowerCase().trim().split(/\s+/).filter(Boolean);
    const hits = (terms.length ? model.searchable.filter(a => terms.every(t => a.label.toLowerCase().includes(t))) : model.searchable.filter(a => a.traded > 1)).slice(0, terms.length ? 8 : 5);
    box.innerHTML = hits.length ? hits.map(a => `<li><button type="button" class="sotu-chipbtn" data-asset="${esc(a.key)}">${esc(a.label)}${a.traded ? `<small>${plural(a.traded, 'trade')}</small>` : ''}</button></li>`).join('') : '<li class="sotu-none">No player or pick by that name has been drafted or traded here.</li>';
  }
  function showJourney(key, focus) {
    ensure('trades');
    const box = $('sotuJourney'); box.innerHTML = journeyHtml(key);
    if (focus) { box.focus({ preventScroll: true }); box.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); }
  }
  function openTree(id, scroll) {
    ensure('trades');
    if (!document.getElementById('trade-' + id)) { ui.tradeTeam = 'all'; paintTrades(); }
    const card = document.getElementById('trade-' + id); if (!card) return;
    ui.openTrees.add(id);
    const wrap = card.querySelector('.sotu-tree-wrap'), btn = card.querySelector('[data-tree]');
    wrap.innerHTML = treeHtml(id); wrap.hidden = false; btn.setAttribute('aria-expanded', 'true'); btn.textContent = 'Close trade tree';
    if (scroll) { card.scrollIntoView({ block: 'start', behavior: reduced() ? 'auto' : 'smooth' }); btn.focus({ preventScroll: true }); }
  }

  /* ------------------------------------------------------------ franchises */
  function spark(s) {
    if (!s.weeks.length) return '';
    const max = Math.max(...s.weeks.map(w => w.pf), 1), bw = 9, gap = 3, h = 44;
    const bars = s.weeks.map((w, i) => { const bh = Math.max(3, Math.round(w.pf / max * h)); return `<rect x="${i * (bw + gap)}" y="${h - bh}" width="${bw}" height="${bh}" rx="2" class="${w.res === 'W' ? 'w' : 'l'}"/>`; }).join('');
    const width = s.weeks.length * (bw + gap) - gap;
    return `<svg class="sotu-spark" viewBox="0 0 ${width} ${h}" width="${width}" height="${h}" role="img" aria-label="${s.year} weekly scores. Results in order: ${s.weeks.map(w => w.res).join(' ')}">${bars}</svg>`;
  }
  function mixBar(mix) {
    const keys = ['startup', 'rookie', 'trade', 'waiver'].filter(k => mix[k] > 0);
    return `<div class="sotu-mix" role="img" aria-label="Where the started points came from: ${keys.map(k => how[k] + ' ' + mix[k] + '%').join(', ')}">${keys.map(k => `<span class="m-${k}" style="flex:${mix[k]}"></span>`).join('')}</div><ul class="sotu-mix-key">${keys.map(k => `<li><i class="m-${k}" aria-hidden="true"></i>${how[k]} ${mix[k]}%</li>`).join('')}</ul>`;
  }
  function identityLine(f) {
    const played = f.seasons.filter(s => s.games); if (!played.length) return '';
    const last = played[played.length - 1], first = played[0];
    const top = k => Object.entries(k).filter(([n]) => n !== 'unknown').sort((a, b) => b[1] - a[1])[0];
    const [k1, p1] = top(last.mix);
    const voice = { startup: 'Still living off the startup draft', rookie: 'Built through the rookie draft', trade: 'Built on the trade market', waiver: 'Held together by the waiver wire' }[k1];
    let s = `${voice}: ${p1}% of ${last.year} started points came from ${how[k1].toLowerCase()} players.`;
    if (played.length > 1) {
      const d = last.mix.trade - first.mix.trade;
      if (Math.abs(d) >= 8) s += ` Trade-acquired production went from ${first.mix.trade}% in ${first.year} to ${last.mix.trade}% in ${last.year}.`;
      if (f.coreCarried != null) s += ` ${f.coreCarried} of the top six scorers carried over from ${played[played.length - 2].year}.`;
    }
    if (f.startup.picks) s += ` ${f.startup.kept} of ${f.startup.picks} startup picks are still on the roster.`;
    return s;
  }
  function franchiseCard(f) {
    const titles = f.seasons.filter(s => s.result === 'Champion').length;
    const tot = f.totals, w = tot.h2h[0] + tot.med[0], l = tot.h2h[1] + tot.med[1];
    const mgr = f.managers.length > 1 ? `<p class="sotu-managers"><span>Managers</span> ${f.managers.map(m => `${esc(m.name)} <small>${m.from.year}${m.from.week > 1 ? ' Wk ' + m.from.week : ''}–${m.to ? (m.to.end ? m.to.year : m.to.year + ' Wk ' + m.to.week) : 'now'}</small>`).join(' → ')}</p>` : '';
    const seasons = f.seasons.map(s => {
      const multi = s.managers.length > 1 ? s.managers.map(model.name).join(' then ') : model.name(s.manager);
      return `<section class="sotu-fr-season" aria-label="${s.year}"><header><h4>${s.year}<small>${esc(s.teamName)} · managed by ${esc(multi)}</small></h4><span class="sotu-chip${s.result === 'Champion' ? ' is-gold' : ''}">${esc(s.result)}</span></header>
        <dl class="sotu-mini"><div><dt>Overall</dt><dd>${s.w}–${s.l}${s.t ? '–' + s.t : ''}</dd></div><div><dt>H2H</dt><dd>${rec(s.h2h)}</dd></div><div><dt>Rank</dt><dd>${s.games ? ordinal(s.rank) : '—'}</dd></div><div><dt>PF</dt><dd>${f1(s.pf)}</dd></div><div><dt>PA</dt><dd>${f1(s.pa)}</dd></div><div><dt>Luck</dt><dd>${signed(s.luck)}</dd></div></dl>
        ${spark(s)}
        ${s.best ? `<p class="sotu-fine">Best week ${f2(s.best.pf)} (Wk ${s.best.week}) · worst ${f2(s.worst.pf)} (Wk ${s.worst.week})${s.playoff[0] + s.playoff[1] ? ` · playoffs ${s.playoff[0]}–${s.playoff[1]}` : ''}${s.tradeCount ? ' · ' + plural(s.tradeCount, 'trade') : ''}</p>` : ''}
        <h5>Roster core <small>top scorers in the lineup</small></h5>
        <ol class="sotu-core">${s.core.map(c => `<li><span>${esc(c.name)}${c.pos ? ` <small>${esc(c.pos)}</small>` : ''}</span><span class="sotu-how h-${c.how}">${how[c.how]}</span><span class="sotu-pts">${f1(c.pts)}</span></li>`).join('') || '<li class="sotu-none">No games yet</li>'}</ol>
        ${s.games ? mixBar(s.mix) : ''}</section>`;
    }).join('');
    const bw = f.bestSeason ? `<p class="sotu-fine"><strong>Best season:</strong> ${f.bestSeason.year} (${f.bestSeason.w}–${f.bestSeason.l}, ${esc(f.bestSeason.result.toLowerCase())})${f.worstSeason && f.worstSeason !== f.bestSeason ? ` · <strong>Worst:</strong> ${f.worstSeason.year} (${f.worstSeason.w}–${f.worstSeason.l}${f.worstSeason.complete ? '' : ', in progress'})` : ''}</p>` : '';
    return `<article class="sotu-fr" id="franchise-${f.rid}" aria-labelledby="fh-${f.rid}"><header><div><h3 id="fh-${f.rid}">${esc(f.name)}</h3><p>${esc(f.teamName)}${f.division ? ' · ' + esc(f.division) : ''}</p></div>${titles ? `<span class="sotu-banner" aria-label="${plural(titles, 'championship')}">${icon.trophy}${titles > 1 ? '×' + titles : ''}</span>` : ''}</header>
      <dl class="sotu-mini"><div><dt>All-time</dt><dd>${w}–${l}</dd></div><div><dt>H2H</dt><dd>${rec(tot.h2h)}</dd></div><div><dt>PF / game</dt><dd>${tot.games ? f1(tot.pf / tot.games) : '—'}</dd></div><div><dt>Trades</dt><dd>${f.trades}</dd></div></dl>
      ${mgr}<p class="sotu-identity">${esc(identityLine(f))}</p>${bw}
      <details class="sotu-details"><summary>Season by season<span class="sotu-vh"> for ${esc(f.name)}</span></summary><div class="sotu-fr-seasons">${seasons}</div><p class="sotu-fr-links"><a href="team.html?owner=${encodeURIComponent(f.manager)}">Team page</a><button type="button" class="sotu-link" data-team-trades="${f.rid}">${esc(f.name)}’s trades</button><button type="button" class="sotu-share" data-share-hash="franchise-${f.rid}" data-share-title="${esc(f.name)}: franchise history">Share</button></p></details></article>`;
  }
  function renderFranchises() {
    const order = model.allTime.franchise.map(r => r.rid);
    $('sotuFranchises').innerHTML = `<p class="sotu-fine">Ordered by all-time record. A franchise keeps its history when the manager changes; the people keep their own records in the record book below.</p><div class="sotu-frs">${order.map(rid => franchiseCard(model.franchises.find(f => f.rid === rid))).join('')}</div>`;
  }

  /* --------------------------------------------------------------- records */
  function allTimeTable() {
    const rows = model.allTime[ui.standings];
    const body = rows.map((r, i) => `<tr><td class="num">${i + 1}</td><th scope="row">${esc(r.name)}${ui.standings === 'franchise' ? `<small>${esc(r.teamName || '')}</small>` : r.former ? '<small>former manager</small>' : ''}</th><td class="num"><strong>${r.w}–${r.l}${r.t ? '–' + r.t : ''}</strong></td><td class="num">${(r.pct * 100).toFixed(1)}%</td><td class="num">${rec(r.h2h)}</td><td class="num">${rec(r.med)}</td><td class="num">${f1(r.pf)}</td><td class="num">${f1(r.pa)}</td><td class="num">${f1(r.avg)}</td><td class="num">${r.apps}</td><td class="num">${r.playoff[0]}–${r.playoff[1]}</td><td class="num">${r.titles ? '<strong>' + r.titles + '</strong>' : 0}</td></tr>`).join('');
    return scroller('All-time standings', `<table class="sotu-table"><caption class="sotu-vh">All-time regular-season standings by ${ui.standings}</caption><thead><tr><th scope="col" class="num">#</th><th scope="col">${ui.standings === 'franchise' ? 'Franchise' : 'Manager'}</th><th scope="col" class="num">Overall</th><th scope="col" class="num">Win %</th><th scope="col" class="num">H2H</th><th scope="col" class="num">Median</th><th scope="col" class="num">PF</th><th scope="col" class="num">PA</th><th scope="col" class="num">Avg</th><th scope="col" class="num"><abbr title="Playoff appearances">PO</abbr></th><th scope="col" class="num"><abbr title="Playoff record">PO W–L</abbr></th><th scope="col" class="num">Titles</th></tr></thead><tbody>${body}</tbody></table>`);
  }
  function luckChart() {
    const rows = model.allTime[ui.standings].filter(r => r.games >= 3).slice().sort((a, b) => b.luck - a.luck);
    const max = Math.max(1, ...rows.map(r => Math.abs(r.luck)));
    return `<ul class="sotu-luck">${rows.map(r => `<li><span class="sotu-luck-name">${esc(r.name)}</span><span class="sotu-luck-bar ${r.luck >= 0 ? 'is-up' : 'is-down'}" aria-hidden="true"><i style="width:${Math.round(Math.abs(r.luck) / max * 50)}%"></i></span><span class="sotu-luck-n">${signed(r.luck)}</span><small>${rec(r.h2h)} real, ${f1(r.expected)} expected</small></li>`).join('')}</ul>`;
  }
  function recordCard(title, sub, items) { return `<section class="sotu-rec"><h4>${title}</h4><p class="sotu-fine">${sub}</p><ol>${items.join('') || '<li class="sotu-none">Nothing yet</li>'}</ol></section>`; }
  const sideItem = x => `<li><span class="sotu-big">${f2(x.pf)}</span><span><strong>${M(x.manager)}</strong> ${x.won ? 'beat' : 'lost to'} ${M(x.oppManager)} (${f2(x.pa)})<small>${wk(x)}</small></span></li>`;
  const gameItem = g => `<li><span class="sotu-big">${f2(g.margin)}</span><span><strong>${M(g.winnerManager)}</strong> ${f2(g.winScore)}, ${M(g.loserManager)} ${f2(g.loseScore)}<small>${wk(g)}</small></span></li>`;
  function draftBlock() {
    if (!model.drafts.length) return '<p class="sotu-empty">No completed drafts yet.</p>';
    if (ui.draft == null || !model.drafts[ui.draft]) ui.draft = model.drafts.length - 1;
    const d = model.drafts[ui.draft];
    const tabs = model.drafts.map((x, i) => `<button type="button" data-draft="${i}" aria-pressed="${i === ui.draft}">${x.startup ? x.year + ' startup' : x.year + ' rookie'}</button>`).join('');
    const rows = d.table.map((r, i) => `<tr><td class="num">${i + 1}</td><th scope="row">${M(r.manager)}</th><td class="num">${r.picks}</td><td class="num"><strong>${f1(r.pts)}</strong></td><td class="num">${f1(r.per)}</td><td>${r.best && r.best.pts > 0 ? `${esc(r.best.name)} <small>pick ${r.best.no} · ${f1(r.best.pts)}</small>` : '—'}</td></tr>`).join('');
    const steals = d.steals.filter(p => p.steal > 0).map(p => `<li><span class="sotu-big">#${p.no}</span><span><strong>${esc(p.name)}</strong>${p.pos ? ' ' + esc(p.pos) : ''} to ${M(p.manager)}<small>${f1(p.pts)} pts · ${ordinal(p.ptsRank)}-most in the class</small></span></li>`);
    return `<div class="sotu-seg" role="group" aria-label="Choose a draft">${tabs}</div>${scroller('Draft results by manager', `<table class="sotu-table"><caption class="sotu-vh">${d.year} ${d.startup ? 'startup' : 'rookie'} draft: points scored since by each manager’s picks</caption><thead><tr><th scope="col" class="num">#</th><th scope="col">Drafted by</th><th scope="col" class="num">Picks</th><th scope="col" class="num">Points since</th><th scope="col" class="num">Per pick</th><th scope="col">Best pick</th></tr></thead><tbody>${rows}</tbody></table>`)}${steals.length ? recordCard('Steals', 'Picks that out-scored their draft slot the most', steals) : ''}<p class="sotu-fine">Points a pick has scored on any CTE roster since the draft. Credit goes to whoever made the pick.</p>`;
  }
  function tradersTable() {
    const rows = model.traderStats.map((r, i) => {
      const partner = model.pairs.filter(p => p.a === r.rid || p.b === r.rid)[0];
      return `<tr><td class="num">${i + 1}</td><th scope="row">${F(r.rid)}${Object.keys(r.managers).length > 1 ? `<small>${Object.entries(r.managers).map(([m, n]) => esc(model.name(m)) + ' ' + n).join(', ')}</small>` : ''}</th><td class="num"><strong>${r.trades}</strong></td><td class="num">${r.assetsIn}</td><td class="num">${r.assetsOut}</td><td class="num">${r.trades ? signed(r.net) : '—'}</td><td>${partner ? `${F(partner.a === r.rid ? partner.b : partner.a)} <small>×${partner.n}</small>` : '—'}</td></tr>`;
    }).join('');
    return scroller('Most active traders', `<table class="sotu-table"><caption class="sotu-vh">Trades by franchise</caption><thead><tr><th scope="col" class="num">#</th><th scope="col">Franchise</th><th scope="col" class="num">Trades</th><th scope="col" class="num">Assets in</th><th scope="col" class="num">Assets out</th><th scope="col" class="num"><abbr title="Points since scored by what came in, minus what went out">Net pts</abbr></th><th scope="col">Favorite partner</th></tr></thead><tbody>${rows}</tbody></table>`);
  }
  function renderRecords() {
    const r = model.records;
    $('sotuRecords').innerHTML = `
      <div class="sotu-block" id="standings"><div class="sotu-block-head"><h3 class="sotu-h3">All-time standings</h3><div class="sotu-seg" role="group" aria-label="Group records by"><button type="button" data-standings="franchise" aria-pressed="${ui.standings === 'franchise'}">Franchise</button><button type="button" data-standings="manager" aria-pressed="${ui.standings === 'manager'}">Manager</button></div></div><div id="sotuAllTime">${allTimeTable()}</div><p class="sotu-fine">Regular season only. Overall = head-to-head + league-median results. PO = playoff appearances in finished seasons.</p></div>
      <div class="sotu-block" id="luck"><h3 class="sotu-h3">Luck index</h3><p class="sotu-fine">Real head-to-head wins minus the wins a team would expect playing everyone, every week. Right of center: the schedule has been kind.</p><div id="sotuLuck">${luckChart()}</div></div>
      <div class="sotu-block"><h3 class="sotu-h3">Superlatives</h3><div class="sotu-recs">
        ${recordCard('Highest scores', 'Single-week explosions', r.high.map(sideItem))}
        ${recordCard('Lowest scores', 'We all have bad weeks. These were worse.', r.low.map(sideItem))}
        ${recordCard('Biggest blowouts', 'By margin of victory', r.blowouts.map(gameItem))}
        ${recordCard('Closest games', 'Decided by a rounding error', r.closest.map(gameItem))}
        ${recordCard('Best score in a loss', 'Right week, wrong opponent', r.highLoss.map(sideItem))}
        ${recordCard('Lowest score in a win', 'A win is a win', r.lowWin.map(sideItem))}
        ${recordCard('Longest win streaks', 'Head-to-head, regular season', r.streaks.map(s => `<li><span class="sotu-big">${s.n}</span><span><strong>${F(s.rid)}</strong>${s.active ? ' · still going' : ''}<small>${s.from.year} Wk ${s.from.week} to ${s.to.year} Wk ${s.to.week}</small></span></li>`))}
      </div></div>
      <div class="sotu-block" id="traders"><h3 class="sotu-h3">Most active traders</h3>${tradersTable()}</div>
      <div class="sotu-block" id="drafters"><h3 class="sotu-h3">Best drafters</h3><div id="sotuDrafts">${draftBlock()}</div></div>`;
  }

  /* ------------------------------------------------------- render plumbing */
  const renderers = { history: renderHistory, trades: renderTrades, franchises: renderFranchises, records: renderRecords };
  const order = ['history', 'trades', 'franchises', 'records'];
  function ensure(name) { if (model && !rendered.has(name)) { rendered.add(name); renderers[name](); } }
  function rerender(reset) { if (reset) rendered.clear(); else for (const n of [...rendered]) renderers[n](); }
  let io = null;
  function observe() {
    if (io) io.disconnect();
    if (!('IntersectionObserver' in window)) { order.forEach(ensure); return; }
    io = new IntersectionObserver(entries => { for (const e of entries) if (e.isIntersecting) { ensure(e.target.dataset.section); io.unobserve(e.target); } }, { rootMargin: '700px 0px' });
    document.querySelectorAll('.sotu-section[data-section]').forEach(el => io.observe(el));
  }
  const reduced = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function upTo(name) { const i = order.indexOf(name); for (let k = 0; k <= i; k++) ensure(order[k]); }
  /* Deep links: #history, #trade-<id>, #franchise-<roster>, #asset-<key> */
  function route(initial) {
    if (!model) return;
    const h = decodeURIComponent(location.hash.slice(1)); if (!h) return;
    let m;
    if ((m = /^trade-(.+)$/.exec(h))) { upTo('trades'); openTree(m[1], false); }
    else if ((m = /^franchise-(\d+)$/.exec(h))) { upTo('franchises'); const d = document.querySelector('#franchise-' + m[1] + ' details'); if (d) d.open = true; }
    else if ((m = /^asset-(.+)$/.exec(h))) { upTo('trades'); showJourney(m[1], false); }
    else if (order.includes(h)) upTo(h);
    else if (['standings', 'luck', 'traders', 'drafters'].includes(h)) upTo('records');
    else return;
    const target = /^asset-/.test(h) ? $('sotuJourney') : document.getElementById(h);
    if (target) requestAnimationFrame(() => target.scrollIntoView({ block: 'start', behavior: initial || reduced() ? 'auto' : 'smooth' }));
  }
  addEventListener('hashchange', () => route(false));

  /* ------------------------------------------------------------ interaction */
  function toast(text) { const t = $('sotuToast'); t.textContent = text; t.classList.add('is-on'); clearTimeout(toast.timer); toast.timer = setTimeout(() => t.classList.remove('is-on'), 2600); }
  async function share(url, title) {
    try {
      if (navigator.share) { await navigator.share({ title, url }); return; }
      await navigator.clipboard.writeText(url); toast('Link copied');
    } catch (err) {
      if (err && err.name === 'AbortError') return;
      const box = document.createElement('input'); box.value = url; box.setAttribute('aria-label', 'Link to copy'); box.className = 'sotu-copybox';
      $('sotuToast').textContent = ''; $('sotuToast').append('Copy this link: ', box); $('sotuToast').classList.add('is-on'); box.select();
    }
  }
  document.addEventListener('click', e => {
    const el = e.target.closest('button,[role=button],a'); if (!el) return;
    const d = el.dataset;
    if (d.share) return void share(SITE + 'sotu/' + d.share + '.html', d.shareTitle);
    if (d.shareHash) return void share(SITE + 'state-of-the-union.html#' + d.shareHash, d.shareTitle);
    if ('retry' in d || 'refresh' in d) return void start('refresh' in d);
    if (!model) return;
    if (d.tree) {
      const id = d.tree, wrap = $('tree-' + id);
      if (ui.openTrees.has(id)) { ui.openTrees.delete(id); wrap.hidden = true; el.setAttribute('aria-expanded', 'false'); el.textContent = 'Open trade tree'; }
      else openTree(id, false);
    } else if (d.gotoTrade) { openTree(d.gotoTrade, true); history.replaceState(null, '', '#trade-' + d.gotoTrade); }
    else if (d.asset) { showJourney(d.asset, true); history.replaceState(null, '', '#asset-' + encodeURIComponent(d.asset)); }
    else if ('journeyClose' in d) { $('sotuJourney').innerHTML = ''; const q = $('sotuAssetQuery'); if (q) q.focus(); }
    else if (d.team) { ui.tradeTeam = String(ui.tradeTeam) === d.team ? 'all' : d.team; paintTrades(); }
    else if (d.teamTrades) { ensure('trades'); ui.tradeTeam = d.teamTrades; paintTrades(); document.getElementById('trades').scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth' }); }
    else if (d.standings) { ui.standings = d.standings; $('sotuAllTime').innerHTML = allTimeTable(); $('sotuLuck').innerHTML = luckChart(); document.querySelectorAll('[data-standings]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.standings === ui.standings))); }
    else if (d.draft) { ui.draft = Number(d.draft); $('sotuDrafts').innerHTML = draftBlock(); const b = document.querySelector(`[data-draft="${ui.draft}"]`); if (b) b.focus(); }
  });
  document.addEventListener('keydown', e => { if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.sotu-web-node')) { e.preventDefault(); e.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); } });
  document.addEventListener('change', e => {
    if (e.target.id === 'sotuTradeTeam') { ui.tradeTeam = e.target.value; paintTrades(); }
    if (e.target.id === 'sotuTradeSort') { ui.tradeSort = e.target.value; paintTrades(); }
  });
  document.addEventListener('input', e => { if (e.target.id === 'sotuAssetQuery') suggest(e.target.value); });

  /* Jump bar: mark the section in view. */
  const jump = [...document.querySelectorAll('.sotu-jump a')];
  if ('IntersectionObserver' in window && jump.length) {
    const seen = new Map();
    const spy = new IntersectionObserver(entries => {
      for (const e of entries) seen.set(e.target.id, e.isIntersecting);
      const cur = ['state', ...order].filter(id => seen.get(id)).pop();
      jump.forEach(a => { if (a.getAttribute('href') === '#' + cur) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    }, { rootMargin: '-45% 0px -50% 0px' });
    ['state', ...order].forEach(id => { const el = document.getElementById(id); if (el) spy.observe(el); });
  }

  start(false);
})();
