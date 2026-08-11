/**
 * CTE League HQ - Sleeper API client
 * Sleeper's API is read-only and does not require authentication.
 * Docs: https://docs.sleeper.com/
 */
(function () {
  'use strict';

  const BASE_URL = 'https://api.sleeper.app/v1';
  const CACHE_PREFIX = 'cte-sleeper-cache:';
  const DEFAULT_CACHE_MS = 60 * 1000;

  function cacheKey(path) {
    return CACHE_PREFIX + path;
  }

  function getCached(path, maxAgeMs) {
    try {
      const raw = sessionStorage.getItem(cacheKey(path));
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (!parsed || Date.now() - parsed.savedAt > maxAgeMs) return null;
      return parsed.data;
    } catch (_) {
      return null;
    }
  }

  function setCached(path, data) {
    try {
      sessionStorage.setItem(cacheKey(path), JSON.stringify({ savedAt: Date.now(), data }));
    } catch (_) {
      // Caching is optional. Ignore storage failures.
    }
  }

  async function request(path, options = {}) {
    const cacheMs = options.cacheMs ?? DEFAULT_CACHE_MS;
    const useCache = options.cache !== false;

    if (useCache && cacheMs > 0) {
      const cached = getCached(path, cacheMs);
      if (cached !== null) return cached;
    }

    const response = await fetch(BASE_URL + path, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });

    if (!response.ok) {
      throw new Error(`Sleeper API ${response.status}: ${response.statusText} (${path})`);
    }

    const data = await response.json();
    if (useCache && cacheMs > 0) setCached(path, data);
    return data;
  }

  const api = {
    baseUrl: BASE_URL,

    getLeague(leagueId, options) {
      return request(`/league/${leagueId}`, options);
    },

    getUsers(leagueId, options) {
      return request(`/league/${leagueId}/users`, options);
    },

    getRosters(leagueId, options) {
      return request(`/league/${leagueId}/rosters`, options);
    },

    getMatchups(leagueId, week, options) {
      return request(`/league/${leagueId}/matchups/${week}`, options);
    },

    getTransactions(leagueId, week, options) {
      return request(`/league/${leagueId}/transactions/${week}`, options);
    },

    getTradedPicks(leagueId, options) {
      return request(`/league/${leagueId}/traded_picks`, options);
    },

    getWinnersBracket(leagueId, options) {
      return request(`/league/${leagueId}/winners_bracket`, options);
    },

    getLosersBracket(leagueId, options) {
      return request(`/league/${leagueId}/losers_bracket`, options);
    },

    getDrafts(leagueId, options) {
      return request(`/league/${leagueId}/drafts`, options);
    },

    getDraft(draftId, options) {
      return request(`/draft/${draftId}`, options);
    },

    getDraftPicks(draftId, options) {
      return request(`/draft/${draftId}/picks`, options);
    },

    getDraftTradedPicks(draftId, options) {
      return request(`/draft/${draftId}/traded_picks`, options);
    },

    async getLeagueSnapshot(leagueId, options = {}) {
      const [league, users, rosters, tradedPicks, drafts] = await Promise.all([
        api.getLeague(leagueId, options),
        api.getUsers(leagueId, options),
        api.getRosters(leagueId, options),
        api.getTradedPicks(leagueId, options),
        api.getDrafts(leagueId, options)
      ]);
      return { league, users, rosters, tradedPicks, drafts };
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
      for (let week = startWeek; week <= endWeek; week += 1) {
        requests.push(api.getWeek(leagueId, week, options));
      }
      return Promise.all(requests);
    },

    clearCache() {
      try {
        Object.keys(sessionStorage)
          .filter(key => key.startsWith(CACHE_PREFIX))
          .forEach(key => sessionStorage.removeItem(key));
      } catch (_) {}
    }
  };

  window.CTE_Sleeper = api;
})();
