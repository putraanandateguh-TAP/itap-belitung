/* PPOB iTAP v26 — order manual via WA kedai. Belum ada transaksi otomatis (backend belum live).
   Harga opsional dari data/ppob-harga.json (dikelola di admin/ppob):
   { "pulsa": { "Telkomsel": { "10000": 11500 } }, "data": {...}, "pln": { "20000": 21500 } }
   Kalau harga belum ada, tampil "Harga dikonfirmasi via WA" — jangan isi harga karangan. */
(function(){
const WA='6285141121283';
const OPS=[['by.U',/^0851/],['Telkomsel',/^08(11|12|13|21|22|23|52|53)/],['Indosat',/^08(14|15|16|55|56|57|58)/],['XL',/^08(17|18|19|59|77|78)/],['Axis',/^08(31|32|33|38)/],['Tri',/^08(95|96|97|98|99)/],['Smartfren',/^08(81|82|83|84|85|86|87|88|89)/]];
const C={
 pulsa:{n:'📱 Pulsa',nm:'Pulsa',id:'Nomor HP',t:'hp',ph:'Contoh: 0812xxxxxxxx',nom:[5000,10000,20000,25000,50000,100000],ll:'Pilih nominal pulsa',cl:'Catatan (opsional)',cp:''},
 data:{n:'📶 Data',nm:'Paket Data',id:'Nomor HP',t:'hp',ph:'Contoh: 0812xxxxxxxx',nom:null,ll:'Paket data',cl:'Paket/kuota yang dicari',cp:'Contoh: 10 GB 30 hari, atau budget Rp50rb'},
 pln:{n:'⚡ Token',nm:'Token PLN',id:'Nomor meter / ID pelanggan',t:'meter',ph:'11–12 digit, ada di meteran',nom:[20000,50000,100000,200000,500000],ll:'Pilih nominal token',cl:'Catatan (opsional)',cp:''}
};
let H={},cat='pulsa',sel=null;
const $=s=>document.querySelector(s),rp=n=>'Rp'+Number(n).toLocaleString('id-ID');
const norm=v=>{v=(v||'').replace(/\D/g,'');if(v.startsWith('62'))v='0'+v.slice(2);return v};
const opOf=v=>{v=norm(v);for(const[o,r]of OPS)if(r.test(v))return o;return ''};
function price(nom,op){const h=H[cat];if(!h)return null;const x=(op&&h[op])?h[op]:h;const p=x&&x[nom];return typeof p==='number'&&p>0?p:null}
function render(){
 const c=C[cat];sel=null;
 document.querySelectorAll('#pp-cats button').forEach(b=>{const on=b.dataset.c===cat;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
 $('#pp-idl').textContent=c.id;$('#pp-id').placeholder=c.ph;$('#pp-id').autocomplete=c.t==='hp'?'tel':'off';
 $('#pp-listl').textContent=c.ll;$('#pp-cat2l').textContent=c.cl;$('#pp-cat2').placeholder=c.cp;
 $('#pp-err').textContent='';upd();
}
function upd(){
 const c=C[cat],v=$('#pp-id').value,o=c.t==='hp'?opOf(v):'';
 $('#pp-op').textContent=c.t==='hp'?(o?'✓ Operator: '+o:(norm(v).length>=4?'Operator belum kedeteksi, admin cek manual':'')):'';
 if(c.nom){$('#pp-list').innerHTML=c.nom.map(n=>{const p=price(n,o);return `<button type="button" class="pp-item${sel==n?' on':''}" data-n="${n}"><b>${rp(n)}</b><small>${p?'Harga '+rp(p):'Harga via WA'}</small></button>`}).join('')}
 else $('#pp-list').innerHTML='<p class="mu sm">Daftar paket tiap operator beda-beda. Tulis paket yang kamu cari di bawah, admin kirim pilihan & harganya via WA.</p>';
 const p=sel?price(sel,o):null;
 $('#pp-sum').textContent=c.nom?(sel?c.nm+' '+rp(sel)+(o?' · '+o:'')+' — '+(p?rp(p):'harga dikonfirmasi via WA'):'Pilih nominal dulu ya.'):'Paket data'+(o?' '+o:'')+' — harga dikonfirmasi via WA';
}
function send(e){e.preventDefault();
 const c=C[cat],raw=$('#pp-id').value.trim(),err=$('#pp-err');let id=raw;
 if(c.t==='hp'){id=norm(raw);if(!/^08\d{8,11}$/.test(id))return err.textContent='Nomor HP harus 10–13 digit, diawali 08.';}
 if(c.t==='meter'){id=raw.replace(/\D/g,'');if(!/^\d{11,12}$/.test(id))return err.textContent='Nomor meter/ID PLN harus 11–12 digit.';}
 if(c.nom&&!sel)return err.textContent='Pilih nominal dulu ya.';
 const ket=$('#pp-cat2').value.trim();if(!c.nom&&!ket)return err.textContent='Tulis paket/kuota yang dicari.';
 const o=c.t==='hp'?opOf(id):'',nama=$('#pp-nama').value.trim(),p=sel?price(sel,o):null;
 const L=['Halo kak, mau order *'+c.nm+'* dari web iTAP',''];
 if(o)L.push('Operator: '+o);L.push(c.id+': '+id);
 if(sel)L.push('Nominal: '+rp(sel)+(p?' (harga di web '+rp(p)+')':''));
 if(ket)L.push((c.nom?'Catatan: ':'Paket: ')+ket);if(nama)L.push('Nama: '+nama);
 L.push('','Tolong info total & cara bayarnya ya (QRIS/transfer). Makasih 🙏');
 err.textContent='';window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(L.join('\n')),'_blank','noopener');
}
function init(){if(!$('#ppob'))return;
 $('#pp-cats').innerHTML=Object.entries(C).map(([k,c])=>`<button type="button" role="tab" data-c="${k}">${c.n}</button>`).join('');
 $('#pp-cats').onclick=e=>{const b=e.target.closest('[data-c]');if(b&&b.dataset.c!==cat){cat=b.dataset.c;render()}};
 $('#pp-list').onclick=e=>{const b=e.target.closest('[data-n]');if(b){sel=+b.dataset.n;$('#pp-err').textContent='';upd()}};
 $('#pp-id').oninput=upd;$('#pp-form').onsubmit=send;
 render();fetch('data/ppob-harga.json?v=27').then(r=>r.ok?r.json():{}).then(j=>{H=j||{};upd()}).catch(()=>{});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
