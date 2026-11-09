// CCTV publik: status kamera dari data/cctv.json (dicek otomatis tiap 2 jam oleh GitHub Actions)
(function(){
  const box=document.getElementById('cctv-body'); if(!box) return;
  const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const item=x=>x.yt
    ? `<div class="cctv-yt"><div class="cctv-yt-h"><span class="cctv-dot"></span><b>${esc(x.nama)}</b></div><button type="button" class="cctv-play" data-yt="${esc(x.yt)}" aria-label="Putar ${esc(x.nama)}"><img loading="lazy" alt="" src="https://i.ytimg.com/vi/${esc(x.yt)}/hqdefault_live.jpg"><span>▶</span></button></div>`
    : `<a class="cctv-item${x.live?'':' off'}" href="${esc(x.portal)}" target="_blank" rel="noopener"><span class="cctv-dot" aria-hidden="true"></span><span>${esc(x.nama)}</span><b aria-hidden="true">›</b></a>`;
  fetch('data/cctv.json?t='+Date.now(),{cache:'no-store'}).then(r=>{if(!r.ok)throw 0;return r.json()}).then(d=>{
    const on=d.items.filter(x=>x.live), off=d.items.filter(x=>!x.live);
    const yt=on.filter(x=>x.yt), hls=on.filter(x=>!x.yt);
    const reg={}; hls.forEach(x=>(reg[x.wilayah]=reg[x.wilayah]||[]).push(x));
    const regs=Object.keys(reg).sort((a,b)=>(a!=='Tanjungpandan')-(b!=='Tanjungpandan')||a.localeCompare(b));
    let h=`<p class="mu sm"><b>${on.length} dari ${d.items.length} kamera sedang tayang</b> · dicek ${esc(d.diperbarui)}</p>`;
    if(yt.length) h+=`<div class="cctv-yts">${yt.map(item).join('')}</div>`;
    regs.forEach(r=>{h+=`<h3 class="cctv-reg">${esc(r)}</h3><div class="cctv-list">${reg[r].map(item).join('')}</div>`});
    if(off.length) h+=`<details class="cctv-off"><summary>Sedang mati di portal (${off.length})</summary><div class="cctv-list">${off.map(x=>item({...x,yt:null})).join('')}</div></details>`;
    box.innerHTML=h;
  }).catch(()=>{box.innerHTML='<p class="mu sm">Status kamera belum bisa dimuat. Buka <a href="https://cctv.belitung.go.id/?page=daftar" target="_blank" rel="noopener">portal CCTV Belitung</a>.</p>'});
  box.addEventListener('click',e=>{const b=e.target.closest('.cctv-play');if(!b)return;
    b.outerHTML=`<iframe title="CCTV" allow="autoplay; fullscreen" referrerpolicy="strict-origin-when-cross-origin" src="https://www.youtube-nocookie.com/embed/${b.dataset.yt}?autoplay=1&mute=1"></iframe>`});
})();
