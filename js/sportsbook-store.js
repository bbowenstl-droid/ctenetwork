/**
 * CTE SPORTSBOOK — persistence layer.
 *
 * WHY THIS IS DEVICE-ONLY TODAY
 * CTE Network is static GitHub Pages. The only backend is Firebase with
 * *anonymous* auth, which proves "some browser" — not "Jacob". Writing picks
 * there would let anyone submit or overwrite anyone's card, so this layer never
 * pretends a card reached the league. Cards are saved on this device and shared
 * to the group chat as an entry line the commissioner pastes into
 * data/sportsbook-data.js (leagueChallenge.cards).
 *
 * TO GO MULTI-USER, implement the same four methods against a backend that knows
 * who the owner is, then call CTE_BookStore.use(adapter). Recommended: Firebase
 * email-link sign-in + Realtime Database rules that map each owner's email to
 * their owner ID and reject writes after lockAt. See SPORTSBOOK.md.
 *
 * Adapter contract (all async):
 *   getDraft(week)            -> { ownerId, ids } | null
 *   saveDraft(week, draft)    -> void
 *   getCard(week)             -> { ownerId, ids, lockedAt, storage } | null
 *   lockCard(week, card)      -> { ownerId, ids, lockedAt, storage }
 *   unlockCard(week)          -> void   (only before the deadline)
 */
(function () {
  'use strict';
  const PREFIX = 'cte_book_v1';
  const read = key => { try { return JSON.parse(localStorage.getItem(key) || 'null'); } catch (_) { return null; } };
  const write = (key, value) => { try { localStorage.setItem(key, JSON.stringify(value)); return true; } catch (_) { return false; } };
  const remove = key => { try { localStorage.removeItem(key); } catch (_) {} };

  const deviceAdapter = {
    storage: 'device',
    async getDraft(week) { return read(`${PREFIX}:draft:${week}`); },
    async saveDraft(week, draft) { write(`${PREFIX}:draft:${week}`, { ownerId: draft.ownerId || null, ids: draft.ids || [] }); },
    async getCard(week) { return read(`${PREFIX}:card:${week}`); },
    async lockCard(week, card) {
      const saved = { ownerId: card.ownerId, ids: card.ids.slice(), lockedAt: card.lockedAt || new Date().toISOString(), storage: card.storage || 'device' };
      if (card.quotes) saved.quotes = card.quotes;
      if (!write(`${PREFIX}:card:${week}`, saved)) throw new Error('This browser blocked saving. Share the card before leaving the page.');
      return saved;
    },
    async unlockCard(week) { remove(`${PREFIX}:card:${week}`); },
    async getParlayDraft(week) { return read(`${PREFIX}:pdraft:${week}`); },
    async saveParlayDraft(week, draft) { write(`${PREFIX}:pdraft:${week}`, { ids: draft.ids || [] }); },
    async getParlay(week) { return read(`${PREFIX}:parlay:${week}`); },
    async lockParlay(week, p) {
      const saved = { ownerId: p.ownerId, ids: p.ids.slice(), lockedAt: p.lockedAt || new Date().toISOString(), storage: p.storage || 'device' };
      if (p.quotes) saved.quotes = p.quotes;
      if (!write(`${PREFIX}:parlay:${week}`, saved)) throw new Error('This browser blocked saving. Share the parlay before leaving the page.');
      return saved;
    },
    async unlockParlay(week) { remove(`${PREFIX}:parlay:${week}`); }
  };

  let adapter = deviceAdapter;
  window.CTE_BookStore = {
    get storage() { return adapter.storage; },
    use(next) { adapter = next; },
    getDraft: w => adapter.getDraft(w),
    saveDraft: (w, d) => adapter.saveDraft(w, d),
    getCard: w => adapter.getCard(w),
    lockCard: (w, c) => adapter.lockCard(w, c),
    unlockCard: w => adapter.unlockCard(w),
    getParlayDraft: w => adapter.getParlayDraft(w),
    saveParlayDraft: (w, d) => adapter.saveParlayDraft(w, d),
    getParlay: w => adapter.getParlay(w),
    lockParlay: (w, p) => adapter.lockParlay(w, p),
    unlockParlay: w => adapter.unlockParlay(w),
    // Viewer preference only (whose card this device builds). Not identity.
    getOwner() { return read(`${PREFIX}:owner`); },
    setOwner(id) { write(`${PREFIX}:owner`, id); }
  };
})();
