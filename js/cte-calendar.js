/* CTE Network — league key dates (glow-up, 2026-11-16).
 * Builds the season's dates from Sleeper league settings (trade deadline week,
 * playoff start, playoff field) plus the reviewed NFL week anchor in
 * data/cte-calendar.js, and serialises them as an iCalendar file.
 * Pure: no DOM, no network. Shared by calendar.html, the home page and
 * tools/build-calendar.cjs.
 */
(function (root) {
  'use strict';
  const DAY = 86400000;
  const parse = iso => { const [y, m, d] = iso.split('-').map(Number); return Date.UTC(y, m - 1, d); };
  const iso = ms => new Date(ms).toISOString().slice(0, 10);
  const add = (date, days) => iso(parse(date) + days * DAY);
  /** Thursday–Monday window of an NFL week. */
  function week(season, n) { const sunday = add(season.week1Sunday, 7 * (n - 1)); return { start: add(sunday, -3), sunday, end: add(sunday, 1) }; }
  function rounds(teams) { return Math.max(1, Math.ceil(Math.log2(Math.max(2, Number(teams) || 2)))); }

  /** @returns chronological [{id,start,end,title,detail,kind,source}] — end is inclusive. */
  function events(year, season, liveSettings) {
    const s = { ...(season.settings || {}), ...(liveSettings || {}) }, out = [];
    const push = (id, start, end, title, detail, kind, source, alarm) => out.push({ id: 'cte-' + year + '-' + id, start, end: end || start, title, detail, kind, source, alarm: !!alarm });
    if (season.rookieDraft) push('rookie-draft', season.rookieDraft, null, year + ' rookie draft', 'Four-round rookie draft held in Sleeper.', 'draft', 'Sleeper draft record');
    if (season.nflKickoff) push('kickoff', season.nflKickoff, week(season, 1).end, 'Week 1 — season kicks off', 'CTE League Week 1.', 'season', 'NFL schedule');
    const deadline = Number(s.trade_deadline);
    if (Number.isInteger(deadline) && deadline >= 1 && deadline <= 18) push('trade-deadline', week(season, deadline).end, null, 'Trade deadline', 'Trading closes in Sleeper when the final Week ' + deadline + ' game ends. Get deals accepted before then.', 'deadline', 'Sleeper league setting: trade deadline Week ' + deadline, true);
    const start = Number(s.playoff_week_start);
    if (Number.isInteger(start) && start >= 2 && start <= 18 && Number(s.playoff_round_type || 0) === 0) {
      const last = week(season, start - 1);
      push('regular-season-ends', last.start, last.end, 'Week ' + (start - 1) + ' — regular season finale', 'Last week before the playoff field is locked.', 'season', 'Sleeper league setting: playoffs start Week ' + start);
      const total = rounds(s.playoff_teams), teams = Number(s.playoff_teams);
      for (let r = 1; r <= total; r++) {
        const w = week(season, start + r - 1), final = r === total;
        const name = final ? 'CTE Championship' : r === total - 1 ? 'Playoff semifinals' : 'Playoffs begin';
        const detail = final ? 'Championship game, third-place game and the end of the Toilet Bowl bracket.' : r === 1 ? teams + '-team playoff field' + (teams === 6 ? '; seeds 1 and 2 have a bye.' : '.') + ' The consolation (Toilet Bowl) bracket starts the same week.' : 'Winners play for the championship next week.';
        push('playoffs-round-' + r, w.start, w.end, 'Week ' + (start + r - 1) + ' — ' + name, detail, final ? 'championship' : 'playoffs', 'Sleeper league settings: ' + teams + ' playoff teams from Week ' + start, r === 1 || final);
      }
    }
    return out.sort((a, b) => a.start.localeCompare(b.start) || a.id.localeCompare(b.id));
  }
  /** First event that has not ended; today is YYYY-MM-DD in league time. */
  function next(list, today) { return list.find(e => e.end >= today) || null; }
  function daysUntil(event, today) { return Math.round((parse(event.start) - parse(today)) / DAY); }
  function today(timezone, now = new Date()) {
    try { return new Intl.DateTimeFormat('en-CA', { timeZone: timezone || 'America/Chicago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now); } catch (_) { return now.toISOString().slice(0, 10); }
  }
  function currentWeek(season, day) { const n = Math.floor((parse(day) - parse(add(season.week1Sunday, -4))) / (7 * DAY)) + 1; return n >= 1 && n <= 18 ? n : null; }
  function label(e, opts = { month: 'short', day: 'numeric' }) {
    const f = d => new Date(parse(d)).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' });
    return e.start === e.end ? f(e.start) : f(e.start) + ' – ' + f(e.end);
  }

  const escText = v => String(v).replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
  function fold(line) { // RFC 5545: 75 octets per line
    const out = []; let cur = '', bytes = 0;
    for (const ch of line) { const n = ch.codePointAt(0) < 0x80 ? 1 : ch.codePointAt(0) < 0x800 ? 2 : ch.codePointAt(0) < 0x10000 ? 3 : 4; if (bytes + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; bytes = 0; } cur += ch; bytes += n; }
    out.push(cur); return out.join('\r\n ');
  }
  /** All-day iCalendar events. stamp = YYYY-MM-DD the data was last reviewed (keeps the file reproducible). */
  function ics(list, opts = {}) {
    const stamp = (opts.stamp || '2026-01-01').replace(/-/g, '') + 'T000000Z', d = v => v.replace(/-/g, '');
    const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//CTE Network//League Key Dates//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', 'X-WR-CALNAME:' + escText(opts.name || 'CTE League'), 'X-WR-CALDESC:' + escText('Key dates for the CTE dynasty fantasy football league.'), 'REFRESH-INTERVAL;VALUE=DURATION:P1D', 'X-PUBLISHED-TTL:P1D'];
    for (const e of list) {
      lines.push('BEGIN:VEVENT', 'UID:' + e.id + '@ctenetwork', 'DTSTAMP:' + stamp, 'DTSTART;VALUE=DATE:' + d(e.start), 'DTEND;VALUE=DATE:' + d(add(e.end, 1)), 'SUMMARY:' + escText('CTE: ' + e.title), 'DESCRIPTION:' + escText(e.detail + (e.source ? '\nSource: ' + e.source + '.' : '')), 'TRANSP:TRANSPARENT');
      if (opts.url) lines.push('URL:' + opts.url);
      if (e.alarm) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', 'DESCRIPTION:' + escText('CTE: ' + e.title), 'TRIGGER:-PT15H', 'END:VALARM');
      lines.push('END:VEVENT');
    }
    lines.push('END:VCALENDAR');
    return lines.map(fold).join('\r\n') + '\r\n';
  }
  const api = { events, next, daysUntil, today, currentWeek, week, rounds, label, ics, add };
  if (typeof module === 'object' && module.exports) module.exports = api; else root.CTE_Calendar = api;
})(typeof window === 'undefined' ? globalThis : window);
