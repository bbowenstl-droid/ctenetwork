/**
 * CTE League HQ - owner/season mapping helpers.
 * This layer translates Sleeper roster/user IDs into permanent CTE owner IDs.
 */
(function () {
  'use strict';

  function normalize(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '')
      .trim();
  }

  function activeOwners() {
    const data = window.CTE_LEAGUE_DATA;
    if (!data) throw new Error('CTE_LEAGUE_DATA has not loaded.');
    return Object.values(data.owners).filter(owner => owner.status === 'active');
  }

  function seasonConfig(season) {
    const data = window.CTE_LEAGUE_DATA;
    return data?.league?.seasons?.[season] || null;
  }

  function ownerForHistoricalWeek(ownerId, season, week) {
    // Special ownership transitions recorded by CTE history.
    if (season === 2025 && ownerId === 'isaiah' && Number(week) < 4) return 'jeremy';
    if (season === 2025 && ownerId === 'carter') return 'tyler';
    return ownerId;
  }

  /**
   * Best-effort helper for setup only. Permanent mappings should ultimately be
   * saved by Sleeper user_id in league-data.js once confirmed.
   */
  function suggestOwnerForUser(user) {
    const owners = activeOwners();
    const candidates = [
      user?.metadata?.team_name,
      user?.display_name,
      user?.username
    ].filter(Boolean).map(normalize);

    let best = null;
    for (const owner of owners) {
      const ownerValues = [owner.name, owner.currentTeamName].filter(Boolean).map(normalize);
      const exact = candidates.some(candidate => ownerValues.includes(candidate));
      if (exact) return { ownerId: owner.id, confidence: 'high' };

      const fuzzy = candidates.some(candidate => ownerValues.some(v =>
        candidate && v && (candidate.includes(v) || v.includes(candidate))
      ));
      if (fuzzy && !best) best = { ownerId: owner.id, confidence: 'medium' };
    }
    return best;
  }

  function buildRosterLookup(users, rosters, manualUserMap = {}) {
    const userById = Object.fromEntries((users || []).map(u => [String(u.user_id), u]));
    const result = {};

    for (const roster of rosters || []) {
      const userId = String(roster.owner_id || '');
      const user = userById[userId];
      const manualOwnerId = manualUserMap[userId];
      const suggestion = manualOwnerId
        ? { ownerId: manualOwnerId, confidence: 'confirmed' }
        : suggestOwnerForUser(user);

      result[String(roster.roster_id)] = {
        rosterId: roster.roster_id,
        sleeperUserId: userId || null,
        sleeperDisplayName: user?.display_name || user?.username || null,
        sleeperTeamName: user?.metadata?.team_name || null,
        ownerId: suggestion?.ownerId || null,
        confidence: suggestion?.confidence || 'unmatched'
      };
    }
    return result;
  }

  function groupMatchups(matchups) {
    const groups = new Map();
    for (const row of matchups || []) {
      if (row.matchup_id == null) continue;
      const key = String(row.matchup_id);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(row);
    }
    return [...groups.values()];
  }

  function resolveGames(matchups, rosterLookup, season, week) {
    const games = [];
    for (const pair of groupMatchups(matchups)) {
      if (pair.length !== 2) continue;
      const [a, b] = pair;
      const aMap = rosterLookup[String(a.roster_id)];
      const bMap = rosterLookup[String(b.roster_id)];
      if (!aMap?.ownerId || !bMap?.ownerId) continue;

      const ownerA = ownerForHistoricalWeek(aMap.ownerId, Number(season), Number(week));
      const ownerB = ownerForHistoricalWeek(bMap.ownerId, Number(season), Number(week));
      const scoreA = Number(a.points || 0);
      const scoreB = Number(b.points || 0);

      games.push({
        season: Number(season),
        week: Number(week),
        matchupId: a.matchup_id,
        ownerA,
        ownerB,
        scoreA,
        scoreB,
        winnerOwnerId: scoreA === scoreB ? null : (scoreA > scoreB ? ownerA : ownerB),
        loserOwnerId: scoreA === scoreB ? null : (scoreA > scoreB ? ownerB : ownerA),
        margin: Math.abs(scoreA - scoreB)
      });
    }
    return games;
  }

  window.CTE_LeagueEngine = {
    normalize,
    activeOwners,
    seasonConfig,
    ownerForHistoricalWeek,
    suggestOwnerForUser,
    buildRosterLookup,
    groupMatchups,
    resolveGames
  };
})();
