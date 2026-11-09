// Pendaftaran service worker + banner pasang. Tidak menyimpan data pembeli.
(function () {
  var script = document.currentScript;
  var rootAttr = (script && script.getAttribute('data-root')) || './';
  var base = new URL(rootAttr, location.href);
  var hadController = !!(navigator.serviceWorker && navigator.serviceWorker.controller);

  function standalone() {
    return matchMedia('(display-mode: standalone)').matches
      || matchMedia('(display-mode: fullscreen)').matches
      || navigator.standalone === true;
  }

  function showHold() {
    if (document.getElementById('pwa-update')) return;
    var box = document.createElement('div');
    box.id = 'pwa-update';
    box.setAttribute('role', 'status');
    box.style.cssText = 'position:fixed;left:12px;right:12px;bottom:12px;z-index:60;background:#082c50;color:#fff;padding:10px 12px;border-radius:14px;font:14px/1.4 system-ui,sans-serif;display:flex;gap:8px;align-items:center;box-shadow:0 8px 24px #0004';
    var text = document.createElement('span');
    text.style.flex = '1';
    text.textContent = 'Pembaruan iTAP siap. Muat ulang setelah transaksi selesai supaya isian yang belum disimpan tidak hilang.';
    var button = document.createElement('button');
    button.type = 'button';
    button.textContent = 'Muat ulang';
    button.style.cssText = 'border:0;border-radius:999px;padding:8px 12px;font-weight:700;background:#fff;color:#082c50';
    button.addEventListener('click', function () { location.reload(); });
    box.appendChild(text);
    box.appendChild(button);
    document.body.appendChild(box);
  }

  if ('serviceWorker' in navigator) {
    var swUrl = new URL('sw.js', base).href;
    navigator.serviceWorker.register(swUrl, { scope: base.pathname, updateViaCache: 'none' }).then(function (reg) {
      var poke = function () { reg.update().catch(function () {}); };
      poke();
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible') poke();
      });
    }).catch(function () {});

    var reloaded = false;
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController || reloaded) return;
      if (/\/kasir\//.test(location.pathname)) {
        showHold();
        return;
      }
      reloaded = true;
      location.reload();
    });
  }

  document.addEventListener('click', function (event) {
    var link = event.target.closest && event.target.closest('a[href]');
    if (!link || navigator.onLine) return;
    var url;
    try { url = new URL(link.href, location.href); } catch (err) { return; }
    if (url.origin === location.origin) return;
    if (/lynk\.id|wa\.me|api\.whatsapp\.com|linktr\.ee|grab\.com|gofood\.link/i.test(url.href)) {
      event.preventDefault();
      window.alert('Tautan ini butuh internet. Pembelian, Lynk, Linktree, Grab/GoFood, dan WhatsApp tidak berjalan offline.');
    }
  }, true);

  var bar = document.getElementById('pwa-install');
  if (!bar || standalone()) return;
  try {
    if (localStorage.getItem('itap_pwa_x') === '1') return;
    var dismissed = Number(localStorage.getItem('itap_pwa_dismiss') || 0);
    if (dismissed && Date.now() - dismissed < 30 * 86400000) return;
  } catch (err) {}

  var installBtn = bar.querySelector('[data-install]');
  var iosHelp = bar.querySelector('[data-ios]');
  var androidHelp = bar.querySelector('[data-android]');
  var closeBtn = bar.querySelector('[data-close]');
  if (closeBtn) closeBtn.addEventListener('click', function () {
    try { localStorage.setItem('itap_pwa_dismiss', String(Date.now())); } catch (err) {}
    bar.hidden = true;
  });

  var inlineBtn = document.getElementById('pwa-inline');
  var deferred = null;
  window.addEventListener('beforeinstallprompt', function (event) {
    event.preventDefault();
    deferred = event;
    if (iosHelp) iosHelp.hidden = true;
    if (androidHelp) androidHelp.hidden = false;
    if (installBtn) installBtn.hidden = false;
    if (bar) bar.hidden = false;
    if (inlineBtn) inlineBtn.hidden = false;
  });

  function runPrompt() {
    if (!deferred) return;
    var promptEvent = deferred;
    deferred = null;
    promptEvent.prompt();
    promptEvent.userChoice.then(function (choice) {
      if (choice.outcome === 'accepted' && bar) bar.hidden = true;
    }).catch(function () {});
  }
  if (installBtn) installBtn.addEventListener('click', runPrompt);
  if (inlineBtn) inlineBtn.addEventListener('click', runPrompt);

  window.addEventListener('appinstalled', function () {
    try { localStorage.setItem('itap_pwa_x', '1'); } catch (err) {}
    bar.hidden = true;
  });

  var ua = navigator.userAgent || '';
  var ios = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  if (ios && !deferred) {
    if (installBtn) installBtn.hidden = true;
    if (inlineBtn) inlineBtn.hidden = true;
    if (androidHelp) androidHelp.hidden = true;
    if (iosHelp) iosHelp.hidden = false;
    if (bar) bar.hidden = false;
  }
})();

(function () {
  var box = document.getElementById('apk-dl');
  if (!box) return;
  var verEl = box.querySelector('[data-apk-ver]');
  var link = box.querySelector('[data-apk-link]');
  var shaEl = box.querySelector('[data-apk-sha]');
  fetch('downloads/itap-android.json', { cache: 'no-store' }).then(function (res) {
    if (!res.ok) throw new Error('meta');
    return res.json();
  }).then(function (meta) {
    if (!meta || meta.channel !== 'test' || !meta.version || !meta.file || !meta.sha256) return;
    if (!/^downloads\/itap-belitung-[0-9a-z.+-]+\.apk$/.test(meta.file)) return;
    if (meta.file.indexOf(meta.version) === -1) return;
    if (!/^[a-f0-9]{64}$/.test(meta.sha256)) return;
    return fetch(meta.file, { method: 'HEAD', cache: 'no-store' }).then(function (head) {
      if (!head.ok) return;
      var len = Number(head.headers.get('content-length') || 0);
      if (len && len < 20000) return;
      verEl.textContent = meta.version;
      if (verEl.textContent !== meta.version) return;
      link.href = meta.file;
      link.setAttribute('download', meta.file.split('/').pop());
      shaEl.textContent = meta.sha256;
      box.hidden = false;
    });
  }).catch(function () {});
})();
