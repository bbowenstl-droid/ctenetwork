/* CTE Network — team identity (glow-up, 2026-11-16).
 * One colour per franchise and the owner's Sleeper avatar, the same on every page.
 * Colours are CTE-assigned (Sleeper has no team colours); avatars and team names
 * are learned from any Sleeper users/rosters response and remembered locally so
 * pages that never call Sleeper — and offline visits — still show them.
 * Pure helpers are exported for Node tests.
 */
(function (root) {
  'use strict';
  // Hues are spaced so neighbours in a 12-team table never read as the same team.
  const COLORS = {
    brendan: '#f0b93a', jerry: '#ff6b5e', elijah: '#ff9548', cotton: '#c3d64a', dan: '#5fd27a', troy: '#35c9b4',
    brett: '#3fc4ee', isaiah: '#5b9dff', mike: '#8f86ff', jacob: '#c07cff', carter: '#ff6fb0', jesse: '#c9d0da'
  };
  // A franchise keeps its colour when the manager changes.
  const FRANCHISE = { jeremy: 'isaiah', tyler: 'carter' };
  const KEY = 'cte_team_identity_v1';
  const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const data = () => root.CTE_LEAGUE_DATA || { owners: {} };
  let cache = null;

  function franchiseOf(id) { return FRANCHISE[id] || id; }
  function color(id) { return COLORS[franchiseOf(id)] || '#aab0ba'; }
  function name(id) { return data().owners?.[id]?.name || id || 'Unknown'; }
  function initials(id) { const n = name(id).replace(/[^A-Za-z0-9 ]/g, '').trim(); return (n.slice(0, 1) + (n.split(/\s+/)[1]?.slice(0, 1) || n.slice(1, 2))).toUpperCase(); }

  /** Only Sleeper's own image CDN is ever used as an avatar source. */
  function avatarUrl(user) {
    const custom = user?.metadata?.avatar;
    if (typeof custom === 'string' && /^https:\/\/sleepercdn\.com\/[\w./-]+$/.test(custom)) return custom;
    const id = user?.avatar;
    return typeof id === 'string' && /^[a-f0-9]{16,64}$/i.test(id) ? 'https://sleepercdn.com/avatars/thumbs/' + id : null;
  }
  function read() {
    if (cache) return cache;
    try { cache = JSON.parse(root.localStorage.getItem(KEY) || '{}') || {}; } catch (_) { cache = {}; }
    return cache;
  }
  /** Remember avatars/team names from a current-season Sleeper lookup (roster id -> owner). */
  function learn(users, rosters, lookup) {
    const byUser = Object.fromEntries((users || []).map(u => [String(u.user_id), u]));
    const next = { ...read() };
    for (const r of rosters || []) {
      const ownerId = lookup?.[String(r.roster_id)]?.ownerId, user = byUser[String(r.owner_id)];
      if (!ownerId || !user) continue;
      next[ownerId] = { avatar: avatarUrl(user), team: user.metadata?.team_name || null };
    }
    cache = next;
    try { root.localStorage.setItem(KEY, JSON.stringify(next)); } catch (_) {}
    // Avatars drawn before Sleeper answered get their photo now.
    for (const el of root.document?.querySelectorAll?.('.g-avatar[data-owner]') || []) {
      const src = next[el.dataset.owner]?.avatar;
      if (src && !el.querySelector('img')) el.insertAdjacentHTML('beforeend', '<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async" width="40" height="40">');
    }
    return next;
  }
  function teamName(id) { return read()[id]?.team || data().owners?.[id]?.currentTeamName || ''; }
  function avatarSrc(id) { return read()[id]?.avatar || null; }

  /** Avatar markup: team-coloured ring, initials underneath, photo on top when known. Decorative. */
  function avatar(id, opts = {}) {
    const src = avatarSrc(id), size = opts.size ? ' g-avatar--' + esc(opts.size) : '';
    return '<span class="g-avatar' + size + '" style="--team:' + color(id) + '" data-owner="' + esc(id) + '" aria-hidden="true"><span>' + esc(initials(id)) + '</span>' +
      (src ? '<img src="' + esc(src) + '" alt="" loading="lazy" decoding="async" width="40" height="40">' : '') + '</span>';
  }
  /** Small coloured dot + name, for dense tables. */
  function chip(id, label) { return '<span class="g-team-chip" style="--team:' + color(id) + '"><i aria-hidden="true"></i>' + esc(label ?? name(id)) + '</span>'; }

  const api = { COLORS, color, name, initials, franchiseOf, avatarUrl, learn, teamName, avatarSrc, avatar, chip };
  if (typeof module === 'object' && module.exports) { module.exports = api; return; }
  /** Give existing owner-linked cards (power rankings, weekly awards, playoff seeds) their team colour and avatar. */
  const DECORATE = '.power-row,.x-award,.cte-home-seed,.n-playoff-slot';
  function decorate(scope) {
    for (const el of (scope || root.document).querySelectorAll(DECORATE)) {
      if (el.dataset.gTeam) continue;
      const id = new URLSearchParams((el.getAttribute('href') || '').split('?')[1] || '').get('owner');
      if (!id || !data().owners?.[id]) continue;
      el.dataset.gTeam = id; el.style.setProperty('--team', color(id));
      const anchor = el.matches('.power-row') ? el.querySelector('.rank-main') : el.querySelector('strong');
      if (anchor) anchor.insertAdjacentHTML(el.matches('.power-row') ? 'beforebegin' : 'afterbegin', avatar(id, { size: el.matches('.power-row') ? '' : 'sm' }));
      const move = el.querySelector('.rank-grade');
      if (move) { const t = move.textContent.trim(); move.classList.add(t.startsWith('↑') ? 'is-up' : t.startsWith('↓') ? 'is-down' : 'is-flat'); if (t.startsWith('↑') || t.startsWith('↓')) move.setAttribute('aria-label', (t.startsWith('↑') ? 'Up ' : 'Down ') + t.slice(1).trim()); else move.setAttribute('aria-label', 'No change'); }
    }
  }
  api.decorate = decorate;
  root.CTE_Teams = api;
  if (root.document && root.MutationObserver) {
    let queued = false; const run = () => { queued = false; decorate(); };
    const start = () => { decorate(); new root.MutationObserver(() => { if (!queued) { queued = true; root.requestAnimationFrame(run); } }).observe(root.document.body, { childList: true, subtree: true }); };
    if (root.document.readyState === 'loading') root.document.addEventListener('DOMContentLoaded', start); else start();
  }
  // A broken or blocked image falls back to the initials already underneath it.
  root.document?.addEventListener('error', e => { if (e.target?.matches?.('.g-avatar img')) e.target.remove(); }, true);
})(typeof window === 'undefined' ? globalThis : window);
