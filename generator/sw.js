// iTAP Epic Video Generator SW (scope folder generator/). Naikkan VER tiap rilis.
// Tidak menyimpan URL yang memuat kode akses. Tidak mengubah localStorage.
const VER = 'itapgen-v16';
const A = ['./', 'index.html', 'manifest.json', 'studio.html', 'studio.js', 'lock.js', '../icons/icon-192.png', '../icons/icon-512.png', '../icons/maskable-512.png', '../icons/apple-touch-icon.png'];

function sensitive(url) {
  for (const key of url.searchParams.keys()) {
    if (/kode|token|key|auth|pass|secret|session/i.test(key)) return true;
  }
  return false;
}

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VER).then((cache) => cache.addAll(A)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(caches.keys().then((names) => Promise.all(names.filter((name) => name.startsWith('itapgen-') && name !== VER).map((name) => caches.delete(name)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== 'GET' || url.origin !== location.origin || sensitive(url)) return;
  event.respondWith(fetch(event.request).then((res) => {
    if (res.ok && res.type === 'basic') {
      const copy = res.clone();
      caches.open(VER).then((cache) => cache.put(event.request, copy));
    }
    return res;
  }).catch(() => caches.match(event.request).then((cached) => cached || caches.match('./index.html'))));
});
