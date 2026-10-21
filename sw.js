// iTAP Belitung service worker. Naikkan VER tiap rilis aset.
const VER='itap-v24',STATIC=VER+'-static';
self.addEventListener('install',e=>{e.waitUntil(caches.open(STATIC).then(c=>c.addAll(['/','/style.css?v=24','/app.js?v=24','/data.js?v=24','/views.js?v=24','/data-belitung.js?v=24','/ppob.js?v=24','/logo-sm.png','/favicon.png']).catch(()=>{})));self.skipWaiting()});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k.startsWith('itap-')&&!k.startsWith(VER)).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
self.addEventListener('fetch',e=>{const r=e.request,u=new URL(r.url);
 if(r.method!=='GET'||u.origin!==location.origin||u.pathname.startsWith('/admin/')||u.pathname.startsWith('/api/')||u.pathname.startsWith('/audio/'))return; // tidak di-cache
 const html=r.mode==='navigate'||r.headers.get('accept')?.includes('text/html');
 if(html||u.pathname.startsWith('/data/')){e.respondWith(fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(VER+'-rt').then(x=>x.put(r,c))}return res}).catch(()=>caches.match(r,{ignoreSearch:u.pathname.startsWith('/data/')}).then(m=>m||caches.match('/'))));return}
 e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>{if(res.ok){const c=res.clone();caches.open(STATIC).then(x=>x.put(r,c))}return res})))});
