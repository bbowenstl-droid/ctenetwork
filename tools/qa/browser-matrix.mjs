#!/usr/bin/env node
/*
 * CTE Network 2.0 release browser matrix (QA only, read-only).
 *
 * - Serves nothing itself: expects tools/qa/serve-pages.cjs on BASE (default
 *   http://localhost:8080/ctenetwork/) so GitHub Pages project-path asset
 *   resolution is reproduced.
 * - Engines: Chromium (desktop) and WebKit (Safari engine). WebKit at
 *   320/375/390 runs with iPhone user agent, isMobile and touch enabled.
 *   This is NOT a substitute for a real iPhone; it is the closest automated
 *   approximation and is labelled as such in the report.
 * - All Firebase / Google identity network traffic is aborted so no QA run can
 *   read from or write to the production database. Pages are therefore
 *   checked in their Firebase-unavailable state; Sleeper traffic is live.
 * - Outputs qa-out/browser-matrix.json, qa-out/browser-matrix.md and
 *   screenshots under qa-out/shots/.
 */
import { chromium, webkit } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE = process.env.BASE || 'http://localhost:8080/ctenetwork/';
const OUT = process.env.OUT || 'qa-out';
const WIDTHS = [320, 375, 390, 768, 1024, 1440];
const CONCURRENCY = Number(process.env.CONCURRENCY || 6);
const SETTLE_MS = Number(process.env.SETTLE_MS || 3500);
const BLOCK = /(firebaseio\.com|firebasedatabase\.app|identitytoolkit\.googleapis\.com|securetoken\.googleapis\.com|firebaseinstallations\.googleapis\.com|apis\.google\.com\/js\/api|accounts\.google\.com)/i;
const IPHONE_UA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';

fs.mkdirSync(path.join(OUT, 'shots'), { recursive: true });
// Detail templates are also exercised with real deep-link parameters, as linked from the site.
const firstArticle = (fs.readFileSync('news-data.js', 'utf8').match(/"id":"([^"]+)"/) || [])[1];
const DEEP_LINKS = ['article.html?id=' + firstArticle, 'matchup.html?season=2026&week=9&matchup=1', 'rivalry.html?id=duncan', 'team.html?owner=brendan', 'team.html?owner=carter'];
const pages = (process.env.PAGES ? process.env.PAGES.split(',') : [...fs.readdirSync('.').filter(f => f.endsWith('.html')), ...DEEP_LINKS]).sort();

function contextOptions(engine, width) {
  const mobile = engine === 'webkit' && width <= 390;
  return {
    viewport: { width, height: width <= 390 ? 844 : width <= 1024 ? 1024 : 900 },
    isMobile: mobile, hasTouch: mobile, deviceScaleFactor: mobile ? 3 : 1,
    userAgent: mobile ? IPHONE_UA : undefined, serviceWorkers: 'block', reducedMotion: 'no-preference'
  };
}

async function checkOne(browser, engine, page, width, { axe, shot }) {
  const ctx = await browser.newContext(contextOptions(engine, width));
  const tab = await ctx.newPage();
  const consoleErrors = [], pageErrors = [], sameOriginFailures = [], externalFailures = [], blocked = [];
  await tab.route('**/*', route => {
    const u = route.request().url();
    if (BLOCK.test(u)) { blocked.push(u.split('?')[0]); return route.abort('blockedbyclient'); }
    return route.continue();
  });
  tab.on('console', m => { if (m.type() === 'error') consoleErrors.push(m.text().slice(0, 300)); });
  tab.on('pageerror', e => pageErrors.push(String(e.message || e).slice(0, 300)));
  tab.on('requestfailed', r => {
    const u = r.url(); if (BLOCK.test(u)) return;
    (u.startsWith(BASE) ? sameOriginFailures : externalFailures).push(`${r.failure()?.errorText || 'failed'} ${u.split('?')[0]}`);
  });
  tab.on('response', r => {
    const u = r.url();
    if (r.status() >= 400 && !BLOCK.test(u)) (u.startsWith(BASE) ? sameOriginFailures : externalFailures).push(`HTTP ${r.status()} ${u.split('?')[0]}`);
  });
  const t0 = Date.now();
  let status = null, error = null;
  try {
    const resp = await tab.goto(BASE + page, { waitUntil: 'load', timeout: 45000 });
    status = resp && resp.status();
    await tab.waitForTimeout(SETTLE_MS);
  } catch (e) { error = String(e.message || e).slice(0, 300); }
  const loadMs = Date.now() - t0;
  let dom = {};
  try {
    dom = await tab.evaluate(() => {
      const de = document.documentElement;
      const wide = [];
      if (de.scrollWidth > de.clientWidth + 1) {
        for (const el of document.body.querySelectorAll('*')) {
          const r = el.getBoundingClientRect();
          if (r.right > de.clientWidth + 1 && r.width > 0) {
            let p = el.parentElement, clipped = false;
            while (p && p !== document.body) { const s = getComputedStyle(p); if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) { clipped = true; break; } p = p.parentElement; }
            if (!clipped) wide.push((el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + ` right=${Math.round(r.right)}`);
            if (wide.length >= 5) break;
          }
        }
      }
      const imgs = [...document.images].filter(i => i.complete && i.naturalWidth === 0 && i.getAttribute('src')).map(i => i.getAttribute('src')).slice(0, 10);
      const ids = {}; for (const el of document.querySelectorAll('[id]')) ids[el.id] = (ids[el.id] || 0) + 1;
      return {
        title: document.title, lang: de.lang || null, h1: document.querySelectorAll('h1').length,
        scrollWidth: de.scrollWidth, clientWidth: de.clientWidth, overflow: de.scrollWidth > de.clientWidth + 1, overflowCulprits: wide,
        brokenImages: imgs, duplicateIds: Object.entries(ids).filter(([, n]) => n > 1).map(([k]) => k).slice(0, 10),
        hasMain: !!document.querySelector('main,[role=main]'), viewportMeta: !!document.querySelector('meta[name=viewport]'),
        bodyTextLength: (document.body && document.body.innerText || '').length,
        heights: Object.fromEntries(['#playoffField', '#leagueStandings', '#powerRankings', '.cte-home-pulse', '#warOutput', '#bkPersonal'].map(q => [q, document.querySelector(q)]).filter(([, el]) => el).map(([q, el]) => [q, Math.round(el.getBoundingClientRect().height)]))
      };
    });
  } catch (e) { error = error || String(e.message || e).slice(0, 300); }
  let axeResult = null;
  if (axe && !error) {
    try {
      const r = await new AxeBuilder({ page: tab }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
      axeResult = r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length, help: v.help, sample: v.nodes.slice(0, 6).map(n => n.target.join(' ') + (v.id === 'color-contrast' && n.any && n.any[0] && n.any[0].data ? ` [${n.any[0].data.fgColor} on ${n.any[0].data.bgColor} = ${n.any[0].data.contrastRatio}]` : '')) }));
    } catch (e) { axeResult = [{ id: 'axe-error', impact: 'unknown', nodes: 0, help: String(e.message || e).slice(0, 200), sample: [] }]; }
  }
  if (shot && !error) {
    try { await tab.screenshot({ path: path.join(OUT, 'shots', `${engine}-${width}-${page.replace('.html', '').replace(/[^a-z0-9-]+/gi, '_')}.png`), fullPage: false }); } catch {}
  }
  await ctx.close();
  return { engine, page, width, status, error, loadMs, consoleErrors: [...new Set(consoleErrors)], pageErrors: [...new Set(pageErrors)], sameOriginFailures: [...new Set(sameOriginFailures)], externalFailures: [...new Set(externalFailures)], blockedFirebase: [...new Set(blocked)].length, ...dom, axe: axeResult };
}

async function menuInteraction(browser, engine, width) {
  // Shared navigation dialog: open via tap/click, aria-expanded sync, Escape closes, focus returns.
  const ctx = await browser.newContext(contextOptions(engine, width));
  const tab = await ctx.newPage();
  await tab.route('**/*', r => BLOCK.test(r.request().url()) ? r.abort('blockedbyclient') : r.continue());
  const res = { engine, width, steps: [] };
  try {
    await tab.goto(BASE + 'index.html', { waitUntil: 'load', timeout: 45000 });
    await tab.waitForTimeout(1500);
    const btn = tab.locator('.n-menu-button:visible').first();
    if (!(await btn.count())) { res.steps.push('no visible .n-menu-button'); res.pass = false; return res; }
    if (contextOptions(engine, width).hasTouch) await btn.tap(); else await btn.click();
    await tab.waitForTimeout(400);
    const open = await tab.evaluate(() => { const d = document.getElementById('networkMenu'); return { open: !!(d && d.open), expanded: [...document.querySelectorAll('.n-menu-button')].map(b => b.getAttribute('aria-expanded')) }; });
    res.steps.push('after open: ' + JSON.stringify(open));
    await tab.keyboard.press('Escape');
    await tab.waitForTimeout(400);
    const closed = await tab.evaluate(() => { const d = document.getElementById('networkMenu'); const a = document.activeElement; return { open: !!(d && d.open), expanded: [...document.querySelectorAll('.n-menu-button')].map(b => b.getAttribute('aria-expanded')), focusOnTrigger: !!(a && a.classList && a.classList.contains('n-menu-button')) }; });
    res.steps.push('after Escape: ' + JSON.stringify(closed));
    res.pass = open.open && open.expanded.every(v => v === 'true') && !closed.open && closed.expanded.every(v => v === 'false') && closed.focusOnTrigger;
  } catch (e) { res.steps.push('error ' + String(e.message || e).slice(0, 200)); res.pass = false; }
  finally { await ctx.close(); }
  return res;
}

async function pool(items, n, fn) {
  const results = []; let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; results[k] = await fn(items[k]); } }));
  return results;
}

const browsers = { chromium: await chromium.launch(), webkit: await webkit.launch() };
const jobs = [];
for (const engine of Object.keys(browsers)) for (const page of pages) for (const width of WIDTHS) {
  const axe = (engine === 'webkit' && width === 390) || (engine === 'chromium' && width === 1440);
  const shot = (engine === 'webkit' && width === 390) || (engine === 'chromium' && width === 1440) || (engine === 'webkit' && width === 320);
  jobs.push({ engine, page, width, axe, shot });
}
console.log(`Running ${jobs.length} page loads across ${pages.length} pages`);
const results = await pool(jobs, CONCURRENCY, j => checkOne(browsers[j.engine], j.engine, j.page, j.width, j));
const menus = [];
for (const engine of Object.keys(browsers)) for (const width of [320, 390, 768, 1440]) menus.push(await menuInteraction(browsers[engine], engine, width));
await Promise.all(Object.values(browsers).map(b => b.close()));

const problems = r => [
  r.error && 'load error', r.status && r.status >= 400 && `HTTP ${r.status}`, r.overflow && 'horizontal overflow', r.h1 !== 1 && `h1=${r.h1}`,
  r.pageErrors.length && `${r.pageErrors.length} JS exception(s)`, r.sameOriginFailures.length && `${r.sameOriginFailures.length} broken same-origin request(s)`,
  r.brokenImages && r.brokenImages.length && `${r.brokenImages.length} broken image(s)`
].filter(Boolean);
const summary = { base: BASE, generatedAt: new Date().toISOString(), loads: results.length, pages: pages.length, failingLoads: results.filter(r => problems(r).length).length, menus, results };
fs.writeFileSync(path.join(OUT, 'browser-matrix.json'), JSON.stringify(summary, null, 2));

let md = `# Browser matrix\n\nBase: ${BASE} (GitHub Pages project-path emulation). Firebase/Google identity traffic blocked; Sleeper live.\nWebKit ≤390px = iPhone UA + touch emulation, **not a real device**.\n\nLoads: ${results.length}; loads with problems: ${summary.failingLoads}\n\n`;
md += '## Per-page problems\n\n| Page | Engine/width | Problems |\n|---|---|---|\n';
for (const page of pages) {
  const rows = results.filter(r => r.page === page && problems(r).length);
  const grouped = {}; for (const r of rows) { const k = problems(r).join('; '); (grouped[k] = grouped[k] || []).push(`${r.engine[0]}${r.width}`); }
  for (const [k, v] of Object.entries(grouped)) md += `| ${page} | ${v.join(' ')} | ${k} |\n`;
}
md += '\n## Detail (unique messages per page)\n\n';
for (const page of pages) {
  const rs = results.filter(r => r.page === page);
  const uniq = key => [...new Set(rs.flatMap(r => r[key] || []))];
  const items = { pageErrors: uniq('pageErrors'), sameOriginFailures: uniq('sameOriginFailures'), externalFailures: uniq('externalFailures'), overflowCulprits: uniq('overflowCulprits').slice(0, 6), brokenImages: uniq('brokenImages'), duplicateIds: uniq('duplicateIds') };
  if (Object.values(items).some(a => a.length)) {
    md += `### ${page}\n`;
    for (const [k, a] of Object.entries(items)) if (a.length) md += `- **${k}**: ${a.slice(0, 8).map(s => '`' + s.replace(/`/g, "'") + '`').join(', ')}\n`;
    md += '\n';
  }
}
md += '## Axe (WCAG 2.1 A/AA) — webkit 390 + chromium 1440\n\n| Page | Engine/width | Violations (impact × nodes) |\n|---|---|---|\n';
for (const r of results.filter(r => r.axe)) md += `| ${r.page} | ${r.engine} ${r.width} | ${r.axe.length ? r.axe.map(v => `${v.id} (${v.impact}×${v.nodes})`).join(', ') : 'none'} |\n`;
md += '\n## Menu interaction\n\n';
for (const m of menus) md += `- ${m.engine} ${m.width}: **${m.pass ? 'PASS' : 'FAIL'}** — ${m.steps.join(' | ')}\n`;
md += '\n## Load times (median ms per engine)\n\n';
for (const e of Object.keys(browsers)) { const t = results.filter(r => r.engine === e).map(r => r.loadMs).sort((a, b) => a - b); md += `- ${e}: ${t[Math.floor(t.length / 2)]} ms (includes ${SETTLE_MS} ms settle)\n`; }
fs.writeFileSync(path.join(OUT, 'browser-matrix.md'), md);
console.log(md);
console.log('\n## Rendered heights (for layout-shift reservations)');
for (const r of results.filter(r => r.heights && Object.keys(r.heights).length && r.engine === 'chromium')) console.log(`${r.page} ${r.width}: ${JSON.stringify(r.heights)}`);
// Full axe detail (targets) for triage from CI logs.
console.log('\n## Axe detail');
const seen = new Set();
for (const r of results.filter(r => r.axe)) for (const v of r.axe) { const k = r.page + v.id + r.engine; if (seen.has(k)) continue; seen.add(k); console.log(`${r.page} [${r.engine} ${r.width}] ${v.id}: ${v.sample.join(' || ')}`); }
