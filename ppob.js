/* PPOB iTAP v33 (pulsa, data, game, e-wallet, PLN) — order manual via WA kedai. Belum ada transaksi otomatis (backend belum live).
   Harga opsional dari data/ppob-harga.json (dikelola di admin/ppob):
   { "pulsa": { "Telkomsel": { "10000": 11500 } }, "data": {...}, "pln": { "20000": 21500 },
   "game": { "Mobile Legends": { "86 diamond": 21000 } }, "ewallet": { "DANA": { "50000": 51500 } } }
   Kalau harga belum ada, tampil "Harga dikonfirmasi via WA" — jangan isi harga karangan. */
(function(){
const WA='6285141121283';
const OPS=[['by.U',/^0851/],['Telkomsel',/^08(11|12|13|21|22|23|52|53)/],['Indosat',/^08(14|15|16|55|56|57|58)/],['XL',/^08(17|18|19|59|77|78)/],['Axis',/^08(31|32|33|38)/],['Tri',/^08(95|96|97|98|99)/],['Smartfren',/^08(81|82|83|84|85|86|87|88|89)/]];
const C={
 pulsa:{n:'📱 Pulsa',nm:'Pulsa',id:'Nomor HP',t:'hp',ph:'Contoh: 0812xxxxxxxx',nom:[5000,10000,20000,25000,50000,100000],ll:'Pilih nominal pulsa',cl:'Catatan (opsional)',cp:''},
 data:{n:'📶 Data',nm:'Paket Data',id:'Nomor HP',t:'hp',ph:'Contoh: 0812xxxxxxxx',nom:null,ll:'Paket data',cl:'Paket/kuota yang dicari',cp:'Contoh: 10 GB 30 hari, atau budget Rp50rb'},
 game:{n:'🎮 Game',nm:'Top Up Game',id:'User ID',t:'uid',ph:'User ID di profil game',sub:['Mobile Legends','Free Fire','PUBG Mobile','Genshin Impact','Roblox','Higgs Domino','Lainnya'],sl:'Pilih game',nom:null,ll:'Nominal (contoh, klik buat isi)',cl:'Nominal yang dibeli',cp:'Contoh: 86 diamond, 1 Weekly Pass'},
 ewallet:{n:'💳 E-Wallet',nm:'Top Up E-Wallet',id:'Nomor HP terdaftar',t:'hp',ph:'Contoh: 0812xxxxxxxx',sub:['DANA','GoPay','OVO','ShopeePay','LinkAja'],sl:'Pilih e-wallet',nom:[10000,20000,25000,50000,100000],ll:'Pilih nominal saldo',cl:'Catatan (opsional)',cp:''},
 pln:{n:'⚡ Token',nm:'Token PLN',id:'Nomor meter / ID pelanggan',t:'meter',ph:'11–12 digit, ada di meteran',nom:[20000,50000,100000,200000,500000],ll:'Pilih nominal token',cl:'Catatan (opsional)',cp:''}
};
const GN={'Mobile Legends':['86 diamond','172 diamond','257 diamond','344 diamond','Weekly Diamond Pass'],'Free Fire':['70 diamond','140 diamond','355 diamond','720 diamond','Member Mingguan'],'PUBG Mobile':['60 UC','325 UC','660 UC','1800 UC'],'Genshin Impact':['60 Genesis Crystal','300+30 Genesis Crystal','Welkin Moon'],'Roblox':['80 Robux','400 Robux','800 Robux'],'Higgs Domino':['30M koin','60M koin','200M koin']};
const CODA='https://www.codashop.com/id-id/';
const OFF={'Telkomsel':'https://www.telkomsel.com','by.U':'https://www.byu.id','Indosat':'https://im3.id','XL':'https://www.xl.co.id','Axis':'https://www.axis.co.id','Tri':'https://tri.co.id','Smartfren':'https://www.smartfren.com',
 'Mobile Legends':CODA+'mobile-legends','Free Fire':CODA+'free-fire','Genshin Impact':CODA+'genshin-impact','PUBG Mobile':CODA,'Roblox':CODA,'Higgs Domino':CODA,'Lainnya':CODA,
 'GoPay':'https://www.gojek.com/gopay','OVO':'https://www.ovo.id','ShopeePay':'https://shopeepay.co.id','LinkAja':'https://www.linkaja.id'};
let H={},cat='pulsa',sel=null,sub='';
const $=s=>document.querySelector(s),rp=n=>'Rp'+Number(n).toLocaleString('id-ID');
const norm=v=>{v=(v||'').replace(/\D/g,'');if(v.startsWith('62'))v='0'+v.slice(2);return v};
const opOf=v=>{v=norm(v);for(const[o,r]of OPS)if(r.test(v))return o;return ''};
function price(nom,op){const h=H[cat];if(C[cat].sub)op=sub;if(!h)return null;const x=(op&&h[op])?h[op]:h;const p=x&&x[nom];return typeof p==='number'&&p>0?p:null}
function render(){
 const c=C[cat];sel=null;sub='';
 $('#pp-sub-w').hidden=!c.sub;$('#pp-subl').textContent=c.sl||'';$('#pp-id').inputMode=c.t==='uid'?'text':'numeric';
 document.querySelectorAll('#pp-cats button').forEach(b=>{const on=b.dataset.c===cat;b.classList.toggle('on',on);b.setAttribute('aria-selected',on)});
 $('#pp-idl').textContent=c.id;$('#pp-id').placeholder=c.ph;$('#pp-id').autocomplete=c.t==='hp'?'tel':'off';
 $('#pp-listl').textContent=c.ll;$('#pp-cat2l').textContent=c.cl;$('#pp-cat2').placeholder=c.cp;
 $('#pp-err').textContent='';upd();
}
function upd(){
 const c=C[cat],v=$('#pp-id').value,o=c.sub?sub:(c.t==='hp'?opOf(v):'');
 if(c.sub)$('#pp-sub').innerHTML=c.sub.map(g=>`<button type="button" class="pp-item${sub===g?' on':''}" data-s="${g}"><b>${g}</b></button>`).join('');
 $('#pp-zone-w').hidden=sub!=='Mobile Legends';
 $('#pp-op').textContent=c.sub?'':c.t==='hp'?(o?'✓ Operator: '+o:(norm(v).length>=4?'Operator belum kedeteksi, admin cek manual':'')):'';
 if(c.nom){$('#pp-list').innerHTML=c.nom.map(n=>{const p=price(n,o);return `<button type="button" class="pp-item${sel==n?' on':''}" data-n="${n}"><b>${rp(n)}</b><small>${p?'Harga '+rp(p):'Harga via WA'}</small></button>`}).join('')}
 else if(cat==='game'){const g=GN[sub];$('#pp-list').innerHTML=g?g.map(x=>{const p=price(x);return `<button type="button" class="pp-item" data-t="${x}"><b>${x}</b><small>${p?'Harga '+rp(p):'Harga via WA'}</small></button>`}).join(''):'<p class="mu sm">'+(sub?'Tulis nominal yang dicari di bawah, harga dikonfirmasi admin via WA.':'Pilih game dulu ya.')+'</p>'}
 else $('#pp-list').innerHTML='<p class="mu sm">Daftar paket tiap operator beda-beda. Tulis paket yang kamu cari di bawah, admin kirim pilihan & harganya via WA.</p>';
 const u=cat==='pln'?'https://www.pln.co.id':OFF[o],a=$('#pp-off');if(a){a.hidden=!u;if(u)a.href=u}
 const p=sel?price(sel,o):null;
 $('#pp-sum').textContent=c.nom?(sel?c.nm+' '+rp(sel)+(o?' · '+o:'')+' — '+(p?rp(p):'harga dikonfirmasi via WA'):'Pilih nominal dulu ya.'):(cat==='game'?'Top up '+(sub||'game')+' — harga dikonfirmasi via WA':'Paket data'+(o?' '+o:'')+' — harga dikonfirmasi via WA');
}
function send(e){e.preventDefault();
 const c=C[cat],raw=$('#pp-id').value.trim(),err=$('#pp-err');let id=raw;
 if(c.t==='hp'){id=norm(raw);if(!/^08\d{8,11}$/.test(id))return err.textContent='Nomor HP harus 10–13 digit, diawali 08.';}
 if(c.t==='meter'){id=raw.replace(/\D/g,'');if(!/^\d{11,12}$/.test(id))return err.textContent='Nomor meter/ID PLN harus 11–12 digit.';}
 if(c.t==='uid'){id=raw;if(!/^[A-Za-z0-9._-]{3,30}$/.test(id))return err.textContent='User ID belum valid, cek lagi di profil game.';}
 if(c.sub&&!sub)return err.textContent=c.sl+' dulu ya.';
 const zone=$('#pp-zone').value.replace(/\D/g,'');if(sub==='Mobile Legends'&&!zone)return err.textContent='Zone ID Mobile Legends wajib diisi.';
 if(c.nom&&!sel)return err.textContent='Pilih nominal dulu ya.';
 const ket=$('#pp-cat2').value.trim();if(!c.nom&&!ket)return err.textContent=cat==='game'?'Tulis nominal top up-nya.':'Tulis paket/kuota yang dicari.';
 const o=c.sub?sub:(c.t==='hp'?opOf(id):''),nama=$('#pp-nama').value.trim(),p=sel?price(sel,o):(cat==='game'?price(ket):null);
 const L=['Halo kak, mau order *'+c.nm+'* dari web iTAP',''];
 if(o)L.push((cat==='game'?'Game: ':cat==='ewallet'?'E-Wallet: ':'Operator: ')+o);L.push(c.id+': '+id+(sub==='Mobile Legends'?' ('+zone+')':''));
 if(sel)L.push('Nominal: '+rp(sel)+(p?' (harga di web '+rp(p)+')':''));
 if(ket)L.push((c.nom?'Catatan: ':cat==='game'?'Nominal: ':'Paket: ')+ket+(cat==='game'&&p?' (harga di web '+rp(p)+')':''));if(nama)L.push('Nama: '+nama);
 L.push('','Tolong info total & cara bayarnya ya (QRIS/transfer). Makasih 🙏');
 err.textContent='';window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(L.join('\n')),'_blank','noopener');
}
function init(){if(!$('#ppob'))return;
 $('#pp-cats').innerHTML=Object.entries(C).map(([k,c])=>`<button type="button" role="tab" data-c="${k}">${c.n}</button>`).join('');
 $('#pp-cats').onclick=e=>{const b=e.target.closest('[data-c]');if(b&&b.dataset.c!==cat){cat=b.dataset.c;render()}};
 $('#pp-sub').onclick=e=>{const b=e.target.closest('[data-s]');if(b){sub=b.dataset.s;sel=null;$('#pp-err').textContent='';upd()}};
 $('#pp-list').onclick=e=>{const t=e.target.closest('[data-t]');if(t){$('#pp-cat2').value=t.dataset.t;return}const b=e.target.closest('[data-n]');if(b){sel=+b.dataset.n;$('#pp-err').textContent='';upd()}};
 $('#pp-id').oninput=upd;$('#pp-form').onsubmit=send;
 render();fetch('data/ppob-harga.json?v=29').then(r=>r.ok?r.json():{}).then(j=>{H=j||{};upd()}).catch(()=>{});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
