/* CTE SPORTSBOOK v35 — page controller. Vanilla JS, no dependencies. Fictional CTE$ only. */
(() => {
'use strict';
if (document.body.dataset.view !== 'sportsbook') return;
const E = window.CTE_BookEngine, B = window.CTE_SPORTSBOOK, S = window.CTE_BookStore, L = window.CTE_BookLive, C = window.CTE_BookCloud;
const esc = window.CTE_UI.esc, owner = id => window.CTE_UI.owner(id);
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const now = () => window.CTE_BOOK_NOW ? new Date(window.CTE_BOOK_NOW).getTime() : Date.now();
const reduced = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const money = (n, o) => E.formatMoney(n, o);
const commissionerResults = () => Object.fromEntries(Object.entries(B.results || {}).filter(([, r]) => r && r.scores).map(([id, r]) => [id, { final: true, ...r, source: 'commissioner' }]));
const markets = E.weekMarkets(B);
const TABS = { board: 'board', 'my-card': 'card', 'carl-vs-holly': 'duel', leaderboard: 'leaders', results: 'results', commissioner: 'commish' };

const state = {
  ids: [], ownerId: S.getOwner() || '', card: null, ctx: null, ctxError: null, recent: null, h2h: null, h2hError: false,
  players: null, playersLoading: false, lineupsFor: new Set(), open: new Set(), animated: new Set(),
  tab: 'board', results: commissionerResults(), phase: 'open', prevOdds: {}, celebrated: new Set(),
  mode: 'card', pids: [], parlay: null,
  // cloud: null = still checking; { ok:false } = device-only; { ok:true, linked, status, subs }
  cloud: C ? null : { ok: false }, linking: false
};
const cloudOn = () => !!(state.cloud && state.cloud.ok);
const linked = () => cloudOn() && state.cloud.linked ? state.cloud.linked : null;
const whoAmI = () => linked() || state.ownerId;
/** Book with everyone's submitted cards/parlays merged in (after lock). */
function LB() {
  let book = B;
  for (const [week, sub] of Object.entries((state.cloud && state.cloud.history) || {}))
    book = E.withSubmissions(book, Number(week), sub.cards, sub.parlays);
  const sub = state.cloud && state.cloud.subs;
  return sub ? E.withSubmissions(book, B.week, sub.cards, sub.parlays) : book;
}
state.phase = E.bookPhase(B, now(), state.results);

/* ---------------- Small helpers ---------------- */
const initials = n => String(n || '?').slice(0, 2).toUpperCase();
function avatar(id) {
  const a = state.ctx && state.ctx.owners[id] && state.ctx.owners[id].avatar;
  return `<span class="bk-avatar" aria-hidden="true">${esc(initials(owner(id).name))}${a ? `<img src="${esc(a)}" alt="" loading="lazy" onerror="this.remove()">` : ''}</span>`;
}
const recText = o => o && o.wins != null ? `${o.wins}\u2013${o.losses}${o.ties ? '\u2013' + o.ties : ''}` : null;
function selLabel(sel) { return sel.type === 'ml' ? `${owner(sel.side).name} ML` : `${owner(sel.side).name} ${E.formatLine(sel.line)}`; }
function lockLabel() {
  return new Date(B.lockAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT';
}
function countdown() {
  const ms = new Date(B.lockAt).getTime() - now();
  if (ms <= 0) return null;
  const m = Math.floor(ms / 60000), d = Math.floor(m / 1440), h = Math.floor(m % 1440 / 60), mm = m % 60;
  return d ? `${d}d ${h}h` : h ? `${h}h ${mm}m` : `${Math.max(1, mm)}m`;
}
function statusChip(status) {
  const text = { covering: 'Covering \u2713', 'not-covering': 'Not covering \u2715', push: 'Push =', winning: 'Winning \u2713', losing: 'Losing \u2715', tied: 'Tied =', won: 'Won \u2713', lost: 'Lost \u2715', pending: 'Pending' }[status] || status;
  return `<span class="bk-chip" data-s="${esc(status)}">${esc(text)}</span>`;
}
let toastTimer;
function toast(msg) {
  const t = $('#bkToast'), d = $('#bkSheet');
  const home = d && d.open ? d : document.body; if (t.parentElement !== home) home.append(t); // stay above the open slip
  t.textContent = msg; t.classList.add('is-on');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('is-on'), 2600);
}
function countUp(el, to) {
  const from = Number(el.dataset.value ?? to);
  el.dataset.value = to;
  if (reduced() || from === to) { el.textContent = money(to); return; }
  const t0 = performance.now(), dur = 800;
  const step = t => { const p = Math.min(1, (t - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = money(from + (to - from) * e); if (p < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function burst(host) {
  if (reduced() || !host) return;
  const b = document.createElement('div'); b.className = 'bk-burst'; b.setAttribute('aria-hidden', 'true');
  const colors = ['#35d38a', '#f5f6f8', '#ff3347', '#dcc59b'];
  for (let i = 0; i < 18; i++) {
    const p = document.createElement('i'), a = (i / 18) * Math.PI * 2, d = 70 + (i % 3) * 30;
    p.style.cssText = `--x:${Math.cos(a) * d}px;--y:${Math.sin(a) * d - 30}px;--r:${i * 40}deg;background:${colors[i % 4]}`;
    b.append(p);
  }
  host.append(b); setTimeout(() => b.remove(), 1000);
}

/* ---------------- Line movement component (shared shape with embeds) ---------------- */
function movementHTML(m, opts = {}) {
  const mv = E.lineMovement(m); if (!mv) return '';
  const fav = mv.current.fav, fv = e => e.fav === fav ? Number(e.points) : -Number(e.points);
  const vals = mv.steps.map(fv), lo = Math.min(...vals) - 2, hi = Math.max(...vals) + 2, pos = v => ((v - lo) / (hi - lo) * 100).toFixed(2) + '%';
  const from = vals[0], to = vals[vals.length - 1];
  const left = Math.min(from, to), width = Math.abs(to - from) / (hi - lo) * 100;
  const towardName = mv.toward ? owner(mv.toward).name : null;
  const shift = E.moneylineShift(m);
  const summary = mv.points ? `Moved <b>${mv.points} pt${mv.points === 1 ? '' : 's'}</b> toward ${esc(towardName)}${mv.favoriteChanged ? ' \u2014 the favorite flipped' : ''}` : 'No movement since open';
  return `<div class="bk-movement" data-move="${esc(m.id)}">
    <div class="bk-move-ends"><div><small>${esc(mv.open.label)}</small><strong class="bk-num">${esc(owner(mv.open.fav).name)} ${E.formatLine(-mv.open.points)}</strong></div>
    <span aria-hidden="true" class="bk-arrow" style="color:var(--bk-move);font-size:18px">\u2192</span>
    <div><small>${esc(mv.current.label)}</small><strong class="bk-num">${esc(owner(mv.current.fav).name)} ${E.formatLine(-mv.current.points)}</strong></div></div>
    <div class="bk-meter ${opts.armed ? 'is-armed' : ''}" style="--bk-from:${pos(from)};--bk-to:${pos(to)}" role="img" aria-label="Line moved from ${esc(owner(mv.open.fav).name)} ${mv.open.points} to ${esc(owner(fav).name)} ${mv.current.points}">
      <span class="bk-meter-track"></span>
      <span class="bk-meter-fill" style="left:${((left - lo) / (hi - lo) * 100).toFixed(2)}%;width:${width.toFixed(2)}%;transform-origin:${to >= from ? 'left' : 'right'}"></span>
      ${mv.steps.slice(0, -1).map(e => `<span class="bk-meter-dot" style="left:${pos(fv(e))}"></span>`).join('')}
      <span class="bk-meter-dot is-now"></span>
    </div>
    <div class="bk-move-summary">${summary}</div>
    ${shift != null && m.openMoneyline ? `<p class="bk-block-note">Moneyline: ${esc(owner(fav).name)} ${E.formatOdds(m.openMoneyline[fav])} \u2192 ${E.formatOdds(m.moneyline[fav])} (${shift > 0 ? '+' : ''}${shift.toFixed(1)} pts implied win probability).</p>` : ''}
  </div>`;
}
function playMovement(root) {
  const meter = root && root.querySelector('.bk-meter.is-armed');
  if (!meter) return;
  requestAnimationFrame(() => requestAnimationFrame(() => meter.classList.remove('is-armed')));
}

/* ---------------- Board ---------------- */
function isPicked(id) {
  return state.mode === 'parlay' ? (state.pids.includes(id) || !!(state.parlay && state.parlay.ids.includes(id)))
    : (state.ids.includes(id) || !!(state.card && state.card.ids.includes(id)));
}
function oddsButton(m, type, side, phase) {
  const id = E.selectionId(m.id, type, side), sel = E.selection(B, id), picked = isPicked(id);
  const main = type === 'ats' ? E.formatLine(sel.line) : E.formatOdds(sel.odds);
  const sub = type === 'ats' ? E.formatOdds(sel.odds) : 'ML';
  const sig = main + sub, flash = state.prevOdds[id] && state.prevOdds[id] !== sig;
  state.prevOdds[id] = sig;
  const locked = phase !== 'open' || (state.mode === 'parlay' ? !!state.parlay : !!state.card);
  const label = `${owner(side).name} ${type === 'ats' ? 'spread ' + E.formatLine(sel.line) + ' at ' + E.formatOdds(sel.odds) : 'moneyline ' + E.formatOdds(sel.odds)}${state.mode === 'parlay' ? ', parlay leg' : ''}${locked ? (phase !== 'open' ? ', market locked' : state.mode === 'parlay' ? ', your parlay is locked' : ', your card is locked') : ''}`;
  return `<button type="button" class="bk-odds ${type === 'ml' ? 'bk-odds-ml' : ''} ${flash ? 'bk-flash' : ''}" data-sel="${esc(id)}" aria-pressed="${picked}" aria-label="${esc(label)}" ${locked ? 'disabled' : ''}>
    <strong class="bk-num">${main}</strong><small class="bk-num">${phase !== 'open' ? '<span class="bk-lock-ico" aria-hidden="true">\uD83D\uDD12</span> ' : ''}${sub}</small></button>`;
}
function marketTop(m, phase, index) {
  const live = state.ctx && state.ctx.live[m.id];
  const pairing = state.ctx && state.ctx.pairing[m.id];
  let when;
  if (phase === 'final') when = '<span>Final</span>';
  else if (phase === 'live') when = live && live.started ? '<span class="bk-live-dot" aria-hidden="true"></span><strong style="color:var(--bk-text)">Live</strong>' : '<span>\uD83D\uDD12 Locked \u00b7 awaiting kickoff</span>';
  else when = `<span>Locks ${esc(lockLabel())}</span>`;
  const warn = pairing === 'mismatch' ? ' \u00b7 <span style="color:var(--bk-move)">Sleeper pairing differs</span>' : '';
  return `<div class="bk-market-top"><span class="bk-when">${when}${warn}</span><span>Game ${index + 1}</span></div>`;
}
function teamRow(m, side, phase) {
  const o = owner(side), c = state.ctx && state.ctx.owners[side], fav = E.favorite(m) === side;
  const live = state.ctx && state.ctx.live[m.id], res = state.results[m.id];
  const scores = res && res.final ? res.scores : live && live.started && phase !== 'open' ? live.scores : null;
  const opp = E.opponent(m, side);
  const sub = c ? `${recText(c)} \u00b7 ${c.pf.toFixed(1)} PF` : state.ctxError ? esc(o.currentTeamName || '') : '<span class="bk-skel" style="display:inline-block;width:90px;height:10px"></span>';
  return `<div class="bk-team">${avatar(side)}<div class="bk-team-text"><span class="bk-team-name">${esc(o.name)}${fav ? '<span class="bk-fav" aria-label="favorite">FAV</span>' : ''}</span><span class="bk-team-sub bk-num">${sub}</span></div>${scores ? `<span class="bk-score bk-num ${scores[side] > scores[opp] ? 'is-ahead' : ''}">${scores[side].toFixed(2)}</span>` : ''}</div>
    ${oddsButton(m, 'ats', side, phase)}${oddsButton(m, 'ml', side, phase)}`;
}
function myStatusRow(m, phase) {
  const mine = (state.card ? state.card.ids : state.ids).filter(id => id.startsWith(m.id + ':'));
  if (!mine.length || phase === 'open') return '';
  const res = state.results[m.id], live = state.ctx && state.ctx.live[m.id];
  const chips = mine.map(id => {
    const sel = E.selection(B, id);
    if (res && res.final) return `<span class="bk-chip" data-s="${E.settle(sel, 100, state.results).status}">${esc(selLabel(sel))} \u00b7 ${E.settle(sel, 100, state.results).status.toUpperCase()}</span>`;
    const ls = live && live.started ? E.liveStatus(sel, live.scores) : null;
    if (!ls) return `<span class="bk-chip">${esc(selLabel(sel))} \u00b7 Pending</span>`;
    const m2 = sel.type === 'ats' ? ` (${ls.adjusted > 0 ? '+' : ''}${ls.adjusted.toFixed(1)})` : '';
    return statusChip(ls.status).replace('">', `">${esc(selLabel(sel))}${m2} \u00b7 `);
  });
  return `<div class="bk-status-row" aria-label="Your picks in this game">${chips.join('')}</div>`;
}
function marketCard(m, index) {
  const phase = E.marketPhase(B, m, now(), state.results);
  const mv = E.lineMovement(m), open = state.open.has(m.id);
  return `<article class="bk-market ${open ? 'is-open' : ''}" data-market="${esc(m.id)}" aria-labelledby="t-${esc(m.id)}">
    <h3 class="bk-sr" id="t-${esc(m.id)}">${esc(owner(m.sides[0]).name)} versus ${esc(owner(m.sides[1]).name)}</h3>
    ${marketTop(m, phase, index)}
    <div class="bk-grid"><span class="bk-colhead"><span class="bk-sr">Team</span></span><span class="bk-colhead">Spread</span><span class="bk-colhead">Moneyline</span>
      ${teamRow(m, m.sides[0], phase)}${teamRow(m, m.sides[1], phase)}</div>
    ${myStatusRow(m, phase)}
    <div class="bk-market-foot">${mv && mv.points ? `<span class="bk-move-chip"><span class="bk-arrow" aria-hidden="true">${mv.toward === E.favorite(m) ? '\u2197' : '\u2198'}</span>Open ${E.formatLine(-mv.open.points)} \u2192 <b>${E.formatLine(-mv.current.points)}</b></span>` : '<span>No line movement</span>'}
      <button type="button" class="bk-more" aria-expanded="${open}" aria-controls="d-${esc(m.id)}" data-expand="${esc(m.id)}">${open ? 'Less' : 'Matchup'}<svg width="12" height="12" viewBox="0 0 12 12" aria-hidden="true"><path d="M2 4l4 4 4-4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button></div>
    <div class="bk-detail" id="d-${esc(m.id)}" role="region" aria-label="Matchup analysis"><div>${open ? detailHTML(m) : ''}</div></div>
  </article>`;
}
function renderBoard() {
  const phase = state.phase;
  const heading = phase === 'open' ? `Week ${B.week} board` : phase === 'live' ? `Week ${B.week} \u00b7 markets locked` : `Week ${B.week} \u00b7 final`;
  const note = phase === 'open' ? 'Tap a number to add it to your card. 3 moneylines + 3 spreads.' : phase === 'live' ? 'No new selections. Scores refresh every minute.' : 'Every market is graded. See Results.';
  const par = state.mode === 'parlay';
  const modeSwitch = phase === 'open' ? `<div class="bk-mode" role="group" aria-label="What are you building?"><button type="button" data-mode="card" aria-pressed="${!par}">Weekly card${state.card ? ' \u2713' : ''}</button><button type="button" data-mode="parlay" aria-pressed="${par}">Parlay${state.parlay ? ' \u2713' : ''}</button></div>` : '';
  $('#panel-board').innerHTML = `<div class="bk-head"><h2>${heading}</h2><p>${par && phase === 'open' ? `Tap numbers to build your parlay. ${E.parlayRules(B).minLegs}\u2013${E.parlayRules(B).maxLegs} legs, one per matchup.` : note}</p></div>
    ${B.quoteNote ? `<p class="bk-note" style="margin-bottom:12px">${esc(B.quoteNote)}</p>` : ''}
    ${modeSwitch}${submissionsHTML()}
    ${state.ctxError ? `<p class="bk-note" style="margin-bottom:12px">Sleeper is unreachable, so records and scores are hidden. Lines and your card still work. <button type="button" class="bk-link-btn" data-retry>Retry</button></p>` : ''}
    <div class="bk-board">${markets.map(marketCard).join('')}</div>
    <p class="bk-note" style="margin-top:14px">Opening numbers and Anita's takes first appeared in <a href="article.html?id=${esc(B.sources.open.articleId)}">${esc(B.sources.open.label)}</a>. Records and points come from Sleeper.</p>`;
}
function submissionsHTML() {
  if (!cloudOn() || !state.cloud.status) return '';
  const st = state.cloud.status, active = Object.values(window.CTE_LEAGUE_DATA.owners).filter(o => o.status === 'active').sort((a, b) => a.name.localeCompare(b.name));
  const cards = active.filter(o => st[o.id] && st[o.id].card).length, pars = active.filter(o => st[o.id] && st[o.id].parlay).length;
  return `<div class="bk-subs" aria-label="Submitted picks"><div class="bk-subs-top"><b>${cards}/${active.length} cards in</b><span>${pars} parlay${pars === 1 ? '' : 's'}</span><span>Picks unlock at kickoff</span></div>
    <div class="bk-subs-list">${active.map(o => { const s = st[o.id] || {}; return `<span class="bk-sub ${s.card ? 'is-in' : ''}"><span aria-hidden="true">${s.card ? '\u2713 ' : ''}${esc(o.name)}</span>${s.parlay ? '<i aria-hidden="true">P</i>' : ''}<span class="bk-sr">${esc(o.name)} ${s.card ? 'card in' : 'no card yet'}${s.parlay ? ', parlay in' : ''}</span></span>`; }).join('')}</div></div>`;
}
function rerenderMarket(id) {
  const el = $(`.bk-market[data-market="${CSS.escape(id)}"]`); if (!el) return;
  const i = markets.findIndex(m => m.id === id);
  el.outerHTML = marketCard(markets[i], i);
}

/* ---------------- Expanded matchup ---------------- */
function tape(m) {
  const [a, b] = m.sides, ca = state.ctx && state.ctx.owners[a], cb = state.ctx && state.ctx.owners[b];
  if (!ca || !cb) return `<div class="bk-block"><h3>Tale of the tape</h3><p class="bk-note">${state.ctxError ? 'Sleeper records are unavailable right now.' : '<span class="bk-skel" style="display:block"></span>'}</p></div>`;
  const ra = state.recent && state.recent[a], rb = state.recent && state.recent[b];
  const avg = r => r && r.length ? (r.reduce((s, x) => s + x.points, 0) / r.length).toFixed(1) : '\u2014';
  const lead = (x, y) => x > y ? 'style="color:var(--bk-text)"' : 'style="color:var(--bk-mute)"';
  const row = (l, va, vb, na, nb) => `<strong ${na != null ? lead(na, nb) : ''}>${va}</strong><span>${l}</span><strong ${nb != null ? lead(nb, na) : ''}>${vb}</strong>`;
  const last3 = r => (r || []).slice(-3);
  const maxPts = Math.max(1, ...last3(ra).map(x => x.points), ...last3(rb).map(x => x.points));
  const bars = (id, r) => `<div><h4>${esc(owner(id).name)} \u00b7 last ${last3(r).length || 0}</h4>${last3(r).length ? last3(r).map(x => `<div class="bk-bar"><span>W${x.week}</span><i><b style="width:${(x.points / maxPts * 100).toFixed(1)}%"></b></i><span class="bk-num">${x.points.toFixed(2)}</span></div>`).join('') : '<p class="bk-note">No completed weeks yet.</p>'}</div>`;
  const na = ra && ra.length ? ra.reduce((s, x) => s + x.points, 0) / ra.length : null, nb = rb && rb.length ? rb.reduce((s, x) => s + x.points, 0) / rb.length : null;
  return `<div class="bk-block"><h3>Tale of the tape</h3>
    <div class="bk-tape bk-num">${row('Record', recText(ca), recText(cb))}${row('Points for', `${ca.pf.toFixed(1)} <small style="color:var(--bk-mute)">#${ca.pfRank}</small>`, `<small style="color:var(--bk-mute)">#${cb.pfRank}</small> ${cb.pf.toFixed(1)}`, ca.pf, cb.pf)}${row('Avg / week', avg(ra), avg(rb), na, nb)}</div>
    <div class="bk-bars" style="margin-top:14px">${state.recent ? bars(a, ra) + bars(b, rb) : '<span class="bk-skel"></span><span class="bk-skel"></span>'}</div>
    <p class="bk-block-note">Points-for rank among 12 teams. Source: Sleeper.</p></div>`;
}
function h2hHTML(m) {
  const [a, b] = m.sides;
  let body;
  if (state.h2hError) body = '<p class="bk-note">Head-to-head history is unavailable right now.</p>';
  else if (!state.h2h) body = '<span class="bk-skel" style="display:block"></span>';
  else {
    const s = L.seriesBetween(state.h2h, a, b);
    if (!s.games.length) body = `<p class="bk-note">First meeting. ${esc(owner(a).name)} and ${esc(owner(b).name)} have no completed games against each other in CTE history.</p>`;
    else {
      const g = s.games[0], mine = x => x.ownerA === a ? [x.scoreA, x.scoreB] : [x.scoreB, x.scoreA], [sa, sb] = mine(g);
      body = `<div class="bk-tape bk-num"><strong>${s.record[a]}</strong><span>All-time wins</span><strong>${s.record[b]}</strong></div>
        <p class="bk-block-note">${s.record.ties ? s.record.ties + ' tie(s). ' : ''}Last meeting: ${g.season} Week ${g.week}, ${esc(owner(a).name)} ${sa.toFixed(2)} \u2013 ${sb.toFixed(2)} ${esc(owner(b).name)}.</p>`;
    }
  }
  return `<div class="bk-block"><h3>Head to head</h3>${body}</div>`;
}
function probHTML(m) {
  const [a, b] = m.sides, pa = E.impliedProbability(m.moneyline[a]), pb = E.impliedProbability(m.moneyline[b]);
  return `<div class="bk-block"><h3>What the moneyline implies</h3>
    <div class="bk-prob bk-num"><span>${esc(owner(a).name)} ${E.formatPct(pa)}</span><span>${esc(owner(b).name)} ${E.formatPct(pb)}</span></div>
    <div class="bk-probbar" aria-hidden="true"><i style="flex:${pa}"></i><i style="flex:${pb}"></i></div>
    <p class="bk-block-note">Implied probabilities include the book's margin, so they add up to ${E.formatPct(pa + pb)}.</p></div>`;
}
function takesHTML(m) {
  const t = m.takes || {};
  const source = m.freezeLegacyTickets && B.sources.current ? B.sources.current : B.sources.open;
  const carl = t.carl ? `<p>${esc(t.carl)}</p>` : `<p class="bk-muted">Carl hasn't filed a Week ${B.week} take yet.</p>`;
  const holly = t.holly ? `<p>${esc(t.holly)}</p><cite>From <a href="article.html?id=${esc(source.articleId)}">${esc(source.label)}</a></cite>` : `<p class="bk-muted">Anita hasn't filed yet.</p>`;
  return `<div class="bk-takes"><div class="bk-take is-carl"><img src="concussion-carl.webp" alt="" loading="lazy"><div><strong>Carl's take</strong>${carl}</div></div>
    <div class="bk-take is-holly"><img src="anita-headcheck.webp" alt="" loading="lazy"><div><strong>Anita's take</strong>${holly}</div></div></div>`;
}
function lineupHTML(m) {
  if (!state.lineupsFor.has(m.id)) return `<div class="bk-block"><h3>Starting lineups</h3><button type="button" class="bk-cta is-quiet" style="width:100%;min-height:44px;font-size:13px" data-lineups="${esc(m.id)}">Load lineups and key players</button><p class="bk-block-note">Downloads Sleeper's player list once (about 5 MB), then it's saved for a day.</p></div>`;
  if (!state.players) return `<div class="bk-block"><h3>Starting lineups</h3><span class="bk-skel" style="display:block"></span></div>`;
  const live = state.ctx && state.ctx.live[m.id];
  const col = side => {
    const row = live && live.rows[side], starters = (row && row.starters || []).filter(id => id && id !== '0');
    if (!starters.length) return `<div><h4>${esc(owner(side).name)}</h4><p class="bk-note">Lineup not set in Sleeper yet.</p></div>`;
    const season = {};
    for (const wk of (state.recent && state.recent[side]) || []) for (const [pid, p] of Object.entries(wk.row.players_points || {})) season[pid] = (season[pid] || 0) + Number(p || 0);
    const key = new Set([...starters].sort((x, y) => (season[y] || 0) - (season[x] || 0)).slice(0, 3).filter(pid => season[pid] > 0));
    return `<div><h4>${esc(owner(side).name)}</h4>${starters.map(pid => { const p = state.players[pid] || {}; const name = p.full_name || [p.first_name, p.last_name].filter(Boolean).join(' ') || (/^[A-Z]{2,3}$/.test(pid) ? pid + ' D/ST' : 'Player ' + pid);
      return `<div class="bk-player ${key.has(pid) ? 'is-key' : ''}"><span><em>${esc(p.position || '')}</em>${esc(name)}</span><span class="bk-num">${season[pid] ? season[pid].toFixed(1) : '\u2014'}</span></div>`; }).join('')}</div>`;
  };
  return `<div class="bk-block"><h3>Starting lineups</h3><div class="bk-lineups">${col(m.sides[0])}${col(m.sides[1])}</div><p class="bk-block-note">Bold = key players, the three starters with the most ${B.season} points on this roster. Right column: ${B.season} points scored for this team.</p></div>`;
}
function detailHTML(m) {
  const armed = !state.animated.has(m.id) && !reduced();
  return `<div class="bk-detail-inner"><div class="bk-block"><h3>Line movement</h3>${movementHTML(m, { armed })}</div>${tape(m)}${h2hHTML(m)}${probHTML(m)}${takesHTML(m)}${lineupHTML(m)}</div>`;
}
function refreshOpenDetails() {
  for (const id of state.open) {
    const box = $(`#d-${CSS.escape(id)} > div`); if (!box) continue;
    state.animated.add(id);
    box.innerHTML = detailHTML(markets.find(m => m.id === id));
  }
}
async function toggleDetail(id) {
  const el = $(`.bk-market[data-market="${CSS.escape(id)}"]`), btn = el.querySelector('[data-expand]');
  const opening = !state.open.has(id);
  if (opening) state.open.add(id); else state.open.delete(id);
  btn.setAttribute('aria-expanded', String(opening)); btn.firstChild.textContent = opening ? 'Less' : 'Matchup';
  const box = el.querySelector('.bk-detail > div');
  if (opening) { box.innerHTML = detailHTML(markets.find(m => m.id === id)); el.classList.add('is-open'); playMovement(box); state.animated.add(id); }
  else el.classList.remove('is-open');
  if (opening && !state.h2h && !state.h2hError) {
    L.headToHead().then(g => { state.h2h = g; refreshOpenDetails(); }).catch(() => { state.h2hError = true; refreshOpenDetails(); });
  }
}
async function loadLineups(id) {
  state.lineupsFor.add(id); refreshOpenDetails();
  if (state.players || state.playersLoading) return;
  state.playersLoading = true;
  try { state.players = await window.CTE_Sleeper.getNFLPlayers(); } catch (_) { state.players = {}; toast('Player names are unavailable. Showing Sleeper IDs.'); }
  state.playersLoading = false; refreshOpenDetails();
}

/* ---------------- Slip ---------------- */
function pickRow(sel, stake, removable, extra = '') {
  const p = E.profit(stake, sel.odds), r = E.totalReturn(stake, sel.odds);
  return `<li class="bk-pick ${removable ? 'has-remove' : ''}"><span class="bk-pick-title">${esc(selLabel(sel))}<small>${sel.type === 'ml' ? 'ML' : 'ATS'}</small></span>
    <span class="bk-pick-odds bk-num">${E.formatOdds(sel.odds)}</span>
    <span class="bk-pick-sub">vs ${esc(owner(sel.opponent).name)}${extra}</span>
    ${removable ? `<button type="button" class="bk-pick-remove" data-remove="${esc(sel.id)}" aria-label="Remove ${esc(selLabel(sel))}">\u00d7</button>` : ''}
    <span class="bk-pick-money bk-num"><span>Stake <b>${money(stake)}</b></span><span>Profit <b>${money(p)}</b></span><span>Return <b>${money(r)}</b></span></span></li>`;
}
function progressHTML(ids) {
  const c = E.cardCounts(ids), req = B.leagueChallenge.required, tot = req.ml + req.ats;
  const cell = (label, n, of) => `<div class="${n === of ? 'is-done' : ''}"><small>${label}</small><strong class="bk-num">${n} / ${of}</strong><i><b style="transform:scaleX(${n / of})"></b></i></div>`;
  return `<div class="bk-progress" role="status" aria-label="Card progress: ${c.ml} of ${req.ml} moneylines, ${c.ats} of ${req.ats} spreads">${cell('Moneyline', c.ml, req.ml)}${cell('ATS', c.ats, req.ats)}${cell('Total', c.total, tot)}</div>`;
}
function ownerSelect() {
  const active = Object.values(window.CTE_LEAGUE_DATA.owners).filter(o => o.status === 'active').sort((a, b) => a.name.localeCompare(b.name));
  return `<div class="bk-owner"><label>Whose card is this?</label><select data-owner-select aria-label="Whose card is this"><option value="">Choose your team</option>${active.map(o => `<option value="${esc(o.id)}" ${o.id === state.ownerId ? 'selected' : ''}>${esc(o.name)} \u2014 ${esc(o.currentTeamName || '')}</option>`).join('')}</select></div>`;
}
function identityHTML() {
  if (!cloudOn()) return ownerSelect();
  const me = linked();
  if (me) return `<div class="bk-owner bk-ident"><span>Playing as <b>${esc(owner(me).name)}</b></span><button type="button" class="bk-link-btn" data-unlink>Not you?</button></div>`;
  const active = Object.values(window.CTE_LEAGUE_DATA.owners).filter(o => o.status === 'active').sort((a, b) => a.name.localeCompare(b.name));
  return `<div class="bk-owner bk-ident is-signin"><label>Sign in to save picks to the league</label>
    <select data-owner-select aria-label="Your team"><option value="">Choose your team</option>${active.map(o => `<option value="${esc(o.id)}" ${o.id === state.ownerId ? 'selected' : ''}>${esc(o.name)} \u2014 ${esc(o.currentTeamName || '')}</option>`).join('')}</select>
    <div class="bk-code-row"><input data-code autocomplete="off" autocapitalize="characters" spellcheck="false" inputmode="text" maxlength="9" placeholder="League code" aria-label="Your league code"><button type="button" class="bk-cta is-quiet" data-link ${state.linking ? 'disabled' : ''}>${state.linking ? 'Checking\u2026' : 'Sign in'}</button></div>
    <small>Your code comes from the commissioner. You only enter it once per device.</small></div>`;
}
function lockBlocker() {
  if (cloudOn() && !linked()) return 'Sign in with your league code to lock.';
  if (!cloudOn() && !state.ownerId) return 'Choose whose card this is.';
  return '';
}
function slipHTML() {
  if (state.mode === 'parlay') return parlaySlipHTML();
  const stake = B.leagueChallenge.stake, ids = state.ids;
  if (state.card) {
    return `<div class="bk-slip"><div class="bk-slip-head"><h2>Bet slip</h2></div>
      <p class="bk-slip-empty">Your Week ${B.week} card is locked in. <button type="button" class="bk-link-btn" data-goto="my-card">View your card</button></p><div style="height:18px"></div></div>`;
  }
  if (state.phase !== 'open') {
    return `<div class="bk-slip"><div class="bk-slip-head"><h2>Bet slip</h2></div><p class="bk-slip-empty">Week ${B.week} markets are locked. Cards had to be in by ${esc(lockLabel())}.</p><div style="height:18px"></div></div>`;
  }
  const v = E.validateCard(ids, B), sels = ids.map(id => E.selection(B, id)).filter(Boolean);
  sels.sort((a, b) => (a.type === b.type ? 0 : a.type === 'ml' ? -1 : 1));
  const totalProfit = sels.reduce((s, x) => s + E.profit(stake, x.odds), 0), totalReturn = sels.reduce((s, x) => s + E.totalReturn(stake, x.odds), 0);
  const missing = [];
  if (v.counts.ml < v.required.ml) missing.push(`${v.required.ml - v.counts.ml} more moneyline${v.required.ml - v.counts.ml > 1 ? 's' : ''}`);
  if (v.counts.ats < v.required.ats) missing.push(`${v.required.ats - v.counts.ats} more spread${v.required.ats - v.counts.ats > 1 ? 's' : ''}`);
  const block = lockBlocker();
  const hint = missing.length ? `Add ${missing.join(' and ')}.` : block || 'Ready. Locks can be edited until kickoff.';
  return `<div class="bk-slip"><div class="bk-slip-head"><h2>Bet slip <span class="bk-sr">${ids.length} selections</span></h2>${ids.length ? '<button type="button" class="bk-link-btn" data-clear>Clear slip</button>' : ''}</div>
    ${identityHTML()}${progressHTML(ids)}
    ${sels.length ? `<ul class="bk-picks" aria-label="Selections">${sels.map(s => pickRow(s, stake, true)).join('')}</ul>` : `<p class="bk-slip-empty">Your Week ${B.week} card is empty. Pick exactly three moneylines and three spreads from the board. Every pick carries a standard ${money(stake)} stake.</p>`}
    ${sels.length ? `<div class="bk-totals bk-num"><div><span>Standard stake</span><b>${money(stake)} \u00d7 ${sels.length} = ${money(stake * sels.length)}</b></div><div><span>Potential profit</span><b>${money(totalProfit)}</b></div><div class="bk-return"><span>Potential return</span><b>${money(totalReturn)}</b></div></div>` : ''}
    <div class="bk-slip-actions"><button type="button" class="bk-cta" data-lock ${v.valid && !block ? '' : 'disabled'}>Lock in Week ${B.week} card</button><p class="bk-slip-hint" aria-live="polite">${esc(hint)}</p></div></div>`;
}
function parlayLegRow(sel, removable) {
  return `<li class="bk-pick ${removable ? 'has-remove' : ''}"><span class="bk-pick-title">${esc(selLabel(sel))}<small>${sel.type === 'ml' ? 'ML' : 'ATS'}</small></span>
    <span class="bk-pick-odds bk-num">${E.formatOdds(sel.odds)}</span><span class="bk-pick-sub">vs ${esc(owner(sel.opponent).name)}</span>
    ${removable ? `<button type="button" class="bk-pick-remove" data-remove="${esc(sel.id)}" aria-label="Remove ${esc(selLabel(sel))}">\u00d7</button>` : ''}</li>`;
}
function parlayMath(ids, entry = {}) {
  const sels = ids.map(id => E.ticketSelection(B, id, entry)).filter(Boolean), rules = E.parlayRules(B);
  const price = sels.length ? E.parlayPrice(sels) : null, pay = sels.length ? E.parlayPayout(rules.stake, sels) : null;
  return { sels, rules, price, pay };
}
function parlaySlipHTML() {
  const rules = E.parlayRules(B);
  if (state.parlay) return `<div class="bk-slip"><div class="bk-slip-head"><h2>Parlay</h2></div><p class="bk-slip-empty">Your Week ${B.week} parlay is locked in. <button type="button" class="bk-link-btn" data-goto="my-card">View it</button></p><div style="height:18px"></div></div>`;
  if (state.phase !== 'open') return `<div class="bk-slip"><div class="bk-slip-head"><h2>Parlay</h2></div><p class="bk-slip-empty">Week ${B.week} markets are locked.</p><div style="height:18px"></div></div>`;
  const { sels, price, pay } = parlayMath(state.pids), v = E.validateParlay(state.pids, B), block = lockBlocker();
  const need = rules.minLegs - sels.length;
  const hint = need > 0 ? `Add ${need} more leg${need > 1 ? 's' : ''}.` : block || 'Ready. Every leg has to hit.';
  return `<div class="bk-slip is-parlay"><div class="bk-slip-head"><h2>Parlay <span class="bk-sr">${sels.length} legs</span></h2>${sels.length ? '<button type="button" class="bk-link-btn" data-clear>Clear</button>' : ''}</div>
    ${identityHTML()}
    ${sels.length ? `<ul class="bk-picks" aria-label="Parlay legs">${sels.map(s => parlayLegRow(s, true)).join('')}</ul>` : `<p class="bk-slip-empty">Build one parlay a week: ${rules.minLegs}\u2013${rules.maxLegs} legs from different matchups, a flat ${money(rules.stake)} stake. Every leg has to hit.</p>`}
    ${sels.length ? `<div class="bk-totals bk-num"><div><span>Legs</span><b>${sels.length} of ${rules.maxLegs} max</b></div><div><span>Parlay odds</span><b>${E.formatOdds(price.american)}</b></div><div><span>Stake</span><b>${money(rules.stake)}</b></div><div class="bk-return"><span>Pays</span><b>${money(pay.returned)}</b></div></div>` : ''}
    <div class="bk-slip-actions"><button type="button" class="bk-cta" data-plock ${v.valid && !block ? '' : 'disabled'}>Lock Week ${B.week} parlay</button><p class="bk-slip-hint" aria-live="polite">${esc(hint)}</p></div></div>`;
}
function parlayTicketHTML(p) {
  const { sels, rules, price, pay } = parlayMath(p.ids, p), st = E.settleParlay(p.ids, B, rules.stake, state.results, p);
  const legStatus = s => { const r = st.legs.find(l => l.sel.id === s.id); return r && r.status !== 'pending' ? `<small>${r.status.toUpperCase()}</small>` : ''; };
  const stamp = st.status === 'won' ? 'CASHED' : st.status === 'lost' ? 'BUSTED' : st.status === 'push' ? 'PUSH' : 'LOCKED';
  return `<div class="bk-receipt bk-parlay-ticket" id="bkParlayTicket" tabindex="-1" aria-labelledby="parlayTitle"><span class="bk-receipt-stamp" aria-hidden="true">${stamp}</span>
    <div class="bk-receipt-head"><small>CTE SPORTSBOOK \u00b7 WEEK ${B.week} PARLAY</small><h2 id="parlayTitle">${sels.length}-LEG PARLAY ${E.formatOdds(price.american)}</h2><p>${esc(owner(p.ownerId).name)}</p></div>
    <ol>${sels.map(s => `<li><span>${s.type === 'ml' ? 'ML' : 'ATS'}</span><b>${esc(selLabel(s))}</b><span class="bk-num">${E.formatOdds(s.odds)}</span>${legStatus(s)}</li>`).join('')}</ol>
    <div class="bk-receipt-foot bk-num"><div><span>Stake</span><b>${money(rules.stake)}</b></div><div><span>${st.status === 'won' ? 'Won' : st.status === 'lost' ? 'Lost' : 'Pays'}</span><b>${st.status === 'won' ? money(st.profit, { sign: true }) : st.status === 'lost' ? money(-rules.stake) : money(pay.returned)}</b></div></div></div>
    <div class="bk-receipt-actions">${state.phase === 'open' ? '<button type="button" class="bk-cta is-quiet" data-pedit>Edit parlay</button>' : ''}</div>
    <p class="bk-storage-note">${storageNote(p, 'parlay')}</p>`;
}
function storageNote(entry, kind) {
  const what = kind === 'parlay' ? 'parlay' : 'card';
  if (entry.storage === 'cloud') return `\u2713 Saved to the CTE Sportsbook. It counts automatically, and the league sees it at kickoff.`;
  if (cloudOn() && state.phase === 'open') return linked() ? `Saved on this device only. <button type="button" class="bk-link-btn" data-push="${kind}">Send this ${what} to the league</button>` : `Saved on this device only. Sign in with your league code on the Board to send it to the league.`;
  if (kind === 'card' && onLedger(entry)) return '\u2713 This card is on the league ledger and counts toward the leaderboard.';
  return `Saved on this device only. It counts once you share it to the league chat and the commissioner adds it to the ledger.`;
}
function renderSlips() {
  for (const host of $$('[data-slip-host]')) host.innerHTML = slipHTML();
  const pill = $('#bkPill'), par = state.mode === 'parlay', n = par ? state.pids.length : state.ids.length;
  pill.hidden = state.phase !== 'open' || (par ? !!state.parlay : !!state.card) || n === 0 || state.tab === 'card';
  $('#bkPillCount').textContent = par ? `${n} leg${n === 1 ? '' : 's'}` : `${n}/6`;
  $('#bkPillText').textContent = par ? (E.validateParlay(state.pids, B).valid ? 'Review & lock parlay' : 'Parlay') : n === 6 && E.validateCard(state.ids, B).valid ? 'Review & lock card' : 'Bet slip';
  const badge = $('#tab-card b'); if (badge) badge.remove();
  if (n && !state.card) $('#tab-card').insertAdjacentHTML('beforeend', `<b aria-label="${n} selections">${n}</b>`);
}
function syncBoardButtons() {
  for (const b of $$('.bk-odds[data-sel]')) b.setAttribute('aria-pressed', String(isPicked(b.dataset.sel)));
}
function select(id, btn) {
  if (state.mode === 'parlay') {
    const r = E.toggleParlayLeg(state.pids, id, B);
    if (r.action === 'blocked') { toast(r.reason); btn && btn.classList.add('bk-shake'); setTimeout(() => btn && btn.classList.remove('bk-shake'), 500); return; }
    state.pids = r.ids; S.saveParlayDraft(B.week, { ids: state.pids });
    syncBoardButtons(); renderSlips();
    const pill = $('#bkPill'); pill.classList.remove('is-bump'); void pill.offsetWidth; pill.classList.add('is-bump');
    if (r.action === 'swapped') toast(`One leg per matchup. Swapped to ${selLabel(E.selection(B, id))}.`);
    return;
  }
  const r = E.toggleSelection(state.ids, id, B);
  if (r.action === 'blocked') { toast(r.reason); btn && btn.classList.add('bk-shake'); setTimeout(() => btn && btn.classList.remove('bk-shake'), 500); return; }
  state.ids = r.ids;
  S.saveDraft(B.week, { ownerId: state.ownerId, ids: state.ids });
  syncBoardButtons(); renderSlips(); renderMast();
  if (navigator.vibrate && r.action !== 'removed') try { navigator.vibrate(8); } catch (_) {}
  const pill = $('#bkPill'); pill.classList.remove('is-bump'); void pill.offsetWidth; pill.classList.add('is-bump');
  if (r.action === 'swapped') toast(`Swapped to ${selLabel(E.selection(B, id))}.`);
}

/* ---------------- Bottom sheet ---------------- */
const sheet = () => $('#bkSheet');
let sheetReturn = null;
function openSheet() {
  const d = sheet(); if (d.open) return;
  sheetReturn = document.activeElement;
  d.showModal(); $('#bkPill').classList.add('is-away');
  requestAnimationFrame(() => requestAnimationFrame(() => d.classList.add('is-open')));
}
function closeSheet() {
  const d = sheet(); if (!d.open) return;
  d.classList.remove('is-open'); d.style.removeProperty('--bk-drag');
  const done = () => { if (d.open) d.close(); $('#bkPill').classList.remove('is-away'); if (sheetReturn && document.contains(sheetReturn)) sheetReturn.focus(); };
  if (reduced()) done(); else setTimeout(done, 380);
}
function wireSheet() {
  const d = sheet();
  d.addEventListener('cancel', e => { e.preventDefault(); closeSheet(); });
  d.addEventListener('click', e => { if (e.target === d) closeSheet(); });
  const grab = $('.bk-grab', d); let y0 = null, dy = 0;
  grab.addEventListener('pointerdown', e => { y0 = e.clientY; dy = 0; grab.setPointerCapture(e.pointerId); d.classList.add('is-dragging'); });
  grab.addEventListener('pointermove', e => { if (y0 == null) return; dy = Math.max(0, e.clientY - y0); d.style.setProperty('--bk-drag', dy + 'px'); });
  const end = () => { if (y0 == null) return; y0 = null; d.classList.remove('is-dragging'); if (dy > 110) closeSheet(); else d.style.setProperty('--bk-drag', '0px'); };
  grab.addEventListener('pointerup', end); grab.addEventListener('pointercancel', end);
  grab.addEventListener('click', () => { if (dy < 4) closeSheet(); });
}

/* ---------------- My card / receipt ---------------- */
function shareText(card) {
  const sels = card.ids.map(id => E.ticketSelection(B, id, card)).sort((a, b) => (a.type === b.type ? 0 : a.type === 'ml' ? -1 : 1));
  const stake = B.leagueChallenge.stake;
  const lines = sels.map(s => `${s.type === 'ml' ? 'ML ' : 'ATS'}  ${selLabel(s)}${s.type === 'ats' ? ` (${E.formatOdds(s.odds)})` : ` ${E.formatOdds(s.odds)}`}`);
  const max = sels.reduce((t, s) => t + E.totalReturn(stake, s.odds), 0);
  return `CTE SPORTSBOOK \u00b7 WEEK ${B.week} CARD \u00b7 ${owner(card.ownerId).name}\n${lines.join('\n')}\n${money(stake)} per pick \u00b7 max return ${money(max)}\nBet fake. Talk real shit.\n\n${E.entryLine(card.ownerId, B.week, card.ids)}`;
}
function onLedger(card) {
  const logged = B.leagueChallenge.cards[B.week] && B.leagueChallenge.cards[B.week][card.ownerId];
  return logged && logged.length === card.ids.length && logged.every(id => card.ids.includes(id));
}
function receiptHTML(card) {
  const stake = B.leagueChallenge.stake, o = owner(card.ownerId);
  const sels = card.ids.map(id => E.ticketSelection(B, id, card)).filter(Boolean).sort((a, b) => (a.type === b.type ? 0 : a.type === 'ml' ? -1 : 1));
  let net = 0, settled = 0;
  const items = sels.map(s => {
    const phase = E.marketPhase(B, s.market, now(), state.results);
    let tail = '';
    if (phase === 'final') { const st = E.settle(s, stake, state.results); net += st.profit; settled++; tail = `<small>${st.status === 'won' ? 'WON' : st.status === 'lost' ? 'LOST' : 'PUSH'} \u00b7 ${money(st.profit, { sign: true })}</small>`; }
    else if (phase === 'live') { const lv = state.ctx && state.ctx.live[s.marketId]; const ls = lv && lv.started ? E.liveStatus(s, lv.scores) : null; tail = `<small>${ls ? ls.status.replace('-', ' ').toUpperCase() + ` \u00b7 ${owner(s.side).name} ${ls.pointsFor.toFixed(1)}\u2013${ls.pointsAgainst.toFixed(1)}` : 'LOCKED \u00b7 awaiting kickoff'}</small>`; }
    else tail = `<small>To win ${money(E.profit(stake, s.odds))}</small>`;
    return `<li><span>${s.type === 'ml' ? 'ML' : 'ATS'}</span><b>${esc(selLabel(s))}</b><span class="bk-num">${E.formatOdds(s.odds)}</span>${tail}</li>`;
  }).join('');
  const max = sels.reduce((t, s) => t + E.totalReturn(stake, s.odds), 0);
  const when = new Date(card.lockedAt).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT';
  const allFinal = settled === sels.length;
  return `<div class="bk-receipt" id="bkReceipt" tabindex="-1" aria-labelledby="receiptTitle">
    <span class="bk-receipt-stamp" aria-hidden="true">${allFinal ? (net > 0 ? 'CASHED' : net < 0 ? 'BUSTED' : 'EVEN') : 'LOCKED'}</span>
    <div class="bk-receipt-head"><small>CTE SPORTSBOOK \u00b7 ${B.season} WEEK ${B.week}</small><h2 id="receiptTitle">YOUR WEEK ${B.week} CARD IS LOCKED.</h2><p>${esc(o.name)} \u00b7 ${esc(o.currentTeamName || '')}</p></div>
    <ol>${items}</ol>
    <div class="bk-receipt-foot bk-num"><div><span>Stake</span><b>${money(stake)} \u00d7 ${sels.length}</b></div>
    ${settled ? `<div><span>Net so far</span><b>${money(net, { sign: true })}</b></div>` : `<div><span>Max return</span><b>${money(max)}</b></div>`}
    <div><span>Locked</span><b>${esc(when)}</b></div></div></div>
    <div class="bk-receipt-actions"><button type="button" class="bk-cta" data-share>Share card</button>${state.phase === 'open' ? '<button type="button" class="bk-cta is-quiet" data-edit>Edit card</button>' : ''}</div>
    <p class="bk-storage-note">${storageNote(card, 'card')}</p>`;
}
function renderCardTab() {
  const host = $('#panel-card');
  if (state.card) {
    host.innerHTML = `<div class="bk-head"><h2>My card</h2><p>Week ${B.week} \u00b7 league pick'em</p></div>${receiptHTML(state.card)}${parlaySectionHTML()}`;
    const key = 'settle:' + state.card.ownerId;
    const sels = state.card.ids.map(id => E.ticketSelection(B, id, state.card));
    if (sels.every(s => state.results[s.marketId] && state.results[s.marketId].final) && !state.celebrated.has(key)) {
      state.celebrated.add(key);
      const net = sels.reduce((t, s) => t + E.settle(s, B.leagueChallenge.stake, state.results).profit, 0);
      if (net > 0) burst($('#bkReceipt')); else if (net < 0) $('#bkReceipt').classList.add('bk-shake');
    }
    return;
  }
  host.innerHTML = `<div class="bk-head"><h2>My card</h2><p>3 moneylines + 3 spreads \u00b7 ${money(B.leagueChallenge.stake)} standard stake</p></div>
    <p class="bk-note" style="margin-bottom:14px">Everyone plays the same six-pick card. Standings are ranked by fictional profit, so hitting a big underdog beats going 4\u20132 on chalk.</p>
    <div class="bk-pcard" data-slip-host></div>${parlaySectionHTML()}`;
}
function parlaySectionHTML() {
  const rules = E.parlayRules(B);
  if (state.parlay) return `<h3 class="bk-week-title">Week ${B.week} parlay</h3>${parlayTicketHTML(state.parlay)}`;
  if (state.phase !== 'open') return '';
  return `<h3 class="bk-week-title">Week ${B.week} parlay</h3><div class="bk-empty"><strong>No parlay yet.</strong>One per week, separate from your card: ${rules.minLegs}\u2013${rules.maxLegs} legs, ${money(rules.stake)} flat. <button type="button" class="bk-link-btn" data-build-parlay>Build a parlay</button></div>`;
}
async function lockCard() {
  const v = E.validateCard(state.ids, B);
  if (!v.valid || lockBlocker() || state.phase !== 'open') return;
  try {
    let entry = { ownerId: whoAmI(), ids: state.ids.slice(), lockedAt: new Date().toISOString(), storage: 'device' };
    entry.quotes = E.quoteSnapshot(B, entry.ids);
    if (cloudOn()) { if (!linked()) return; entry = await C.saveEntry(B.season, B.week, linked(), 'card', entry); refreshStatus(); }
    state.card = await S.lockCard(B.week, entry);
    state.ids = []; await S.saveDraft(B.week, { ownerId: state.ownerId, ids: [] });
    closeSheet(); go('my-card');
    renderAll();
    const r = $('#bkReceipt'); r && r.focus({ preventScroll: true }); burst(r);
    if (navigator.vibrate) try { navigator.vibrate([10, 40, 14]); } catch (_) {}
  } catch (e) { toast(e.code === 'PERMISSION_DENIED' ? 'The Sportsbook rejected this card. Is it past kickoff, or was your code reset?' : e.message || 'Could not save the card.'); }
}
async function editCard() {
  if (state.phase !== 'open' || !state.card) return;
  if (state.card.storage === 'cloud') {
    try { await C.removeEntry(B.season, B.week, state.card.ownerId, 'card'); refreshStatus(); }
    catch (e) { toast('Could not reach the Sportsbook. Try again.'); return; }
  }
  state.ids = state.card.ids.slice(); state.ownerId = state.card.ownerId; state.card = null;
  await S.unlockCard(B.week); await S.saveDraft(B.week, { ownerId: state.ownerId, ids: state.ids });
  renderAll(); toast(cloudOn() ? 'Card withdrawn. Lock it again before kickoff or it won\u2019t count.' : 'Card unlocked. Make changes, then lock it again.');
}
async function lockParlay() {
  if (!E.validateParlay(state.pids, B).valid || lockBlocker() || state.phase !== 'open') return;
  try {
    let entry = { ownerId: whoAmI(), ids: state.pids.slice(), lockedAt: new Date().toISOString(), storage: 'device' };
    entry.quotes = E.quoteSnapshot(B, entry.ids);
    if (cloudOn()) entry = await C.saveEntry(B.season, B.week, linked(), 'parlay', entry);
    state.parlay = await S.lockParlay(B.week, entry); state.pids = []; await S.saveParlayDraft(B.week, { ids: [] });
    refreshStatus(); closeSheet(); go('my-card'); renderAll();
    const t = $('#bkParlayTicket'); if (t) { t.scrollIntoView({ block: 'center', behavior: reduced() ? 'auto' : 'smooth' }); t.focus({ preventScroll: true }); burst(t); }
  } catch (e) { toast(e.code === 'PERMISSION_DENIED' ? 'The Sportsbook rejected this parlay. Is it past kickoff, or was your code reset?' : e.message || 'Could not save the parlay.'); }
}
async function editParlay() {
  if (state.phase !== 'open' || !state.parlay) return;
  if (state.parlay.storage === 'cloud') {
    try { await C.removeEntry(B.season, B.week, state.parlay.ownerId, 'parlay'); } catch (_) { toast('Could not reach the Sportsbook. Try again.'); return; }
  }
  state.pids = state.parlay.ids.slice(); state.parlay = null; state.mode = 'parlay';
  await S.unlockParlay(B.week); await S.saveParlayDraft(B.week, { ids: state.pids });
  refreshStatus(); go('board'); renderAll(); toast('Parlay reopened. Lock it again before kickoff.');
}
async function share() {
  const text = shareText(state.card);
  try {
    if (navigator.share) { await navigator.share({ title: `CTE Sportsbook Week ${B.week} card`, text }); return; }
    await navigator.clipboard.writeText(text); toast('Card copied. Paste it in the league chat.');
  } catch (e) {
    if (e && e.name === 'AbortError') return;
    try { await navigator.clipboard.writeText(text); toast('Card copied. Paste it in the league chat.'); } catch (_) { toast('Sharing is blocked in this browser.'); }
  }
}

/* ---------------- Carl vs Anita ---------------- */
function wagerRow(wg) {
  if (wg.invalid) return `<div class="bk-wager"><span>?</span><b>Unknown market</b><small>${esc(wg.market)}</small></div>`;
  const s = wg.sel;
  const status = wg.status === 'pending' ? (() => { const lv = state.ctx && state.ctx.live[s.marketId]; const ls = lv && lv.started && state.phase !== 'open' ? E.liveStatus(s, lv.scores) : null; return ls ? statusChip(ls.status) : ''; })() : statusChip(wg.status);
  const result = wg.status === 'pending' ? `To win ${money(E.profit(wg.stake, s.odds))}` : `${money(wg.profit, { sign: true })}`;
  return `<div class="bk-wager"><span>${wg.sel.type === 'ml' ? 'ML' : 'ATS'}</span><b>${esc(selLabel(s))} <span class="bk-num" style="color:var(--bk-mute);font-weight:650">${E.formatOdds(s.odds)}</span>${wg.lock ? ' <span class="bk-badge">LOCK</span>' : ''}</b>${status}<small class="bk-num">${money(wg.stake)} \u00b7 ${result}</small></div>`;
}
function personalityCard(led) {
  const p = led.personality, wk = led.thisWeek, cls = p.id === 'carl' ? 'is-carl' : 'is-holly';
  const start = wk && wk.start;
  if (!wk || wk.status === 'no-card') {
    const req = B.leagueChallenge.required, slots = [...Array(req.ml).fill('ML'), ...Array(req.ats).fill('ATS')];
    return `<div class="bk-pcard ${cls}"><h3>${esc(p.shortName)}'s Week ${B.week} card</h3><p>${start != null ? `Must stake all ${money(start)}` : 'Bankroll pending last week\'s results'} across 3 ML + 3 ATS.</p>
      <div class="bk-alloc" aria-hidden="true"></div>${slots.map((t, i) => `<div class="bk-slot"><span>${t}</span><span>${i === 0 ? `${esc(p.shortName)} hasn't posted this week's card.` : 'Open slot'}</span></div>`).join('')}</div>`;
  }
  const alloc = wk.wagers.map(w => `<i style="flex:${Number(w.stake) || 0}"></i>`).join('');
  const card = p.cards[B.week];
  const release = card && card.lateRelease ? `<p class="bk-note"><strong>Late Friday release — after Thursday.</strong> Filed ${esc(new Date(card.postedAt).toLocaleString('en-US', { timeZone: 'America/Chicago', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }))} CT. Full-week scores, Friday pinned prices; no Thursday pregame credit.</p>` : '';
  return `<div class="bk-pcard ${cls}"><h3>${esc(p.shortName)}'s Week ${B.week} card</h3><p class="bk-num">${money(wk.staked)} staked of ${wk.start != null ? money(wk.start) : 'a pending bankroll'}${wk.status === 'settled' ? ` \u00b7 ${money(wk.pnl, { sign: true })}` : ''}</p>
    ${release}<div class="bk-alloc" role="img" aria-label="Stake allocation">${alloc}</div>${wk.wagers.map(wagerRow).join('')}${wk.issues.map(i => `<p class="bk-issue">\u26a0 ${esc(i)}</p>`).join('')}</div>`;
}
function sparkline(carl, holly) {
  const pts = led => [led.startingBankroll, ...led.weeks.filter(w => w.status === 'settled').map(w => w.end)];
  const a = pts(carl), b = pts(holly), n = Math.max(a.length, b.length);
  if (n < 2) return '<p class="bk-note" style="margin-top:8px">The bankroll chart draws itself once Week ' + B.week + ' settles.</p>';
  const all = [...a, ...b], lo = Math.min(...all) * 0.95, hi = Math.max(...all) * 1.05, x = i => (i / (n - 1) * 300).toFixed(1), y = v => (64 - (v - lo) / (hi - lo || 1) * 58).toFixed(1);
  const path = arr => arr.map((v, i) => `${i ? 'L' : 'M'}${x(i)},${y(v)}`).join('');
  return `<svg class="bk-spark" viewBox="0 0 300 70" preserveAspectRatio="none" role="img" aria-label="Bankroll by week: Carl ${money(a[a.length - 1])}, Anita ${money(b[b.length - 1])}">
    <path d="${path(a)}" fill="none" stroke="var(--bk-red)" stroke-width="2.5" vector-effect="non-scaling-stroke"/><path d="${path(b)}" fill="none" stroke="var(--bk-holly)" stroke-width="2.5" stroke-dasharray="6 4" vector-effect="non-scaling-stroke"/></svg>
    <div class="bk-tug-legend"><span>\u2014 Carl</span><span>Week ${B.personalities.carl.startWeek}\u2013${B.personalities.carl.startWeek + n - 2}</span><span>- - Anita</span></div>`;
}
function renderDuel() {
  const carl = E.bankrollLedger(B, 'carl', state.results), holly = E.bankrollLedger(B, 'holly', state.results);
  const delta = led => led.lastWeekPnl == null ? '<span class="bk-delta">No settled weeks yet</span>' : `<span class="bk-delta ${led.lastWeekPnl > 0 ? 'is-up' : led.lastWeekPnl < 0 ? 'is-down' : ''}">${led.lastWeekPnl > 0 ? '\u25b2' : led.lastWeekPnl < 0 ? '\u25bc' : '='} ${money(led.lastWeekPnl, { sign: true })} last week</span>`;
  const duelist = (led, cls) => `<div class="bk-duelist ${cls}"><img src="${esc(led.personality.image)}" alt="${esc(led.personality.name)}" loading="lazy"><h3>${esc(led.personality.name)}</h3><strong class="bk-bank bk-num" data-count="${led.current}" data-value="${led.current}">${money(led.current)}</strong>${delta(led)}${led.busted ? '<span class="bk-badge" data-b="degen">BUSTED</span>' : ''}</div>`;
  const cmp = (label, a, b, av, bv, higherWins = true) => {
    const aw = av != null && bv != null && (higherWins ? av > bv : av < bv), bw = av != null && bv != null && (higherWins ? bv > av : bv < av);
    return `<div><span class="bk-num ${aw ? 'is-lead' : ''}">${a}</span><span>${label}</span><span class="bk-num ${bw ? 'is-lead' : ''}">${b}</span></div>`;
  };
  const r = (led, k) => E.recordText(led.records[k]), pct = rec => rec.w + rec.l ? rec.w / (rec.w + rec.l) : null;
  const hit = t => t ? `${esc(selLabel(t.sel))} ${money(t.profit, { sign: true })}` : '\u2014';
  const total = carl.current + holly.current || 1;
  $('#panel-duel').innerHTML = `<div class="bk-head"><h2>Carl vs Anita</h2><p>All-in every week. No refills.</p></div>
    <section class="bk-duel" aria-label="Bankrolls">${duelist(carl, 'is-carl')}<span class="bk-vs" aria-hidden="true">VS</span>${duelist(holly, 'is-holly')}</section>
    <div class="bk-tug"><div class="bk-tug-legend"><span>Share of the combined ${money(carl.current + holly.current)}</span><span class="bk-num">${E.formatPct(carl.current / total, 0)} / ${E.formatPct(holly.current / total, 0)}</span></div>
      <div class="bk-tug-bar" aria-hidden="true"><i style="flex-grow:${carl.current}"></i><i style="flex-grow:${holly.current}"></i></div>${sparkline(carl, holly)}</div>
    <div class="bk-duel-stats" role="table" aria-label="Carl and Anita compared">
      ${cmp('Bankroll', money(carl.current), money(holly.current), carl.current, holly.current)}
      ${cmp('Started with', money(carl.startingBankroll), money(holly.startingBankroll))}
      ${cmp('Season P/L', money(carl.seasonPnl, { sign: true }), money(holly.seasonPnl, { sign: true }), carl.seasonPnl, holly.seasonPnl)}
      ${cmp('Overall', r(carl, 'total'), r(holly, 'total'), pct(carl.records.total), pct(holly.records.total))}
      ${cmp('Moneyline', r(carl, 'ml'), r(holly, 'ml'), pct(carl.records.ml), pct(holly.records.ml))}
      ${cmp('ATS', r(carl, 'ats'), r(holly, 'ats'), pct(carl.records.ats), pct(holly.records.ats))}
      ${cmp('Locks', r(carl, 'locks'), r(holly, 'locks'), pct(carl.records.locks), pct(holly.records.locks))}
      ${cmp('Upset MLs', r(carl, 'upsets'), r(holly, 'upsets'), pct(carl.records.upsets), pct(holly.records.upsets))}
      ${cmp('Streak', carl.streak.text, holly.streak.text)}
      ${cmp('Biggest win', hit(carl.biggestWin), hit(holly.biggestWin))}
      ${cmp('Worst loss', hit(carl.worstLoss), hit(holly.worstLoss))}
    </div>
    <div class="bk-duel-cards">${personalityCard(carl)}${personalityCard(holly)}</div>
    ${ledgerTable(carl, holly)}
    <p class="bk-note" style="margin-top:14px">Rules: both started Week ${B.personalities.carl.startWeek} with ${money(B.personalities.carl.startingBankroll)}. Each week they must wager their entire bankroll across exactly 3 moneyline and 3 ATS bets. Whatever they finish with is next week's bankroll.</p>`;
  for (const el of $$('#panel-duel [data-count]')) countUp(el, Number(el.dataset.count));
}
function ledgerTable(carl, holly) {
  const weeks = carl.weeks.filter(w => w.status !== 'no-card' || holly.weeks.find(h => h.week === w.week && h.status !== 'no-card'));
  if (!weeks.length) return '';
  const cell = w => !w || w.status === 'no-card' ? 'No card' : w.status === 'pending' ? `${w.start != null ? money(w.start) : '\u2014'} \u2192 pending` : `${money(w.start)} \u2192 ${money(w.end)}`;
  return `<div class="bk-ledger bk-results">${weeks.map(w => { const h = holly.weeks.find(x => x.week === w.week); return `<div class="bk-result"><div class="bk-result-score">Week ${w.week}</div><div class="bk-result-meta"><span class="bk-chip">Carl ${cell(w)}</span><span class="bk-chip">Anita ${cell(h)}</span></div></div>`; }).join('')}</div>`;
}

/* ---------------- Leaderboard ---------------- */
function renderLeaders() {
  const { rows, latestWeek } = E.leaderboardWithMovement(LB(), state.results);
  const host = $('#panel-leaders');
  const graded = rows.filter(r => r.total.w + r.total.l + r.total.p > 0);
  if (!graded.length) {
    const entered = rows.length;
    host.innerHTML = `<div class="bk-head"><h2>Leaderboard</h2><p>Ranked by fictional profit</p></div>
      <div class="bk-empty"><strong>No graded cards yet.</strong>${entered ? `${entered} card${entered > 1 ? 's are' : ' is'} on the ledger for Week ${B.week}. ` : ''}The board ranks every owner by CTE$ profit on a ${money(B.leagueChallenge.stake)}-per-pick card, then ROI. It fills in when Week ${B.week} goes final.</div>${parlayRaceHTML()}`;
    return;
  }
  const badges = {};
  const top = graded[0]; if (top.profit > 0) badges[top.ownerId] = ['sharp', 'THE SHARP'];
  const coldest = [...graded].filter(r => r.streak.type === 'L' && r.streak.count >= 3).sort((a, b) => b.streak.count - a.streak.count)[0];
  if (coldest && !badges[coldest.ownerId]) badges[coldest.ownerId] = ['cold', 'ICE COLD'];
  if (latestWeek) {
    const wkDogs = r => r.tickets.filter(t => t.week === latestWeek && t.sel.type === 'ml' && t.sel.isUnderdog).length;
    const degen = [...graded].sort((a, b) => wkDogs(b) - wkDogs(a) || (a.weekly[latestWeek] || 0) - (b.weekly[latestWeek] || 0))[0];
    if (degen && wkDogs(degen) >= 2 && !badges[degen.ownerId]) badges[degen.ownerId] = ['degen', 'DEGENERATE OF THE WEEK'];
  }
  const chalk = [...graded].sort((a, b) => b.favorites / b.tickets.length - a.favorites / a.tickets.length)[0];
  if (chalk && chalk.favorites / chalk.tickets.length >= 0.83 && !badges[chalk.ownerId]) badges[chalk.ownerId] = ['public', 'PUBLIC MONEY'];
  const cls = n => n > 0 ? 'bk-pos' : n < 0 ? 'bk-neg' : '';
  host.innerHTML = `<div class="bk-head"><h2>Leaderboard</h2><p>Ranked by fictional profit, then ROI</p></div>
    <div class="bk-lb" role="table" aria-label="League sportsbook leaderboard">
      <div class="bk-lb-head" role="row"><span role="columnheader">#</span><span role="columnheader">Owner</span><span role="columnheader">ML</span><span role="columnheader">ATS</span><span role="columnheader">Total</span><span role="columnheader">Profit</span><span role="columnheader">ROI</span><span role="columnheader">Streak</span></div>
      ${graded.map((r, i) => { const o = owner(r.ownerId), b = badges[r.ownerId], wk = latestWeek && r.weekly[latestWeek];
        return `<div class="bk-lb-row" role="row" style="animation-delay:${Math.min(i, 8) * 35}ms"><span class="bk-rank bk-num" role="cell">${r.rank}${r.rankChange ? `<small class="${r.rankChange > 0 ? 'is-up' : 'is-down'}" aria-label="${r.rankChange > 0 ? 'up' : 'down'} ${Math.abs(r.rankChange)}">${r.rankChange > 0 ? '\u25b2' : '\u25bc'}${Math.abs(r.rankChange)}</small>` : ''}</span>
          <span class="bk-lb-owner" role="cell">${avatar(r.ownerId)}<span><strong>${esc(o.name)}</strong><small>${r.bestHit ? `Best hit: ${esc(selLabel(r.bestHit.sel))} ${money(r.bestHit.profit, { sign: true })}` : esc(o.currentTeamName || '')}</small>${b ? `<span class="bk-badge" data-b="${b[0]}">${b[1]}</span>` : ''}</span></span>
          <span class="bk-num" role="cell">${E.recordText(r.ml)}</span><span class="bk-num" role="cell">${E.recordText(r.ats)}</span><span class="bk-num" role="cell">${E.recordText(r.total)}</span>
          <span class="bk-num bk-lb-profit ${cls(r.profit)}" role="cell">${money(r.profit, { sign: true })}</span><span class="bk-num ${cls(r.roi)}" role="cell">${(r.roi * 100).toFixed(1)}%</span><span class="bk-num" role="cell">${r.streak.text}</span>
          <span class="bk-lb-sub bk-num"><span>ML <b>${E.recordText(r.ml)}</b></span><span>ATS <b>${E.recordText(r.ats)}</b></span><span>ROI <b class="${cls(r.roi)}">${(r.roi * 100).toFixed(1)}%</b></span><span>Streak <b>${r.streak.text}</b></span>${wk != null ? `<span>Week ${latestWeek} <b class="${cls(wk)}">${money(wk, { sign: true })}</b></span>` : ''}${r.worstBeat ? `<span>Worst beat: <b>${esc(selLabel(r.worstBeat.sel))} by ${Math.abs(r.worstBeat.margin).toFixed(2)}</b></span>` : ''}</span></div>`; }).join('')}
    </div>${challengeReceiptsHTML(graded)}${parlayRaceHTML()}`;
}
function challengeReceiptsHTML(rows) {
  return '<h3 class="bk-week-title">Submitted card receipts</h3>' + rows.map(r => {
    const weeks = [...new Set(r.tickets.map(t => t.week))].sort((a,b) => b-a);
    return weeks.map(week => {
      const tickets = r.tickets.filter(t => t.week === week);
      const pnl = E.round2(tickets.reduce((sum,t) => sum+t.profit,0));
      return '<details class="bk-block"><summary>' + esc(owner(r.ownerId).name) + ' · Week ' + week +
        ' · ' + money(pnl,{sign:true}) + '</summary>' + tickets.map(t =>
        '<div class="bk-eb-row"><b class="bk-num">' + esc(selLabel(t.sel)) + ' ' + E.formatOdds(t.sel.odds) +
        '</b><span class="bk-num">' + money(t.stake) + ' stake</span><span class="bk-num">' +
        t.status.toUpperCase() + ' ' + money(t.profit,{sign:true}) + '</span></div>'
      ).join('') + '</details>';
    }).join('');
  }).join('');
}
function parlayRaceHTML() {
  const rows = E.parlayLeaderboard(LB(), state.results), cls = n => n > 0 ? 'bk-pos' : n < 0 ? 'bk-neg' : '';
  const head = `<h3 class="bk-week-title">Parlay race</h3>`;
  if (!rows.length) return `${head}<p class="bk-note">No parlays on the books yet. Everyone gets one ${money(E.parlayRules(B).stake)} parlay a week; this ranks season parlay profit.</p>`;
  return `${head}<div class="bk-plb">${rows.map(r => { const last = r.parlays[r.parlays.length - 1];
    return `<div class="bk-plb-row"><span class="bk-rank bk-num">${r.rank}</span><span class="bk-lb-owner">${avatar(r.ownerId)}<span><strong>${esc(owner(r.ownerId).name)}</strong><small>${r.hits}\u2013${r.misses}${r.pushes ? '\u2013' + r.pushes : ''} \u00b7 ${r.best ? `best hit ${money(r.best.profit, { sign: true })} (${r.best.legs} legs)` : last ? `Week ${last.week}: ${last.ids.length} legs ${E.formatOdds(last.price.american)}${last.status === 'pending' ? ' \u00b7 pending' : ''}` : ''}</small></span></span><span class="bk-num bk-lb-profit ${cls(r.profit)}">${money(r.profit, { sign: true })}</span></div>`; }).join('')}</div>`;
}

/* ---------------- Results ---------------- */
function renderResults() {
  const weeks = [...new Set((B.markets || []).map(m => Number(m.week)))].sort((a, b) => b - a);
  const host = $('#panel-results');
  const block = w => {
    const ms = E.weekMarkets(B, w);
    return `<h3 class="bk-week-title">Week ${w}</h3><div class="bk-results">${ms.map(m => {
      const phase = E.marketPhase(B, m, now(), state.results), [a, b] = m.sides, res = state.results[m.id], live = state.ctx && state.ctx.live[m.id];
      const sc = res && res.final ? res.scores : phase === 'live' && live && live.started ? live.scores : null;
      const fav = E.favorite(m), dog = E.opponent(m, fav);
      let meta = '';
      if (res && res.final) {
        const mlw = E.gradeMoneyline(res.scores[a], res.scores[b]);
        const ats = E.settle(E.selection(B, E.selectionId(m.id, 'ats', fav)), 100, state.results);
        meta = `${mlw === 'push' ? '<span class="bk-chip" data-s="push">ML push =</span>' : `<span class="bk-chip" data-s="won">${esc(owner(mlw === 'won' ? a : b).name)} ML \u2713</span>`}
          <span class="bk-chip" data-s="${ats.status === 'won' ? 'won' : ats.status === 'lost' ? 'lost' : 'push'}">${esc(owner(fav).name)} ${E.formatLine(m.spread[fav].line)} ${ats.status === 'won' ? 'covered \u2713' : ats.status === 'lost' ? `failed \u2715 (${esc(owner(dog).name)} covers)` : 'push ='}</span>
          ${E.gradeMoneyline(res.scores[dog], res.scores[fav]) === 'won' ? '<span class="bk-badge" data-b="degen">UPSET</span>' : ''}<span class="bk-chip">${res.source === 'commissioner' ? 'Confirmed by commissioner' : 'Final \u00b7 Sleeper'}</span>`;
      } else if (sc) {
        const ls = E.liveStatus(E.selection(B, E.selectionId(m.id, 'ats', fav)), sc);
        meta = `<span class="bk-chip"><span class="bk-live-dot" aria-hidden="true"></span> Live</span><span class="bk-chip" data-s="${ls.status}">${esc(owner(fav).name)} ${E.formatLine(m.spread[fav].line)} ${ls.status === 'covering' ? 'covering \u2713' : ls.status === 'push' ? 'on the number =' : 'not covering \u2715'}</span>`;
      } else meta = `<span class="bk-chip">${phase === 'open' ? 'Not started' : 'Awaiting kickoff'}</span><span class="bk-chip">${esc(owner(fav).name)} ${E.formatLine(m.spread[fav].line)} \u00b7 ${E.formatOdds(m.moneyline[fav])}</span>`;
      return `<div class="bk-result"><div class="bk-result-score bk-num">${esc(owner(a).name)} ${sc ? sc[a].toFixed(2) : ''} <span>vs</span> ${esc(owner(b).name)} ${sc ? sc[b].toFixed(2) : ''}</div><div class="bk-result-meta">${meta}</div></div>`;
    }).join('')}</div>`;
  };
  host.innerHTML = `<div class="bk-head"><h2>Results</h2><p>Graded only when a matchup is final</p></div>
    ${state.phase === 'open' && !Object.keys(state.results).length ? `<p class="bk-note" style="margin-bottom:6px">Week ${B.week} hasn't kicked off. Results grade automatically when Sleeper closes the week, or when the commissioner confirms a final.</p>` : ''}
    ${weeks.map(block).join('')}`;
}

/* ---------------- Masthead ---------------- */
function renderMast() {
  const phase = state.phase, cd = countdown();
  const status = phase === 'open' ? `Markets open \u00b7 lock in ${cd}` : phase === 'live' ? 'Markets locked \u00b7 live' : `Week ${B.week} final`;
  $('#bkStatus').innerHTML = `<i aria-hidden="true"></i>${esc(status)}`;
  $('#bkStatus').dataset.phase = phase;
  const c = state.card ? E.cardCounts(state.card.ids) : E.cardCounts(state.ids);
  $('#bkWalletCard').textContent = (state.card ? 'Locked \u2713' : `${c.total} / 6`) + (state.parlay ? ' +P' : '');
  const carl = E.bankrollLedger(B, 'carl', state.results), holly = E.bankrollLedger(B, 'holly', state.results);
  $('#bkWalletCarl').textContent = money(carl.current); $('#bkWalletHolly').textContent = money(holly.current);
  $('#bkEdition').textContent = `${B.season} season · Week ${B.week}`;
  for (const [led, id] of [[carl,'#bkCarlDetail'],[holly,'#bkAnitaDetail']]) {
    const el=$(id), pnl=led.lastWeekPnl;
    el.textContent = `${E.recordText(led.records.total)} season · ${pnl == null ? 'Awaiting results' : money(pnl,{sign:true})+' last settled week'}`;
    el.className='bk-wallet-detail'+(pnl>0?' is-up':pnl<0?' is-down':'');
    if(led.pendingChain)el.textContent+=' · settlement pending';
  }
  const me=whoAmI(), rows=E.leaderboardWithMovement(LB(),state.results).rows;
  const rank=rows.find(r=>r.ownerId===me), entry=state.card;
  const pending=entry ? entry.ids.filter(id=>{const sel=E.ticketSelection(B,id,entry);return !sel||E.settle(sel,B.leagueChallenge.stake,state.results).status==='pending'}).length : null;
  const title=entry ? (pending ? `Week ${B.week} card submitted` : `Week ${B.week} card graded`) : `Week ${B.week}: ${c.total} of 6 picks selected`;
  const saved=entry ? storageNote(entry,'card') : (state.phase==='open'?'Choose 3 moneylines and 3 spreads, then submit your card.':'Markets are locked. View results or your saved card.');
  const standing=rank&&rank.risked ? ` Season rank #${rank.rank} · ${money(rank.profit,{sign:true})} card profit.` : '';
  const host=$('#bkPersonal');
  host.innerHTML=`<div><span class="n-label">${me?esc(owner(me).name)+"’S SPORTSBOOK":'YOUR SPORTSBOOK'}</span><h2>${title}</h2><p>${esc(saved)}${entry&&pending?' '+pending+' picks awaiting settlement.':''}${standing}</p></div><a class="n-action" href="#${entry?'my-card':state.phase==='open'?'board':'results'}">${entry?'View my card':state.phase==='open'?'Build my card':'View results'} ↗</a>`;

}

/* ---------------- Tabs ---------------- */
function go(hash) { if (location.hash !== '#' + hash) history.pushState(null, '', '#' + hash); showTab(hash); }
function showTab(hash, focus) {
  if (!hash && /(^|[?&])commissioner\b/.test(location.search)) hash = 'commissioner';
  const key = TABS[hash] || 'board', slug = Object.keys(TABS).find(k => TABS[k] === key);
  state.tab = key;
  for (const t of $$('.bk-tab')) { const on = t.dataset.tab === slug; t.setAttribute('aria-selected', String(on)); t.tabIndex = on ? 0 : -1; }
  for (const p of $$('.bk-panel')) p.hidden = p.id !== 'panel-' + key;
  $('#bkLayout').classList.toggle('is-card-tab', key === 'card');
  $('.bk-slip-aside').hidden = key === 'card';
  renderSlips();
  const tabs = $('.bk-tabs');
  if (tabs.getBoundingClientRect().top < 70) window.scrollTo({ top: window.scrollY + tabs.getBoundingClientRect().top - 90, behavior: reduced() ? 'auto' : 'smooth' });
  if (focus) $('#panel-' + key).focus({ preventScroll: true });
  if (key === 'commish') { renderCommish(); requestAnimationFrame(() => $('#panel-commish').scrollIntoView({ block: 'start', behavior: 'auto' })); }
}

/* ---------------- Data + lifecycle ---------------- */
function renderAll() { state.phase = E.bookPhase(B, now(), state.results); renderMast(); renderBoard(); renderCardTab(); renderSlips(); renderDuel(); renderLeaders(); renderResults(); renderCommish(); }
let polling = null;
async function loadLive(fresh = false) {
  try {
    state.ctx = await L.load({ fresh }); state.ctxError = null;
    state.results = state.ctx.results;
  } catch (e) { state.ctxError = e; }
  renderAll();
  if (state.ctx && !state.recent) {
    try { state.recent = await L.recentScores(state.ctx); } catch (_) { state.recent = {}; }
    refreshOpenDetails();
  }
  clearInterval(polling);
  if (state.phase === 'live') polling = setInterval(() => { if (document.visibilityState === 'visible') loadLive(true); }, 60000);
}

/* ---------------- Shared picks (cloud) ---------------- */
async function refreshStatus() {
  if (!cloudOn()) return;
  try { state.cloud.status = await C.status(B.season, B.week); } catch (_) {}
  if (state.tab === 'board') { const el = $('.bk-subs'); if (el) el.outerHTML = submissionsHTML(); else renderBoard(); }
}
async function loadSubmissions() {
  if (!cloudOn()) return;
  const weeks = [...new Set((B.markets || []).map(m => Number(m.week)))]
    .filter(w => w < Number(B.week) || (w === Number(B.week) && state.phase !== 'open'));
  const history = state.cloud.history || (state.cloud.history = {});
  await Promise.all(weeks.map(async week => {
    try {
      const all = await C.all(B.season, week);
      if (all) {
        if (week === Number(B.week)) state.cloud.subs = all;
        else history[week] = all;
      }
    } catch (_) {}
  }));
  renderLeaders();
}
async function linkDevice(box) {
  const scope = box || document, who = ($('[data-owner-select]', scope) || {}).value || state.ownerId, code = ($('[data-code]', scope) || {}).value || '';
  if (!who) { toast('Choose your team first.'); return; }
  if (C.normCode(code).length < 6) { toast('Enter the 6-character code from the commissioner.'); return; }
  state.linking = true; renderSlips();
  try {
    const ok = await C.link(B.season, who, code);
    if (!ok) { toast('That code doesn\u2019t match. Check it with the commissioner.'); return; }
    state.cloud.linked = who; state.ownerId = who; S.setOwner(who);
    await restoreOwn();
    toast(`Signed in as ${owner(who).name}. Your picks now save to the league.`);
  } catch (e) { toast('Could not reach the Sportsbook. Check your connection and try again.'); }
  finally { state.linking = false; renderAll(); }
}
/** Pull this owner's saved card/parlay from the cloud (works on any linked device). */
async function restoreOwn() {
  const me = linked(); if (!me) return;
  const own = await C.ownEntries(B.season, B.week, me);
  if (own.card && Array.isArray(own.card.ids) && E.validateCard(own.card.ids, B).valid) { state.card = { ownerId: me, ...own.card, storage: 'cloud' }; await S.lockCard(B.week, state.card); }
  else if (state.card && state.card.storage === 'cloud') { state.card = null; await S.unlockCard(B.week); }
  if (own.parlay && Array.isArray(own.parlay.ids) && E.validateParlay(own.parlay.ids, B).valid) { state.parlay = { ownerId: me, ...own.parlay, storage: 'cloud' }; await S.lockParlay(B.week, state.parlay); }
  else if (state.parlay && state.parlay.storage === 'cloud') { state.parlay = null; await S.unlockParlay(B.week); }
}
async function bootCloud() {
  if (!C) return;
  const ok = await C.ready();
  if (!ok) { state.cloud = { ok: false }; renderAll(); return; }
  state.cloud = { ok: true, linked: C.linkedOwner(B.season), status: null, subs: null };
  try {
    if (state.cloud.linked && !(await C.verifyLink(B.season, B.week, state.cloud.linked))) { state.cloud.linked = null; toast('Your league code changed. Sign in again with the new one.'); }
    await restoreOwn();
  } catch (_) {}
  await refreshStatus(); await loadSubmissions(); renderAll();
}

async function pushLocal(kind, btn) {
  const entry = kind === 'parlay' ? state.parlay : state.card; if (!entry || !linked() || state.phase !== 'open') return;
  const valid = kind === 'parlay' ? E.validateParlay(entry.ids, B).valid : E.validateCard(entry.ids, B).valid; if (!valid) return;
  btn.disabled = true;
  try {
    const saved = await C.saveEntry(B.season, B.week, linked(), kind, { ...entry, ownerId: linked() });
    if (kind === 'parlay') state.parlay = await S.lockParlay(B.week, saved); else state.card = await S.lockCard(B.week, saved);
    refreshStatus(); renderAll(); toast(`Sent. Your ${kind} now counts for the league.`);
  } catch (e) { btn.disabled = false; toast(e.code === 'PERMISSION_DENIED' ? 'Rejected: it may be past kickoff.' : 'Could not reach the Sportsbook.'); }
}

/* ---------------- Commissioner (sportsbook.html#commissioner) ---------------- */
function renderCommish() {
  const host = $('#panel-commish'); if (!host) return;
  const active = Object.values(window.CTE_LEAGUE_DATA.owners).filter(o => o.status === 'active').sort((a, b) => a.name.localeCompare(b.name));
  const codes = state.commishCodes || {}, st = (state.cloud && state.cloud.status) || {};
  host.innerHTML = `<div class="bk-head"><h2>Commissioner</h2><p>League codes and lock time for shared picks</p></div>
    ${state.cloud === null ? '<p class="bk-note">Connecting to the Sportsbook database\u2026</p>' : !cloudOn() ? `<div class="bk-empty"><strong>The Sportsbook database isn't reachable.</strong>Check firebase-config.js and the database rules in SPORTSBOOK.md.</div>` : `
    <div class="bk-commish">
      <p class="bk-note">This device's ID: <code>${esc(C.uid || '')}</code> \u2014 it must be the commissioner ID in the database rules.</p>
      <p class="bk-note">Week ${B.week} locks ${esc(lockLabel())}. Send the lock time to the database each week so late picks are rejected.</p>
      <div class="bk-receipt-actions"><button type="button" class="bk-cta" data-commish="lock">Set Week ${B.week} lock time</button><button type="button" class="bk-cta is-quiet" data-commish="codes">Make new codes for everyone</button></div>
      <div class="bk-commish-list">${active.map(o => `<div class="bk-commish-row"><b>${esc(o.name)}</b><span class="bk-num">${codes[o.id] ? `<code>${esc(codes[o.id])}</code>` : (st[o.id] && st[o.id].card ? 'card in' : '\u2014')}</span><button type="button" class="bk-link-btn" data-commish="reset:${esc(o.id)}">New code</button></div>`).join('')}</div>
      ${Object.keys(codes).length ? `<button type="button" class="bk-cta is-quiet" data-commish="copy">Copy codes</button><p class="bk-note"><b>Copy these now.</b> Codes are only shown once; the database keeps a scrambled version it can check but can't show. Send each owner their own code privately. A new code signs out that owner's devices; their saved picks stay.</p>` : ''}
    </div>`}`;
}
async function commishAction(action, btn) {
  if (!cloudOn()) return;
  const active = Object.values(window.CTE_LEAGUE_DATA.owners).filter(o => o.status === 'active');
  const lockMs = E.lockTime(B);
  try {
    btn.disabled = true;
    if (action === 'copy') { const c = state.commishCodes || {}; await navigator.clipboard.writeText(active.filter(o => c[o.id]).map(o => `${o.name}: ${c[o.id]}`).join('\n')); toast('Codes copied.'); return; }
    let codes = {};
    if (action === 'codes') { if (!confirm('Make new codes for all owners? Everyone will need to sign in again.')) return; active.forEach(o => { codes[o.id] = C.generateCode(); }); }
    else if (action.startsWith('reset:')) { const id = action.slice(6); if (!confirm(`Make a new code for ${owner(id).name}?`)) return; codes[id] = C.generateCode(); }
    await C.commissionerSetup(B.season, B.week, lockMs, codes);
    state.commishCodes = { ...(state.commishCodes || {}), ...codes };
    toast(Object.keys(codes).length ? 'Codes saved. Send them out privately.' : `Week ${B.week} lock time saved.`);
    renderCommish();
  } catch (e) { toast(e.code === 'PERMISSION_DENIED' ? 'Rejected: this device is not the commissioner device in the rules.' : 'Could not reach the database.'); }
  finally { btn.disabled = false; }
}

document.addEventListener('click', e => {
  const t = e.target.closest('button,a'); if (!t) return;
  if (t.matches('[data-sel]') && !t.disabled) return select(t.dataset.sel, t);
  if (t.matches('[data-remove]')) { select(t.dataset.remove); return; }
  if (t.matches('[data-clear]') && state.mode === 'parlay') { state.pids = []; S.saveParlayDraft(B.week, { ids: [] }); syncBoardButtons(); renderSlips(); toast('Parlay cleared.'); return; }
  if (t.matches('[data-clear]')) { state.ids = []; S.saveDraft(B.week, { ownerId: state.ownerId, ids: [] }); syncBoardButtons(); renderSlips(); renderMast(); toast('Slip cleared.'); return; }
  if (t.matches('[data-expand]')) return toggleDetail(t.dataset.expand);
  if (t.matches('[data-lineups]')) return loadLineups(t.dataset.lineups);
  if (t.matches('[data-lock]')) return lockCard();
  if (t.matches('[data-plock]')) return lockParlay();
  if (t.matches('[data-push]')) return pushLocal(t.dataset.push, t);
  if (t.matches('[data-pedit]')) return editParlay();
  if (t.matches('[data-mode]')) { state.mode = t.dataset.mode; renderBoard(); renderSlips(); return; }
  if (t.matches('[data-build-parlay]')) { state.mode = 'parlay'; go('board'); renderBoard(); renderSlips(); return; }
  if (t.matches('[data-link]')) return linkDevice(t.closest('.bk-ident'));
  if (t.matches('[data-unlink]')) { C.unlink(); state.cloud.linked = null; state.card = state.card && state.card.storage === 'cloud' ? null : state.card; state.parlay = state.parlay && state.parlay.storage === 'cloud' ? null : state.parlay; renderAll(); toast('Signed out on this device.'); return; }
  if (t.matches('[data-commish]')) return commishAction(t.dataset.commish, t);
  if (t.matches('[data-edit]')) return editCard();
  if (t.matches('[data-share]')) return share();
  if (t.matches('[data-retry]')) return loadLive(true);
  if (t.matches('[data-goto]')) { closeSheet(); return go(t.dataset.goto); }
  if (t.id === 'bkPill') return openSheet();
  if (t.matches('.bk-tab')) { e.preventDefault(); go(t.dataset.tab); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.matches('[data-code]')) { e.preventDefault(); linkDevice(e.target.closest('.bk-ident')); } });
document.addEventListener('change', e => {
  if (e.target.matches('[data-owner-select]')) {
    state.ownerId = e.target.value; S.setOwner(state.ownerId); S.saveDraft(B.week, { ownerId: state.ownerId, ids: state.ids });
    renderSlips();
  }
});
$('.bk-tabs').addEventListener('keydown', e => {
  const tabs = $$('.bk-tab'), i = tabs.indexOf(document.activeElement); if (i < 0) return;
  const next = e.key === 'ArrowRight' ? (i + 1) % tabs.length : e.key === 'ArrowLeft' ? (i - 1 + tabs.length) % tabs.length : e.key === 'Home' ? 0 : e.key === 'End' ? tabs.length - 1 : null;
  if (next == null) return; e.preventDefault(); tabs[next].focus(); go(tabs[next].dataset.tab);
});
addEventListener('popstate', () => showTab(location.hash.slice(1)));
addEventListener('hashchange', () => showTab(location.hash.slice(1), true));
setInterval(() => {
  const before = state.phase; state.phase = E.bookPhase(B, now(), state.results);
  if (before !== state.phase) { closeSheet(); renderAll(); if (state.phase === 'live') loadLive(true); loadSubmissions(); } else renderMast();
}, 30000);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible' && state.phase === 'live') loadLive(true); });

(async () => {
  wireSheet();
  const [draft, card, pdraft, parlay] = await Promise.all([S.getDraft(B.week), S.getCard(B.week), S.getParlayDraft(B.week), S.getParlay(B.week)]);
  if (parlay && E.validateParlay(parlay.ids, B).valid) state.parlay = parlay;
  else if (pdraft && Array.isArray(pdraft.ids)) state.pids = pdraft.ids.filter(id => E.selection(B, id) && Number(E.selection(B, id).week) === Number(B.week));
  if (card && E.validateCard(card.ids, B).valid) { state.card = card; state.ownerId = card.ownerId; }
  else if (draft) { state.ids = draft.ids.filter(id => E.selection(B, id) && Number(E.selection(B, id).week) === Number(B.week)); state.ownerId = draft.ownerId || state.ownerId; }
  showTab(location.hash.slice(1));
  renderAll();
  document.querySelector('.bk-mast').classList.add('bk-enter');
  loadLive(false);
  bootCloud();
})();
})();
