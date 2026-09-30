/* CTE Network v36 — "Put CTE on your Home Screen" card (Sportsbook page).
 * Self-contained: no dependencies, does not touch the Sportsbook script.
 * Shows only on phones/tablets, only when the site is NOT already running as an installed app,
 * and stays away once dismissed. Add ?install to the URL to force it on any device (for testing). */
(function () {
  'use strict';
  if (!document.body || document.body.dataset.view !== 'sportsbook') return;

  var KEY = 'cte_install_card_v1';
  var force = /(^|[?&])install(=|&|$)/.test(location.search);
  var ua = navigator.userAgent || '';
  var isIOS = /iPad|iPhone|iPod/.test(ua) || (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var isAndroid = /Android/i.test(ua);
  var standalone = navigator.standalone === true || (window.matchMedia && matchMedia('(display-mode: standalone)').matches);

  function dismissed() { try { return localStorage.getItem(KEY) === 'dismissed'; } catch (_) { return false; } }
  function remember() { try { localStorage.setItem(KEY, 'dismissed'); } catch (_) {} }

  if (!force && (standalone || dismissed() || !(isIOS || isAndroid))) return;

  var deferredPrompt = null;
  addEventListener('beforeinstallprompt', function (e) { e.preventDefault(); deferredPrompt = e; var b = document.getElementById('cteInstallNative'); if (b) b.hidden = false; });
  addEventListener('appinstalled', function () { remember(); remove(); });

  var SHARE_SVG = '<svg class="cte-inst-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M12 3v12M8 7l4-4 4 4M6 11H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8a1 1 0 0 0-1-1h-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  var PLUS_SVG = '<svg class="cte-inst-ico" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><rect x="4" y="4" width="16" height="16" rx="4" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 8v8M8 12h8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>';

  var steps = (isAndroid && !isIOS)
    ? ['Tap the <b>\u22EE menu</b> at the top right of Chrome.', 'Tap <b>Install app</b> (or <b>Add to Home screen</b>).', 'Tap <b>Install</b>. CTE shows up with your other apps.']
    : ['Tap the <b>Share</b> button ' + SHARE_SVG + ' in Safari (bottom of the screen).', 'Scroll down and tap <b>Add to Home Screen</b> ' + PLUS_SVG, 'Tap <b>Add</b>. Open CTE from your Home Screen from now on.'];

  var card = document.createElement('aside');
  card.className = 'cte-install';
  card.id = 'cteInstall';
  card.setAttribute('aria-labelledby', 'cteInstallTitle');
  card.innerHTML =
    '<div class="cte-inst-row">' +
      '<img class="cte-inst-app" src="app-icon-192.png" alt="" width="44" height="44">' +
      '<div class="cte-inst-copy"><h2 id="cteInstallTitle">Put CTE on your Home Screen</h2>' +
      '<p>Opens full screen like a real app, one tap away.</p></div>' +
      '<button type="button" class="cte-inst-x" id="cteInstallClose" aria-label="Dismiss install tip">\u00D7</button>' +
    '</div>' +
    '<div class="cte-inst-actions">' +
      '<button type="button" class="cte-inst-btn" id="cteInstallToggle" aria-expanded="false" aria-controls="cteInstallSteps">Show me how</button>' +
      '<button type="button" class="cte-inst-btn is-primary" id="cteInstallNative" hidden>Install</button>' +
    '</div>' +
    '<ol class="cte-inst-steps" id="cteInstallSteps" hidden>' + steps.map(function (s) { return '<li>' + s + '</li>'; }).join('') +
    (isIOS ? '<li class="cte-inst-note">Don\u2019t see it? Open this page in <b>Safari</b> first.</li>' : '') + '</ol>';

  function remove() { var c = document.getElementById('cteInstall'); if (c && c.parentNode) c.parentNode.removeChild(c); }

  function mount() {
    if (document.getElementById('cteInstall')) return;
    var anchor = document.querySelector('.bk-tabs'), mast = document.querySelector('.bk-mast');
    if (anchor && anchor.parentNode) anchor.parentNode.insertBefore(card, anchor);
    else if (mast && mast.parentNode) mast.parentNode.insertBefore(card, mast.nextSibling);
    else return;
    var toggle = card.querySelector('#cteInstallToggle'), list = card.querySelector('#cteInstallSteps');
    toggle.addEventListener('click', function () {
      var open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open)); list.hidden = open; toggle.textContent = open ? 'Show me how' : 'Hide steps';
    });
    card.querySelector('#cteInstallClose').addEventListener('click', function () { remember(); remove(); });
    card.querySelector('#cteInstallNative').addEventListener('click', function () {
      if (!deferredPrompt) return;
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then(function (r) { if (r && r.outcome === 'accepted') { remember(); remove(); } deferredPrompt = null; });
    });
    if (deferredPrompt) card.querySelector('#cteInstallNative').hidden = false;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount); else mount();
})();
