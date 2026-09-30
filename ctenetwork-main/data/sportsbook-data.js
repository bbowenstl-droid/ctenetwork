/**
 * CTE SPORTSBOOK — market + ledger data.
 *
 * Everything here is fictional entertainment for the CTE league. CTE$ has no
 * cash value. The commissioner edits this file; rendering code never hardcodes
 * a line, a pick or a result.
 *
 * HOW TO UPDATE A WEEK
 * 1. Markets: add one object per matchup to `markets`. `sides` are CTE owner IDs.
 *    Fantasy has no home field, so sides are listed in board order, not home/away.
 * 2. Line moves: append to `market.lineHistory` ({label, at, fav, points}).
 *    The last entry is the current line. Any number of updates is supported.
 * 3. Carl / Holly: add a card under personalities.<id>.cards[<week>]. Stakes must
 *    total that week's starting bankroll exactly (the engine checks and flags it).
 * 4. League challenge: paste each owner's shared entry line into
 *    leagueChallenge.cards[<week>][<ownerId>].
 * 5. Results: leave empty to let Sleeper settle a week once Sleeper advances past
 *    it, or add commissioner-confirmed scores to `results` to override
 *    (use this for stat corrections).
 */
window.CTE_SPORTSBOOK = {
  season: 2026,
  week: 4,
  status: "final_lines",               // "opening_lines" | "final_lines"
  lockAt: "2026-10-01T19:15:00-05:00", // Week 4 Thursday kickoff, Central time
  lockLabel: "Thursday kickoff",
  currency: "CTE$",

  /* Official locked Week 4 final board (commissioner, 2026-09-30).
   * These prices apply to the league challenge and to Carl/Holly tickets. */
  markets: [
    {
      id: "w4-brendan-jacob", week: 4, sides: ["brendan", "jacob"],
      spread: { brendan: { line: 16.5, odds: -105 }, jacob: { line: -16.5, odds: -115 } },
      moneyline: { brendan: 525, jacob: -750 },
      openMoneyline: { brendan: 165, jacob: -200 },
      lineHistory: [
        { label: "Open", at: "2026-09-28", fav: "jacob", points: 12.5 },
        { label: "Final", at: "2026-09-30", fav: "jacob", points: 16.5 }
      ],
      takes: {
        holly: "The commissioner gets the league's loudest scoring machine fresh off another avalanche. Brendan, hosting is charming. Letting Jacob redecorate the scoreboard is not.",
        carl: "Jacob wins. Brendan covers."
      }
    },
    {
      id: "w4-brett-carter", week: 4, sides: ["brett", "carter"],
      spread: { brett: { line: -12.5, odds: -120 }, carter: { line: 12.5, odds: 100 } },
      moneyline: { brett: -475, carter: 350 },
      openMoneyline: { brett: -175, carter: 145 },
      lineHistory: [
        { label: "Open", at: "2026-09-28", fav: "brett", points: 8.5 },
        { label: "Final", at: "2026-09-30", fav: "brett", points: 12.5 }
      ],
      takes: {
        holly: "Brett has the loaded roster; Carter has developed a disturbing habit of keeping emergency points on the bench. Carl made Brett a favorite this week and got burned. The early desk is giving him another chance to touch the stove.",
        carl: null
      }
    },
    {
      id: "w4-mike-jerry", week: 4, sides: ["mike", "jerry"],
      spread: { mike: { line: 14.5, odds: -105 }, jerry: { line: -14.5, odds: -115 } },
      moneyline: { mike: 450, jerry: -625 },
      openMoneyline: { mike: 155, jerry: -190 },
      lineHistory: [
        { label: "Open", at: "2026-09-28", fav: "jerry", points: 10.5 },
        { label: "Final", at: "2026-09-30", fav: "jerry", points: 14.5 }
      ],
      takes: {
        holly: "The league's bad-luck patient meets its quiet record collector. Mike has spent three weeks looking like a man who brought flowers to a funeral and discovered they were for him.",
        carl: null
      }
    },
    {
      id: "w4-dan-isaiah", week: 4, sides: ["dan", "isaiah"],
      spread: { dan: { line: 4.5, odds: -115 }, isaiah: { line: -4.5, odds: -105 } },
      moneyline: { dan: 170, isaiah: -210 },
      openMoneyline: { dan: 130, isaiah: -155 },
      lineHistory: [
        { label: "Open", at: "2026-09-28", fav: "isaiah", points: 6.5 },
        { label: "Final", at: "2026-09-30", fav: "isaiah", points: 4.5 }
      ],
      takes: {
        holly: "Dan's lineup-management probation meets Isaiah's increasingly annoying competence. Six and a half says the market noticed. Dan will say it is disrespect. The board says it has eyes.",
        carl: "Isaiah by ten."
      }
    },
    {
      id: "w4-cotton-troy", week: 4, sides: ["cotton", "troy"],
      spread: { cotton: { line: 9.5, odds: 105 }, troy: { line: -9.5, odds: -125 } },
      moneyline: { cotton: 310, troy: -400 },
      openMoneyline: { cotton: 135, troy: -165 },
      lineHistory: [
        { label: "Open", at: "2026-09-28", fav: "troy", points: 7.5 },
        { label: "Final", at: "2026-09-30", fav: "troy", points: 9.5 }
      ],
      takes: {
        holly: "Gas Station Sushi gets Troy, who may arrive with fresh Hurts momentum and entirely too much confidence. Cotton, I recommend something stronger than gas-station wasabi.",
        carl: "I'm betting on 9.5."
      }
    },
    {
      id: "w4-jesse-elijah", week: 4, sides: ["jesse", "elijah"],
      spread: { jesse: { line: 7.5, odds: -110 }, elijah: { line: -7.5, odds: -110 } },
      moneyline: { jesse: 260, elijah: -325 },
      openMoneyline: { jesse: 120, elijah: -145 },
      lineHistory: [
        { label: "Open", at: "2026-09-28", fav: "elijah", points: 5.5 },
        { label: "Final", at: "2026-09-30", fav: "elijah", points: 7.5 }
      ],
      takes: {
        holly: "Jesse may escape Week 3 with a win; Elijah still carries early-season contender heat even with Jacob currently working him over. Five and a half keeps this one close enough to flirt with and dangerous enough to regret.",
        carl: null
      }
    }
  ],

  // Where the opening numbers and Holly's takes were first published.
  sources: {
    open: { articleId: "2026-week-3-holly-sideline-debut", label: "Holly Woodwork's early-look board, Sept 28" }
  },

  personalities: {
    carl: {
      id: "carl", name: "Concussion Carl", shortName: "Carl", image: "concussion-carl.webp",
      role: "Senior Fantasy Investigative Analyst", startWeek: 4, startingBankroll: 1000,
      // Tickets are graded at the official final board prices (pinned per wager).
      cards: {
        4: { postedAt: "2026-09-30", source: "2026-week-4-bankroll-war", wagers: [
          { market: "w4-brendan-jacob", type: "ml", side: "jacob", odds: -750, stake: 250 },
          { market: "w4-mike-jerry", type: "ml", side: "jerry", odds: -625, stake: 175 },
          { market: "w4-cotton-troy", type: "ml", side: "troy", odds: -400, stake: 150 },
          { market: "w4-dan-isaiah", type: "ats", side: "isaiah", odds: -105, stake: 200, lock: true },
          { market: "w4-brendan-jacob", type: "ats", side: "brendan", odds: -105, stake: 125 },
          { market: "w4-cotton-troy", type: "ats", side: "cotton", odds: 105, stake: 100 }
        ] }
      }
    },
    holly: {
      id: "holly", name: "Holly Woodwork", shortName: "Holly", image: "holly-woodwork.webp",
      role: "Sideline Reporter & League Insider", startWeek: 4, startingBankroll: 1000,
      cards: {
        4: { postedAt: "2026-09-30", source: "2026-week-4-bankroll-war", wagers: [
          { market: "w4-brendan-jacob", type: "ml", side: "jacob", odds: -750, stake: 300 },
          { market: "w4-brett-carter", type: "ml", side: "brett", odds: -475, stake: 175 },
          { market: "w4-jesse-elijah", type: "ml", side: "elijah", odds: -325, stake: 125 },
          { market: "w4-brett-carter", type: "ats", side: "brett", odds: -120, stake: 225, lock: true },
          { market: "w4-dan-isaiah", type: "ats", side: "dan", odds: -115, stake: 100 },
          { market: "w4-cotton-troy", type: "ats", side: "troy", odds: -125, stake: 75 }
        ] }
      }
    }
  },

  // Weekly parlay: separate from the 6-pick card. One per owner per week.
  parlay: { stake: 100, minLegs: 2, maxLegs: 6 },

  leagueChallenge: {
    stake: 100,
    required: { ml: 3, ats: 3 },
    // cards: { 4: { brendan: ["w4-brendan-jacob:ats:brendan", ...six selection ids] } }
    cards: {},
    // parlays: { 4: { brendan: ["w4-...:ml:jacob", "w4-...:ats:troy"] } }  (cloud submissions merge on top)
    parlays: {}
  },

  // Commissioner-confirmed finals. Overrides Sleeper. { "<marketId>": { scores: { ownerId: pts, ownerId: pts } } }
  results: {}
};
