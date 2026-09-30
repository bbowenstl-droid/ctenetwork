/**
 * CTE SPORTSBOOK — shared components + embeds for the rest of the network.
 *   CTE_BookUI.movementHTML(market, {armed})  reusable line-movement component
 *   CTE_BookEmbeds.hydrate(root)              newsroom components:
 *     <div data-cte-book="board"></div>
 *     <div data-cte-book="line" data-market="w4-brendan-jacob"></div>
 *     <div data-cte-book="duel"></div>
 *     <div data-cte-book="card" data-who="carl"></div>   (carl | holly)
 *     <div data-cte-book="leaderboard" data-limit="5"></div>
 * Also decorates the homepage (teaser) and Game Center (line + cover status).
 */
(function () {
  'use strict';
  const E = window.CTE_BookEngine, B = window.CTE_SPORTSBOOK;
  if (!E || !B) return;
  const esc = s => window.CTE_UI ? window.CTE_UI.esc(s) : String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const name = id => (window.CTE_UI ? window.CTE_UI.owner(id).name : id);
  const now = () => window.CTE_BOOK_NOW ? new Date(window.CTE_BOOK_NOW).getTime() : Date.now();
  const money = (n, o) => E.formatMoney(n, o);
  const base = () => Object.fromEntries(Object.entries(B.results || {}).filter(([, r]) => r && r.scores).map(([id, r]) => [id, { final: true, ...r, source: 'commissioner' }]));
  let ctxPromise = null;
  const ctx = () => ctxPromise || (ctxPromise = (window.CTE_BookLive && window.CTE_Sleeper ? window.CTE_BookLive.load() : Promise.reject()).catch(() => null));
  const selLabel = sel => sel.type === 'ml' ? `${name(sel.side)} ML` : `${name(sel.side)} ${E.formatLine(sel.line)}`;
  const lockLabel = () => new Date(B.lockAt).toLocaleString('en-US', { weekday: 'short', hour: 'numeric', minute: '2-digit', timeZone: 'America/Chicago' }) + ' CT';
  const brand = `<strong>CTE <span>Sportsbook</span></strong>`;

  /* ---------- Reusable: line movement ---------- */
  function movementHTML(m, opts = {}) {
    const mv = E.lineMovement(m); if (!mv) return '';
    const fav = mv.current.fav, fv = e => e.fav === fav ? Number(e.points) : -Number(e.points);
    const vals = mv.steps.map(fv), lo = Math.min(...vals) - 2, hi = Math.max(...vals) + 2, pct = v => ((v - lo) / (hi - lo) * 100).toFixed(2) + '%';
    const from = vals[0], to = vals[vals.length - 1], left = Math.min(from, to), width = Math.abs(to - from) / (hi - lo) * 100;
    const shift = E.moneylineShift(m);
    const summary = mv.points ? `Moved <b>${mv.points} pt${mv.points === 1 ? '' : 's'}</b> toward ${esc(name(mv.toward))}${mv.favoriteChanged ? ', and the favorite flipped' : ''}` : 'No movement since open';
    return `<div class="bk-movement" data-move="${esc(m.id)}">
      <div class="bk-move-ends"><div><small>${esc(mv.open.label)}</small><strong class="bk-num">${esc(name(mv.open.fav))} ${E.formatLine(-mv.open.points)}</strong></div>
      <span aria-hidden="true" style="color:var(--bk-move);font-size:18px">\u2192</span>
      <div><small>${esc(mv.current.label)}</small><strong class="bk-num">${esc(name(fav))} ${E.formatLine(-mv.current.points)}</strong></div></div>
      <div class="bk-meter ${opts.armed ? 'is-armed' : ''}" style="--bk-from:${pct(from)};--bk-to:${pct(to)}" role="img" aria-label="Spread moved from ${esc(name(mv.open.fav))} minus ${mv.open.points} to ${esc(name(fav))} minus ${mv.current.points}">
        <span class="bk-meter-track"></span><span class="bk-meter-fill" style="left:${((left - lo) / (hi - lo) * 100).toFixed(2)}%;width:${width.toFixed(2)}%;transform-origin:${to >= from ? 'left' : 'right'}"></span>
        ${mv.steps.slice(0, -1).map(e => `<span class="bk-meter-dot" style="left:${pct(fv(e))}"></span>`).join('')}<span class="bk-meter-dot is-now"></span></div>
      <div class="bk-move-summary">${summary}</div>
      ${shift != null ? `<p class="bk-block-note">Moneyline: ${esc(name(fav))} ${E.formatOdds(m.openMoneyline[fav])} \u2192 ${E.formatOdds(m.moneyline[fav])} (${shift > 0 ? '+' : ''}${shift.toFixed(1)} pts implied win probability).</p>` : ''}
    </div>`;
  }
  function playMovement(root) {
    const meters = root ? root.querySelectorAll('.bk-meter.is-armed') : [];
    if (!meters.length) return;
    requestAnimationFrame(() => requestAnimationFrame(() => meters.forEach(m => m.classList.remove('is-armed'))));
  }
  function lineOfTheWeek() {
    return E.weekMarkets(B).map(m => ({ m, mv: E.lineMovement(m), shift: Math.abs(E.moneylineShift(m) || 0) }))
      .filter(x => x.mv && x.mv.points).sort((a, b) => b.mv.points - a.mv.points || b.shift - a.shift)[0] || null;
  }
  function coverRead(m, scores) {
    const fav = E.favorite(m), dog = E.opponent(m, fav), ls = E.liveStatus(E.selection(B, E.selectionId(m.id, 'ats', fav)), scores);
    if (!ls) return null;
    return { ls, text: ls.status === 'covering' ? `${name(fav)} covering \u2713` : ls.status === 'push' ? 'On the number =' : `${name(dog)} covering \u2713`, favCovering: ls.status === 'covering', margin: ls.margin };
  }
  window.CTE_BookUI = { movementHTML, playMovement, lineOfTheWeek, coverRead, selLabel };

  /* ---------- Homepage teaser ---------- */
  function teaserHTML(c) {
    const results = c ? c.results : base(), phase = E.bookPhase(B, now(), results);
    const ms = E.weekMarkets(B), top = [...ms].sort((a, b) => Math.abs(b.spread[E.favorite(b)].line) - Math.abs(a.spread[E.favorite(a)].line)).slice(0, 3);
    const carl = E.bankrollLedger(B, 'carl', results), holly = E.bankrollLedger(B, 'holly', results), lotw = lineOfTheWeek();
    const status = phase === 'open' ? `${ms.length} markets open \u00b7 lock ${esc(lockLabel())}` : phase === 'live' ? 'Markets locked \u00b7 live' : `Week ${B.week} graded`;
    const lineRow = m => {
      const fav = E.favorite(m), live = c && c.live[m.id], r = results[m.id];
      let right = `<span class="bk-num">ML ${E.formatOdds(m.moneyline[fav])}</span>`;
      const scores = r && r.final ? r.scores : phase !== 'open' && live && live.started ? live.scores : null;
      if (scores) { const cr = coverRead(m, scores); right = `<span>${esc(cr.text.replace(' covering', r && r.final ? ' covered' : ' covering'))}</span>`; }
      return `<li><b class="bk-num">${esc(name(fav).toUpperCase())} ${E.formatLine(m.spread[fav].line)}</b>${right}</li>`;
    };
    return `<div class="bk-teaser-main"><div class="bk-teaser-kicker"><span>Week ${B.week} market</span><span>${status}</span></div>
      <h2><span>CTE</span> Sportsbook</h2>
      <ul class="bk-teaser-lines">${top.map(lineRow).join('')}</ul>
      <span class="bk-teaser-cta">Enter the Sportsbook <span aria-hidden="true">\u2197</span></span></div>
      <div class="bk-teaser-side"><div class="bk-teaser-duel">
        <div class="is-carl"><img src="concussion-carl.webp" alt="" loading="lazy"><small>Carl</small><strong class="bk-num">${money(carl.current)}</strong></div>
        <div class="is-holly"><img src="anita-headcheck.webp" alt="" loading="lazy"><small>Anita</small><strong class="bk-num">${money(holly.current)}</strong></div></div>
        ${lotw ? `<div class="bk-teaser-lotw"><small>Line of the week</small><strong class="bk-num">${esc(name(lotw.mv.current.fav))} ${E.formatLine(-lotw.mv.open.points)} \u2192 ${E.formatLine(-lotw.mv.current.points)}</strong><p>Moved <b>${lotw.mv.points} pts</b> toward ${esc(name(lotw.mv.toward))}. Moneyline went from ${E.formatOdds(lotw.m.openMoneyline[lotw.mv.current.fav])} to ${E.formatOdds(lotw.m.moneyline[lotw.mv.current.fav])}.</p></div>` : ''}
      </div>`;
  }
  function homeTeaser() {
    const anchor = document.querySelector('.n-talent'); if (!anchor) return;
    const a = document.createElement('a');
    a.className = 'bk-embed bk-teaser'; a.href = 'sportsbook.html'; a.setAttribute('aria-label', `CTE Sportsbook, Week ${B.week} market. Enter the Sportsbook`);
    a.innerHTML = teaserHTML(null); anchor.before(a);
    ctx().then(c => { if (c) a.innerHTML = teaserHTML(c); });
  }

  /* ---------- Game Center ---------- */
  function decorateScoreboard(detail) {
    if (Number(detail.season) !== Number(B.season) || Number(detail.week) !== Number(B.week)) return;
    const line = document.querySelector('.n-live-line');
    if (line && !line.querySelector('.bk-gc-link')) line.insertAdjacentHTML('beforeend', '<a class="bk-gc-link" href="sportsbook.html">Sportsbook \u2197</a>');
    ctx().then(c => {
      const results = c ? c.results : base();
      for (const card of document.querySelectorAll('.n-match-card[data-owners]')) {
        const ids = card.dataset.owners.split(','), m = E.weekMarkets(B).find(x => x.sides.includes(ids[0]) && x.sides.includes(ids[1]));
        if (!m) continue;
        card.querySelector('.bk-gc') && card.querySelector('.bk-gc').remove();
        const fav = E.favorite(m), phase = E.marketPhase(B, m, now(), results), live = c && c.live[m.id], r = results[m.id];
        const scores = r && r.final ? r.scores : live && live.started && phase !== 'open' ? live.scores : null;
        let html = `<span class="bk-gc-head"><b>${esc(name(fav))} ${E.formatLine(m.spread[fav].line)}</b></span><span class="bk-num">ML ${E.formatOdds(m.moneyline[m.sides[0]])} / ${E.formatOdds(m.moneyline[m.sides[1]])}</span>`;
        if (scores) {
          const cr = coverRead(m, scores), final = r && r.final;
          html += `<span class="bk-num">${final ? 'Final' : 'Current'} margin ${cr.margin > 0 ? '+' : ''}${cr.margin.toFixed(1)} ${esc(name(fav))}</span><span class="bk-chip" data-s="${cr.favCovering ? 'covering' : cr.ls.status === 'push' ? 'push' : 'not-covering'}">${esc(final ? cr.text.replace(' covering', ' covered') : cr.text).toUpperCase()}</span>`;
        } else if (phase === 'open') html += `<span>Locks ${esc(lockLabel())}</span>`;
        const div = document.createElement('div'); div.className = 'bk-gc'; div.setAttribute('aria-label', 'CTE Sportsbook line'); div.innerHTML = html;
        const foot = card.querySelector('.n-match-foot'); foot ? foot.before(div) : card.append(div);
      }
    });
  }
  document.addEventListener('cte:scoreboard', e => { if (e.detail && e.detail.view === 'game-day') decorateScoreboard(e.detail); });

  /* ---------- Newsroom components ---------- */
  const shell = (inner, foot) => `<div class="bk-embed-head">${brand}<span>Week ${B.week}</span></div>${inner}${foot ? `<div class="bk-embed-foot">${foot}</div>` : ''}`;
  const disclaimer = '<span>Fictional CTE$. No real money.</span>';
  const renderers = {
    board() {
      return shell(E.weekMarkets(B).map(m => { const fav = E.favorite(m), dog = E.opponent(m, fav);
        return `<div class="bk-eb-row"><b class="bk-num">${esc(name(fav))} ${E.formatLine(m.spread[fav].line)} <span style="font-weight:650">(${E.formatOdds(m.spread[fav].odds)})</span></b><span>vs ${esc(name(dog))} ${E.formatLine(m.spread[dog].line)} (${E.formatOdds(m.spread[dog].odds)})</span><span class="bk-num">ML ${E.formatOdds(m.moneyline[fav])} / ${E.formatOdds(m.moneyline[dog])}</span></div>`; }).join(''),
        `${disclaimer}<a href="sportsbook.html">Open the board \u2197</a>`);
    },
    line(el) {
      const m = E.market(B, el.dataset.market) || (lineOfTheWeek() || {}).m;
      if (!m) return shell('<p class="bk-note" style="padding:0 20px 16px">That market is not on the board.</p>');
      return shell(`<div class="bk-eb-row" style="border:0"><b>${esc(name(m.sides[0]))} vs ${esc(name(m.sides[1]))}</b></div>${movementHTML(m, { armed: true })}`, `${disclaimer}<a href="sportsbook.html#board">Full matchup \u2197</a>`);
    },
    duel(el, results) {
      const d = id => { const l = E.bankrollLedger(B, id, results); return `<div class="is-${id}"><img src="${esc(l.personality.image)}" alt="" loading="lazy"><div><small>${esc(l.personality.name)}</small><strong class="bk-num">${money(l.current)}</strong><small class="bk-num">${E.recordText(l.records.total)} \u00b7 season ${money(l.seasonPnl, { sign: true })}</small></div></div>`; };
      return shell(`<div class="bk-embed-duel">${d('carl')}${d('holly')}</div>`, `<span>Bankrolls carry over. No refills.</span><a href="sportsbook.html#carl-vs-holly">Carl vs Anita \u2197</a>`);
    },
    card(el, results) {
      const id = el.dataset.who === 'holly' ? 'holly' : 'carl', l = E.bankrollLedger(B, id, results), wk = l.weeks.find(w => w.week === Number(el.dataset.week || B.week));
      const body = !wk || wk.status === 'no-card' ? `<p class="bk-note" style="padding:4px 20px 16px">${esc(l.personality.shortName)} hasn't posted a Week ${esc(el.dataset.week || B.week)} card.</p>`
        : wk.wagers.filter(w => !w.invalid).map(w => `<div class="bk-eb-row"><b class="bk-num">${esc(selLabel(w.sel))} ${E.formatOdds(w.sel.odds)}${w.lock ? ' \u00b7 LOCK' : ''}</b><span class="bk-num">${money(w.stake)}</span><span class="bk-num">${w.status === 'pending' ? 'to win ' + money(E.profit(w.stake, w.sel.odds)) : w.status.toUpperCase() + ' ' + money(w.profit, { sign: true })}</span></div>`).join('');
      return shell(body, `<span>${esc(l.personality.shortName)}: ${wk && wk.start != null ? money(wk.start) + ' bankroll' : ''}</span><a href="sportsbook.html#carl-vs-holly">Full card \u2197</a>`);
    },
    leaderboard(el, results) {
      const rows = E.leaderboard(B, results).filter(r => r.total.w + r.total.l + r.total.p).slice(0, Number(el.dataset.limit || 5));
      const body = rows.length ? rows.map(r => `<div class="bk-eb-row"><b>${r.rank}. ${esc(name(r.ownerId))}</b><span class="bk-num">${E.recordText(r.total)}</span><span class="bk-num ${r.profit >= 0 ? 'bk-pos' : 'bk-neg'}">${money(r.profit, { sign: true })}</span></div>`).join('')
        : `<p class="bk-note" style="padding:4px 20px 16px">No graded cards yet. The leaderboard ranks owners by CTE$ profit once Week ${B.week} goes final.</p>`;
      return shell(body, `<span>${money(B.leagueChallenge.stake)} per pick, ranked by profit</span><a href="sportsbook.html#leaderboard">Leaderboard \u2197</a>`);
    }
  };
  function hydrate(root = document) {
    const els = [...root.querySelectorAll('[data-cte-book]')];
    if (!els.length) return;
    const paint = results => {
      for (const el of els) {
        const r = renderers[el.dataset.cteBook]; if (!r) continue;
        el.classList.add('bk-embed'); el.innerHTML = r(el, results); playMovement(el);
      }
    };
    paint(base());
    if (els.some(el => ['duel', 'card', 'leaderboard'].includes(el.dataset.cteBook))) ctx().then(c => { if (c) paint(c.results); });
  }
  window.CTE_BookEmbeds = { hydrate, teaserHTML };

  const view = document.body && document.body.dataset.view;
  if (view === 'index') homeTeaser();
})();
