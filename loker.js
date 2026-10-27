// Lowongan Kerja Belitung, dikelompokkan per daerah: data/loker.json (diperbarui GitHub Actions tiap hari)
(()=>{const L=document.getElementById('loker-list'),U=document.getElementById('loker-upd'),Q=document.getElementById('loker-q');if(!L)return;
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tgl=t=>new Date(t).toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'short'});
const G=[['Belitung','🏝️ Khusus Belitung'],['Belitung Timur','🌅 Khusus Belitung Timur'],['Bangka','⛵ Khusus Bangka'],['Pangkal Pinang','🏙️ Pangkal Pinang'],['Lainnya / Babel umum','📌 Lainnya / Babel umum']];
const RX=[['Belitung Timur',/belitung timur|beltim|manggar|gantung|kelapa kampit|dendang|damar|simpang renggiang/],['Pangkal Pinang',/pangkal ?pinang|girimaya|gerunggang|bukit ?intan|rangkui|taman sari|gabek/],['Belitung',/belitung|belitong|tanjung ?pandan|sijuk|membalong|badau|selat nasik/],['Bangka',/bangka|sungailiat|belinyu|muntok|mentok|toboali|koba|jebus/]];
const reg=x=>{if(x.region)return x.region;const t=((x.location||'')+' '+x.title).toLowerCase().replace(/(kep(ulauan|\.)? )?bangka[ -]belitung|babel/g,' ');for(const[n,r]of RX)if(r.test(t))return n;return 'Lainnya / Babel umum'};
let all=[];const open={Belitung:true},more={};const N=4;
const card=x=>`<a class="card lk" href="${esc(x.url)}" target="_blank" rel="noopener nofollow"><div class="lk-s"><b>${esc(x.source)}</b> · ${tgl(x.date)}</div><h4>${esc(x.title)}</h4><div class="lk-c">🏢 ${esc(x.company||'-')}</div><div class="lk-l">📍 ${esc(x.location)}</div></a>`;
function draw(){const q=(Q.value||'').toLowerCase().trim();
 const r=all.filter(x=>!q||(x.title+' '+x.company+' '+x.location+' '+x.source+' '+x._r).toLowerCase().includes(q));
 const h=G.map(([k,lab])=>{const g=r.filter(x=>x._r===k);if(!g.length)return'';const o=q?true:!!open[k],m=!!more[k];
  return `<div class="lk-g${o?' on':''}"><button class="lk-h" data-g="${esc(k)}">${lab} <span class="lk-n">${g.length}</span><span class="lk-ar">${o?'▾':'▸'}</span></button>${o?`<div class="lk-list">${(m?g:g.slice(0,N)).map(card).join('')}</div>${g.length>N?`<button class="lk-more" data-m="${esc(k)}">${m?'Tampilkan lebih sedikit':'Lihat semua ('+g.length+')'}</button>`:''}`:''}</div>`}).join('');
 L.innerHTML=h||'<div class="card">Belum ada lowongan yang cocok.</div>'}
L.onclick=e=>{const b=e.target.closest('button');if(!b)return;if(b.dataset.g!=null){const k=b.dataset.g;open[k]=!open[k]}else if(b.dataset.m!=null){const k=b.dataset.m;more[k]=!more[k]}draw()};
Q.oninput=draw;
fetch('/data/loker.json?t='+Date.now()).then(r=>r.json()).then(d=>{all=(d.items||[]).map(x=>(x._r=reg(x),x));if(!all.length)throw 0;draw();
U.textContent=all.length+' lowongan · diperbarui '+new Date(d.updated).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' WIB'}).catch(()=>{L.innerHTML='<div class="card">Lowongan belum bisa dimuat. Coba lagi nanti ya.</div>';U.textContent=''})})();
