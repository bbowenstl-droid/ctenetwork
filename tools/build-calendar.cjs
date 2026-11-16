#!/usr/bin/env node
/* Rebuilds calendar/cte-league.ics (the file phones subscribe to) from
 * data/cte-calendar.js. `--check` fails if the committed file is stale. */
const fs = require('node:fs'), path = require('node:path');
const root = path.resolve(__dirname, '..');
const config = require(path.join(root, 'data', 'cte-calendar.js')), C = require(path.join(root, 'js', 'cte-calendar.js'));
const list = Object.entries(config.seasons).flatMap(([year, season]) => C.events(Number(year), season));
const text = C.ics(list, { stamp: config.updated, name: 'CTE League', url: 'https://bbowenstl-droid.github.io/ctenetwork/calendar.html' });
const file = path.join(root, 'calendar', 'cte-league.ics');
if (process.argv.includes('--check')) {
  if (!fs.existsSync(file) || fs.readFileSync(file, 'utf8') !== text) { console.error('calendar/cte-league.ics is stale: run node tools/build-calendar.cjs'); process.exit(1); }
  console.log('PASS calendar/cte-league.ics matches data/cte-calendar.js (' + list.length + ' events)');
} else { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); console.log('Wrote ' + path.relative(root, file) + ' (' + list.length + ' events)'); for (const e of list) console.log(' ', e.start, e.end, e.title); }
