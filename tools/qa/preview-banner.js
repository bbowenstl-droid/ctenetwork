/* PREVIEW BUILD ONLY — never merged into ctenetwork. Marks bbowenstl-droid.github.io/ctenetwork-preview. */
(function () {
  var m = document.createElement('meta'); m.name = 'robots'; m.content = 'noindex,nofollow'; document.head.appendChild(m);
  function show() {
    if (document.getElementById('ctePreviewBanner')) return;
    var b = document.createElement('div'); b.id = 'ctePreviewBanner'; b.setAttribute('role', 'note');
    b.textContent = 'PREVIEW — CTE 2.0 test copy. Sportsbook and Draft Central here use the REAL league database.';
    b.style.cssText = 'position:fixed;left:0;right:0;bottom:calc(env(safe-area-inset-bottom) + 72px);z-index:9999;margin:0 auto;max-width:520px;padding:6px 10px;background:#b3261e;color:#fff;font:600 12px/1.3 system-ui,-apple-system,sans-serif;text-align:center;border-radius:8px;pointer-events:none;opacity:.92';
    document.body.appendChild(b);
  }
  if (document.body) show(); else document.addEventListener('DOMContentLoaded', show);
})();
