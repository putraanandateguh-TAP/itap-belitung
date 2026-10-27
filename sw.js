// iTAP Belitung service worker. Naikkan VER tiap rilis aset.
const VER='itap-v40',STATIC=VER+'-static';
self.addEventListener('install',e=>{e.waitUntil(caches.open(STATIC).then(c=>c.addAll(['/','/style.css?v=37','/app.js?v=37','/data.js?v=37','/views.js?v=37','/data-belitung.js?v=37','/ppob.js?v=37','/berita.js?v=37','/loker.js?v=37','/logo-sm.png','/favicon.png']).catch(()=>{})));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('itap-')&&!k.startsWith(VER)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/admin/')||u.pathname.startsWith('/api/')||u.pathname.startsWith('/audio/'))return; // tidak di-cache
 const html=r.mode==='navigate'||r.headers.get('accept')?.includes('text/html');
 if(html||u.pathname.startsWith('/data/')){e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(VER+'-rt').then(x=>x.put(r,c))}return res}).catch(()=>caches.match(r,{ignoreSearch:u.pathname.startsWith('/data/')}).then(m=>m||caches.match('/'))));return}
 e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(STATIC).then(x=>x.put(r,c))}return res})))});
