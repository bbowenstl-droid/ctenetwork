#!/usr/bin/env node
/*
 * State of the Union browser QA (development only, read-only).
 * Needs tools/qa/serve-pages.cjs running (BASE, default http://localhost:8080/ctenetwork/)
 * and playwright (+ @axe-core/playwright if AXE=1) resolvable from PW_DIR.
 *
 * MODE=mock  (default) Sleeper requests are answered from data/sotu/snapshot.json,
 *            so the "live" code path runs deterministically without network.
 * MODE=down  Sleeper requests are aborted: the page must fall back to the saved copy.
 * MODE=slow  Sleeper never answers: the page must give up and fall back.
 * MODE=live  Requests go to the real Sleeper API.
 * Writes screenshots and a JSON report to OUT (default qa-out/sotu).
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire((process.env.PW_DIR || process.cwd()) + '/');
const { chromium, webkit } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8080/ctenetwork/';
const OUT = process.env.OUT || 'qa-out/sotu';
const MODE = process.env.MODE || 'mock';
const WIDTHS = (process.env.WIDTHS || '320,375,390,430,768,1280').split(',').map(Number);
const ENGINES = (process.env.ENGINES || 'chromium').split(',');
const snap = JSON.parse(fs.readFileSync('data/sotu/snapshot.json', 'utf8')).responses;
if (process.env.THREE_TEAM) { // add the three-team deal that completed after the snapshot was taken
  const k = Object.keys(snap).filter(p => /transactions\/10$/.test(p)).pop();
  snap[k] = [...snap[k], { type: 'trade', status: 'complete', transaction_id: '1426706170696990720', created: 1794700000000, status_updated: 1794700000000, leg: 10, roster_ids: [1, 4, 6], adds: { 11625: 6, 13301: 4, 7588: 1 }, drops: { 11625: 1, 13301: 6, 7588: 4 }, draft_picks: [{ season: '2027', round: 1, roster_id: 2, owner_id: 4, previous_owner_id: 1 }], waiver_budget: [] }];
}
fs.mkdirSync(OUT, { recursive: true });

async function wire(page, stats) {
  await page.route('https://api.sleeper.app/**', async route => {
    const p = new URL(route.request().url()).pathname.replace(/^\/v1/, '');
    stats.requests++;
    if (MODE === 'live') return route.continue();
    if (MODE === 'down') return route.abort('connectionrefused');
    if (MODE === 'slow') return; // never answer
    if (p === '/state/nfl') return route.fulfill({ json: { season: '2026', week: 10, leg: 10, season_type: 'regular' } });
    if (p in snap) return route.fulfill({ json: snap[p] });
    if (/\/(matchups|transactions)\/\d+$/.test(p)) return route.fulfill({ json: [] });
    return route.fulfill({ status: 404, json: null });
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com|firebase|googleapis\.com/, r => r.abort());
}

const report = [];
for (const engine of ENGINES) {
  const browser = await (engine === 'webkit' ? webkit : chromium).launch();
  for (const width of WIDTHS) {
    const mobile = width <= 430;
    const ctx = await browser.newContext({ viewport: { width, height: mobile ? 844 : 900 }, deviceScaleFactor: mobile ? 2 : 1, hasTouch: mobile, serviceWorkers: 'block' });
    const page = await ctx.newPage();
    const stats = { requests: 0 }, errors = [];
    page.on('pageerror', e => errors.push('pageerror: ' + e.message));
    page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource|ERR_FAILED|ERR_CONNECTION/.test(m.text())) errors.push('console: ' + m.text().slice(0, 200)); });
    await wire(page, stats);
    const t0 = Date.now();
    await page.goto(BASE + 'state-of-the-union.html' + (process.env.HASH || ''), { waitUntil: 'load' });
    await page.waitForFunction(() => window.CTESotu && window.CTESotu.model, null, { timeout: MODE === 'slow' ? 60000 : 30000 });
    const readyMs = Date.now() - t0;
    const first = stats.requests;
    // Render every lazy section, open one tree, one journey, one franchise.
    await page.evaluate(async () => { location.hash = 'records'; await new Promise(r => setTimeout(r, 400)); });
    await page.click('[data-tree]'); await page.click('.sotu-side .sotu-asset');
    await page.evaluate(() => { document.querySelector('.sotu-fr details').open = true; });
    await page.waitForTimeout(300);
    const dom = await page.evaluate(() => {
      const de = document.documentElement, wide = [];
      for (const el of document.querySelectorAll('main *')) { const r = el.getBoundingClientRect(); if (r.width && r.right > de.clientWidth + 1) { let p = el.parentElement, clipped = false; while (p && p !== document.body) { if (/(auto|scroll|hidden|clip)/.test(getComputedStyle(p).overflowX)) { clipped = true; break; } p = p.parentElement; } if (!clipped) wide.push(el.className || el.tagName); } }
      const small = [...document.querySelectorAll('main button, main a, main summary, main select, main input')].filter(el => { const r = el.getBoundingClientRect(); return r.width && (r.height < 24 || r.width < 24); }).map(el => (el.className || el.tagName) + ' ' + Math.round(el.getBoundingClientRect().width) + 'x' + Math.round(el.getBoundingClientRect().height));
      const ids = {}; for (const el of document.querySelectorAll('[id]')) ids[el.id] = (ids[el.id] || 0) + 1;
      return { mode: window.CTESotu.mode, overflow: de.scrollWidth > de.clientWidth + 1, scrollWidth: de.scrollWidth, wide: [...new Set(wide)].slice(0, 8), small: [...new Set(small)].slice(0, 8), h1: document.querySelectorAll('h1').length, dupIds: Object.entries(ids).filter(([, n]) => n > 1).map(([k]) => k),
        trades: document.querySelectorAll('.sotu-trade').length, franchises: document.querySelectorAll('.sotu-fr').length, seasons: document.querySelectorAll('.sotu-season').length, takes: document.querySelectorAll('#sotuTakes li p').length, tree: document.querySelectorAll('.sotu-tree-wrap:not([hidden]) .sotu-node').length, journey: document.querySelectorAll('.sotu-journey-list li').length, recs: document.querySelectorAll('.sotu-rec').length,
        status: document.getElementById('sotuStatus').textContent.trim(), notice: document.getElementById('sotuNotice').textContent.trim().slice(0, 90), cached: Object.keys(sessionStorage).filter(k => k.startsWith('cte_sotu_v1:')).length };
    });
    let axe = null;
    if (process.env.AXE) { const AxeBuilder = require('@axe-core/playwright').default; const r = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze(); axe = r.violations.map(v => `${v.id} (${v.impact}×${v.nodes.length}): ${v.nodes.slice(0, 4).map(n => n.target.join(' ') + (n.any && n.any[0] && n.any[0].data && n.any[0].data.contrastRatio ? ` [${n.any[0].data.fgColor}/${n.any[0].data.bgColor}=${n.any[0].data.contrastRatio}]` : '')).join(' || ')}`); }
    if (process.env.SHOTS !== '0') {
      await page.evaluate(() => scrollTo(0, 0)); await page.waitForTimeout(150);
      await page.screenshot({ path: path.join(OUT, `${engine}-${MODE}-${width}-top.png`) });
      await page.screenshot({ path: path.join(OUT, `${engine}-${MODE}-${width}-full.png`), fullPage: true });
    }
    // Second visit in the same session must not refetch finished seasons.
    let reload = null;
    if (MODE === 'mock') { stats.requests = 0; await page.reload({ waitUntil: 'load' }); await page.waitForFunction(() => window.CTESotu && window.CTESotu.model); reload = stats.requests; }
    report.push({ engine, width, readyMs, requests: first, reloadRequests: reload, errors, ...dom, axe });
    await ctx.close();
  }
  await browser.close();
}
fs.writeFileSync(path.join(OUT, `report-${MODE}.json`), JSON.stringify(report, null, 1));
for (const r of report) console.log(JSON.stringify(r));
const bad = report.filter(r => r.errors.length || r.overflow || r.h1 !== 1 || r.dupIds.length || !r.trades || !r.franchises || !r.takes || (r.axe && r.axe.length));
console.log(bad.length ? `FAIL: ${bad.length} of ${report.length} loads have problems` : `PASS: ${report.length} loads (${MODE})`);
process.exit(bad.length ? 1 : 0);
