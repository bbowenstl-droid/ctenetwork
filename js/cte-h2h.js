/* CTE Network — all-time head-to-head matrix (pure; exported for Node tests).
 * identity 'franchise': a roster slot keeps one line through manager changes
 *                       (Jeremy -> Isaiah, Tyler -> Carter).
 * identity 'manager'  : each person only owns the games he actually managed.
 * Median results are never head-to-head games and are not counted.
 */
(function (root) {
  'use strict';
  function sides(g, identity) {
    return identity === 'franchise' ? [[String(g.rosterA), String(g.rosterB), g.scoreA, g.scoreB], [String(g.rosterB), String(g.rosterA), g.scoreB, g.scoreA]] : [[g.ownerA, g.ownerB, g.scoreA, g.scoreB], [g.ownerB, g.ownerA, g.scoreB, g.scoreA]];
  }
  function matrix(games, identity = 'franchise') {
    const cells = {}, totals = {};
    const sorted = games.slice().sort((a, b) => a.season - b.season || a.week - b.week);
    for (const g of sorted) for (const [a, b, pf, pa] of sides(g, identity)) {
      const c = (cells[a] || (cells[a] = {}))[b] || (cells[a][b] = { w: 0, l: 0, t: 0, pf: 0, pa: 0, games: [], streak: 0, streakType: null });
      const res = pf > pa ? 'w' : pf < pa ? 'l' : 't';
      c[res]++; c.pf += pf; c.pa += pa; c.games.push(g);
      c.streak = c.streakType === res ? c.streak + 1 : 1; c.streakType = res;
      const t = totals[a] || (totals[a] = { w: 0, l: 0, t: 0 }); t[res]++;
    }
    return { cells, totals };
  }
  const record = c => c ? c.w + '–' + c.l + (c.t ? '–' + c.t : '') : '0–0';
  /** Talking points for the grid header. order = ids shown in the grid. */
  function notes(m, order) {
    const pairs = [];
    for (const a of order) for (const b of order) { const c = m.cells[a]?.[b]; if (a !== b && c && c.games.length) pairs.push({ a, b, c }); }
    const lopsided = pairs.filter(p => p.c.w > p.c.l).sort((x, y) => (y.c.w - y.c.l) - (x.c.w - x.c.l) || y.c.games.length - x.c.games.length || (y.c.pf - y.c.pa) - (x.c.pf - x.c.pa))[0] || null;
    const most = pairs.filter(p => p.a < p.b).sort((x, y) => y.c.games.length - x.c.games.length || Math.abs(x.c.w - x.c.l) - Math.abs(y.c.w - y.c.l))[0] || null;
    const streak = pairs.filter(p => p.c.streakType === 'w').sort((x, y) => y.c.streak - x.c.streak || y.c.games.length - x.c.games.length)[0] || null;
    const unmet = []; for (let i = 0; i < order.length; i++) for (let j = i + 1; j < order.length; j++) if (!m.cells[order[i]]?.[order[j]]?.games.length) unmet.push([order[i], order[j]]);
    return { lopsided, most, streak, unmet };
  }
  const api = { matrix, record, notes };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.CTE_H2H = api;
})(typeof window === 'undefined' ? globalThis : window);
