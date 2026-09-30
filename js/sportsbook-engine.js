/**
 * CTE SPORTSBOOK engine — pure functions, no DOM, no network.
 * Odds math, grading, card rules, Carl/Anita bankroll ledgers and the league
 * leaderboard. Runs in the browser (window.CTE_BookEngine) and in Node for tests.
 * Fictional CTE$ only.
 */
(function (root) {
  'use strict';

  const EPS = 0.005;
  const round2 = n => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

  /* ---------- American odds ---------- */
  function assertOdds(odds) {
    const o = Number(odds);
    if (!Number.isFinite(o) || Math.abs(o) < 100) throw new Error(`Invalid American odds: ${odds}`);
    return o;
  }
  /** Implied win probability, 0–1. */
  function impliedProbability(odds) {
    const o = assertOdds(odds);
    return o > 0 ? 100 / (o + 100) : -o / (-o + 100);
  }
  /** Profit on a winning ticket. +odds: stake × odds / 100. −odds: stake × 100 / |odds|. */
  function profit(stake, odds) {
    const o = assertOdds(odds), s = Number(stake);
    if (!Number.isFinite(s) || s < 0) throw new Error(`Invalid stake: ${stake}`);
    return round2(o > 0 ? s * o / 100 : s * 100 / Math.abs(o));
  }
  /** Total return on a winning ticket = stake + profit. */
  function totalReturn(stake, odds) { return round2(Number(stake) + profit(stake, odds)); }

  /* ---------- Formatting ---------- */
  function formatOdds(odds) { const o = Number(odds); return o > 0 ? `+${o}` : `\u2212${Math.abs(o)}`; }
  function formatLine(line) { const l = Number(line); return l === 0 ? 'PK' : l > 0 ? `+${l}` : `\u2212${Math.abs(l)}`; }
  function formatMoney(n, opts = {}) {
    const v = round2(n), abs = Math.abs(v);
    const cents = opts.cents === true || (opts.cents !== false && Math.round(abs * 100) % 100 !== 0);
    const body = 'CTE$' + abs.toLocaleString('en-US', { minimumFractionDigits: cents ? 2 : 0, maximumFractionDigits: cents ? 2 : 0 });
    if (v < 0) return '\u2212' + body;
    return (opts.sign && v > 0 ? '+' : '') + body;
  }
  function formatPct(n, digits = 1) { return (n * 100).toFixed(digits) + '%'; }

  /* ---------- Markets & selections ---------- */
  function market(book, id) { return (book.markets || []).find(m => m.id === id) || null; }
  function weekMarkets(book, week = book.week) { return (book.markets || []).filter(m => Number(m.week) === Number(week)); }
  function opponent(m, side) { return m.sides[0] === side ? m.sides[1] : m.sides[0]; }
  function favorite(m) {
    const [a, b] = m.sides;
    if (m.spread[a].line !== m.spread[b].line) return m.spread[a].line < m.spread[b].line ? a : b;
    return m.moneyline[a] <= m.moneyline[b] ? a : b;
  }
  function selectionId(marketId, type, side) { return `${marketId}:${type}:${side}`; }
  function parseSelectionId(id) {
    const parts = String(id || '').split(':');
    if (parts.length !== 3 || !['ml', 'ats'].includes(parts[1])) return null;
    return { marketId: parts[0], type: parts[1], side: parts[2] };
  }
  /** Resolves a selection id against the book. Optional overrides pin the number a ticket was taken at. */
  function selection(book, id, override = {}) {
    const p = parseSelectionId(id); if (!p) return null;
    const m = market(book, p.marketId); if (!m || !m.sides.includes(p.side)) return null;
    const line = p.type === 'ats' ? (override.line ?? m.spread[p.side].line) : null;
    const odds = override.odds ?? (p.type === 'ats' ? m.spread[p.side].odds : m.moneyline[p.side]);
    return { id, market: m, marketId: m.id, week: m.week, type: p.type, side: p.side, opponent: opponent(m, p.side), line, odds,
      isFavorite: favorite(m) === p.side, isUnderdog: favorite(m) !== p.side };
  }

  /* ---------- Line movement ---------- */
  /** Spread expressed as points for sides[0]. */
  function lineForFirstSide(m, entry) { return entry.fav === m.sides[0] ? -Number(entry.points) : Number(entry.points); }
  function lineMovement(m) {
    const h = m.lineHistory || [];
    if (!h.length) return null;
    const first = h[0], last = h[h.length - 1];
    const a0 = lineForFirstSide(m, first), a1 = lineForFirstSide(m, last);
    const delta = round2(a1 - a0);
    // sides[0] receiving more points means money moved toward sides[1].
    const toward = delta > 0 ? m.sides[1] : delta < 0 ? m.sides[0] : null;
    return { open: first, current: last, points: Math.abs(delta), toward, favoriteChanged: first.fav !== last.fav,
      steps: h.map(e => ({ ...e, lineA: lineForFirstSide(m, e) })) };
  }
  /** Moneyline shift in implied-probability points toward the side the spread moved to. */
  function moneylineShift(m) {
    if (!m.openMoneyline) return null;
    const fav = favorite(m);
    return round2((impliedProbability(m.moneyline[fav]) - impliedProbability(m.openMoneyline[fav])) * 100);
  }

  /* ---------- Grading ---------- */
  /** Returns 'won' | 'lost' | 'push' for a finished matchup. */
  function grade(type, line, pointsFor, pointsAgainst) {
    const margin = round2(Number(pointsFor) - Number(pointsAgainst) + (type === 'ats' ? Number(line) : 0));
    return { status: margin > 0 ? 'won' : margin < 0 ? 'lost' : 'push', margin };
  }
  function gradeSpread(line, pf, pa) { return grade('ats', line, pf, pa).status; }
  function gradeMoneyline(pf, pa) { return grade('ml', 0, pf, pa).status; }

  /** Live (unsettled) read on a selection: covering / winning, never a settlement. */
  function liveStatus(sel, scores) {
    if (!scores || scores[sel.side] == null || scores[sel.opponent] == null) return null;
    const pf = Number(scores[sel.side]), pa = Number(scores[sel.opponent]);
    const raw = round2(pf - pa);
    const g = grade(sel.type, sel.line, pf, pa);
    const word = sel.type === 'ats'
      ? (g.status === 'won' ? 'covering' : g.status === 'lost' ? 'not-covering' : 'push')
      : (g.status === 'won' ? 'winning' : g.status === 'lost' ? 'losing' : 'tied');
    return { status: word, margin: raw, adjusted: g.margin, pointsFor: pf, pointsAgainst: pa };
  }

  /** Settles one ticket. Unfinished matchups stay 'pending'; nothing is paid early. */
  function settle(sel, stake, results) {
    const r = results && results[sel.marketId];
    if (!r || !r.final || !r.scores) return { status: 'pending', stake, profit: 0, returned: null };
    const g = grade(sel.type, sel.line, r.scores[sel.side], r.scores[sel.opponent]);
    const won = g.status === 'won', push = g.status === 'push';
    const p = won ? profit(stake, sel.odds) : push ? 0 : -round2(stake);
    return { status: g.status, stake, profit: p, returned: won ? round2(stake + p) : push ? round2(stake) : 0, margin: g.margin,
      scores: r.scores };
  }

  /* ---------- Phases ---------- */
  function lockTime(book, m) { return new Date((m && m.lockAt) || book.lockAt).getTime(); }
  function marketPhase(book, m, now, results) {
    if (results && results[m.id] && results[m.id].final) return 'final';
    return now >= lockTime(book, m) ? 'live' : 'open';
  }
  function bookPhase(book, now, results, week = book.week) {
    const ms = weekMarkets(book, week);
    if (ms.length && ms.every(m => marketPhase(book, m, now, results) === 'final')) return 'final';
    return ms.some(m => marketPhase(book, m, now, results) !== 'open') ? 'live' : 'open';
  }

  /* ---------- League challenge card ---------- */
  function cardCounts(ids, book) {
    const c = { ml: 0, ats: 0, total: 0 };
    for (const id of ids) { const p = parseSelectionId(id); if (p) { c[p.type]++; c.total++; } }
    return c;
  }
  function requirement(book) { return (book.leagueChallenge && book.leagueChallenge.required) || { ml: 3, ats: 3 }; }
  function validateCard(ids, book, week = book.week) {
    const req = requirement(book), errors = [], seen = new Set(), slots = new Set();
    for (const id of ids) {
      const sel = selection(book, id);
      if (!sel) { errors.push(`Unknown selection ${id}`); continue; }
      if (Number(sel.week) !== Number(week)) errors.push(`${id} is not a Week ${week} market`);
      if (seen.has(id)) errors.push(`${id} appears twice`);
      const slot = sel.marketId + ':' + sel.type;
      if (slots.has(slot)) errors.push(`Both sides of ${sel.marketId} ${sel.type.toUpperCase()}`);
      seen.add(id); slots.add(slot);
    }
    const counts = cardCounts(ids, book);
    if (counts.ml !== req.ml) errors.push(`Needs exactly ${req.ml} moneyline picks (has ${counts.ml})`);
    if (counts.ats !== req.ats) errors.push(`Needs exactly ${req.ats} ATS picks (has ${counts.ats})`);
    return { valid: errors.length === 0, counts, required: { ...req, total: req.ml + req.ats }, errors };
  }
  /** Toggle a selection on a card: add, remove, swap sides, or refuse when that bet type is full. */
  function toggleSelection(ids, id, book) {
    const sel = selection(book, id);
    if (!sel) return { ids: ids.slice(), action: 'blocked', reason: 'That market is not on the board.' };
    if (ids.includes(id)) return { ids: ids.filter(x => x !== id), action: 'removed', id };
    const other = selectionId(sel.marketId, sel.type, sel.opponent);
    if (ids.includes(other)) return { ids: ids.map(x => x === other ? id : x), action: 'swapped', id, replaced: other };
    const req = requirement(book), counts = cardCounts(ids, book);
    if (counts[sel.type] >= req[sel.type]) {
      const label = sel.type === 'ml' ? 'moneylines' : 'ATS picks';
      return { ids: ids.slice(), action: 'blocked', reason: `Your card already has ${req[sel.type]} ${label}. Remove one to add another.` };
    }
    return { ids: [...ids, id], action: 'added', id };
  }

  /* ---------- Shared ticket helpers ---------- */
  function emptyRecord() { return { w: 0, l: 0, p: 0 }; }
  function tally(rec, status) { if (status === 'won') rec.w++; else if (status === 'lost') rec.l++; else if (status === 'push') rec.p++; }
  function recordText(rec) { return `${rec.w}\u2013${rec.l}${rec.p ? '\u2013' + rec.p : ''}`; }
  function boardOrder(book, sel) {
    const i = (book.markets || []).findIndex(m => m.id === sel.marketId);
    return Number(sel.week) * 1000 + i * 10 + (sel.type === 'ml' ? 0 : 1);
  }
  function streakOf(tickets) {
    let type = null, count = 0;
    for (const t of tickets) {
      if (t.status !== 'won' && t.status !== 'lost') continue;
      const s = t.status === 'won' ? 'W' : 'L';
      if (s === type) count++; else { type = s; count = 1; }
    }
    return { type, count, text: type ? type + count : '\u2014' };
  }

  /* ---------- Carl / Anita bankroll ledger ---------- */
  /**
   * Bankroll never resets. Week N's required stake is exactly what the
   * personality finished Week N−1 with. A week that is not yet settled leaves
   * every later starting bankroll unknown (null) rather than guessed.
   */
  function bankrollLedger(book, personalityId, results) {
    const p = book.personalities[personalityId];
    const start = Number(p.startingBankroll);
    const cardWeeks = Object.keys(p.cards || {}).map(Number);
    const lastWeek = Math.max(Number(book.week), ...cardWeeks, Number(p.startWeek));
    const weeks = [], tickets = [];
    let bankroll = start, known = true;
    for (let w = Number(p.startWeek); w <= lastWeek; w++) {
      const card = p.cards && p.cards[w];
      const startBank = known ? round2(bankroll) : null;
      if (!card || !Array.isArray(card.wagers)) {
        weeks.push({ week: w, start: startBank, end: startBank, status: 'no-card', wagers: [], pnl: 0, issues: [] });
        continue;
      }
      const wagers = card.wagers.map(wg => {
        const sel = selection(book, selectionId(wg.market, wg.type, wg.side), { odds: wg.odds, line: wg.line });
        if (!sel) return { ...wg, invalid: true, status: 'void', stake: Number(wg.stake), profit: 0, returned: Number(wg.stake) };
        const s = settle(sel, Number(wg.stake), results);
        return { ...wg, sel, ...s, lock: !!wg.lock };
      });
      const staked = round2(wagers.reduce((a, x) => a + Number(x.stake || 0), 0));
      const issues = [];
      const counts = cardCounts(wagers.filter(x => !x.invalid).map(x => x.sel.id), book);
      const req = requirement(book);
      if (counts.ml !== req.ml || counts.ats !== req.ats) issues.push(`Card needs ${req.ml} ML + ${req.ats} ATS (has ${counts.ml} ML + ${counts.ats} ATS)`);
      if (startBank != null && Math.abs(staked - startBank) > EPS) issues.push(`Stakes total ${formatMoney(staked)}, bankroll is ${formatMoney(startBank)}`);
      if (wagers.some(x => x.invalid)) issues.push('A wager points at a market that is not on the board');
      const settled = wagers.every(x => x.status !== 'pending');
      const end = settled ? round2(wagers.reduce((a, x) => a + Number(x.returned || 0), 0) + (startBank != null ? startBank - staked : 0)) : null;
      weeks.push({ week: w, start: startBank, staked, end, status: settled ? 'settled' : 'pending', wagers, issues,
        pnl: settled && startBank != null ? round2(end - startBank) : null, postedAt: card.postedAt || null });
      wagers.forEach(x => { if (!x.invalid) tickets.push(x); });
      if (settled && known) bankroll = end; else known = false;
    }
    tickets.sort((a, b) => boardOrder(book, a.sel) - boardOrder(book, b.sel));
    const settledTickets = tickets.filter(t => ['won', 'lost', 'push'].includes(t.status));
    const ml = emptyRecord(), ats = emptyRecord(), total = emptyRecord(), locks = emptyRecord(), upsets = emptyRecord();
    for (const t of settledTickets) {
      tally(t.sel.type === 'ml' ? ml : ats, t.status); tally(total, t.status);
      if (t.lock) tally(locks, t.status);
      if (t.sel.type === 'ml' && t.sel.isUnderdog) tally(upsets, t.status);
    }
    const wins = settledTickets.filter(t => t.status === 'won').sort((a, b) => b.profit - a.profit);
    const losses = settledTickets.filter(t => t.status === 'lost').sort((a, b) => a.profit - b.profit);
    const lastSettled = [...weeks].reverse().find(w => w.status === 'settled');
    const current = known ? round2(bankroll) : (lastSettled ? lastSettled.end : start);
    const thisWeek = weeks.find(w => w.week === Number(book.week)) || null;
    return {
      id: personalityId, personality: p, startingBankroll: start, current, pendingChain: !known,
      seasonPnl: round2((lastSettled ? lastSettled.end : start) - start), weeks, thisWeek,
      lastWeekPnl: lastSettled ? lastSettled.pnl : null,
      records: { ml, ats, total, locks, upsets }, streak: streakOf(settledTickets),
      biggestWin: wins[0] || null, worstLoss: losses[0] || null, busted: known && current <= EPS
    };
  }

  /* ---------- League leaderboard ---------- */
  function challengeTickets(book, results, throughWeek = Infinity) {
    const stake = Number((book.leagueChallenge && book.leagueChallenge.stake) || 100);
    const byOwner = {};
    const cards = (book.leagueChallenge && book.leagueChallenge.cards) || {};
    for (const [week, owners] of Object.entries(cards)) {
      if (Number(week) > throughWeek) continue;
      for (const [ownerId, ids] of Object.entries(owners || {})) {
        for (const id of ids || []) {
          const sel = selection(book, id); if (!sel) continue;
          (byOwner[ownerId] = byOwner[ownerId] || []).push({ sel, week: Number(week), ...settle(sel, stake, results) });
        }
      }
    }
    return byOwner;
  }
  function leaderboard(book, results, throughWeek = Infinity) {
    const rows = Object.entries(challengeTickets(book, results, throughWeek)).map(([ownerId, tickets]) => {
      tickets.sort((a, b) => boardOrder(book, a.sel) - boardOrder(book, b.sel));
      const ml = emptyRecord(), ats = emptyRecord(), total = emptyRecord(), weekly = {};
      let pnl = 0, risked = 0, pending = 0;
      for (const t of tickets) {
        if (t.status === 'pending') { pending++; continue; }
        tally(t.sel.type === 'ml' ? ml : ats, t.status); tally(total, t.status);
        pnl += t.profit; risked += t.stake; weekly[t.week] = round2((weekly[t.week] || 0) + t.profit);
      }
      const hits = tickets.filter(t => t.status === 'won').sort((a, b) => b.profit - a.profit);
      const beats = tickets.filter(t => t.status === 'lost').sort((a, b) => Math.abs(a.margin) - Math.abs(b.margin));
      return { ownerId, tickets, ml, ats, total, profit: round2(pnl), risked, roi: risked ? pnl / risked : 0, pending,
        streak: streakOf(tickets), bestHit: hits[0] || null, worstBeat: beats[0] || null, weekly,
        favorites: tickets.filter(t => t.sel.isFavorite).length, dogMl: tickets.filter(t => t.sel.type === 'ml' && t.sel.isUnderdog).length };
    });
    rows.sort((a, b) => b.profit - a.profit || b.roi - a.roi || b.total.w - a.total.w || a.ownerId.localeCompare(b.ownerId));
    rows.forEach((r, i) => { r.rank = i + 1; });
    return rows;
  }
  function settledWeeks(book, results) {
    const weeks = [...new Set((book.markets || []).map(m => Number(m.week)))].sort((a, b) => a - b);
    return weeks.filter(w => { const ms = weekMarkets(book, w); return ms.length && ms.every(m => results && results[m.id] && results[m.id].final); });
  }
  /** Leaderboard with rank movement versus the board before the latest settled week. */
  function leaderboardWithMovement(book, results) {
    const rows = leaderboard(book, results);
    const done = settledWeeks(book, results);
    if (done.length >= 2) {
      const before = Object.fromEntries(leaderboard(book, results, done[done.length - 2]).map(r => [r.ownerId, r.rank]));
      rows.forEach(r => { r.previousRank = before[r.ownerId] ?? null; r.rankChange = r.previousRank ? r.previousRank - r.rank : 0; });
    } else rows.forEach(r => { r.previousRank = null; r.rankChange = 0; });
    return { rows, latestWeek: done[done.length - 1] || null };
  }


  /* ---------- Parlays ----------
   * One parlay per owner per week. Legs come from the same board. One leg per matchup
   * (no same-game parlays). A push drops that leg and the parlay pays on the rest;
   * any losing leg loses the parlay; all legs pushing returns the stake. */
  function parlayRules(book) {
    const p = (book && book.parlay) || {};
    return { stake: Number(p.stake || 100), minLegs: Number(p.minLegs || 2), maxLegs: Number(p.maxLegs || 6) };
  }
  function decimalOdds(odds) { const o = Number(odds); return o > 0 ? 1 + o / 100 : 1 + 100 / Math.abs(o); }
  function americanFromDecimal(d) {
    if (!(d > 1)) return 0;
    return d >= 2 ? Math.round((d - 1) * 100) : -Math.round(100 / (d - 1));
  }
  function parlayPrice(sels) {
    const d = sels.reduce((acc, s) => acc * decimalOdds(s.odds), 1);
    return { decimal: d, american: americanFromDecimal(d) };
  }
  function parlayPayout(stake, sels) {
    const d = parlayPrice(sels).decimal;
    return { profit: round2(stake * (d - 1)), returned: round2(stake * d) };
  }
  function validateParlay(ids, book, week) {
    const rules = parlayRules(book), errors = [], seen = new Set();
    const wk = Number(week != null ? week : book.week);
    const sels = (ids || []).map(id => selection(book, id));
    if (sels.some(s => !s)) errors.push('A leg is not on the board');
    for (const s of sels.filter(Boolean)) {
      if (Number(s.week) !== wk) errors.push(`${s.id} is not a Week ${wk} market`);
      if (seen.has(s.marketId)) errors.push('Only one leg per matchup');
      seen.add(s.marketId);
    }
    if (sels.length < rules.minLegs) errors.push(`Parlays need at least ${rules.minLegs} legs`);
    if (sels.length > rules.maxLegs) errors.push(`Parlays max out at ${rules.maxLegs} legs`);
    return { valid: !errors.length, errors: [...new Set(errors)], legs: sels.length, rules };
  }
  function toggleParlayLeg(ids, id, book) {
    const sel = selection(book, id);
    if (!sel) return { ids, action: 'blocked', reason: 'That line is not on the board.' };
    if (ids.includes(id)) return { ids: ids.filter(x => x !== id), action: 'removed' };
    const rules = parlayRules(book);
    const same = ids.find(x => { const o = selection(book, x); return o && o.marketId === sel.marketId; });
    if (same) return { ids: ids.map(x => (x === same ? id : x)), action: 'swapped', replaced: same };
    if (ids.length >= rules.maxLegs) return { ids, action: 'blocked', reason: `Parlays max out at ${rules.maxLegs} legs.` };
    return { ids: [...ids, id], action: 'added' };
  }
  function settleParlay(ids, book, stake, results) {
    const legs = ids.map(id => selection(book, id)).filter(Boolean).map(s => ({ sel: s, ...settle(s, stake, results) }));
    if (legs.some(l => l.status === 'lost')) return { status: 'lost', legs, profit: -round2(stake), returned: 0 };
    if (legs.some(l => l.status === 'pending')) return { status: 'pending', legs, profit: 0, returned: null };
    const live = legs.filter(l => l.status === 'won').map(l => l.sel);
    if (!live.length) return { status: 'push', legs, profit: 0, returned: round2(stake) };
    const pay = parlayPayout(stake, live);
    return { status: 'won', legs, profit: pay.profit, returned: pay.returned, legsPaid: live.length };
  }
  /** Season parlay standings from book.leagueChallenge.parlays[week][owner] = [ids]. */
  function parlayLeaderboard(book, results) {
    const rules = parlayRules(book), byWeek = (book.leagueChallenge && book.leagueChallenge.parlays) || {}, rows = {};
    for (const [week, owners] of Object.entries(byWeek)) for (const [ownerId, ids] of Object.entries(owners || {})) {
      if (!Array.isArray(ids) || !validateParlay(ids, book, Number(week)).valid) continue;
      const r = rows[ownerId] || (rows[ownerId] = { ownerId, entered: 0, hits: 0, misses: 0, pushes: 0, pending: 0, profit: 0, best: null, parlays: [] });
      const st = settleParlay(ids, book, rules.stake, results);
      r.entered++; r.parlays.push({ week: Number(week), ids, ...st, price: parlayPrice(ids.map(id => selection(book, id))) });
      if (st.status === 'won') { r.hits++; r.profit = round2(r.profit + st.profit); if (!r.best || st.profit > r.best.profit) r.best = { week: Number(week), profit: st.profit, legs: ids.length }; }
      else if (st.status === 'lost') { r.misses++; r.profit = round2(r.profit + st.profit); }
      else if (st.status === 'push') r.pushes++; else r.pending++;
    }
    const out = Object.values(rows).sort((a, b) => b.profit - a.profit || b.hits - a.hits || a.ownerId.localeCompare(b.ownerId));
    out.forEach((r, i) => { r.rank = i + 1; });
    return out;
  }
  /** Book copy with cloud-submitted cards/parlays merged over commissioner-pasted ones. */
  function withSubmissions(book, week, cards, parlays) {
    const b = JSON.parse(JSON.stringify(book)), lc = b.leagueChallenge || (b.leagueChallenge = {});
    lc.cards = lc.cards || {}; lc.parlays = lc.parlays || {};
    const clean = x => (x && Array.isArray(x.ids) ? x.ids : Array.isArray(x) ? x : null);
    for (const [o, c] of Object.entries(cards || {})) { const ids = clean(c); if (ids) (lc.cards[week] = lc.cards[week] || {})[o] = ids; }
    for (const [o, c] of Object.entries(parlays || {})) { const ids = clean(c); if (ids) (lc.parlays[week] = lc.parlays[week] || {})[o] = ids; }
    return b;
  }

  /* ---------- Entry line (share → commissioner) ---------- */
  function entryLine(ownerId, week, ids) { return `CTE-BOOK W${week} ${ownerId} ${ids.join(' ')}`; }
  function parseEntryLine(text) {
    const m = String(text || '').trim().match(/^CTE-BOOK W(\d+) ([a-z0-9_-]+) (.+)$/i);
    return m ? { week: Number(m[1]), ownerId: m[2].toLowerCase(), ids: m[3].trim().split(/\s+/) } : null;
  }

  const api = {
    round2, impliedProbability, profit, totalReturn, formatOdds, formatLine, formatMoney, formatPct,
    market, weekMarkets, opponent, favorite, selectionId, parseSelectionId, selection,
    lineMovement, lineForFirstSide, moneylineShift,
    grade, gradeSpread, gradeMoneyline, liveStatus, settle,
    lockTime, marketPhase, bookPhase,
    cardCounts, validateCard, toggleSelection,
    bankrollLedger, leaderboard, leaderboardWithMovement, settledWeeks, recordText,
    entryLine, parseEntryLine,
    parlayRules, decimalOdds, americanFromDecimal, parlayPrice, parlayPayout, validateParlay, toggleParlayLeg, settleParlay, parlayLeaderboard, withSubmissions
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.CTE_BookEngine = api;
})(typeof window !== 'undefined' ? window : null);
