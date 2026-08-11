/**
 * CTE League HQ - Sleeper API client
 *
 * Live-data policy:
 * - Every browser PAGE LOAD starts with an empty in-memory cache, so the first
 *   request for each Sleeper endpoint is fresh from Sleeper.
 * - Duplicate requests made by the same page share the same promise/response.
 * - No sessionStorage/localStorage is used for live Sleeper responses, so
 *   navigating/reloading a page does not reuse stale data from an earlier load.
 * - Use { fresh:true } or CTE_Sleeper.refresh() to force another network pull
 *   without reloading the page.
 */
(function () {
  'use strict';

  const BASE_URL = 'https://api.sleeper.app/v1';
  const memory = new Map();
  const inflight = new Map();
  let lastNetworkFetchAt = null;

  function key(path) { return path; }

  async function request(path, options = {}) {
    const fresh = options.fresh === true || options.cache === false;
    const k = key(path);

    if (!fresh && memory.has(k)) return memory.get(k).data;
    if (!fresh && inflight.has(k)) return inflight.get(k);

    const promise = fetch(BASE_URL + path, {
      method: 'GET',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    }).then(async response => {
      if (!response.ok) {
        throw new Error(`Sleeper API ${response.status}: ${response.statusText} (${path})`);
      }
      const data = await response.json();
      const fetchedAt = Date.now();
      lastNetworkFetchAt = fetchedAt;
      memory.set(k, { data, fetchedAt });
      return data;
    }).finally(() => {
      inflight.delete(k);
    });

    inflight.set(k, promise);
    return promise;
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
      memory.clear();
      inflight.clear();
    },

    async refresh(loader) {
      api.clearCache();
      if (typeof loader === 'function') return loader({ fresh: true });
    },

    getLastFetchedAt() { return lastNetworkFetchAt; },
    formatLastFetched() {
      if (!lastNetworkFetchAt) return 'Not updated yet';
      return new Date(lastNetworkFetchAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit', second: '2-digit' });
    }
  };

  window.CTE_Sleeper = api;
})();
