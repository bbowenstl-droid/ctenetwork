/* Key dates page: reviewed config + live Sleeper settings -> list, countdown, .ics. */
(async () => {
  'use strict';
  const $ = id => document.getElementById(id), C = CTE_Calendar, cfg = CTE_CALENDAR, esc = CTE_UI.esc, LD = CTE_LEAGUE_DATA;
  const year = LD.league.currentSeason, season = cfg.seasons[year];
  if (!season) { $('calList').innerHTML = '<p class="n-empty">Key dates for ' + esc(year) + ' have not been recorded yet.</p>'; $('calStatus').textContent = ''; return; }
  const today = C.today(cfg.timezone), KIND = { draft: 'Draft', season: 'Season', deadline: 'Deadline', playoffs: 'Playoffs', championship: 'Championship' };
  let list = C.events(year, season), live = false, blobUrl = null;
  function render() {
    const up = C.next(list, today), week = C.currentWeek(season, today), start = Number(season.settings.playoff_week_start);
    $('calNext').innerHTML = up ? (() => { const d = C.daysUntil(up, today); return '<p class="g-kicker">Next up</p><h2>' + esc(up.title) + '</h2><p class="g-count"><strong>' + (d > 0 ? d : 'Now') + '</strong><span>' + (d > 1 ? 'days away' : d === 1 ? 'day away' : 'happening') + ' · ' + esc(C.label(up, { weekday: 'short', month: 'short', day: 'numeric' })) + '</span></p><p>' + esc(up.detail) + '</p>'; })() : '<p class="g-kicker">Season complete</p><h2>See you at the rookie draft.</h2><p>Next season’s dates appear here once they are set in Sleeper.</p>';
    $('calWeeks').innerHTML = Array.from({ length: start + C.rounds(season.settings.playoff_teams) - 1 }, (_, i) => { const n = i + 1, w = C.week(season, n), state = n === week ? ' is-now' : w.end < today ? ' is-past' : ''; return '<li class="' + (n >= start ? 'is-playoff' : '') + state + '"' + (n === week ? ' aria-current="true"' : '') + '><b>' + n + '</b><span>' + esc(C.label({ start: w.sunday, end: w.sunday })) + '</span></li>'; }).join('');
    $('calList').innerHTML = '<ol class="g-timeline">' + list.map(e => '<li class="g-event g-event--' + e.kind + (e.end < today ? ' is-past' : e === up ? ' is-next' : '') + '"><time datetime="' + e.start + '">' + esc(C.label(e, { weekday: 'short', month: 'short', day: 'numeric' })) + '<small>' + new Date(e.start + 'T12:00:00Z').getUTCFullYear() + '</small></time><div><span class="g-tag">' + KIND[e.kind] + '</span>' + (e.end < today ? '<span class="g-tag is-final">Done</span>' : e === up ? '<span class="g-tag is-live"><i aria-hidden="true"></i>Next</span>' : '') + '<h3>' + esc(e.title) + '</h3><p>' + esc(e.detail) + '</p><small>' + esc(e.source) + '</small></div></li>').join('') + '</ol>';
  }
  // Subscribing keeps a phone calendar in step with the repo's reviewed dates.
  const fileUrl = new URL('calendar/cte-league.ics', location.href);
  $('calSubscribe').href = fileUrl.href.replace(/^https?:/, 'webcal:');
  $('calDownload').addEventListener('click', e => {
    if (!live) return; // the static file already matches
    e.preventDefault();
    if (blobUrl) URL.revokeObjectURL(blobUrl);
    blobUrl = URL.createObjectURL(new Blob([C.ics(list, { stamp: today, name: 'CTE League', url: location.href.split('#')[0] })], { type: 'text/calendar' }));
    const a = document.createElement('a'); a.href = blobUrl; a.download = 'cte-league-' + year + '.ics'; document.body.append(a); a.click(); a.remove();
  });
  render();
  try {
    const league = await CTE_Sleeper.getLeague(LD.league.seasons[year].sleeperLeagueId), s = league.settings || {};
    const keys = ['trade_deadline', 'playoff_week_start', 'playoff_teams', 'playoff_round_type'];
    live = keys.some(k => Number(s[k] ?? season.settings[k]) !== Number(season.settings[k]));
    if (live) { list = C.events(year, season, Object.fromEntries(keys.map(k => [k, s[k] ?? season.settings[k]]))); render(); }
    $('calStatus').textContent = live ? 'Sleeper’s league settings changed since these dates were last reviewed. This page and the download use the live settings; the subscription updates after the commissioner’s next review.' : 'Checked against Sleeper’s live league settings just now.';
  } catch (_) { $('calStatus').textContent = 'Sleeper is unreachable, so these are the dates as last reviewed on ' + cfg.updated + '.'; }
})();
