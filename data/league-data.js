/**
 * CTE League HQ - master league configuration
 *
 * IMPORTANT:
 * - Owner IDs are the permanent historical identity.
 * - Sleeper team names are display-only and may change at any time.
 * - Sleeper roster/user mappings will be added separately per season.
 * - This file is for CTE-specific history/configuration that Sleeper does not own.
 */
window.CTE_LEAGUE_DATA = {
  league: {
    id: "cte",
    name: "CTE League",
    established: 2025,
    currentSeason: 2026,
    teamCount: 12,
    seasons: {
      2025: {
        yearNumber: 1,
        sleeperLeagueId: "1255586541745475584",
        status: "complete",
        sleeperUserMap: {},
        championOwnerId: "brendan",
        runnerUpOwnerId: "jacob"
      },
      2026: {
        yearNumber: 2,
        sleeperLeagueId: "1312109948305436672",
        status: "current",
        sleeperUserMap: {}
      }
    }
  },

  divisions: {
    north: { id: "north", name: "CTE North" },
    south: { id: "south", name: "CTE South" },
    central: { id: "central", name: "CTE Central" },
    littleBabies: { id: "littleBabies", name: "Little Babies" }
  },

  owners: {
    brendan: {
      id: "brendan",
      name: "Brendan",
      status: "active",
      joined: { season: 2025, week: 1 },
      currentDivisionId: "north",
      currentTeamName: "Flowers on your Grave"
    },
    troy: {
      id: "troy",
      name: "Troy",
      status: "active",
      joined: { season: 2025, week: 1 },
      currentDivisionId: "north",
      currentTeamName: "Hurts to be You"
    },
    mike: {
      id: "mike",
      name: "Mike",
      status: "active",
      joined: { season: 2025, week: 1 },
      currentDivisionId: "north",
      currentTeamName: "KuppofGoffee"
    },
    elijah: {
      id: "elijah",
      name: "Elijah",
      status: "active",
      joined: { season: 2025, week: 1 },
      currentDivisionId: "littleBabies",
      currentTeamName: "Ej da best #0"
    },
    isaiah: {
      id: "isaiah",
      name: "Isaiah",
      status: "active",
      joined: { season: 2025, week: 4 },
      currentDivisionId: "littleBabies",
      currentTeamName: "Elijah Has No Rizz",
      tookOverFromOwnerId: "jeremy"
    },
    carter: {
      id: "carter",
      name: "Carter",
      status: "active",
      joined: { season: 2026, week: 1 },
      currentDivisionId: "littleBabies",
      currentTeamName: "If the price is right",
      tookOverFromOwnerId: "tyler"
    },
    jerry: {
      id: "jerry",
      name: "Jerry",
      status: "active",
      joined: { season: 2025, week: 1 },
      currentDivisionId: "south",
      currentTeamName: "Hulkamania Running Wild"
    },
    dan: {
      id: "dan",
      name: "Dan",
      status: "active",
      joined: { season: 2025, week: 1 },
      currentDivisionId: "south",
      currentTeamName: "DrummaDan"
    },
    cotton: {
      id: "cotton",
      name: "Cotton",
      status: "active",
      joined: { season: 2025, week: 1 },
      currentDivisionId: "south",
      currentTeamName: "Gas Station Sushi"
    },
    brett: {
      id: "brett",
      name: "Brett",
      status: "active",
      joined: { season: 2025, week: 1 },
      currentDivisionId: "central",
      currentTeamName: "Paint Plug"
    },
    jacob: {
      id: "jacob",
      name: "Jacob",
      status: "active",
      joined: { season: 2025, week: 1 },
      currentDivisionId: "central",
      currentTeamName: "Likely A Dub"
    },
    jesse: {
      id: "jesse",
      name: "Jesse",
      status: "active",
      joined: { season: 2025, week: 1 },
      currentDivisionId: "central",
      currentTeamName: "On Burrowed Time"
    },

    // Former owners remain in the database so historical owner stats stay accurate.
    jeremy: {
      id: "jeremy",
      name: "Jeremy",
      status: "former",
      joined: { season: 2025, week: 1 },
      left: { season: 2025, week: 3 },
      replacedByOwnerId: "isaiah"
    },
    tyler: {
      id: "tyler",
      name: "Tyler",
      status: "former",
      joined: { season: 2025, week: 1 },
      left: { season: 2025, afterSeason: true },
      replacedByOwnerId: "carter"
    }
  },

  // Explicit ownership periods make it possible to attribute historical games
  // to the correct PERSON even when a Sleeper roster changes hands.
  ownershipPeriods: [
    { ownerId: "jeremy", start: { season: 2025, week: 1 }, end: { season: 2025, week: 3 } },
    { ownerId: "isaiah", start: { season: 2025, week: 4 }, end: null },
    { ownerId: "tyler", start: { season: 2025, week: 1 }, end: { season: 2025, afterSeason: true } },
    { ownerId: "carter", start: { season: 2026, week: 1 }, end: null }
  ],

  championships: [
    {
      season: 2025,
      championOwnerId: "brendan",
      runnerUpOwnerId: "jacob"
    }
  ]
};
