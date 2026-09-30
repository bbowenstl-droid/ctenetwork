/* CTE Sportsbook browser tests — node tools/test-sportsbook-ui.cjs (needs Playwright). Mocked Sleeper; never hits the network. */
const fs = require('fs'), path = require('path'), { chromium } = require('playwright');
const root = path.resolve(__dirname, '..'), out = path.resolve('review-v32'); fs.mkdirSync(out, { recursive: true });
const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.webp': 'image/webp', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = require('http').createServer((req, res) => { const f = path.join(root, decodeURIComponent(req.url.split('?')[0])); try { res.setHeader('Content-Type', types[path.extname(f)] || 'text/plain'); res.end(fs.readFileSync(f)); } catch (_) { res.statusCode = 404; res.end('Not found'); } });

// Sleeper fixture: rosters 1–12 follow the 2026 rosterOwnerMap; Week 4 pairs match the book.
const OWNERS = { 1: 'brendan', 2: 'jacob', 3: 'brett', 4: 'mike', 5: 'carter', 6: 'dan', 7: 'isaiah', 8: 'cotton', 9: 'jerry', 10: 'jesse', 11: 'elijah', 12: 'troy' };
const W4 = [[1, 2], [3, 5], [4, 9], [6, 7], [8, 12], [10, 11]];
const rosters = Object.keys(OWNERS).map(Number).map(i => ({ roster_id: i, owner_id: 'u' + i, settings: { wins: i % 4, losses: 3 - i % 4, ties: 0, fpts: 300 + i * 11, fpts_decimal: 40 }, players: [], starters: [] }));
const users = rosters.map(r => ({ user_id: r.owner_id, display_name: 'user' + r.roster_id, metadata: { team_name: 'Team ' + r.roster_id } }));
const weekRows = (week, pts) => W4.flatMap(([a, b], i) => [a, b].map((r, j) => ({ roster_id: r, matchup_id: i + 1, points: pts ? pts(r, j, week) : 0, starters: ['4046', '6794', 'KC'], players_points: { 4046: 20 + r, 6794: 11 } })));
function fixture(context, { leg = 3, live = null } = {}) {
  return context.route('https://api.sleeper.app/**', route => {
    const u = new URL(route.request().url()), p = u.pathname; let data;
    if (p.endsWith('/users')) data = users; else if (p.endsWith('/rosters')) data = rosters;
    else if (p.includes('/matchups/')) { const w = Number(p.split('/').pop()); data = w === 4 ? weekRows(4, live) : w < 4 ? weekRows(w, (r, j, wk) => 90 + r * 3 + wk * 2 + j) : []; }
    else if (p.includes('/transactions/')) data = []; else if (p.includes('/players/')) data = { 4046: { full_name: 'Test QB', position: 'QB' }, 6794: { full_name: 'Test WR', position: 'WR' } };
    else if (p.endsWith('/drafts')) data = []; else data = { settings: { leg, playoff_week_start: 15 }, roster_positions: ['QB', 'RB', 'WR'], season: '2026', status: 'in_season' };
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(data) });
  }).then(() => context.route('https://sleepercdn.com/**', r => r.abort())).then(() => context.route('https://www.gstatic.com/**', r => r.abort()));
}
const BEFORE_LOCK = '2026-09-30T18:00:00-05:00', AFTER_LOCK = '2026-10-04T15:00:00-05:00';

(async () => {
  await new Promise(r => server.listen(8766, '127.0.0.1', r));
  const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage'] });
  const failures = [], report = [];
  const check = (ok, msg) => { if (!ok) failures.push(msg); else report.push('ok ' + msg); };
  async function page(width, opts = {}) {
    const c = await browser.newContext({ viewport: { width, height: opts.height || 900 }, deviceScaleFactor: opts.dpr || 1, serviceWorkers: 'block', reducedMotion: opts.motion || 'reduce', hasTouch: width < 821 });
    await fixture(c, opts); await c.addInitScript(t => { window.CTE_BOOK_NOW = t; }, opts.now || BEFORE_LOCK);
    const p = await c.newPage(); const errors = []; p.on('pageerror', e => errors.push(e.message)); p.on('console', m => { if (m.type() === 'error' && !/sleepercdn|gstatic|ERR_FAILED|net::/.test(m.text())) errors.push(m.text()); });
    return { c, p, errors };
  }
  const overflow = p => p.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);

  /* 1. Board, odds, selection, slip math, 3+3 enforcement — mobile */
  for (const width of [375, 390, 430]) {
    const { c, p, errors } = await page(width);
    await p.goto('http://127.0.0.1:8766/sportsbook.html'); await p.waitForSelector('.bk-market .bk-team-sub:not(:has(.bk-skel))');
    check(await p.locator('.bk-market').count() === 6, `${width}: six markets`);
    const txt = await p.locator('#panel-board').innerText();
    for (const s of ['+16.5', '\u2212105', '\u221216.5', '\u2212115', '+525', '\u2212750', '\u221212.5', '\u2212120', '+100', '\u2212475', '+350', '+14.5', '+450', '\u2212625', '+4.5', '+170', '\u2212210', '+9.5', '+105', '\u2212125', '+310', '\u2212400', '+7.5', '\u2212110', '+260', '\u2212325'])
      check(txt.includes(s), `${width}: board shows ${s}`);
    check(!await overflow(p), `${width}: no horizontal overflow on board`);
    if (width === 390) await p.screenshot({ path: `${out}/m-board.png` });
    await p.click('[data-sel="w4-brendan-jacob:ml:jacob"]');
    check(await p.getAttribute('[data-sel="w4-brendan-jacob:ml:jacob"]', 'aria-pressed') === 'true', `${width}: select sets pressed`);
    check(await p.locator('#bkPill').isVisible(), `${width}: slip pill appears`);
    await p.click('[data-sel="w4-brendan-jacob:ml:jacob"]');
    check(await p.getAttribute('[data-sel="w4-brendan-jacob:ml:jacob"]', 'aria-pressed') === 'false', `${width}: deselect`);
    for (const id of ['w4-brendan-jacob:ml:brendan', 'w4-brett-carter:ml:brett', 'w4-mike-jerry:ml:jerry', 'w4-dan-isaiah:ats:isaiah', 'w4-cotton-troy:ats:troy']) await p.click(`[data-sel="${id}"]`);
    await p.click('[data-sel="w4-jesse-elijah:ml:jesse"]');
    check((await p.locator('#bkToast').innerText()).includes('already has 3 moneylines'), `${width}: 4th ML blocked with message`);
    check(await p.getAttribute('[data-sel="w4-jesse-elijah:ml:jesse"]', 'aria-pressed') === 'false', `${width}: 4th ML not added`);
    await p.click('#bkPill'); await p.waitForTimeout(80);
    check(await p.locator('#bkSheet').evaluate(d => d.open), `${width}: bottom sheet opens`);
    const sheet = await p.locator('#bkSheet').innerText();
    check(/2\s*\/\s*3/.test(sheet) && /5\s*\/\s*6/.test(sheet), `${width}: progress 3 ML / 2 ATS / 5 total`);
    check(await p.locator('#bkSheet [data-lock]').isDisabled(), `${width}: lock disabled at 5 picks`);
    // Brendan ML +525 on 100 → profit 525 return 625; Brett ML −475 → profit 21.05
    check(sheet.includes('CTE$525') && sheet.includes('CTE$625'), `${width}: +525 payout correct`);
    check(sheet.includes('CTE$21.05'), `${width}: \u2212475 payout correct`);
    await p.keyboard.press('Escape'); await p.waitForTimeout(80);
    check(!await p.locator('#bkSheet').evaluate(d => d.open), `${width}: Escape closes sheet`);
    await p.click('[data-sel="w4-jesse-elijah:ats:jesse"]');
    await p.click('#bkPill'); await p.waitForTimeout(80);
    check(await p.locator('#bkSheet [data-lock]').isDisabled(), `${width}: lock needs an owner`);
    await p.selectOption('#bkSheet [data-owner-select]', 'brendan');
    check(!await p.locator('#bkSheet [data-lock]').isDisabled(), `${width}: lock enabled at 3+3 with owner`);
    const sheetText = await p.locator('#bkSheet').innerText();
    // 625+121.05+116+195.24+180+190.91 = 1428.2
    check(sheetText.includes('CTE$1,428.20'), `${width}: total potential return`);
    if (width === 390) await p.screenshot({ path: `${out}/m-sheet.png` });
    await p.click('#bkSheet [data-lock]'); await p.waitForTimeout(500);
    check(await p.locator('#bkReceipt').isVisible(), `${width}: receipt shown after lock`);
    check((await p.locator('#bkReceipt').innerText()).includes('YOUR WEEK 4 CARD IS LOCKED.'), `${width}: confirmation headline`);
    check(await p.locator('[data-sel="w4-brendan-jacob:ml:brendan"]').isDisabled(), `${width}: board locked after card lock`);
    check(!await overflow(p), `${width}: no overflow on receipt`);
    if (width === 390) await p.screenshot({ path: `${out}/m-receipt.png`, fullPage: true });
    await p.reload(); await p.waitForTimeout(150);
    check(await p.locator('#bkWalletCard').innerText() === 'Locked \u2713', `${width}: locked card persists on this device`);
    await p.goto('http://127.0.0.1:8766/sportsbook.html#carl-vs-holly'); await p.waitForTimeout(150);
    check((await p.locator('#panel-duel').innerText()).includes('CTE$1,000'), `${width}: Carl/Holly start at CTE$1,000`);
    check(!await overflow(p), `${width}: no overflow on Carl vs Holly`);
    if (width === 390) await p.screenshot({ path: `${out}/m-duel.png`, fullPage: true });
    for (const tab of ['leaderboard', 'results']) { await p.goto('http://127.0.0.1:8766/sportsbook.html#' + tab); await p.waitForTimeout(120); check(!await overflow(p), `${width}: no overflow on ${tab}`); }
    check(errors.length === 0, `${width}: no console errors (${errors.join(' | ')})`);
    await c.close();
  }

  /* 2. Desktop sticky slip, expanded matchup, keyboard tabs */
  {
    const { c, p, errors } = await page(1440, { height: 1000, motion: 'no-preference' });
    await p.goto('http://127.0.0.1:8766/sportsbook.html'); await p.waitForSelector('.bk-market .bk-team-sub:not(:has(.bk-skel))');
    check(await p.locator('.bk-slip-aside').isVisible(), '1440: desktop slip visible');
    check(!await p.locator('#bkPill').isVisible(), '1440: no mobile pill');
    await p.click('[data-sel="w4-cotton-troy:ats:troy"]');
    check((await p.locator('.bk-slip-aside').innerText()).includes('Troy \u22129.5'), '1440: slip lists selection');
    check((await p.locator('.bk-slip-aside').innerText()).includes('CTE$80'), '1440: \u2212125 on CTE$100 profits CTE$80');
    await p.evaluate(() => scrollTo(0, 900)); await p.waitForTimeout(100);
    const top = await p.locator('.bk-slip-aside').evaluate(e => e.getBoundingClientRect().top);
    check(top > 100 && top < 200, '1440: slip stays sticky while scrolling (' + top + ')');
    await p.evaluate(() => scrollTo(0, 0));
    await p.click('[data-expand="w4-brendan-jacob"]'); await p.waitForTimeout(1200);
    const detail = await p.locator('#d-w4-brendan-jacob').innerText();
    check(detail.includes('Moved 4 pts toward Jacob'), '1440: line movement summary');
    check(detail.includes('Tale of the tape') && /#\d+/.test(detail), '1440: tape with PF rank');
    check(/W1|W2|W3/.test(detail), '1440: last-three scoring from Sleeper');
    check(detail.includes('Head to head'), '1440: head to head block');
    check(detail.includes("hosting is charming"), '1440: Holly take shown');
    check(detail.includes('Jacob wins. Brendan covers.'), '1440: Carl take shown');
    await p.click('[data-expand="w4-brett-carter"]'); await p.waitForTimeout(600);
    check((await p.locator('#d-w4-brett-carter').innerText()).includes("Carl hasn't filed"), '1440: Carl take unavailable state');
    await p.click('[data-lineups="w4-brendan-jacob"]'); await p.waitForTimeout(300);
    check((await p.locator('#d-w4-brendan-jacob').innerText()).includes('Test QB'), '1440: lineups load');
    await p.screenshot({ path: `${out}/d-board.png` });
    await p.locator('#tab-board').focus(); await p.keyboard.press('ArrowRight');
    check(await p.evaluate(() => location.hash) === '#my-card', '1440: arrow keys move between tabs');
    check(errors.length === 0, '1440: no console errors (' + errors.join(' | ') + ')');
    for (const tab of ['carl-vs-holly', 'leaderboard', 'results']) { await p.goto('http://127.0.0.1:8766/sportsbook.html#' + tab); await p.waitForTimeout(900); await p.screenshot({ path: `${out}/d-${tab}.png`, fullPage: true }); }
    await c.close();
  }

  /* 3. LIVE state: markets lock, cover status, no settlement */
  {
    const live = (r, j) => ({ 8: 74.1, 12: 88.4 })[r] ?? 60 + r;
    const { c, p, errors } = await page(390, { now: AFTER_LOCK, leg: 4, live });
    await c.addInitScript(() => localStorage.setItem('cte_book_v1:card:4', JSON.stringify({ ownerId: 'troy', ids: ['w4-brendan-jacob:ml:jacob', 'w4-brett-carter:ml:brett', 'w4-mike-jerry:ml:jerry', 'w4-dan-isaiah:ats:isaiah', 'w4-cotton-troy:ats:troy', 'w4-jesse-elijah:ats:elijah'], lockedAt: '2026-10-01T12:00:00-05:00', storage: 'device' })));
    await p.goto('http://127.0.0.1:8766/sportsbook.html'); await p.waitForSelector('.bk-score');
    check(await p.locator('.bk-odds:not(:disabled)').count() === 0, 'live: every odds button locked');
    check((await p.locator('#bkStatus').innerText()).includes('live'), 'live: status');
    const card = await p.locator('.bk-market[data-market="w4-cotton-troy"]').innerText();
    check(card.includes('88.40') && card.includes('74.10') && /Troy \u22129\.5 \(\+4\.8\).*Covering/s.test(card), 'live: Troy \u22129.5 covering at +14.3 (' + card.replace(/\n/g, ' ') + ')');
    check(!/WON|LOST/.test(await p.locator('#panel-board').innerText()), 'live: nothing settled');
    await p.screenshot({ path: `${out}/m-live.png` });
    await p.goto('http://127.0.0.1:8766/game-day.html'); await p.waitForSelector('.bk-gc');
    check(await p.locator('.n-match-card').count() === 6, 'game day: still six score cards');
    check(await p.locator('.bk-gc').count() === 6, 'game day: six sportsbook lines');
    check(/TROY COVERING|Troy covering/i.test(await p.locator('.bk-gc').nth(4).innerText()), 'game day: cover status on card');
    await p.screenshot({ path: `${out}/m-gameday-live.png` });
    check(errors.length === 0, 'live: no console errors (' + errors.join(' | ') + ')');
    await c.close();
  }

  /* 4. FINAL via Sleeper: graded, leaderboard + results */
  {
    const fin = (r) => ({ 1: 130, 2: 120, 3: 120, 5: 100, 4: 90, 9: 120, 6: 90, 7: 110, 8: 80, 12: 100, 10: 125, 11: 110 })[r];
    const { c, p, errors } = await page(390, { now: '2026-10-07T12:00:00-05:00', leg: 5, live: fin });
    await p.goto('http://127.0.0.1:8766/sportsbook.html#results'); await p.waitForSelector('.bk-result .bk-chip[data-s=won]');
    const res = await p.locator('#panel-results').innerText();
    check(res.includes('Brendan ML') && res.includes('UPSET'), 'final: upset graded');
    check((await p.locator('#bkStatus').innerText()).includes('final'), 'final: status');
    await p.screenshot({ path: `${out}/m-results-final.png`, fullPage: true });
    check(errors.length === 0, 'final: no console errors (' + errors.join(' | ') + ')');
    await c.close();
  }

  /* 5. Sleeper down: lines still work */
  {
    const c = await browser.newContext({ viewport: { width: 390, height: 900 }, serviceWorkers: 'block' });
    await c.route('https://api.sleeper.app/**', r => r.abort()); await c.addInitScript(t => { window.CTE_BOOK_NOW = t; }, BEFORE_LOCK);
    const p = await c.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.goto('http://127.0.0.1:8766/sportsbook.html'); await p.waitForSelector('[data-retry]');
    check(await p.locator('.bk-odds:not(:disabled)').count() === 24, 'offline Sleeper: 24 odds still selectable');
    check(errs.length === 0, 'offline Sleeper: no JS errors');
    await c.close();
  }

  /* 6. Homepage + article embeds + nav */
  for (const width of [390, 1440]) {
    const { c, p, errors } = await page(width);
    await p.goto('http://127.0.0.1:8766/index.html'); await p.waitForSelector('.bk-teaser');
    const t = await p.locator('.bk-teaser').innerText();
    check(t.includes('JACOB') || t.includes('Jacob'), `${width} home: teaser lists lines`);
    check(/6 markets open/i.test(t), `${width} home: markets open count`);
    await p.waitForSelector('.n-score-tile', { timeout: 5000 }).catch(() => {});
    check(await p.locator('.n-score-tile').count() === 6, `${width} home: scores still render`);
    await p.waitForSelector('.x-awards', { timeout: 6000 }).catch(() => {});
    const aw = await p.locator('.x-awards').innerText().catch(() => '');
    check(/Week 2 awards/i.test(aw) && (await p.locator('.x-award').count()) >= 5, `${width} home: last finished week (2) awards render`);
    check(/top score[\s\S]*Troy[\s\S]*131\.00/i.test(aw), `${width} home: top score is Troy 131.00 (` + aw.replace(/\n/g, ' ').slice(0, 120) + ')');
    if (width === 390) await p.locator('.x-awards').screenshot({ path: `${out}/m-awards.png` }).catch(() => {});
    check(await p.locator('.n-navigation a[href="sportsbook.html"]').isVisible(), `${width} nav: Sportsbook link visible`);
    check(!await overflow(p), `${width} home: no overflow`);
    await p.locator('.bk-teaser').scrollIntoViewIfNeeded(); await p.screenshot({ path: `${out}/${width < 800 ? 'm' : 'd'}-home-teaser.png` });
    await p.goto('http://127.0.0.1:8766/article.html?id=2026-week-4-sportsbook-open'); await p.waitForSelector('.bk-embed');
    check(await p.locator('.bk-embed').count() >= 3, `${width} article: embeds hydrate`);
    check(!await overflow(p), `${width} article: no overflow`);
    if (width === 390) await p.screenshot({ path: `${out}/m-article.png`, fullPage: true });
    check(errors.length === 0, `${width} embeds: no console errors (${errors.join(' | ')})`);
    await c.close();
  }

  console.log(failures.length ? 'FAILURES:\n' + failures.join('\n') : `PASS: ${report.length} sportsbook UI checks`);
  fs.writeFileSync(path.join(out, 'qa-sportsbook.json'), JSON.stringify({ report, failures }, null, 2));
  await browser.close(); server.close(); if (failures.length) process.exitCode = 1;
})();
