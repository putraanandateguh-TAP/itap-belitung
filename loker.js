// Lowongan Kerja Belitung: data/loker.json (diperbarui GitHub Actions tiap hari)
(()=>{const L=document.getElementById('loker-list'),U=document.getElementById('loker-upd'),Q=document.getElementById('loker-q'),F=document.getElementById('loker-f'),M=document.getElementById('loker-more');if(!L)return;
const esc=s=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const tgl=t=>new Date(t).toLocaleDateString('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'short'});
const AREA=[['Semua',''],['Belitung','belitung|tanjung pandan|manggar|belitong'],['Pangkal Pinang','pangkal ?pinang'],['Bangka','bangka']];
let all=[],area='',showAll=false;
function draw(){const q=(Q.value||'').toLowerCase().trim();
 let r=all.filter(x=>{const t=(x.title+' '+x.company+' '+x.location+' '+x.source).toLowerCase();return(!q||t.includes(q))&&(!area||new RegExp(area,'i').test(x.title+' '+x.location))});
 const n=r.length;if(!showAll)r=r.slice(0,8);
 L.innerHTML=r.length?r.map(x=>`<a class="card lk" href="${esc(x.url)}" target="_blank" rel="noopener nofollow"><div class="lk-s"><b>${esc(x.source)}</b> · ${tgl(x.date)}</div><h4>${esc(x.title)}</h4><div class="lk-c">🏢 ${esc(x.company||'-')}</div><div class="lk-l">📍 ${esc(x.location)}</div></a>`).join(''):'<div class="card">Belum ada lowongan yang cocok.</div>';
 M.hidden=n<=8;M.textContent=showAll?'Tampilkan lebih sedikit':`Lihat semua (${n})`}
F.innerHTML=AREA.map((a,i)=>`<button data-a="${a[1]}" class="${i?'':'on'}">${a[0]}</button>`).join('');
F.onclick=e=>{const b=e.target.closest('button');if(!b)return;area=b.dataset.a;F.querySelectorAll('button').forEach(x=>x.classList.toggle('on',x===b));draw()};
Q.oninput=draw;M.onclick=()=>{showAll=!showAll;draw()};
fetch('/data/loker.json?t='+Date.now()).then(r=>r.json()).then(d=>{all=d.items||[];if(!all.length)throw 0;draw();
U.textContent=all.length+' lowongan · diperbarui '+new Date(d.updated).toLocaleString('id-ID',{timeZone:'Asia/Jakarta',day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})+' WIB'}).catch(()=>{L.innerHTML='<div class="card">Lowongan belum bisa dimuat. Coba lagi nanti ya.</div>';U.textContent=''})})();
