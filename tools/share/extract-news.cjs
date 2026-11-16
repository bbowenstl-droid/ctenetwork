#!/usr/bin/env node
/*
 * Prints the newsroom as JSON (metadata only) by executing the same news
 * scripts, in the same order, that news.html loads. Read-only; no network.
 */
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = path.resolve(__dirname, '..', '..');
const html = fs.readFileSync(path.join(root, 'news.html'), 'utf8');
const files = [...html.matchAll(/<script[^>]*\bsrc="(news[^"?]*\.js)(?:\?[^"]*)?"/g)].map(m => m[1]);
if (!files.length) throw new Error('No news scripts found in news.html');

const noop = () => {};
const el = new Proxy(function () {}, { get: (t, k) => (k === Symbol.toPrimitive ? () => '' : el), apply: () => el, set: () => true });
const window = { addEventListener: noop, location: { search: '', pathname: '/' } };
const document = { readyState: 'complete', addEventListener: noop, querySelector: () => null, querySelectorAll: () => [], getElementById: () => null, createElement: () => el, currentScript: null, body: el, head: el };
const ctx = vm.createContext({ window, document, console: { log: noop, warn: noop, error: noop }, setTimeout: noop, clearTimeout: noop, URLSearchParams, Date, JSON, Math });
ctx.self = window;
for (const f of files) vm.runInContext(fs.readFileSync(path.join(root, f), 'utf8'), ctx, { filename: f });

const seen = new Set();
const out = [];
for (const a of window.CTE_NEWS || []) {
  if (!a || !a.id || seen.has(a.id)) continue;
  seen.add(a.id);
  out.push({ id: a.id, date: a.date || '', category: a.category || '', kicker: a.kicker || '', author: a.author || '', title: a.title || '', subtitle: a.subtitle || '', excerpt: a.excerpt || '' });
}
out.sort((a, b) => String(b.date).localeCompare(String(a.date)) || a.id.localeCompare(b.id));
process.stdout.write(JSON.stringify(out, null, 1));
