/* CTE State of the Union — pure league-history engine.
 * No DOM, no network. Input: trimmed Sleeper responses for every season in the
 * previous_league_id chain plus the site's league config. Output: one model the
 * page renders. Runs unchanged in Node (tests/data/sotu-engine.test.cjs).
 *
 * League rules honoured here (docs/cte-network-2/DECISIONS.md):
 * - A franchise is a Sleeper roster_id and is continuous; a manager is a person.
 *   Jeremy -> Isaiah and Tyler -> Carter are manager changes on one franchise.
 * - League-median results are never counted as head-to-head results.
 * - A standings rank is not a postseason finish; unpaired postseason rows are not games.
 * - Only weeks the provider has finished scoring are counted.
 */
(function (root) {
  'use strict';

  const num = v => (Number.isFinite(Number(v)) ? Number(v) : 0);
  const round2 = v => Math.round(v * 100) / 100;
  const score = row => num(row.custom_points != null ? row.custom_points : row.points);
  const pickKey = (season, round, orig) => 'pick:' + season + ':' + round + ':' + orig;
  const ord = n => n + (n % 10 === 1 && n % 100 !== 11 ? 'st' : n % 10 === 2 && n % 100 !== 12 ? 'nd' : n % 10 === 3 && n % 100 !== 13 ? 'rd' : 'th');
  const pct = (w, l, t) => (w + l + t ? (w + t / 2) / (w + l + t) : 0);

  /* ---------- trimming: keep only what the engine reads (cache + snapshot size) ---------- */
  function trim(path, data) {
    if (data == null) return data;
    const pick = (o, keys) => { const out = {}; for (const k of keys) if (o && o[k] !== undefined) out[k] = o[k]; return out; };
    if (/\/matchups\/\d+$/.test(path)) return (data || []).map(r => {
      const pp = {}; for (const [id, v] of Object.entries(r.players_points || {})) if (v) pp[id] = v;
      return { roster_id: r.roster_id, matchup_id: r.matchup_id, points: r.points, custom_points: r.custom_points == null ? undefined : r.custom_points, starters: r.starters || [], players: r.players || [], players_points: pp };
    });
    if (/\/transactions\/\d+$/.test(path)) return (data || []).filter(t => t.status === 'complete').map(t => ({
      type: t.type, status: t.status, transaction_id: t.transaction_id, created: t.created, status_updated: t.status_updated, leg: t.leg,
      adds: t.adds || null, drops: t.drops || null, roster_ids: t.roster_ids || [],
      draft_picks: (t.draft_picks || []).map(p => pick(p, ['season', 'round', 'roster_id', 'owner_id', 'previous_owner_id'])),
      waiver_budget: (t.waiver_budget || []).map(w => pick(w, ['sender', 'receiver', 'amount']))
    }));
    if (/\/users$/.test(path)) return (data || []).map(u => ({ user_id: u.user_id, display_name: u.display_name, metadata: { team_name: u.metadata && u.metadata.team_name } }));
    if (/\/rosters$/.test(path)) return (data || []).map(r => ({ roster_id: r.roster_id, owner_id: r.owner_id, players: r.players || [], settings: pick(r.settings, ['wins', 'losses', 'ties', 'fpts', 'fpts_decimal', 'fpts_against', 'fpts_against_decimal', 'division']) }));
    if (/\/drafts$/.test(path)) return (data || []).map(d => ({ ...pick(d, ['draft_id', 'status', 'type', 'season', 'start_time', 'draft_order', 'slot_to_roster_id']), settings: pick(d.settings, ['rounds', 'teams']) }));
    if (/^\/draft\/[^/]+\/picks$/.test(path)) return (data || []).map(p => ({ ...pick(p, ['pick_no', 'round', 'draft_slot', 'roster_id', 'player_id']), metadata: pick(p.metadata, ['first_name', 'last_name', 'position']) }));
    if (/^\/draft\/[^/]+$/.test(path)) return { ...pick(data, ['draft_id', 'status', 'type', 'season', 'start_time', 'draft_order', 'slot_to_roster_id']), settings: pick(data.settings, ['rounds', 'teams']) };
    if (/^\/league\/[^/]+$/.test(path)) return { ...pick(data, ['league_id', 'name', 'season', 'status', 'previous_league_id']), settings: pick(data.settings, ['leg', 'last_scored_leg', 'playoff_week_start', 'league_average_match', 'playoff_teams', 'draft_rounds', 'num_teams', 'divisions', 'start_week']), metadata: pick(data.metadata, ['division_1', 'division_2', 'division_3', 'division_4', 'latest_league_winner_roster_id']) };
    if (path === '/state/nfl') return pick(data, ['season', 'week', 'leg', 'season_type', 'display_week']);
    return data;
  }

  /* ---------- identity ---------- */
  function identity(config) {
    const owners = (config && config.owners) || {};
    const seasons = (config && config.league && config.league.seasons) || {};
    const years = Object.keys(seasons).map(Number).sort((a, b) => a - b);
    function ownerAt(year, rid, week, fallback) {
      let map = seasons[year] && seasons[year].rosterOwnerMap;
      if (!map && years.length && year > years[years.length - 1]) map = seasons[years[years.length - 1]].rosterOwnerMap; // newer season than config: assume no handoff
      const id = map && map[rid];
      if (!id) return fallback || ('roster' + rid);
      const o = owners[id];
      // A manager who joined mid-season took over from a predecessor: earlier weeks belong to the predecessor.
      if (o && o.tookOverFromOwnerId && o.joined && Number(o.joined.season) === Number(year) && Number(o.joined.week) > 1 && Number(week) < Number(o.joined.week)) return o.tookOverFromOwnerId;
      return id;
    }
    const name = id => (owners[id] && owners[id].name) || String(id);
    return { ownerAt, name, owners };
  }

  /* ---------- main build ---------- */
  function build(input) {
    const config = input.config || {};
    const who = identity(config);
    const names = input.names || {};
    const positions = input.positions || {};
    const issues = [];
    const audit = [];
    const state = input.state || null;

    const S = (input.seasons || []).slice().sort((a, b) => Number(a.league.season) - Number(b.league.season)).map(raw => {
      const lg = raw.league, st = lg.settings || {};
      const year = Number(lg.season);
      const start = Number(st.playoff_week_start || 15);
      const complete = lg.status === 'complete';
      let lastFinal = Number(st.last_scored_leg || 0);
      if (!complete && state && String(state.season) === String(lg.season) && state.season_type === 'regular') {
        const live = Math.max(Number(state.week || 0), Number(state.leg || 0));
        if (live) lastFinal = Math.min(lastFinal, live - 1); // never count the week the NFL is still playing
      }
      const users = Object.fromEntries((raw.users || []).map(u => [u.user_id, u]));
      const teams = {};
      for (const r of raw.rosters || []) {
        const u = users[r.owner_id] || {};
        teams[r.roster_id] = { rid: Number(r.roster_id), userName: u.display_name || '', teamName: ((u.metadata && u.metadata.team_name) || u.display_name || ('Team ' + r.roster_id)).trim(), division: r.settings && r.settings.division, sleeper: r.settings || {}, players: r.players || [] };
      }
      const divisions = {}; for (let i = 1; i <= 8; i++) if (lg.metadata && lg.metadata['division_' + i]) divisions[i] = lg.metadata['division_' + i];
      return { year, leagueId: lg.league_id, status: lg.status, complete, start, lastFinal, median: Number(st.league_average_match) === 1, playoffTeams: Number(st.playoff_teams || 6), rookieRounds: Number(st.draft_rounds || 4), teams, divisions, raw };
    });
    if (!S.length) throw new Error('No seasons supplied');
    const rids = Object.keys(S[S.length - 1].teams).map(Number).sort((a, b) => a - b);
    const latest = S[S.length - 1];
    const pname = id => names[id] || (/^[A-Z]{2,3}$/.test(String(id)) ? id + ' D/ST' : 'Player ' + id);
    const managerAt = (year, rid, week) => who.ownerAt(year, rid, week, (S.find(s => s.year === year) || latest).teams[rid] && (S.find(s => s.year === year) || latest).teams[rid].userName);
    const franchiseLabel = rid => who.name(managerAt(latest.year, rid, 99));

    /* ----- games, standings, player-week index ----- */
    const games = [];
    const playerWeeks = {}; // pid -> [{year, week, rid, pts, started}]
    for (const s of S) {
      const bracketGame = (list, week, a, b) => (list || []).find(m => s.start + Number(m.r) - 1 === week && [Number(m.t1), Number(m.t2)].sort().join() === [a, b].sort().join());
      s.table = {}; for (const rid of Object.keys(s.teams).map(Number)) s.table[rid] = { rid, h2h: [0, 0, 0], med: [0, 0, 0], allPlay: [0, 0, 0], pf: 0, pa: 0, weeks: [] };
      s.finalWeeks = [];
      const lastWeek = s.complete ? Math.max(s.lastFinal, 0) : s.lastFinal;
      for (let week = 1; week <= lastWeek; week++) {
        const rows = (s.raw.matchups && s.raw.matchups[week]) || [];
        if (!rows.length) continue;
        s.finalWeeks.push(week);
        for (const r of rows) {
          const starters = new Set((r.starters || []).map(String));
          const ids = new Set([...Object.keys(r.players_points || {}), ...(r.players || []).map(String)]);
          for (const pid of ids) (playerWeeks[pid] || (playerWeeks[pid] = [])).push({ year: s.year, week, rid: Number(r.roster_id), pts: num((r.players_points || {})[pid]), started: starters.has(pid) });
        }
        const groups = new Map();
        for (const r of rows) if (r.matchup_id != null) { const g = groups.get(r.matchup_id) || []; g.push(r); groups.set(r.matchup_id, g); }
        const regular = week < s.start;
        const scores = rows.map(score).sort((a, b) => a - b);
        const median = scores.length % 2 ? scores[(scores.length - 1) / 2] : (scores[scores.length / 2 - 1] + scores[scores.length / 2]) / 2;
        for (const [mid, pair] of groups) {
          if (pair.length !== 2) { issues.push('Unpaired matchup ' + s.year + '/' + week + '/' + mid); continue; }
          const [x, y] = pair.sort((p, q) => p.roster_id - q.roster_id);
          const a = Number(x.roster_id), b = Number(y.roster_id), sa = score(x), sb = score(y);
          let type = 'regular', place = null, round = null;
          if (!regular) {
            const w = bracketGame(s.raw.winners, week, a, b), l = bracketGame(s.raw.losers, week, a, b);
            if (w) { type = w.p && w.p !== 1 ? 'placement' : 'playoff'; place = w.p || null; round = Number(w.r); }
            else if (l) { type = 'consolation'; place = l.p || null; round = Number(l.r); }
            else type = 'other';
          }
          games.push({ year: s.year, week, mid, type, place, round, a, b, sa, sb, margin: round2(Math.abs(sa - sb)), ma: managerAt(s.year, a, week), mb: managerAt(s.year, b, week) });
          if (regular) for (const [rid, opp, pf, pa] of [[a, b, sa, sb], [b, a, sb, sa]]) {
            const t = s.table[rid]; t.pf += pf; t.pa += pa; t.h2h[pf > pa ? 0 : pf < pa ? 1 : 2]++;
            if (s.median) t.med[pf > median ? 0 : pf < median ? 1 : 2]++;
            for (const o of rows) if (Number(o.roster_id) !== rid) { const q = score(o); t.allPlay[pf > q ? 0 : pf < q ? 1 : 2]++; }
            t.weeks.push({ week, pf, pa, opp, res: pf > pa ? 'W' : pf < pa ? 'L' : 'T', med: s.median ? (pf > median ? 'W' : pf < median ? 'L' : 'T') : null });
          }
        }
      }
      s.regWeeksPlayed = s.finalWeeks.filter(w => w < s.start).length;
      const rows = Object.values(s.table);
      for (const t of rows) {
        t.pf = round2(t.pf); t.pa = round2(t.pa);
        t.w = t.h2h[0] + t.med[0]; t.l = t.h2h[1] + t.med[1]; t.t = t.h2h[2] + t.med[2];
        t.manager = managerAt(s.year, t.rid, 99);
        t.weeks.sort((p, q) => p.week - q.week);
        const g = t.h2h[0] + t.h2h[1] + t.h2h[2];
        t.expected = round2(pct(t.allPlay[0], t.allPlay[1], t.allPlay[2]) * g);
        t.luck = round2(t.h2h[0] + t.h2h[2] / 2 - t.expected);
      }
      rows.sort((p, q) => (q.w + q.t / 2) - (p.w + p.t / 2) || q.pf - p.pf || p.rid - q.rid).forEach((t, i) => { t.rank = i + 1; });
      // Reconcile to the provider's own standings wherever the regular season is over or in step.
      for (const t of rows) {
        const sl = s.teams[t.rid].sleeper;
        if (sl.wins == null) continue;
        const pf = num(sl.fpts) + num(sl.fpts_decimal) / 100;
        const inStep = s.complete || (sl.wins + sl.losses + (sl.ties || 0)) === (t.w + t.l + t.t);
        if (!inStep) { audit.push({ year: s.year, rid: t.rid, ok: null, note: 'provider standings include a week still in progress' }); continue; }
        const ok = sl.wins === t.w && sl.losses === t.l && Math.abs(pf - t.pf) < 0.02;
        audit.push({ year: s.year, rid: t.rid, ok, note: ok ? '' : `engine ${t.w}-${t.l} ${t.pf} vs Sleeper ${sl.wins}-${sl.losses} ${pf}` });
        if (!ok) issues.push(`Standings mismatch ${s.year} roster ${t.rid}`);
      }
    }
    games.sort((p, q) => p.year - q.year || p.week - q.week || p.mid - q.mid);

    /* ----- postseason finishes ----- */
    for (const s of S) {
      const rows = Object.values(s.table).sort((p, q) => p.rank - q.rank);
      const f = s.finish = { complete: s.complete, playoffTeams: [], champion: null, runnerUp: null, third: null, toiletBowl: null, consolationWinner: null };
      f.regularSeason = rows[0] || null; f.lastPlace = rows[rows.length - 1] || null;
      f.pointsLeader = rows.slice().sort((p, q) => q.pf - p.pf)[0] || null;
      if (!s.complete) continue;
      const W = s.raw.winners || [], L = s.raw.losers || [];
      f.playoffTeams = [...new Set(W.flatMap(m => [m.t1, m.t2]).filter(v => typeof v === 'number'))].sort((a, b) => a - b);
      const final = W.find(m => m.p === 1), third = W.find(m => m.p === 3);
      if (final && final.w != null) { f.champion = Number(final.w); f.runnerUp = Number(final.l); }
      if (third && third.w != null) f.third = Number(third.w);
      const top = L.find(m => m.p === 1);
      if (top && top.w != null) {
        const losersAdvance = ['t1_from', 't2_from'].some(k => top[k] && top[k].l != null);
        if (losersAdvance) f.toiletBowl = Number(top.l); // toilet-bowl format: the last game's loser is last
        else {
          f.consolationWinner = Number(top.w); // consolation format: winners advance
          const lastGame = L.filter(m => m.p).sort((p, q) => q.p - p.p)[0];
          if (lastGame && lastGame.l != null) f.toiletBowl = Number(lastGame.l); // last in the consolation bracket
        }
      }
    }

    /* ----- drafts ----- */
    const drafts = [];
    for (const s of S) for (const d of (s.raw.drafts || [])) {
      if (!d.draft || d.draft.status !== 'complete' || !Array.isArray(d.picks) || !d.picks.length) continue;
      const draft = d.draft, roundsN = Number(draft.settings && draft.settings.rounds) || Math.max(...d.picks.map(p => p.round));
      const startup = roundsN > Math.max(6, s.rookieRounds);
      let slotMap = draft.slot_to_roster_id ? { ...draft.slot_to_roster_id } : null;
      if (!slotMap && draft.draft_order) {
        // Derive slot -> original roster from the draft order and that season's roster owners.
        const byUser = {}; for (const r of s.raw.rosters || []) byUser[r.owner_id] = r.roster_id;
        slotMap = {}; for (const [uid, slot] of Object.entries(draft.draft_order)) if (byUser[uid] != null) slotMap[slot] = byUser[uid];
        const teamsN = Number(draft.settings && draft.settings.teams) || Object.keys(s.teams).length;
        const used = new Set(Object.values(slotMap).map(Number));
        const freeRosters = Object.keys(s.teams).map(Number).filter(r => !used.has(r));
        const freeSlots = []; for (let i = 1; i <= teamsN; i++) if (slotMap[i] == null) freeSlots.push(i);
        if (freeSlots.length === 1 && freeRosters.length === 1) slotMap[freeSlots[0]] = freeRosters[0]; // one manager has since left: the leftover roster is theirs
        else if (freeSlots.length) issues.push('Unresolved draft slots ' + s.year);
      }
      const time = Number(draft.start_time) || 0;
      const picks = d.picks.slice().sort((p, q) => p.pick_no - q.pick_no).map(p => {
        const orig = slotMap && slotMap[p.draft_slot] != null ? Number(slotMap[p.draft_slot]) : Number(p.roster_id);
        const pid = String(p.player_id);
        const nm = [p.metadata && p.metadata.first_name, p.metadata && p.metadata.last_name].filter(Boolean).join(' ');
        if (nm && !names[pid]) names[pid] = nm;
        if (p.metadata && p.metadata.position && !positions[pid]) positions[pid] = p.metadata.position;
        return { year: s.year, no: p.pick_no, round: p.round, slot: p.draft_slot, rid: Number(p.roster_id), orig, pid, time: time + p.pick_no, manager: managerAt(s.year, p.roster_id, 0), asset: startup ? null : pickKey(s.year, p.round, orig), startup };
      });
      drafts.push({ year: s.year, id: draft.draft_id, startup, rounds: roundsN, time, picks });
    }
    drafts.sort((p, q) => p.time - q.time);

    /* ----- ledger: every completed transaction as asset events ----- */
    const events = [];
    const trades = [];
    const seen = new Set();
    let txCount = 0;
    for (const s of S) for (const t of (s.raw.transactions || [])) {
      const id = String(t.transaction_id);
      if (seen.has(id) || t.status !== 'complete') continue; seen.add(id); txCount++;
      const time = Number(t.status_updated || t.created) || 0, week = Number(t.leg || 1);
      if (t.type === 'trade') {
        const moves = [];
        for (const [pid, to] of Object.entries(t.adds || {})) {
          const from = t.drops && t.drops[pid];
          if (from == null) { issues.push('Unresolved sender ' + id + '/' + pid); continue; }
          moves.push({ asset: 'player:' + pid, from: Number(from), to: Number(to) });
        }
        for (const p of t.draft_picks || []) {
          if (p.previous_owner_id == null || p.owner_id == null) { issues.push('Unresolved pick ' + id); continue; }
          moves.push({ asset: pickKey(p.season, p.round, p.roster_id), from: Number(p.previous_owner_id), to: Number(p.owner_id) });
        }
        const teams = [...new Set([...(t.roster_ids || []).map(Number), ...moves.flatMap(m => [m.from, m.to])])].sort((a, b) => a - b);
        const faab = (t.waiver_budget || []).map(w => ({ from: Number(w.sender), to: Number(w.receiver), amount: Number(w.amount) }));
        trades.push({ id, time, year: s.year, week, teams, moves, faab });
        for (const m of moves) events.push({ ...m, type: 'trade', trade: id, time, year: s.year, week });
      } else {
        for (const [pid, from] of Object.entries(t.drops || {})) events.push({ asset: 'player:' + pid, from: Number(from), to: null, type: 'drop', time, year: s.year, week });
        for (const [pid, to] of Object.entries(t.adds || {})) events.push({ asset: 'player:' + pid, from: null, to: Number(to), type: 'pickup', time: time + 1, year: s.year, week, how: t.type });
      }
    }
    for (const d of drafts) for (const p of d.picks) {
      events.push({ asset: 'player:' + p.pid, from: null, to: p.rid, type: 'selection', time: p.time, year: p.year, week: 0, pick: p });
      if (p.asset) events.push({ asset: p.asset, from: p.rid, to: p.rid, type: 'used', time: p.time, year: p.year, week: 0, became: 'player:' + p.pid, pick: p });
    }
    const typeOrder = { used: 0, selection: 1, drop: 2, pickup: 3, trade: 4 };
    events.sort((p, q) => p.time - q.time || typeOrder[p.type] - typeOrder[q.type]);
    const histories = {};
    for (const e of events) (histories[e.asset] || (histories[e.asset] = [])).push(e);
    trades.sort((p, q) => p.time - q.time || p.id.localeCompare(q.id));
    trades.forEach((t, i) => { t.n = i + 1; t.ref = 'T' + String(i + 1).padStart(2, '0'); });
    const tradeById = Object.fromEntries(trades.map(t => [t.id, t]));

    /* ----- asset helpers ----- */
    const draftedWith = {}; // pick asset -> pick record
    for (const d of drafts) for (const p of d.picks) if (p.asset) draftedWith[p.asset] = p;
    function assetInfo(key) {
      if (key.startsWith('player:')) { const pid = key.slice(7); return { key, kind: 'player', pid, label: pname(pid), pos: positions[pid] || '' }; }
      const [, season, round, orig] = key.split(':');
      const used = draftedWith[key];
      return { key, kind: 'pick', season: Number(season), round: Number(round), orig: Number(orig), label: season + ' ' + ord(Number(round)) + '-round pick', sub: 'originally ' + franchiseLabel(Number(orig)) + '’s', used: used ? { pid: used.pid, label: pname(used.pid), no: used.no, round: used.round, rid: used.rid } : null };
    }
    /* Points a player has scored on CTE rosters after a moment in league time. */
    function playerPointsSince(pid, year, week, toRid) {
      let pts = 0, started = 0, weeks = 0;
      for (const w of playerWeeks[pid] || []) {
        const after = w.year > year || (w.year === year && (w.week > week || (w.week === week && toRid != null && w.rid === toRid)));
        if (!after) continue;
        pts += w.pts; if (w.started) started += w.pts; weeks++;
      }
      return { pts: round2(pts), started: round2(started), weeks };
    }
    function assetValue(key, trade, toRid) {
      if (key.startsWith('player:')) return { ...playerPointsSince(key.slice(7), trade.year, trade.week, toRid), pending: false };
      const used = draftedWith[key];
      if (!used || used.time < trade.time) return { pts: 0, started: 0, weeks: 0, pending: !used };
      return { ...playerPointsSince(used.pid, used.year, 0, null), pending: false, via: used.pid };
    }
    const currentHolder = {}; // asset -> rid (players on current rosters; picks from traded_picks)
    for (const [rid, t] of Object.entries(latest.teams)) for (const pid of t.players) currentHolder['player:' + pid] = Number(rid);
    const pickHolder = {};
    for (const p of latest.raw.tradedPicks || []) pickHolder[pickKey(p.season, p.round, p.roster_id)] = Number(p.owner_id);

    /* What happened to an asset after `time`, starting on roster `rid`. */
    function fate(key, time, rid, depth, guard) {
      const steps = [];
      let cur = key, holder = rid, t = time;
      for (let i = 0; i < 12; i++) {
        const next = (histories[cur] || []).find(e => e.time > t && (e.type !== 'selection'));
        if (!next) {
          if (cur.startsWith('player:')) steps.push(currentHolder[cur] === holder ? { type: 'held', rid: holder } : currentHolder[cur] != null ? { type: 'held', rid: currentHolder[cur] } : { type: 'gone' });
          else steps.push({ type: 'unused', rid: pickHolder[cur] != null ? pickHolder[cur] : holder });
          break;
        }
        if (next.type === 'used') { steps.push({ type: 'used', pick: next.pick, became: next.became, rid: next.to }); cur = next.became; t = next.time; holder = next.to; continue; }
        if (next.type === 'drop') { steps.push({ type: 'drop', time: next.time, rid: next.from, year: next.year, week: next.week }); break; }
        if (next.type === 'pickup') { steps.push({ type: 'pickup', time: next.time, rid: next.to }); holder = next.to; t = next.time; continue; }
        if (next.type === 'trade') {
          const tr = tradeById[next.trade];
          const step = { type: 'trade', trade: tr.id, ref: tr.ref, time: tr.time, from: next.from, to: next.to, back: [] };
          if (depth > 0 && !guard.has(tr.id + ':' + next.from)) {
            guard.add(tr.id + ':' + next.from);
            step.back = tr.moves.filter(m => m.to === next.from).map(m => node(m.asset, tr, next.from, depth - 1, guard));
          }
          steps.push(step);
          break; // the asset now belongs to another branch; follow it from that trade's own tree
        }
      }
      return steps;
    }
    function node(key, trade, toRid, depth, guard) {
      return { ...assetInfo(key), value: assetValue(key, trade, toRid), steps: fate(key, trade.time, toRid, depth, guard) };
    }

    /* ----- trades: sides, points since, verdicts, links ----- */
    const lastCustody = new Map();
    const links = [];
    for (const e of events) {
      const prev = lastCustody.get(e.asset);
      if (e.type === 'used') { if (prev && prev.to === e.to) lastCustody.set(e.became, { ...prev, via: e.asset }); lastCustody.delete(e.asset); continue; }
      if (e.type === 'selection') continue;
      if (e.type === 'trade') { if (prev && prev.to === e.from) links.push({ from: prev.trade, to: e.trade, asset: e.asset, via: prev.via || null }); lastCustody.set(e.asset, e); }
      else lastCustody.delete(e.asset);
    }
    for (const t of trades) {
      t.sides = t.teams.map(rid => {
        const gets = t.moves.filter(m => m.to === rid).map(m => ({ ...assetInfo(m.asset), from: m.from, value: assetValue(m.asset, t, rid) }));
        const gives = t.moves.filter(m => m.from === rid).map(m => ({ ...assetInfo(m.asset), to: m.to }));
        const faabIn = t.faab.filter(f => f.to === rid).reduce((a, f) => a + f.amount, 0);
        return { rid, manager: managerAt(t.year, rid, t.week), gets, gives, faabIn, pts: round2(gets.reduce((a, g) => a + g.value.pts, 0)), started: round2(gets.reduce((a, g) => a + g.value.started, 0)), pending: gets.filter(g => g.value.pending).length };
      });
      t.assets = t.moves.length;
      t.totalPts = round2(t.sides.reduce((a, s) => a + s.pts, 0));
      t.pending = t.sides.reduce((a, s) => a + s.pending, 0);
      const ranked = t.sides.slice().sort((p, q) => q.pts - p.pts);
      t.margin = round2(ranked[0].pts - (ranked[1] ? ranked[1].pts : 0));
      t.leader = t.totalPts > 0 && t.margin > 0 ? ranked[0].rid : null;
      t.verdict = t.totalPts < 25 ? 'early' : t.margin < Math.max(15, t.totalPts * 0.05) ? 'even' : t.pending ? 'leading' : 'won';
      t.linksIn = links.filter(l => l.to === t.id).length; t.linksOut = links.filter(l => l.from === t.id).length;
    }
    function tradeTree(id, depth) {
      const t = tradeById[id]; if (!t) return null;
      return { trade: t, sides: t.sides.map(s => ({ rid: s.rid, manager: s.manager, nodes: t.moves.filter(m => m.to === s.rid).map(m => node(m.asset, t, s.rid, depth == null ? 3 : depth, new Set([t.id + ':' + m.from]))) })) };
    }
    function journey(key) {
      const out = [];
      const info = assetInfo(key);
      const walk = k => { for (const e of histories[k] || []) { if (e.type === 'used' && k !== key) continue; out.push(e); } };
      if (info.kind === 'pick') { walk(key); if (info.used) for (const e of histories['player:' + info.used.pid] || []) if (e.type !== 'selection') out.push(e); }
      else {
        const sel = (histories[key] || []).find(e => e.type === 'selection' && e.pick && e.pick.asset);
        if (sel) for (const e of histories[sel.pick.asset] || []) if (e.type === 'trade') out.push(e);
        walk(key);
      }
      out.sort((p, q) => p.time - q.time);
      const cur = info.kind === 'player' ? currentHolder[key] : (info.used ? currentHolder['player:' + info.used.pid] : (pickHolder[key] != null ? pickHolder[key] : info.orig));
      return { info, events: out, holder: cur == null ? null : cur };
    }
    const searchable = [];
    { const keys = new Set(); for (const t of trades) for (const m of t.moves) keys.add(m.asset);
      for (const d of drafts) for (const p of d.picks) { keys.add('player:' + p.pid); }
      for (const k of keys) { const a = assetInfo(k); searchable.push({ key: k, label: a.kind === 'pick' ? a.label + ' (' + a.sub + ')' : a.label, kind: a.kind, traded: (histories[k] || []).filter(e => e.type === 'trade').length }); }
      searchable.sort((p, q) => q.traded - p.traded || p.label.localeCompare(q.label)); }

    /* ----- trader activity ----- */
    const traderStats = {};
    const pairCount = {};
    for (const rid of rids) traderStats[rid] = { rid, trades: 0, assetsIn: 0, assetsOut: 0, ptsIn: 0, ptsOut: 0, wins: 0, managers: {} };
    for (const t of trades) {
      for (const s of t.sides) {
        const x = traderStats[s.rid] || (traderStats[s.rid] = { rid: s.rid, trades: 0, assetsIn: 0, assetsOut: 0, ptsIn: 0, ptsOut: 0, wins: 0, managers: {} });
        x.trades++; x.assetsIn += s.gets.length; x.assetsOut += s.gives.length; x.ptsIn += s.pts; x.managers[s.manager] = (x.managers[s.manager] || 0) + 1;
        x.ptsOut += t.sides.filter(o => o.rid !== s.rid).reduce((a, o) => a + o.gets.filter(g => g.from === s.rid).reduce((b, g) => b + g.value.pts, 0), 0);
        if (t.leader === s.rid && (t.verdict === 'won' || t.verdict === 'leading')) x.wins++;
      }
      for (let i = 0; i < t.teams.length; i++) for (let j = i + 1; j < t.teams.length; j++) { const k = t.teams[i] + '-' + t.teams[j]; pairCount[k] = (pairCount[k] || 0) + 1; }
    }
    for (const x of Object.values(traderStats)) { x.ptsIn = round2(x.ptsIn); x.ptsOut = round2(x.ptsOut); x.net = round2(x.ptsIn - x.ptsOut); }
    const pairs = Object.entries(pairCount).map(([k, n]) => ({ a: Number(k.split('-')[0]), b: Number(k.split('-')[1]), n })).sort((p, q) => q.n - p.n);

    /* ----- drafter report ----- */
    const draftReports = drafts.map(d => {
      const rows = {};
      const picks = d.picks.map(p => ({ ...p, name: pname(p.pid), pos: positions[p.pid] || '', ...playerPointsSince(p.pid, p.year, 0, null) }));
      const byPts = picks.slice().sort((p, q) => q.pts - p.pts); byPts.forEach((p, i) => { p.ptsRank = i + 1; p.steal = p.no - (i + 1); });
      for (const p of picks) { const r = rows[p.rid] || (rows[p.rid] = { rid: p.rid, manager: p.manager, picks: 0, pts: 0, best: null }); r.picks++; r.pts += p.pts; if (!r.best || p.pts > r.best.pts) r.best = p; }
      const table = Object.values(rows).map(r => ({ ...r, pts: round2(r.pts), per: round2(r.pts / r.picks) })).sort((p, q) => q.pts - p.pts);
      return { year: d.year, startup: d.startup, rounds: d.rounds, time: d.time, first: picks[0], table, steals: picks.filter(p => p.pts > 0).sort((p, q) => q.steal - p.steal || q.pts - p.pts).slice(0, 5), picks };
    });

    /* ----- franchises ----- */
    function acquiredHow(pid, rid, year, week) {
      const hist = (histories['player:' + pid] || []).filter(e => e.to === rid && e.type !== 'used' && (e.year < year || (e.year === year && e.week <= week)));
      const e = hist[hist.length - 1];
      if (!e) return 'unknown';
      if (e.type === 'selection') return e.pick && e.pick.startup ? 'startup' : 'rookie';
      return e.type === 'trade' ? 'trade' : 'waiver';
    }
    const startupDraft = drafts.find(d => d.startup);
    const franchises = rids.map(rid => {
      const managers = [];
      for (const s of S) {
        const lastW = Math.max(s.start + 2, 17);
        for (let w = 0; w <= lastW; w++) { const m = managerAt(s.year, rid, w); const cur = managers[managers.length - 1]; if (!cur || cur.id !== m) managers.push({ id: m, name: who.name(m), from: { year: s.year, week: Math.max(1, w) }, to: null }); if (cur && cur.id !== m) cur.to = w <= 1 ? { year: s.year - 1, end: true } : { year: s.year, week: w - 1 }; }
      }
      const seasons = S.map(s => {
        const t = s.table[rid];
        const started = {}; const mix = { startup: 0, rookie: 0, trade: 0, waiver: 0, unknown: 0 }; let total = 0;
        for (const [pid, list] of Object.entries(playerWeeks)) for (const w of list) {
          if (w.year !== s.year || w.rid !== rid || !w.started || w.week >= s.start) continue;
          const x = started[pid] || (started[pid] = { pid, name: pname(pid), pos: positions[pid] || '', pts: 0, starts: 0, how: acquiredHow(pid, rid, s.year, w.week) });
          x.pts += w.pts; x.starts++; mix[acquiredHow(pid, rid, s.year, w.week)] += w.pts; total += w.pts;
        }
        const core = Object.values(started).map(x => ({ ...x, pts: round2(x.pts) })).sort((p, q) => q.pts - p.pts).slice(0, 6);
        const mixPct = {}; for (const k of Object.keys(mix)) mixPct[k] = total ? Math.round(mix[k] / total * 100) : 0;
        const best = t.weeks.slice().sort((p, q) => q.pf - p.pf)[0] || null, worst = t.weeks.slice().sort((p, q) => p.pf - q.pf)[0] || null;
        const f = s.finish; let result = s.complete ? 'Missed playoffs' : 'In progress';
        if (s.complete) { if (f.champion === rid) result = 'Champion'; else if (f.runnerUp === rid) result = 'Runner-up'; else if (f.third === rid) result = 'Third place'; else if (f.playoffTeams.includes(rid)) result = 'Playoffs'; else if (f.toiletBowl === rid) result = 'Toilet Bowl'; }
        const playoff = [0, 0]; for (const g of games) if (g.year === s.year && g.type === 'playoff' && (g.a === rid || g.b === rid)) { const mine = g.a === rid ? g.sa : g.sb, theirs = g.a === rid ? g.sb : g.sa; playoff[mine > theirs ? 0 : 1]++; }
        return { year: s.year, complete: s.complete, manager: t.manager, managers: [...new Set(t.weeks.map(w => managerAt(s.year, rid, w.week)))], teamName: s.teams[rid].teamName, rank: t.rank, h2h: t.h2h, med: t.med, w: t.w, l: t.l, t: t.t, pf: t.pf, pa: t.pa, games: t.weeks.length, avg: t.weeks.length ? round2(t.pf / t.weeks.length) : 0, luck: t.luck, expected: t.expected, result, playoff, core, mix: mixPct, best, worst, weeks: t.weeks, tradeCount: trades.filter(x => x.year === s.year && x.teams.includes(rid)).length };
      });
      const played = seasons.filter(x => x.games);
      const rankSeason = x => pct(x.w, x.l, x.t) * 1000 + x.avg / 1000;
      const bestSeason = played.slice().sort((p, q) => rankSeason(q) - rankSeason(p))[0] || null;
      const worstSeason = played.length > 1 ? played.slice().sort((p, q) => rankSeason(p) - rankSeason(q))[0] : null;
      const startupPicks = startupDraft ? startupDraft.picks.filter(p => p.rid === rid) : [];
      const kept = startupPicks.filter(p => currentHolder['player:' + p.pid] === rid).length;
      const coreNow = played.length ? played[played.length - 1].core.map(c => c.pid) : [];
      const corePrev = played.length > 1 ? played[played.length - 2].core.map(c => c.pid) : [];
      const tot = { h2h: [0, 0, 0], med: [0, 0, 0], pf: 0, pa: 0, games: 0 };
      for (const x of seasons) { for (let i = 0; i < 3; i++) { tot.h2h[i] += x.h2h[i]; tot.med[i] += x.med[i]; } tot.pf += x.pf; tot.pa += x.pa; tot.games += x.games; }
      return { rid, name: franchiseLabel(rid), manager: managerAt(latest.year, rid, 99), teamName: latest.teams[rid].teamName, division: latest.divisions[latest.teams[rid].division] || '', managers, seasons, bestSeason, worstSeason, startup: { picks: startupPicks.length, kept }, coreCarried: corePrev.length ? coreNow.filter(p => corePrev.includes(p)).length : null, totals: { ...tot, pf: round2(tot.pf), pa: round2(tot.pa) }, trades: (traderStats[rid] || {}).trades || 0 };
    });

    /* ----- all-time tables (franchise and manager) ----- */
    function tally(keyOf) {
      const out = {};
      const row = id => out[id] || (out[id] = { id, h2h: [0, 0, 0], med: [0, 0, 0], allPlay: [0, 0, 0], pf: 0, pa: 0, games: 0, playoff: [0, 0], apps: 0, titles: 0, finals: 0, high: null, low: null, seasons: new Set() });
      for (const s of S) for (const t of Object.values(s.table)) for (const w of t.weeks) {
        const r = row(keyOf(s.year, t.rid, w.week)); r.seasons.add(s.year); r.games++; r.pf += w.pf; r.pa += w.pa;
        r.h2h[w.res === 'W' ? 0 : w.res === 'L' ? 1 : 2]++; if (w.med) r.med[w.med === 'W' ? 0 : w.med === 'L' ? 1 : 2]++;
        if (!r.high || w.pf > r.high.pf) r.high = { pf: w.pf, year: s.year, week: w.week }; if (!r.low || w.pf < r.low.pf) r.low = { pf: w.pf, year: s.year, week: w.week };
      }
      // all-play, attributed week by week
      for (const s of S) for (const week of s.finalWeeks.filter(w => w < s.start)) {
        const rows = Object.values(s.table).map(t => ({ rid: t.rid, wk: t.weeks.find(w => w.week === week) })).filter(x => x.wk);
        for (const x of rows) { const r = row(keyOf(s.year, x.rid, week)); for (const y of rows) if (y !== x) r.allPlay[x.wk.pf > y.wk.pf ? 0 : x.wk.pf < y.wk.pf ? 1 : 2]++; }
      }
      for (const g of games) if (g.type === 'playoff') for (const [rid, mine, theirs] of [[g.a, g.sa, g.sb], [g.b, g.sb, g.sa]]) row(keyOf(g.year, rid, g.week)).playoff[mine > theirs ? 0 : 1]++;
      for (const s of S) if (s.complete) {
        const f = s.finish, endWeek = s.start + 2;
        for (const rid of f.playoffTeams) row(keyOf(s.year, rid, s.start)).apps++;
        if (f.champion != null) { row(keyOf(s.year, f.champion, endWeek)).titles++; row(keyOf(s.year, f.champion, endWeek)).finals++; }
        if (f.runnerUp != null) row(keyOf(s.year, f.runnerUp, endWeek)).finals++;
      }
      return Object.values(out).map(r => {
        const g = r.h2h[0] + r.h2h[1] + r.h2h[2];
        const expected = round2(pct(r.allPlay[0], r.allPlay[1], r.allPlay[2]) * g);
        return { ...r, seasons: [...r.seasons].sort(), pf: round2(r.pf), pa: round2(r.pa), avg: r.games ? round2(r.pf / r.games) : 0, w: r.h2h[0] + r.med[0], l: r.h2h[1] + r.med[1], t: r.h2h[2] + r.med[2], pct: pct(r.h2h[0] + r.med[0], r.h2h[1] + r.med[1], r.h2h[2] + r.med[2]), h2hPct: pct(r.h2h[0], r.h2h[1], r.h2h[2]), allPlayPct: pct(r.allPlay[0], r.allPlay[1], r.allPlay[2]), expected, luck: round2(r.h2h[0] + r.h2h[2] / 2 - expected) };
      }).sort((p, q) => q.pct - p.pct || q.pf - p.pf);
    }
    const allTime = {
      franchise: tally((y, rid) => rid).map(r => ({ ...r, rid: r.id, name: franchiseLabel(r.id), teamName: latest.teams[r.id] && latest.teams[r.id].teamName })),
      manager: tally((y, rid, w) => managerAt(y, rid, w)).map(r => ({ ...r, name: who.name(r.id), former: !!(who.owners[r.id] && who.owners[r.id].status === 'former') }))
    };

    /* ----- record book ----- */
    const counted = games.filter(g => g.type !== 'other');
    const sideRows = counted.flatMap(g => [{ g, rid: g.a, m: g.ma, pf: g.sa, opp: g.b, om: g.mb, pa: g.sb }, { g, rid: g.b, m: g.mb, pf: g.sb, opp: g.a, om: g.ma, pa: g.sa }]);
    const fmtSide = x => ({ year: x.g.year, week: x.g.week, type: x.g.type, rid: x.rid, manager: x.m, pf: x.pf, opp: x.opp, oppManager: x.om, pa: x.pa, won: x.pf > x.pa });
    const fmtGame = g => { const aw = g.sa >= g.sb; return { year: g.year, week: g.week, type: g.type, margin: g.margin, winner: aw ? g.a : g.b, winnerManager: aw ? g.ma : g.mb, winScore: aw ? g.sa : g.sb, loser: aw ? g.b : g.a, loserManager: aw ? g.mb : g.ma, loseScore: aw ? g.sb : g.sa }; };
    const streaks = [];
    for (const rid of rids) {
      let run = 0, startAt = null;
      const seq = S.flatMap(s => (s.table[rid] ? s.table[rid].weeks.map(w => ({ year: s.year, week: w.week, res: w.res })) : []));
      seq.forEach((w, i) => {
        if (w.res === 'W') { if (!run) startAt = w; run++; }
        if (w.res !== 'W' || i === seq.length - 1) { if (run >= 2) { const end = w.res === 'W' ? w : seq[i - 1]; streaks.push({ rid, n: run, from: startAt, to: end, active: w.res === 'W' && i === seq.length - 1 }); } if (w.res !== 'W') run = 0; }
      });
    }
    const records = {
      high: sideRows.slice().sort((p, q) => q.pf - p.pf).slice(0, 5).map(fmtSide),
      low: sideRows.slice().sort((p, q) => p.pf - q.pf).slice(0, 5).map(fmtSide),
      blowouts: counted.slice().sort((p, q) => q.margin - p.margin).slice(0, 5).map(fmtGame),
      closest: counted.slice().sort((p, q) => p.margin - q.margin).slice(0, 5).map(fmtGame),
      highLoss: sideRows.filter(x => x.pf < x.pa).sort((p, q) => q.pf - p.pf).slice(0, 3).map(fmtSide),
      lowWin: sideRows.filter(x => x.pf > x.pa).sort((p, q) => p.pf - q.pf).slice(0, 3).map(fmtSide),
      streaks: streaks.sort((p, q) => q.n - p.n).slice(0, 5)
    };

    /* ----- timeline ----- */
    const timeline = [];
    for (const d of drafts) timeline.push({ time: d.time, year: d.year, kind: 'draft', title: d.startup ? 'Startup draft' : d.year + ' rookie draft', text: `${who.name(d.picks[0].manager)} opens it with ${pname(d.picks[0].pid)}. ${d.picks.length} picks, ${d.rounds} rounds.` });
    if (trades[0]) timeline.push({ time: trades[0].time, year: trades[0].year, kind: 'trade', trade: trades[0].id, title: 'First trade', text: trades[0].sides.map(s => who.name(s.manager)).join(' and ') + ' shake hands. The group chat has not been quiet since.' });
    for (const f of franchises) for (let i = 1; i < f.managers.length; i++) { const m = f.managers[i], prev = f.managers[i - 1]; timeline.push({ year: m.from.year, week: m.from.week, kind: 'handoff', rid: f.rid, title: `${m.name} takes over`, text: `${prev.name} hands the franchise to ${m.name}${m.from.week > 1 ? ' in Week ' + m.from.week : ' before the ' + m.from.year + ' season'}. Same franchise, new manager — the records stay separate.` }); }
    for (const s of S) if (s.complete && s.finish.champion != null) timeline.push({ year: s.year, week: s.start + 2, kind: 'title', rid: s.finish.champion, title: `${who.name(managerAt(s.year, s.finish.champion, 99))} wins the ${s.year} title`, text: `Beats ${who.name(managerAt(s.year, s.finish.runnerUp, 99))} in the championship.` });
    const big = trades.slice().sort((p, q) => q.assets - p.assets || q.totalPts - p.totalPts)[0];
    if (big && big !== trades[0]) timeline.push({ time: big.time, year: big.year, kind: 'trade', trade: big.id, title: 'Biggest deal by assets', text: `${big.sides.map(s => who.name(s.manager)).join(', ')} move ${big.assets} assets in one trade.` });
    const tKey = e => e.time || Date.UTC(e.year, 8, 4) + ((e.week || 1) - 1) * 7 * 864e5; // week 1 is roughly early September
    timeline.sort((p, q) => tKey(p) - tKey(q));

    const model = {
      generatedAt: Date.now(), seasons: S.map(s => ({ year: s.year, leagueId: s.leagueId, status: s.status, complete: s.complete, start: s.start, lastFinal: s.lastFinal, regWeeksPlayed: s.regWeeksPlayed, median: s.median, teams: s.teams, divisions: s.divisions, table: Object.values(s.table).sort((p, q) => p.rank - q.rank), finish: s.finish })),
      rids, games, trades, links, pairs, traderStats: Object.values(traderStats).sort((p, q) => q.trades - p.trades || q.assetsIn + q.assetsOut - p.assetsIn - p.assetsOut), drafts: draftReports, franchises, allTime, records, timeline, searchable,
      counts: { seasons: S.length, games: counted.length, regularGames: games.filter(g => g.type === 'regular').length, trades: trades.length, transactions: txCount, draftPicks: drafts.reduce((a, d) => a + d.picks.length, 0), managers: allTime.manager.length, linkedTrades: new Set(links.flatMap(l => [l.from, l.to])).size },
      audit, issues,
      name: who.name, managerAt, franchiseLabel, pname, position: id => positions[id] || '', assetInfo, tradeTree, journey, tradeById, ord
    };
    model.summary = summarize(model);
    return model;
  }

  /* ---------- CTE Bot: the headline read, generated from the numbers ---------- */
  function summarize(m) {
    const N = m.name, lines = [];
    const cur = m.seasons[m.seasons.length - 1];
    const done = m.seasons.filter(s => s.complete);
    const fr = rid => m.franchiseLabel(rid);
    const rec = t => `${t.w}-${t.l}${t.t ? '-' + t.t : ''}`;
    const titles = m.allTime.manager.filter(r => r.titles).sort((a, b) => b.titles - a.titles);
    if (titles.length) {
      const t = titles[0];
      lines.push({ tag: 'The throne', anchor: 'history', text: done.length === 1 ? `${t.name} owns the only banner this league has ever hung, and has mentioned it roughly once per group-chat message since.` : `${t.name} leads the league with ${t.titles} title${t.titles === 1 ? '' : 's'}. Everyone else is still shopping for a trophy case.` });
    }
    if (!cur.complete && cur.table.length && cur.regWeeksPlayed) {
      const a = cur.table[0], b = cur.table[1], z = cur.table[cur.table.length - 1];
      lines.push({ tag: `${cur.year} race`, anchor: 'history', text: `${N(a.manager)} sits on top at ${rec(a)} through Week ${cur.lastFinal}${b ? `, with ${N(b.manager)} (${rec(b)}) close enough to read the back of the jersey` : ''}. ${N(z.manager)} is ${rec(z)} and has started saying “dynasty is a long game” out loud.` });
    }
    const luck = m.allTime.manager.filter(r => r.games >= 8).slice().sort((a, b) => b.luck - a.luck);
    if (luck.length > 1) {
      const hi = luck[0], lo = luck[luck.length - 1];
      lines.push({ tag: 'Luck', anchor: 'records', text: `${hi.name} is ${hi.luck >= 0 ? '+' : ''}${hi.luck.toFixed(1)} head-to-head wins against what the weekly scores say they earned. ${lo.name} is at ${lo.luck.toFixed(1)} and would like a word with the schedule maker.` });
    }
    const tr = m.traderStats[0];
    if (tr && tr.trades) {
      const quiet = m.traderStats.filter(x => !x.trades).map(x => fr(x.rid));
      lines.push({ tag: 'Trade market', anchor: 'trades', text: `${m.counts.trades} trades on the books. ${fr(tr.rid)}’s franchise has been in ${tr.trades} of them — if your phone buzzes after midnight, it’s probably that.${quiet.length ? ` ${quiet.join(' and ')} ${quiet.length === 1 ? 'has' : 'have'} never made one. We respect the monk lifestyle.` : ''}` });
    }
    const won = m.trades.filter(t => t.verdict === 'won' || t.verdict === 'leading').sort((a, b) => b.margin - a.margin)[0];
    if (won) {
      const w = won.sides.find(s => s.rid === won.leader), l = won.sides.filter(s => s.rid !== won.leader).sort((a, b) => a.pts - b.pts)[0];
      lines.push({ tag: 'Receipts', anchor: 'trade-' + won.id, text: `Most lopsided deal so far: ${N(w.manager)} is up ${won.margin.toFixed(1)} points on ${N(l.manager)} from their ${new Date(won.time).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'America/Chicago' })} trade. No refunds.` });
    }
    const hi = m.records.high[0], blow = m.records.blowouts[0], close = m.records.closest[0];
    if (hi && blow) lines.push({ tag: 'Record book', anchor: 'records', text: `Highest score ever: ${N(hi.manager)}, ${hi.pf.toFixed(2)} (${hi.year} Week ${hi.week}). Biggest beatdown: ${N(blow.winnerManager)} over ${N(blow.loserManager)} by ${blow.margin.toFixed(2)}.${close ? ` Closest call: ${N(close.winnerManager)} over ${N(close.loserManager)} by ${close.margin.toFixed(2)} — somebody is still thinking about that kicker.` : ''}` });
    const rookie = m.drafts.filter(d => !d.startup).slice(-1)[0];
    if (rookie && rookie.steals[0] && rookie.steals[0].steal > 0) { const s = rookie.steals[0]; lines.push({ tag: 'Draft room', anchor: 'records', text: `Steal of the ${rookie.year} rookie draft so far: ${s.name}, pick ${s.no}, already ${s.pts.toFixed(1)} points for ${N(s.manager)}. ${rookie.table[0] ? N(rookie.table[0].manager) + ' has the most productive class.' : ''}` }); }
    const mostPf = m.allTime.franchise.slice().sort((a, b) => b.pf - a.pf)[0];
    const tiles = [
      { n: m.counts.seasons, label: 'seasons' }, { n: m.counts.games, label: 'games played' }, { n: m.counts.trades, label: 'trades' },
      { n: m.counts.transactions, label: 'roster moves' }, { n: m.counts.draftPicks, label: 'draft picks made' }, { n: m.counts.managers, label: 'managers, ' + m.rids.length + ' franchises' }
    ];
    const headline = cur.complete ? `${cur.year} is in the books.` : `${m.counts.seasons} season${m.counts.seasons === 1 ? '' : 's'} in. Nobody is innocent.`;
    return { headline, lines, tiles, mostPf: mostPf ? { name: mostPf.name, pf: mostPf.pf } : null, through: cur.complete ? `${cur.year} final` : `${cur.year} Week ${cur.lastFinal}` };
  }

  /* Turn a path -> response map (live cache or snapshot) into build() input, walking previous_league_id. */
  function assemble(responses, startLeagueId) {
    const seasons = [];
    let id = String(startLeagueId), hops = 0;
    while (id && id !== '0' && responses['/league/' + id] && hops++ < 30) {
      const league = responses['/league/' + id];
      const matchups = {}, transactions = [];
      for (let w = 1; w <= 18; w++) {
        if (responses[`/league/${id}/matchups/${w}`]) matchups[w] = responses[`/league/${id}/matchups/${w}`];
        for (const t of responses[`/league/${id}/transactions/${w}`] || []) transactions.push(t);
      }
      const drafts = (responses[`/league/${id}/drafts`] || []).map(d => ({ draft: { ...d, ...(responses['/draft/' + d.draft_id] || {}) }, picks: responses[`/draft/${d.draft_id}/picks`] || [] }));
      seasons.push({ league, users: responses[`/league/${id}/users`] || [], rosters: responses[`/league/${id}/rosters`] || [], winners: responses[`/league/${id}/winners_bracket`] || [], losers: responses[`/league/${id}/losers_bracket`] || [], tradedPicks: responses[`/league/${id}/traded_picks`] || [], matchups, transactions, drafts });
      id = league.previous_league_id;
    }
    return { seasons, state: responses['/state/nfl'] || null };
  }

  const api = { build, trim, assemble, pickKey, identity, summarize, ord };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.CTESotuEngine = api;
})(typeof window === 'undefined' ? globalThis : window);
