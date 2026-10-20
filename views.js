// Penghitung "dibaca" asli (abacus.jasoncameron.dev, tanpa akun). Mulai dari 0, tidak ada angka palsu.
(function(){
const API='https://abacus.jasoncameron.dev',NS='itapbelitung',TTL=6e5;
const V=ls('itap_views',{t:0,v:{}});let ok=true;
const key=id=>'kb-'+id;
const fmt=n=>n>=1000?(n/1000).toFixed(1).replace('.',',').replace(',0','')+' rb':String(n);
const eye='<svg viewBox="0 0 24 24" width="14" height="14" aria-hidden="true"><path fill="currentColor" d="M12 5C6.5 5 2.7 9.1 1.5 12c1.2 2.9 5 7 10.5 7s9.3-4.1 10.5-7C21.3 9.1 17.5 5 12 5zm0 11.5a4.5 4.5 0 110-9 4.5 4.5 0 010 9zm0-2.5a2 2 0 100-4 2 2 0 000 4z"/></svg>';
window.viewTag=id=>`<span class="vw" data-v="${id}" hidden>${eye}<span></span></span>`;
function paint(){if(!ok)return;document.querySelectorAll('[data-v]').forEach(s=>{const n=V.v[s.dataset.v];if(n==null)return;s.lastChild.textContent=fmt(n)+' dibaca';s.hidden=false});top()}
function save(){ss('itap_views',V)}
async function get(id){const r=await fetch(`${API}/get/${NS}/${key(id)}`);if(r.status===404)return 0;if(!r.ok)throw 0;const j=await r.json();return j.value|0}
async function loadAll(){if(Date.now()-V.t<TTL&&Object.keys(V.v).length>=KB.length){paint();return}
 for(let i=0;i<KB.length;i++){try{V.v[i]=await get(i)}catch(_){if(i===0){ok=false;hideTop();return}}if(i%6==5){paint();await new Promise(r=>setTimeout(r,2200))}}
 V.t=Date.now();save();paint()}
async function hit(id){const d=new Date().toLocaleDateString('en-CA',{timeZone:'Asia/Jakarta'}),seen=ls('itap_seen',{});if(seen.d!==d){seen.d=d;seen.ids=[]}
 if(seen.ids.includes(id))return;seen.ids.push(id);ss('itap_seen',seen);
 try{const r=await fetch(`${API}/hit/${NS}/${key(id)}`);if(r.ok){V.v[id]=(await r.json()).value|0;save();paint()}}catch(_){}}
window.viewHit=hit;
document.addEventListener('click',ev=>{if(ev.target.closest('[data-s]'))return;const c=ev.target.closest('[data-vid]');if(c)hit(+c.dataset.vid)},true);
function hideTop(){const t=document.getElementById('top');if(t)t.hidden=true}
function top(){const el=document.getElementById('toplist');if(!el)return;const l=Object.entries(V.v).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).slice(0,5);
 el.innerHTML=l.length?l.map(([i,n],k)=>{const e=KB[i];return `<div class="li" data-vid="${i}" onclick="q.value='${e.t.split(' ').slice(0,2).join(' ')}';render();go('cari')"><span class="n">0${k+1}</span><div><span class="tag">${e.c}</span><div><b>${e.t}</b></div><span class="vw">${eye}<span>${fmt(n)} dibaca</span></span></div></div>`}).join(''):'<p class="mu sm">Belum ada yang dibaca. Buka salah satu cerita, jadi pembaca pertama! 👀</p>'}
new MutationObserver(()=>{clearTimeout(window._vt);window._vt=setTimeout(paint,50)}).observe(document.body,{childList:true,subtree:true});
try{renderAll()}catch(_){}loadAll();
})();
