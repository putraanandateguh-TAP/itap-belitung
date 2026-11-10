// Kartu artikel iTAP (data/artikel.json) di bagian Wisata, Kuliner, dan Budaya beranda.
(()=>{const M={wisata:'art-wisata',kuliner:'art-kuliner',budaya:'art-budaya'},E={wisata:'🏝️',kuliner:'🍜',budaya:'🥁'};
if(!document.getElementById('art-wisata'))return;
const esc=s=>String(s==null?'':s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
fetch('data/artikel.json',{cache:'no-cache'}).then(r=>{if(!r.ok)throw 0;return r.json()}).then(d=>{const A=d.artikel||[];
for(const k in M){const el=document.getElementById(M[k]);const L=A.filter(a=>a.kategori===k);if(!el||!L.length)continue;
el.innerHTML='<div class="art-sh"><b>📖 Artikel iTAP</b><a class="more" href="artikel/#'+k+'">Semua →</a></div><div class="row">'+L.map(a=>'<a class="art-card mini" href="artikel/'+esc(a.slug)+'.html">'+(a.foto?'<img src="'+esc(a.foto)+'" alt="" loading="lazy">':'<div class="art-ph" aria-hidden="true"><span>'+E[k]+'</span><small>iTAP Belitung</small></div>')+'<div><h3>'+esc(a.judul)+'</h3>'+(a.kredit?'<small>Foto: '+esc(a.kredit)+'</small>':'')+'</div></a>').join('')+'</div>'}}).catch(()=>{})})();
