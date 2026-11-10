// iTAP Belitung — service worker situs utama.
// Naikkan VER tiap rilis aset. Cache lama itap-* dihapus saat aktivasi.
// localStorage / IndexedDB (termasuk data kasir) tidak disentuh.
const VER = 'itap-v64';
const SCOPE = new URL('./', self.location).pathname;
const LIVE = /^data\/(harga-pangan|keuangan|ppob-harga|berita|loker)\.json$/;
const PRECACHE = [
  'index.html',
  'offline.html',
  'style.css',
  'app.js',
  'views.js',
  'data.js',
  'data-belitung.js',
  'ppob.js',
  'berita.js',
  'loker.js',
  'komunitas.js',
  'cctv.js',
  'undangan/index.html',
  'undangan/undangan.css',
  'undangan/config.js',
  'undangan/landing.js',
  'undangan/landing.css',
  'undangan/common.js',
  'undangan/tema/index.html',
  'undangan/tema/tema.js',
  'undangan/cari/index.html',
  'undangan/cari/cari.js',
  'undangan/masuk/index.html',
  'undangan/masuk/masuk.js',
  'undangan/syarat/index.html',
  'undangan/refund/index.html',
  'undangan/pesan/index.html',
  'undangan/pesan/pesan.js',
  'undangan/demo/melayu.json',
  'undangan/demo/emas.json',
  'undangan/demo/pantai.json',
  'undangan/demo/islami.json',
  'undangan/demo/hijab.json',
  'undangan/demo/khitanan.json',
  'undangan/demo/masjid.json',
  'undangan/demo/ultah.json',
  'undangan/demo/wisuda.json',
  'undangan/demo/syukuran.json',
  'u/index.html',
  'u/invite.js',
  'u/invite.css',
  'privasi.html',
  'pwa.js',
  'manifest.webmanifest',
  'favicon.png',
  'logo-sm.png',
  'icons/icon-192.png',
  'icons/icon-512.png',
  'icons/maskable-512.png',
  'icons/apple-touch-icon.png',
  'kasir/index.html',
  'kasir/app.html',
  'kasir/app.js',
  'kasir/kasir.css',
  'kasir/lock.js'
];

function relOf(url) {
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE)) return null;
  return url.pathname.slice(SCOPE.length);
}

function sensitive(url) {
  for (const key of url.searchParams.keys()) {
    if (/kode|token|key|auth|pass|secret|session/i.test(key)) return true;
  }
  return false;
}

function leaveToNetwork(rel) {
  if (rel == null) return true;
  if (rel === 'sw.js' || rel === 'generator/sw.js' || rel === 'config.js') return true;
  if (rel.startsWith('generator/')) return true;
  if (rel.startsWith('audio/')) return true;
  return false;
}

function neverStore(rel, url) {
  if (rel == null) return true;
  if (LIVE.test(rel)) return true;
  if (sensitive(url)) return true;
  if (rel.startsWith('admin/') || rel.startsWith('undangan/admin/')) return true;
  if (rel.startsWith('kasir/buatkode')) return true;
  return false;
}

function stripped(url) {
  const copy = new URL(url.href);
  copy.search = '';
  copy.hash = '';
  return copy.href;
}

async function precache() {
  const cache = await caches.open(VER);
  await Promise.all(PRECACHE.map(async (path) => {
    const url = new URL(path, self.location);
    const res = await fetch(url, { cache: 'reload' });
    if (!res.ok) throw new Error('precache ' + path + ' ' + res.status);
    await cache.put(url.href, res.clone());
    if (path === 'index.html') await cache.put(new URL('./', self.location).href, res.clone());
    if (path === 'kasir/index.html') await cache.put(new URL('kasir/', self.location).href, res.clone());
  }));
}

async function offlineResponse() {
  const cached = await caches.match(new URL('offline.html', self.location).href);
  if (!cached) return Response.error();
  const baseHref = new URL('./', self.location).href;
  const html = (await cached.text()).replace('<head>', '<head><base href="' + baseHref + '">');
  return new Response(html, {
    status: 200,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' }
  });
}

async function purgeSensitive(cache) {
  const keys = await cache.keys();
  await Promise.all(keys.map(async (req) => {
    const url = new URL(req.url);
    const rel = relOf(url);
    if (neverStore(rel, url)) await cache.delete(req);
  }));
}

self.addEventListener('install', (event) => {
  event.waitUntil(precache().then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names.filter((name) => name.startsWith('itap-') && name !== VER).map((name) => caches.delete(name)));
    const current = await caches.open(VER);
    await purgeSensitive(current);
    await self.clients.claim();
  })());
});

self.addEventListener('message', (event) => {
  if (event.data === 'itap-version' && event.source) event.source.postMessage({ ver: VER });
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  if (request.cache === 'only-if-cached' && request.mode !== 'same-origin') return;
  const url = new URL(request.url);
  const rel = relOf(url);
  if (leaveToNetwork(rel)) return;

  if (LIVE.test(rel) || rel.startsWith('downloads/')) {
    event.respondWith(fetch(request, { cache: 'no-store' }));
    return;
  }

  if (rel.startsWith('admin/') || rel.startsWith('undangan/admin/') || rel.startsWith('kasir/buatkode') || sensitive(url)) {
    if (request.mode === 'navigate') {
      event.respondWith(fetch(request).catch(() => offlineResponse()));
    }
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(request);
        if (res.ok && res.type === 'basic') {
          const cache = await caches.open(VER);
          await cache.put(stripped(url), res.clone());
        }
        return res;
      } catch (err) {
        const cached = await caches.match(request, { ignoreSearch: true })
          || await caches.match(stripped(url));
        if (cached) return cached;
        return offlineResponse();
      }
    })());
    return;
  }

  event.respondWith((async () => {
    const cache = await caches.open(VER);
    try {
      const res = await fetch(request);
      if (res.ok && res.type === 'basic') await cache.put(stripped(url), res.clone());
      return res;
    } catch (err) {
      const cached = await caches.match(request, { ignoreSearch: true })
        || await caches.match(stripped(url));
      if (cached) return cached;
      return new Response('Offline', { status: 503, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
  })());
});
