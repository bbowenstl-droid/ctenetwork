/**
 * CTE Network - Sleeper API client v16
 * Core league pages only block on league/users/rosters.
 * Optional data (drafts/traded picks) is fetched only when requested.
 * Every network call has a timeout so one Sleeper endpoint cannot hang a page forever.
 */
(function () {
  'use strict';

  const BASE_URL = 'https://api.sleeper.app/v1';
  const memory = new Map();
  const inflight = new Map();
  let lastNetworkFetchAt = null;
  const DEFAULT_TIMEOUT = 12000;

  async function request(path, options = {}) {
    const fresh = options.fresh === true || options.cache === false;
    const timeoutMs = Number(options.timeoutMs || DEFAULT_TIMEOUT);
    const k = path;

    if (!fresh && memory.has(k)) return memory.get(k).data;
    if (!fresh && inflight.has(k)) return inflight.get(k);

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    const promise = fetch(BASE_URL + path, {
      method: 'GET',
      cache: 'no-store',
      signal: controller.signal
    }).then(async response => {
      if (!response.ok) throw new Error(`Sleeper API ${response.status} (${path})`);
      const data = await response.json();
      const fetchedAt = Date.now();
      lastNetworkFetchAt = fetchedAt;
      memory.set(k, { data, fetchedAt });
      return data;
    }).catch(err => {
      if (err && err.name === 'AbortError') throw new Error(`Sleeper timed out (${path})`);
      throw err;
    }).finally(() => {
      clearTimeout(timer);
      inflight.delete(k);
    });

    inflight.set(k, promise);
    return promise;
  }

  async function optional(promise, fallback) {
    try { return await promise; } catch (_) { return fallback; }
  }

  const api = {
    baseUrl: BASE_URL,
    getLeague(leagueId, options) { return request(`/league/${leagueId}`, options); },
    getUsers(leagueId, options) { return request(`/league/${leagueId}/users`, options); },
    getRosters(leagueId, options) { return request(`/league/${leagueId}/rosters`, options); },
    getMatchups(leagueId, week, options) { return request(`/league/${leagueId}/matchups/${week}`, options); },
    getTransactions(leagueId, week, options) { return request(`/league/${leagueId}/transactions/${week}`, options); },
    getTradedPicks(leagueId, options) { return request(`/league/${leagueId}/traded_picks`, options); },
    getWinnersBracket(leagueId, options) { return request(`/league/${leagueId}/winners_bracket`, options); },
    getLosersBracket(leagueId, options) { return request(`/league/${leagueId}/losers_bracket`, options); },
    getDrafts(leagueId, options) { return request(`/league/${leagueId}/drafts`, options); },
    getDraft(draftId, options) { return request(`/draft/${draftId}`, options); },
    getDraftPicks(draftId, options) { return request(`/draft/${draftId}/picks`, options); },
    getDraftTradedPicks(draftId, options) { return request(`/draft/${draftId}/traded_picks`, options); },

    async getNFLPlayers(options = {}) {
      const storageKey = 'cte_sleeper_nfl_players_v1';
      const maxAge = 24 * 60 * 60 * 1000;
      if (!options.fresh) {
        try {
          const cached = JSON.parse(localStorage.getItem(storageKey) || 'null');
          if (cached?.savedAt && Date.now() - cached.savedAt < maxAge && cached.data) return cached.data;
        } catch (_) {}
      }
      const data = await request('/players/nfl', { fresh: true, timeoutMs: 20000 });
      try { localStorage.setItem(storageKey, JSON.stringify({ savedAt: Date.now(), data })); } catch (_) {}
      return data;
    },

    // Fast snapshot for almost every page. Only essential endpoints can block rendering.
    async getLeagueSnapshot(leagueId, options = {}) {
      const [league, users, rosters] = await Promise.all([
        api.getLeague(leagueId, options),
        api.getUsers(leagueId, options),
        api.getRosters(leagueId, options)
      ]);
      return { league, users, rosters, tradedPicks: [], drafts: [] };
    },

    // Use this only on pages that need the optional league assets.
    async getFullLeagueSnapshot(leagueId, options = {}) {
      const core = await api.getLeagueSnapshot(leagueId, options);
      const [tradedPicks, drafts] = await Promise.all([
        optional(api.getTradedPicks(leagueId, options), []),
        optional(api.getDrafts(leagueId, options), [])
      ]);
      return { ...core, tradedPicks, drafts };
    },

    async getWeek(leagueId, week, options = {}) {
      const [matchups, transactions] = await Promise.all([
        api.getMatchups(leagueId, week, options),
        api.getTransactions(leagueId, week, options)
      ]);
      return { week, matchups, transactions };
    },

    async getWeeks(leagueId, startWeek, endWeek, options = {}) {
      const requests = [];
      for (let week = startWeek; week <= endWeek; week += 1) requests.push(api.getWeek(leagueId, week, options));
      return Promise.all(requests);
    },

    clearCache() { memory.clear(); inflight.clear(); },
    async refresh(loader) { api.clearCache(); if (typeof loader === 'function') return loader({ fresh: true }); },
    getLastFetchedAt() { return lastNetworkFetchAt; },
    formatLastFetched() {
      if (!lastNetworkFetchAt) return 'Not updated yet';
      return new Date(lastNetworkFetchAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    }
  };

  window.CTE_Sleeper = api;
})();
