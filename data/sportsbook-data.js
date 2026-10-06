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
 * 3. Carl / Anita: add a card under personalities.<id>.cards[<week>]. Stakes must
 *    total that week's starting bankroll exactly (the engine checks and flags it).
 * 4. League challenge: paste each owner's shared entry line into
 *    leagueChallenge.cards[<week>][<ownerId>].
 * 5. Results: leave empty to let Sleeper settle a week once Sleeper advances past
 *    it, or add commissioner-confirmed scores to `results` to override
 *    (use this for stat corrections).
 */
window.CTE_SPORTSBOOK = {
  season: 2026,
  week: 5,
  status: "opening_lines",               // "opening_lines" | "final_lines"
  lockAt: "2026-10-08T19:15:00-05:00", // Week 5 Thursday kickoff, Central time
  lockLabel: "Thursday kickoff",
  currency: "CTE$",
  updatedAt: "2026-10-06T17:45:00-05:00",
  quoteNote: "Week 5 provisional opening board, carried forward from the October 6 opening-line draft. Fictional CTE estimates, not provider projections. All spreads -110 both ways. Injury availability, bye replacements and final lineups require review before final lines. Week 4 tickets retain their posted terms.",

  /* Approved Thursday Week 4 board. Prices are fictional estimates, not
   * provider projections. previousQuote preserves pre-update submissions. */
  markets: [
    {
      "id": "w5-brendan-brett",
      "week": 5,
      "sides": [
        "brendan",
        "brett"
      ],
      "spread": {
        "brendan": {
          "line": -2.5,
          "odds": -110
        },
        "brett": {
          "line": 2.5,
          "odds": -110
        }
      },
      "moneyline": {
        "brendan": -135,
        "brett": 115
      },
      "openMoneyline": {
        "brendan": -135,
        "brett": 115
      },
      "lineHistory": [
        {
          "label": "Open",
          "at": "2026-10-06",
          "fav": "brendan",
          "points": 2.5
        }
      ],
      "assumptions": "Provisional opening quote. Brett's Justin Jefferson availability and final lineup need review.",
      "takes": {
        "holly": null,
        "carl": null
      }
    },
    {
      "id": "w5-jacob-jesse",
      "week": 5,
      "sides": [
        "jacob",
        "jesse"
      ],
      "spread": {
        "jacob": {
          "line": -35.5,
          "odds": -110
        },
        "jesse": {
          "line": 35.5,
          "odds": -110
        }
      },
      "moneyline": {
        "jacob": -500,
        "jesse": 360
      },
      "openMoneyline": {
        "jacob": -500,
        "jesse": 360
      },
      "lineHistory": [
        {
          "label": "Open",
          "at": "2026-10-06",
          "fav": "jacob",
          "points": 35.5
        }
      ],
      "assumptions": "Provisional opening quote. Jesse's Saquon Barkley availability needs review; no healthy-starter assumption is guaranteed.",
      "takes": {
        "holly": null,
        "carl": null
      }
    },
    {
      "id": "w5-troy-mike",
      "week": 5,
      "sides": [
        "troy",
        "mike"
      ],
      "spread": {
        "troy": {
          "line": -18.5,
          "odds": -110
        },
        "mike": {
          "line": 18.5,
          "odds": -110
        }
      },
      "moneyline": {
        "troy": -260,
        "mike": 210
      },
      "openMoneyline": {
        "troy": -260,
        "mike": 210
      },
      "lineHistory": [
        {
          "label": "Open",
          "at": "2026-10-06",
          "fav": "troy",
          "points": 18.5
        }
      ],
      "assumptions": "Provisional opening quote. Troy's Tee Higgins availability and Chiefs bye replacements need review.",
      "takes": {
        "holly": null,
        "carl": null
      }
    },
    {
      "id": "w5-dan-carter",
      "week": 5,
      "sides": [
        "dan",
        "carter"
      ],
      "spread": {
        "dan": {
          "line": -8.5,
          "odds": -110
        },
        "carter": {
          "line": 8.5,
          "odds": -110
        }
      },
      "moneyline": {
        "dan": -170,
        "carter": 145
      },
      "openMoneyline": {
        "dan": -170,
        "carter": 145
      },
      "lineHistory": [
        {
          "label": "Open",
          "at": "2026-10-06",
          "fav": "dan",
          "points": 8.5
        }
      ],
      "assumptions": "Provisional opening quote. Carter's Chiefs and Panthers bye replacements need review.",
      "takes": {
        "holly": null,
        "carl": null
      }
    },
    {
      "id": "w5-isaiah-cotton",
      "week": 5,
      "sides": [
        "isaiah",
        "cotton"
      ],
      "spread": {
        "isaiah": {
          "line": -6.5,
          "odds": -110
        },
        "cotton": {
          "line": 6.5,
          "odds": -110
        }
      },
      "moneyline": {
        "isaiah": -155,
        "cotton": 130
      },
      "openMoneyline": {
        "isaiah": -155,
        "cotton": 130
      },
      "lineHistory": [
        {
          "label": "Open",
          "at": "2026-10-06",
          "fav": "isaiah",
          "points": 6.5
        }
      ],
      "assumptions": "Provisional opening quote. Isaiah's Ja'Marr Chase availability needs review.",
      "takes": {
        "holly": null,
        "carl": null
      }
    },
    {
      "id": "w5-jerry-elijah",
      "week": 5,
      "sides": [
        "jerry",
        "elijah"
      ],
      "spread": {
        "jerry": {
          "line": -9.5,
          "odds": -110
        },
        "elijah": {
          "line": 9.5,
          "odds": -110
        }
      },
      "moneyline": {
        "jerry": -180,
        "elijah": 155
      },
      "openMoneyline": {
        "jerry": -180,
        "elijah": 155
      },
      "lineHistory": [
        {
          "label": "Open",
          "at": "2026-10-06",
          "fav": "jerry",
          "points": 9.5
        }
      ],
      "assumptions": "Provisional opening quote. Elijah's Lamar Jackson availability and Jerry's Chiefs bye replacements need review.",
      "takes": {
        "holly": null,
        "carl": null
      }
    },

    {
      id: "w4-brendan-jacob", week: 4, sides: ["brendan", "jacob"],
      spread: { brendan: { line: 28.5, odds: -110 }, jacob: { line: -28.5, odds: -110 } },
      moneyline: { brendan: 340, jacob: -435 },
      previousQuote: { before: "2026-10-01T08:32:01-05:00", spread: { brendan: { line: 16.5, odds: -105 }, jacob: { line: -16.5, odds: -115 } }, moneyline: { brendan: 525, jacob: -750 } },
      openMoneyline: { brendan: 165, jacob: -200 },
      lineHistory: [
        { label: "Open", at: "2026-09-28", fav: "jacob", points: 12.5 },
        { label: "Wednesday", at: "2026-09-30", fav: "jacob", points: 16.5 },
        { label: "Thursday update", at: "2026-10-01", fav: "jacob", points: 28.5 }
      ],
      takes: {
        holly: "The commissioner gets the league's loudest scoring machine fresh off another avalanche. Brendan, hosting is charming. Letting Jacob redecorate the scoreboard is not.",
        carl: "Jacob wins. Brendan covers."
      }
    },
    {
      id: "w4-brett-carter", week: 4, sides: ["brett", "carter"],
      spread: { brett: { line: -11.5, odds: -110 }, carter: { line: 11.5, odds: -110 } },
      moneyline: { brett: -185, carter: 155 },
      previousQuote: { before: "2026-10-01T08:32:01-05:00", spread: { brett: { line: -12.5, odds: -120 }, carter: { line: 12.5, odds: 100 } }, moneyline: { brett: -475, carter: 350 } },
      openMoneyline: { brett: -175, carter: 145 },
      lineHistory: [
        { label: "Open", at: "2026-09-28", fav: "brett", points: 8.5 },
        { label: "Wednesday", at: "2026-09-30", fav: "brett", points: 12.5 },
        { label: "Thursday update", at: "2026-10-01", fav: "brett", points: 11.5 }
      ],
      takes: {
        holly: "Brett has the loaded roster; Carter has developed a disturbing habit of keeping emergency points on the bench. Carl made Brett a favorite this week and got burned. The early desk is giving him another chance to touch the stove.",
        carl: null
      }
    },
    {
      id: "w4-mike-jerry", week: 4, sides: ["mike", "jerry"],
      spread: { mike: { line: 31.5, odds: -110 }, jerry: { line: -31.5, odds: -110 } },
      moneyline: { mike: 390, jerry: -510 },
      previousQuote: { before: "2026-10-01T08:32:01-05:00", spread: { mike: { line: 14.5, odds: -105 }, jerry: { line: -14.5, odds: -115 } }, moneyline: { mike: 450, jerry: -625 } },
      openMoneyline: { mike: 155, jerry: -190 },
      lineHistory: [
        { label: "Open", at: "2026-09-28", fav: "jerry", points: 10.5 },
        { label: "Wednesday", at: "2026-09-30", fav: "jerry", points: 14.5 },
        { label: "Thursday update", at: "2026-10-01", fav: "jerry", points: 31.5 }
      ],
      takes: {
        holly: "The league's bad-luck patient meets its quiet record collector. Mike has spent three weeks looking like a man who brought flowers to a funeral and discovered they were for him.",
        carl: null
      }
    },
    {
      id: "w4-dan-isaiah", week: 4, sides: ["dan", "isaiah"],
      spread: { dan: { line: 8.5, odds: -110 }, isaiah: { line: -8.5, odds: -110 } },
      moneyline: { dan: 135, isaiah: -160 },
      previousQuote: { before: "2026-10-01T08:32:01-05:00", spread: { dan: { line: 4.5, odds: -115 }, isaiah: { line: -4.5, odds: -105 } }, moneyline: { dan: 170, isaiah: -210 } },
      openMoneyline: { dan: 130, isaiah: -155 },
      lineHistory: [
        { label: "Open", at: "2026-09-28", fav: "isaiah", points: 6.5 },
        { label: "Wednesday", at: "2026-09-30", fav: "isaiah", points: 4.5 },
        { label: "Thursday update", at: "2026-10-01", fav: "isaiah", points: 8.5 }
      ],
      takes: {
        holly: "Isaiah averages 122.89 to Dan's 107.91. Eight and a half is the final quote, and my Dan ticket gets the new cushion. Read the receipt, darling.",
        carl: "Isaiah by ten."
      }
    },
    {
      id: "w4-cotton-troy", week: 4, sides: ["cotton", "troy"],
      spread: { cotton: { line: 17.5, odds: -110 }, troy: { line: -17.5, odds: -110 } },
      moneyline: { cotton: 205, troy: -245 },
      assumptions: "Kamara replaces Etienne; Puka replaces Deebo. Assumed changes, not a verified lineup; conditional on Puka playing.",
      previousQuote: { before: "2026-10-01T08:32:01-05:00", spread: { cotton: { line: 9.5, odds: 105 }, troy: { line: -9.5, odds: -125 } }, moneyline: { cotton: 310, troy: -400 } },
      openMoneyline: { cotton: 135, troy: -165 },
      lineHistory: [
        { label: "Open", at: "2026-09-28", fav: "troy", points: 7.5 },
        { label: "Wednesday", at: "2026-09-30", fav: "troy", points: 9.5 },
        { label: "Thursday update", at: "2026-10-01", fav: "troy", points: 17.5 }
      ],
      takes: {
        holly: "Gas Station Sushi gets Troy, who may arrive with fresh Hurts momentum and entirely too much confidence. Cotton, I recommend something stronger than gas-station wasabi.",
        carl: "I'm betting on 17.5."
      }
    },
    {
      id: "w4-jesse-elijah", week: 4, sides: ["jesse", "elijah"],
      spread: { jesse: { line: 17.5, odds: -110 }, elijah: { line: -17.5, odds: -110 } },
      moneyline: { jesse: 205, elijah: -245 },
      previousQuote: { before: "2026-10-01T08:32:01-05:00", spread: { jesse: { line: 7.5, odds: -110 }, elijah: { line: -7.5, odds: -110 } }, moneyline: { jesse: 260, elijah: -325 } },
      openMoneyline: { jesse: 120, elijah: -145 },
      lineHistory: [
        { label: "Open", at: "2026-09-28", fav: "elijah", points: 5.5 },
        { label: "Wednesday", at: "2026-09-30", fav: "elijah", points: 7.5 },
        { label: "Thursday update", at: "2026-10-01", fav: "elijah", points: 17.5 }
      ],
      takes: {
        holly: "Elijah averages 134.23 to Jesse's 108.25. Jesse's scoring is climbing, but seventeen and a half reflects the current lineup comparison, not another free pass for last week's result.",
        carl: null
      }
    }
  ],

  // Where the opening numbers and Anita's takes were first published.
  sources: {
    open: { articleId: "2026-week-3-holly-sideline-debut", label: "Anita Headcheck's early-look board, Sept 28" }
  },

  personalities: {
    carl: {
      id: "carl", name: "Concussion Carl", shortName: "Carl", image: "concussion-carl.webp",
      role: "Senior Fantasy Investigative Analyst", startWeek: 4, startingBankroll: 1000,
      // Tickets are graded at the official final board prices (pinned per wager).
      cards: {
        4: { postedAt: "2026-09-30", updatedAt: "2026-10-01T08:35:57-05:00", repricedByCommissioner: true, source: "2026-week-4-bankroll-war", wagers: [
          { market: "w4-brendan-jacob", type: "ml", side: "jacob", odds: -435, stake: 250 },
          { market: "w4-mike-jerry", type: "ml", side: "jerry", odds: -510, stake: 175 },
          { market: "w4-cotton-troy", type: "ml", side: "troy", odds: -245, stake: 150 },
          { market: "w4-dan-isaiah", type: "ats", side: "isaiah", line: -8.5, odds: -110, stake: 200, lock: true },
          { market: "w4-brendan-jacob", type: "ats", side: "brendan", line: 28.5, odds: -110, stake: 125 },
          { market: "w4-cotton-troy", type: "ats", side: "cotton", line: 17.5, odds: -110, stake: 100 }
        ] }
      }
    },
    holly: {
      id: "holly", name: "Anita Headcheck", shortName: "Anita", image: "anita-headcheck.webp",
      role: "Sideline Reporter & League Insider", startWeek: 4, startingBankroll: 1000,
      cards: {
        4: { postedAt: "2026-09-30", updatedAt: "2026-10-01T08:35:57-05:00", repricedByCommissioner: true, source: "2026-week-4-bankroll-war", wagers: [
          { market: "w4-brendan-jacob", type: "ml", side: "jacob", odds: -435, stake: 300 },
          { market: "w4-brett-carter", type: "ml", side: "brett", odds: -185, stake: 175 },
          { market: "w4-jesse-elijah", type: "ml", side: "elijah", odds: -245, stake: 125 },
          { market: "w4-brett-carter", type: "ats", side: "brett", line: -11.5, odds: -110, stake: 225, lock: true },
          { market: "w4-dan-isaiah", type: "ats", side: "dan", line: 8.5, odds: -110, stake: 100 },
          { market: "w4-cotton-troy", type: "ats", side: "troy", line: -17.5, odds: -110, stake: 75 }
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
  results: {
    "w4-brendan-jacob": {
      "scores": {
        "brendan": 163.62,
        "jacob": 205.92
      }
    },
    "w4-brett-carter": {
      "scores": {
        "brett": 125.66,
        "carter": 95.2
      }
    },
    "w4-mike-jerry": {
      "scores": {
        "mike": 106.18,
        "jerry": 142.36
      }
    },
    "w4-dan-isaiah": {
      "scores": {
        "dan": 138.08,
        "isaiah": 138.78
      }
    },
    "w4-cotton-troy": {
      "scores": {
        "cotton": 136.28,
        "troy": 148.62
      }
    },
    "w4-jesse-elijah": {
      "scores": {
        "jesse": 95.42,
        "elijah": 90.38
      }
    }
  }
};
