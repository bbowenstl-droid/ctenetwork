/* CTE League key dates — reviewed configuration.
 * Only facts with a source are recorded here. A date that is not known yet
 * (for example the next rookie draft) is left out, never estimated.
 * After editing, rebuild the subscribable file:  node tools/build-calendar.cjs
 */
(function (root) {
  const config = {
    timezone: 'America/Chicago',
    updated: '2026-11-16',
    seasons: {
      2026: {
        // NFL calendar: Week 1 opened Wed Sep 9, 2026; Week N Sunday = week1Sunday + 7·(N−1).
        // Cross-checked against the sportsbook's recorded Week 7 lock (Sun Oct 25, 2026).
        nflKickoff: '2026-09-09',
        week1Sunday: '2026-09-13',
        // Sleeper draft 1312109948309614592 start_time 2026-08-02T01:31Z = Sat Aug 1, 8:31 PM Central.
        rookieDraft: '2026-08-01',
        // Recorded copy of the Sleeper league settings used when Sleeper is unreachable
        // and for the static .ics. The calendar page re-reads them live.
        settings: { trade_deadline: 11, playoff_week_start: 15, playoff_teams: 6, playoff_round_type: 0 }
      }
    }
  };
  if (typeof module === 'object' && module.exports) module.exports = config; else root.CTE_CALENDAR = config;
})(typeof window === 'undefined' ? globalThis : window);
