// Loker terverifikasi: data/loker-resmi.json (dikurasi manual, tautan resmi dicek). Lamar selalu di situs resmi, tidak ada formulir di iTAP.
(()=>{const box=document.getElementById('lr');if(!box)return;
const $=id=>document.getElementById(id),L=$('lr-list'),Q=$('lr-q'),K=$('lr-kat'),U=$('lr-upd'),T=box.querySelectorAll('[data-bag]');
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tgl=d=>{const p=String(d||'').split('-');if(p.length!==3)return'';return new Date(Date.UTC(+p[0],+p[1]-1,+p[2])).toLocaleDateString('id-ID',{timeZone:'UTC',day:'numeric',month:'short',year:+p[0]!==new Date().getFullYear()?'numeric':undefined})};
// Sumber tanpa tanggal posting pasti (README: tanggal_posting diisi = dicek) diberi label "dicek", bukan "diposting".
const noDate=x=>x.tanggal_posting===x.dicek&&/nyamankerje|karirhub/i.test(x.sumber||'');
const safe=u=>/^https:\/\//.test(u||'')?u:'#';
let all=[],bag='Belitung';const N=12;let lim=N;
const card=x=>`<article class="card lr-c"><div class="lk-s"><b>${esc(x.sumber)}</b> · ${noDate(x)?'dicek '+tgl(x.dicek):'diposting '+tgl(x.tanggal_posting)}</div><h4>${esc(x.judul)}</h4><div class="lk-c">🏢 ${esc(x.perusahaan)}</div><div class="lk-l">📍 ${esc(x.lokasi)}</div>${x.gaji?`<div class="lr-gaji">💰 ${esc(x.gaji)}</div>`:''}<p class="lr-r">${esc(x.ringkasan)}</p><div class="lr-f"><span class="lr-tag">${esc(x.kategori)}</span>${x.batas_lamaran?`<span class="lr-bl">Batas ${tgl(x.batas_lamaran)}</span>`:''}</div><a class="lr-go" href="${esc(safe(x.link))}" target="_blank" rel="noopener nofollow">Lamar di situs resmi ↗</a></article>`;
function draw(){const q=(Q.value||'').toLowerCase().trim(),k=K.value;
 T.forEach(b=>{const on=b.dataset.bag===bag;b.setAttribute('aria-selected',on);b.querySelector('span').textContent=all.filter(x=>x.bagian===b.dataset.bag).length});
 const r=all.filter(x=>x.bagian===bag&&(!k||x.kategori===k)&&(!q||[x.judul,x.perusahaan,x.lokasi,x.kategori,x.sumber,x.ringkasan].join(' ').toLowerCase().includes(q)));
 L.innerHTML=r.length?`<div class="lk-list">${r.slice(0,lim).map(card).join('')}</div>${r.length>lim?`<button type="button" class="lk-more" id="lr-more">Lihat lagi (${r.length-lim})</button>`:''}`:'<div class="card">Belum ada lowongan yang cocok. Coba kata lain atau kategori lain.</div>'}
T.forEach(b=>b.onclick=()=>{bag=b.dataset.bag;lim=N;draw()});
Q.oninput=()=>{lim=N;draw()};K.onchange=()=>{lim=N;draw()};
L.onclick=e=>{if(e.target.id==='lr-more'){lim+=N;draw()}};
fetch('data/loker-resmi.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw 0;return r.json()}).then(d=>{all=(d.lowongan||[]).filter(x=>x&&x.judul&&x.link);if(!all.length)throw 0;
 const ks=[...new Set(all.map(x=>x.kategori).filter(Boolean))].sort();K.innerHTML='<option value="">Semua kategori</option>'+ks.map(k=>`<option>${esc(k)}</option>`).join('');
 const m=d.meta||{};U.textContent=all.length+' lowongan · diperbarui '+tgl(m.diperbarui)+(m.diperbarui&&m.diperbarui.slice(0,4)==String(new Date().getFullYear())?' '+m.diperbarui.slice(0,4):'');
 if(m.cakupan_babel_lainnya)$('lr-cak').textContent='Babel lainnya: lowongan yang tayang sejak 10 Okt 2026. Lowongan lebih lama mungkin masih ada di situs sumbernya.';
 draw()}).catch(()=>{L.innerHTML='<div class="card">'+(navigator.onLine?'Daftar lowongan belum bisa dimuat. Coba lagi nanti ya.':'Daftar lowongan butuh internet.')+'</div>';U.textContent=''})})();
