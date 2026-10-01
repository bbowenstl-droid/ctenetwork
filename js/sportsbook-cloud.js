/**
 * CTE SPORTSBOOK — shared picks (Firebase Realtime Database).
 *
 * How identity works without passwords:
 *  - The commissioner gives each owner a 6-character league code (set from sportsbook.html#commissioner).
 *    Only a SHA-256 hash of the code is stored, at book/<season>/pins/<owner>, which nobody can read.
 *  - An owner "links" a device once by entering their code. The device writes the hash to
 *    book/<season>/links/<owner>/<its anonymous uid>. Database rules only accept that write when the
 *    hash matches the pin, and links are unreadable, so the code never becomes public.
 *  - Cards and parlays can only be written by a linked device, only before that week's lockAt,
 *    and are hidden from everyone else until lock. Rules live in SPORTSBOOK.md.
 *
 * The backend is swappable (tests inject window.CTE_BOOK_CLOUD_BACKEND):
 *   signIn() -> uid, get(path) -> value|null, update({path: value}), set(path, value)
 * Errors carry code 'PERMISSION_DENIED' when rules reject a request.
 */
(function () {
  'use strict';
  const LS = 'cte_book_v1:link';
  const SDK = 'https://www.gstatic.com/firebasejs/10.12.5/';
  let backendPromise = null, uid = null;

  function firebaseBackend() {
    const cfg = window.CTE_FIREBASE_CONFIG;
    if (!cfg || !cfg.apiKey || !cfg.databaseURL) return Promise.reject(Object.assign(new Error('Firebase is not configured.'), { code: 'NOT_CONFIGURED' }));
    return Promise.all([import(SDK + 'firebase-app.js'), import(SDK + 'firebase-auth.js'), import(SDK + 'firebase-database.js')]).then(([appMod, authMod, dbMod]) => {
      // Default app: same anonymous device ID as the draft admin page, so one commissioner ID covers both.
      const app = appMod.getApps().find(a => a.name === '[DEFAULT]') || appMod.initializeApp(cfg);
      const auth = authMod.getAuth(app), db = dbMod.getDatabase(app);
      const wrap = p => p.catch(e => { const denied = /permission[_ ]denied/i.test(String(e && (e.code || e.message))); throw Object.assign(new Error(denied ? 'PERMISSION_DENIED' : (e && e.message) || 'Network error'), { code: denied ? 'PERMISSION_DENIED' : 'NETWORK' }); });
      return {
        signIn: () => wrap(authMod.signInAnonymously(auth).then(c => c.user.uid)),
        get: path => wrap(dbMod.get(dbMod.ref(db, path)).then(s => (s.exists() ? s.val() : null))),
        update: map => wrap(dbMod.update(dbMod.ref(db), map)),
        set: (path, value) => wrap(dbMod.set(dbMod.ref(db, path), value))
      };
    });
  }
  function backend() {
    if (!backendPromise) {
      backendPromise = (window.CTE_BOOK_CLOUD_BACKEND ? Promise.resolve(window.CTE_BOOK_CLOUD_BACKEND) : firebaseBackend())
        .then(b => b.signIn().then(id => { uid = id; return b; }));
      backendPromise.catch(() => { backendPromise = null; });
    }
    return backendPromise;
  }
  const withTimeout = (p, ms = 9000) => Promise.race([p, new Promise((_, no) => setTimeout(() => no(Object.assign(new Error('Timed out'), { code: 'TIMEOUT' })), ms))]);

  async function sha256Hex(text) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  const normCode = code => String(code || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  const pinHash = (season, owner, code) => sha256Hex(`cte-book|${season}|${owner}|${normCode(code)}`);
  const base = season => `book/${season}`;
  const readLink = () => { try { return JSON.parse(localStorage.getItem(LS) || 'null'); } catch (_) { return null; } };
  const writeLink = v => { try { v ? localStorage.setItem(LS, JSON.stringify(v)) : localStorage.removeItem(LS); } catch (_) {} };

  const Cloud = {
    /** Resolves true when the database is reachable and signed in. Never throws. */
    async ready() { try { await withTimeout(backend()); return true; } catch (_) { return false; } },
    get uid() { return uid; },
    linkedOwner(season) { const l = readLink(); return l && Number(l.season) === Number(season) ? l.ownerId : null; },
    unlink() { writeLink(null); },
    normCode, pinHash,

    /** Link this device to an owner. Returns true on success, false when the code is wrong. */
    async link(season, ownerId, code) {
      const b = await withTimeout(backend()), h = await pinHash(season, ownerId, code);
      try { await withTimeout(b.update({ [`${base(season)}/links/${ownerId}/${uid}`]: h })); }
      catch (e) { if (e.code === 'PERMISSION_DENIED') return false; throw e; }
      writeLink({ season, ownerId, at: Date.now() });
      return true;
    },
    /** Checks the link is still valid (commissioner may have reset the code). */
    async verifyLink(season, week, ownerId) {
      const b = await withTimeout(backend());
      try { await b.get(`${base(season)}/weeks/${week}/cards/${ownerId}`); return true; }
      catch (e) { if (e.code === 'PERMISSION_DENIED') { writeLink(null); return false; } throw e; }
    },
    async saveEntry(season, week, ownerId, kind, entry) {
      const b = await withTimeout(backend()), w = `${base(season)}/weeks/${week}`, col = kind === 'parlay' ? 'parlays' : 'cards';
      const doc = { ids: entry.ids.slice(), lockedAt: entry.lockedAt || new Date().toISOString(), by: uid };
      doc.quotes = entry.quotes || window.CTE_BookEngine.quoteSnapshot(window.CTE_SPORTSBOOK, entry.ids);
      await withTimeout(b.update({ [`${w}/${col}/${ownerId}`]: doc, [`${w}/status/${ownerId}/${kind}`]: Date.now() }));
      return { ownerId, ...doc, storage: 'cloud' };
    },
    async removeEntry(season, week, ownerId, kind) {
      const b = await withTimeout(backend()), w = `${base(season)}/weeks/${week}`, col = kind === 'parlay' ? 'parlays' : 'cards';
      await withTimeout(b.update({ [`${w}/${col}/${ownerId}`]: null, [`${w}/status/${ownerId}/${kind}`]: null }));
    },
    async ownEntries(season, week, ownerId) {
      const b = await withTimeout(backend()), w = `${base(season)}/weeks/${week}`;
      const [card, parlay] = await Promise.all([b.get(`${w}/cards/${ownerId}`), b.get(`${w}/parlays/${ownerId}`)]);
      return { card, parlay };
    },
    /** Who has submitted (visible before lock; contains no picks). */
    async status(season, week) { const b = await withTimeout(backend()); return (await b.get(`${base(season)}/weeks/${week}/status`)) || {}; },
    /** Everyone's cards and parlays. Rules only allow this after lock; returns null before. */
    async all(season, week) {
      const b = await withTimeout(backend()), w = `${base(season)}/weeks/${week}`;
      try { const [cards, parlays] = await Promise.all([b.get(`${w}/cards`), b.get(`${w}/parlays`)]); return { cards: cards || {}, parlays: parlays || {} }; }
      catch (e) { if (e.code === 'PERMISSION_DENIED') return null; throw e; }
    },

    /* ---- Commissioner (rules only accept these from the commissioner device) ---- */
    async commissionerSetup(season, week, lockAtMs, codes) {
      const b = await withTimeout(backend()), map = { [`${base(season)}/weeks/${week}/lockAt`]: lockAtMs };
      for (const [ownerId, code] of Object.entries(codes || {})) map[`${base(season)}/pins/${ownerId}`] = await pinHash(season, ownerId, code);
      await withTimeout(b.update(map));
    },
    async lockAt(season, week) { const b = await withTimeout(backend()); return b.get(`${base(season)}/weeks/${week}/lockAt`); },
    generateCode() {
      const abc = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789', r = new Uint32Array(6); crypto.getRandomValues(r);
      return [...r].map(n => abc[n % abc.length]).join('').replace(/^(.{3})/, '$1-');
    }
  };
  window.CTE_BookCloud = Cloud;
})();
