// Berita Belitung: baca data/berita.json (diperbarui GitHub Actions 3x sehari)
(()=>{const L=document.getElementById('berita-list'),U=document.getElementById('berita-upd');if(!L)return;
const FB='/img/e0.webp';const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const ago=t=>{const m=Math.max(0,(Date.now()-new Date(t))/6e4);if(m<60)return Math.round(m)+' menit lalu';const h=m/60;if(h<24)return Math.round(h)+' jam lalu';return Math.round(h/24)+' hari lalu'};
const tgl=t=>new Date(t).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' WIB';
fetch('/data/berita.json?t='+Date.now()).then(r=>r.json()).then(d=>{const it=d.items||[];if(!it.length)throw 0;
L.innerHTML=it.map(x=>`<a class="card nw" href="${esc(x.url)}" target="_blank" rel="noopener nofollow"><img class="nw-img" src="${esc(x.image||FB)}" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${FB}'"><div class="nw-s"><b>${esc(x.source)}</b> · ${ago(x.published)}</div><h4>${esc(x.title)}</h4>${x.snippet?`<p class="mu sm nw-p">${esc(x.snippet)}</p>`:''}</a>`).join('');
U.textContent='Terakhir diperbarui '+tgl(d.updated)}).catch(()=>{L.innerHTML='<div class="card">Berita belum bisa dimuat. Coba lagi nanti ya.</div>';U.textContent=''})})();
