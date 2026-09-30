/* CTE Sportsbook shared-picks tests — node tools/test-sportsbook-cloud.cjs (needs Playwright).
 * A fake database in Node enforces the same rules as SPORTSBOOK.md, so several browser
 * "devices" can share picks without touching Firebase. */
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), out = path.resolve('review-v33'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = require('http').createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0])); try { res.setHeader('Content-Type', types[path.extname(f)] || 'text/plain'); res.end(fs.readFileSync(f)); } catch (_) { res.statusCode = 404; res.end('Not found'); } });

/* ---------- fake Realtime Database with the production rules ---------- */
const COMMISH = 'commish-device';
const db = {}; let serverNow = new Date('2026-09-30T18:00:00-05:00').getTime();
const parts = p => p.split('/').filter(Boolean);
const getAt = p => parts(p).reduce((o, k) => (o == null ? undefined : o[k]), db);
function setAt(p, v) { const ks = parts(p); let o = db; ks.slice(0, -1).forEach(k => { o = o[k] = o[k] && typeof o[k] === 'object' ? o[k] : {}; }); if (v === null) delete o[ks[ks.length - 1]]; else o[ks[ks.length - 1]] = JSON.parse(JSON.stringify(v)); }
const denied = () => { const e = new Error('PERMISSION_DENIED'); e.code = 'PERMISSION_DENIED'; throw e; };
function ownerOk(season, owner, uid) { const pin = getAt(`book/${season}/pins/${owner}`); return pin != null && getAt(`book/${season}/links/${owner}/${uid}`) === pin; }
function open(season, week) { const l = getAt(`book/${season}/weeks/${week}/lockAt`); return typeof l === 'number' && serverNow < l; }
function canWrite(p, v, uid) {
  const k = parts(p);
  if (k[0] !== 'book' || k.length < 3) return false;
  const [, season, area] = k;
  if (area === 'pins') return uid === COMMISH && k.length === 4 && typeof v === 'string' && v.length === 64;
  if (area === 'links') return k.length === 5 && k[4] === uid && typeof v === 'string' && v === getAt(`book/${season}/pins/${k[3]}`);
  if (area === 'weeks') {
    const week = k[3], col = k[4];
    if (col === 'lockAt') return uid === COMMISH && typeof v === 'number';
    if (['cards', 'parlays', 'status'].includes(col)) {
      const owner = k[5]; if (!owner) return false;
      if (uid === COMMISH) return true;
      if (!ownerOk(season, owner, uid) || !open(season, week)) return false;
      if (col !== 'status' && v !== null && !(v && Array.isArray(v.ids) && v.lockedAt)) return false;
      return true;
    }
  }
  return false;
}
function canRead(p, uid) {
  const k = parts(p), [, season, area] = k;
  if (uid === COMMISH) return true;
  if (area === 'pins' || area === 'links') return false;
  if (area === 'weeks') {
    const week = k[3], col = k[4];
    if (col === 'lockAt' || col === 'status') return true;
    if (col === 'cards' || col === 'parlays') {
      const l = getAt(`book/${season}/weeks/${week}/lockAt`);
      if (typeof l === 'number' && serverNow > l) return true;
      return k.length >= 6 && ownerOk(season, k[5], uid);
    }
  }
  return false;
}
let writes = 0, rejected = 0;
async function dbCall(uid, op, a, b) {
  if (op === 'get') { if (!canRead(a, uid)) { rejected++; return { error: 'PERMISSION_DENIED' }; } const v = getAt(a); return { value: v === undefined ? null : v }; }
  if (op === 'update') { for (const [p, v] of Object.entries(a)) if (!canWrite(p, v, uid)) { rejected++; return { error: 'PERMISSION_DENIED' }; } for (const [p, v] of Object.entries(a)) setAt(p, v); writes++; return { ok: true }; }
  if (op === 'set') return dbCall(uid, 'update', { [a]: b });
  return { error: 'bad op' };
}

/* ---------- Sleeper fixture (same as UI tests) ---------- */
const OWNERS = { 1: 'brendan', 2: 'jacob', 3: 'brett', 4: 'mike', 5: 'carter', 6: 'dan', 7: 'isaiah', 8: 'cotton', 9: 'jerry', 10: 'jesse', 11: 'elijah', 12: 'troy' };
const W4 = [[1, 2], [3, 5], [4, 9], [6, 7], [8, 12], [10, 11]];
const rosters = Object.keys(OWNERS).map(Number).map(i => ({ roster_id: i, owner_id: 'u' + i, settings: { wins: 1, losses: 2, ties: 0, fpts: 300 + i, fpts_decimal: 0 }, players: [], starters: [] }));
const users = rosters.map(r => ({ user_id: r.owner_id, display_name: 'user' + r.roster_id, metadata: { team_name: 'Team ' + r.roster_id } }));
const pts = { 1: 90, 2: 120, 3: 120, 5: 100, 4: 90, 9: 120, 6: 90, 7: 110, 8: 80, 12: 100, 10: 90, 11: 110 }; // favorites win and cover
const weekRows = (week, final) => W4.flatMap(([a, b], i) => [a, b].map(r => ({ roster_id: r, matchup_id: i + 1, points: final ? pts[r] : 0, starters: [], players_points: {} })));

async function device(browser, uid, { now = '2026-09-30T18:00:00-05:00', leg = 4, width = 390 } = {}) {
  const c = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce', hasTouch: width < 821 });
  await c.route('https://api.sleeper.app/**', route => {
    const p = new URL(route.request().url()).pathname; let data;
    if (p.endsWith('/users')) data = users; else if (p.endsWith('/rosters')) data = rosters;
    else if (p.includes('/matchups/')) { const w = Number(p.split('/').pop()); data = w <= 4 ? weekRows(w, w < leg) : []; }
    else if (p.includes('/transactions/') || p.endsWith('/drafts')) data = []; else if (p.includes('/players/')) data = {};
    else data = { settings: { leg, playoff_week_start: 15 }, roster_positions: ['QB'], season: '2026', status: 'in_season' };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  });
  await c.route('https://sleepercdn.com/**', r => r.abort()); await c.route('https://www.gstatic.com/**', r => r.abort());
  await c.exposeBinding('__cteDb', (_src, op, a, b) => dbCall(uid, op, a, b));
  await c.addInitScript(([t, id]) => {
    window.CTE_BOOK_NOW = t;
    const call = async (op, a, b) => { const r = await window.__cteDb(op, a, b); if (r.error) throw Object.assign(new Error(r.error), { code: r.error }); return r.value; };
    window.CTE_BOOK_CLOUD_BACKEND = { signIn: async () => id, get: p => call('get', p), update: m => call('update', m), set: (p, v) => call('set', p, v) };
  }, [now, uid]);
  const p = await c.newPage(); const errors = [];
  p.on('pageerror', e => errors.push(e.message));
  p.on('dialog', d => d.accept());
  return { c, p, errors };
}

(async () => {
  await new Promise(r => server.listen(8767, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const failures = [], report = [];
  const check = (ok, msg) => { if (!ok) failures.push(msg); else report.push('ok ' + msg); };
  const url = 'http://127.0.0.1:8767/sportsbook.html';
  const ready = p => p.waitForFunction(() => document.querySelector('.bk-subs') || document.querySelector('.bk-ident'), null, { timeout: 8000 });

  /* 1. Commissioner makes codes and sets the lock time */
  const cm = await device(browser, COMMISH);
  await cm.p.goto(url + '#commissioner'); await cm.p.waitForSelector('[data-commish="codes"]');
  await cm.p.click('[data-commish="codes"]'); await cm.p.waitForSelector('.bk-commish-row code');
  const codes = await cm.p.$$eval('.bk-commish-row', rows => Object.fromEntries(rows.map(r => [r.querySelector('b').textContent.trim(), (r.querySelector('code') || {}).textContent])));
  check(Object.keys(codes).length === 12 && Object.values(codes).every(c => /^[A-Z0-9]{3}-[A-Z0-9]{3}$/.test(c)), 'commissioner: 12 codes generated');
  check(Object.keys(getAt('book/2026/pins') || {}).length === 12 && Object.values(getAt('book/2026/pins')).every(h => !Object.values(codes).includes(h)), 'only hashes stored, never codes');
  check(getAt('book/2026/weeks/4/lockAt') === new Date('2026-10-01T19:15:00-05:00').getTime(), 'lock time stored');
  await cm.p.screenshot({ path: out + '/commissioner.png', fullPage: true });
  const jacobCode = codes.Jacob;

  /* 2. A non-commissioner device cannot set pins */
  check((await dbCall('rando', 'update', { 'book/2026/pins/jacob': 'x'.repeat(64) })).error === 'PERMISSION_DENIED', 'rules: only commissioner sets codes');

  /* 3. Jacob signs in on his phone */
  const a = await device(browser, 'jacob-phone');
  await a.p.goto(url); await ready(a.p);
  await a.p.click('[data-sel="w4-brendan-jacob:ml:jacob"]'); await a.p.click('#bkPill'); await a.p.waitForTimeout(100);
  check(await a.p.locator('#bkSheet .bk-ident.is-signin').isVisible(), 'sign-in form in the slip');
  await a.p.selectOption('#bkSheet [data-owner-select]', 'jacob');
  await a.p.fill('#bkSheet [data-code]', 'WRO-NG1'); await a.p.click('#bkSheet [data-link]'); await a.p.waitForTimeout(300);
  check((await a.p.locator('#bkToast').innerText()).includes('doesn\u2019t match'), 'wrong code rejected');
  await a.p.fill('#bkSheet [data-code]', jacobCode.toLowerCase().replace('-', ' ')); await a.p.click('#bkSheet [data-link]'); await a.p.waitForTimeout(400);
  check((await a.p.locator('#bkSheet').innerText()).includes('Playing as Jacob'), 'right code signs in (case/format tolerant)');
  await a.p.keyboard.press('Escape'); await a.p.waitForTimeout(100);
  for (const id of ['w4-brett-carter:ml:brett', 'w4-mike-jerry:ml:jerry', 'w4-dan-isaiah:ats:isaiah', 'w4-cotton-troy:ats:troy', 'w4-jesse-elijah:ats:elijah']) await a.p.click(`[data-sel="${id}"]`);
  await a.p.click('#bkPill'); await a.p.waitForTimeout(100); await a.p.click('#bkSheet [data-lock]'); await a.p.waitForTimeout(500);
  check((await a.p.locator('#panel-card').innerText()).includes('Saved to the CTE Sportsbook'), 'card saved to the league');
  check((getAt('book/2026/weeks/4/cards/jacob') || {}).ids?.length === 6, 'card stored under Jacob');
  await a.p.screenshot({ path: out + '/card-cloud.png', fullPage: true });

  /* 4. Parlay: one per matchup, 2+ legs, locks separately */
  await a.p.click('.bk-tab[data-tab="board"]'); await a.p.click('[data-mode="parlay"]');
  check((await a.p.locator('.bk-odds[aria-pressed="true"]').count()) === 0, 'parlay board starts empty (card picks not shown as legs)');
  await a.p.click('[data-sel="w4-brendan-jacob:ml:jacob"]'); await a.p.click('[data-sel="w4-brendan-jacob:ats:jacob"]');
  check((await a.p.locator('#bkToast').innerText()).includes('One leg per matchup'), 'same-game leg swaps');
  await a.p.click('[data-sel="w4-cotton-troy:ats:troy"]');
  await a.p.click('#bkPill'); await a.p.waitForTimeout(100);
  const slip = await a.p.locator('#bkSheet').innerText();
  // swap kept the last-tapped leg: Jacob −16.5 (−115) × Troy −9.5 (−125) = +237, pays CTE$336.52
  check(/Parlay odds\s*\+237/.test(slip) && slip.includes('CTE$336.52'), 'parlay odds + payout (' + slip.replace(/\n/g, ' ').slice(0, 160) + ')');
  if (true) await a.p.screenshot({ path: out + '/parlay-slip.png' });
  await a.p.click('#bkSheet [data-plock]'); await a.p.waitForTimeout(500);
  check(await a.p.locator('#bkParlayTicket').isVisible(), 'parlay ticket on My card');
  check((getAt('book/2026/weeks/4/parlays/jacob') || {}).ids?.length === 2, 'parlay stored under Jacob');
  check(getAt('book/2026/weeks/4/status/jacob/card') && getAt('book/2026/weeks/4/status/jacob/parlay'), 'status shows card + parlay in');
  await a.p.screenshot({ path: out + '/parlay-ticket.png', fullPage: true });

  /* 5. Before lock, other people can't see Jacob's picks, only that he's in */
  const b = await device(browser, 'brett-phone');
  await b.p.goto(url); await ready(b.p); await b.p.waitForSelector('.bk-subs');
  check((await b.p.locator('.bk-subs-top').innerText()).includes('1/12 cards in'), 'others see 1/12 cards in');
  check((await dbCall('brett-phone', 'get', 'book/2026/weeks/4/cards')).error === 'PERMISSION_DENIED', 'rules: picks hidden before lock');
  check((await dbCall('brett-phone', 'update', { 'book/2026/weeks/4/cards/jacob': { ids: ['x'], lockedAt: 'y' } })).error === 'PERMISSION_DENIED', 'rules: nobody else can overwrite Jacob');
  await b.p.screenshot({ path: out + '/board-subs.png' });

  /* 6. Jacob's laptop: sign in once, picks come back */
  const a2 = await device(browser, 'jacob-laptop', { width: 1440 });
  await a2.p.goto(url); await ready(a2.p);
  await a2.p.selectOption('.bk-slip-aside [data-owner-select]', 'jacob'); await a2.p.fill('.bk-slip-aside [data-code]', jacobCode); await a2.p.click('.bk-slip-aside [data-link]'); await a2.p.waitForTimeout(500);
  check((await a2.p.locator('#bkWalletCard').innerText()).includes('Locked'), 'second device restores the card');
  await a2.p.click('.bk-tab[data-tab="my-card"]');
  check(await a2.p.locator('#bkParlayTicket').isVisible(), 'second device restores the parlay');

  /* 7. Code reset signs Jacob's devices out; picks stay */
  await cm.p.click('.bk-commish-row:has(b:text-is("Jacob")) [data-commish^="reset:"]'); await cm.p.waitForTimeout(300);
  await a.p.reload(); await a.p.waitForTimeout(800);
  check((await a.p.locator('#bkToast').innerText()).includes('code changed'), 'reset code signs old devices out');
  check((getAt('book/2026/weeks/4/cards/jacob') || {}).ids?.length === 6, 'picks survive a code reset');

  /* 8. After lock + final: everyone's picks count */
  serverNow = new Date('2026-10-07T12:00:00-05:00').getTime();
  const late = await dbCall('jacob-phone', 'update', { 'book/2026/weeks/4/cards/jacob': null });
  check(late.error === 'PERMISSION_DENIED', 'rules: no changes after lock');
  const v = await device(browser, 'viewer', { now: '2026-10-07T12:00:00-05:00', leg: 5 });
  await v.p.goto(url + '#leaderboard'); await v.p.waitForTimeout(2500);
  const lb = await v.p.locator('#panel-leaders').innerText();
  check(/Jacob[\s\S]*\+CTE\$316\.53/.test(lb), 'leaderboard grades the cloud card 6-0 for +CTE$316.53');
  check(/Parlay race[\s\S]*Jacob[\s\S]*1\u20130[\s\S]*\+CTE\$236\.52/.test(lb), 'parlay race: 1\u20130, +CTE$236.52');
  await v.p.screenshot({ path: out + '/leaderboard-cloud.png', fullPage: true });

  /* 9. Device-only fallback still works when the database is unreachable */
  const off = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
  await off.route('https://**', r => r.abort()); await off.addInitScript(() => { window.CTE_BOOK_NOW = '2026-09-30T18:00:00-05:00'; });
  const op = await off.newPage(); await op.goto(url); await op.waitForTimeout(12000);
  await op.click('[data-sel="w4-brendan-jacob:ml:jacob"]'); await op.click('#bkPill'); await op.waitForTimeout(100);
  check(await op.locator('#bkSheet [data-owner-select]').isVisible() && !(await op.locator('#bkSheet [data-link]').count()), 'offline: falls back to device-only owner picker');

  for (const d of [cm, a, b, a2, v]) { if (d.errors.length) failures.push('JS errors: ' + d.errors.join(' | ')); await d.c.close(); }
  await off.close(); await browser.close(); server.close();
  console.log(failures.length ? 'FAILURES:\n' + failures.join('\n') : `PASS: ${report.length} shared-picks checks`);
  if (failures.length) process.exitCode = 1;
})().catch(e => { console.error(e); process.exit(1); });
