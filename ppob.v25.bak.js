/* PPOB iTAP — order manual via WA. Harga opsional dari data/ppob-harga.json:
   { "pulsa": { "Telkomsel": { "10000": 11500 } }, "pln": { "20000": 21500 }, ... }  (kunci kategori -> [operator ->] nominal -> harga jual) */
(function(){
const WA='6287749476651';
const OPS=[['by.U',/^0851/],['Telkomsel',/^08(11|12|13|21|22|23|52|53)/],['Indosat',/^08(14|15|16|55|56|57|58)/],['XL',/^08(17|18|19|59|77|78)/],['Axis',/^08(31|32|33|38)/],['Tri',/^08(95|96|97|98|99)/],['Smartfren',/^08(81|82|83|84|85|86|87|88|89)/]];
const NOM=[5000,10000,20000,25000,50000,100000];
const C={
 pulsa:{n:'📱 Pulsa',id:'Nomor HP',t:'hp',nom:NOM},
 data:{n:'📶 Paket Data',id:'Nomor HP',t:'hp',nom:NOM,note:'Sebut kuota/paket yang diinginkan di catatan (opsional).'},
 pln:{n:'⚡ Token PLN',id:'Nomor meter / ID pelanggan',t:'meter',nom:[20000,50000,100000,200000,500000]},
 ewallet:{n:'💳 E-Wallet',id:'Nomor HP terdaftar',t:'hp',sub:['DANA','OVO','GoPay','ShopeePay'],nom:[10000,20000,25000,50000,100000,200000]},
 game:{n:'🎮 Topup Game',id:'User ID (+ Zone/Server jika ada)',t:'gid',sub:['Mobile Legends','Free Fire','PUBG Mobile','Genshin Impact','Lainnya'],nom:null,note:'Tulis jumlah diamond/UC yang diinginkan.'},
 tagihan:{n:'🧾 Tagihan',id:'ID pelanggan / No. VA',t:'bill',sub:['PLN Pascabayar','BPJS Kesehatan','PDAM'],nom:null,note:'Jumlah tagihan dicek & dikonfirmasi via WA.'}
};
let H={},cat='pulsa';
const $=s=>document.querySelector(s),rp=n=>'Rp'+Number(n).toLocaleString('id-ID');
const opOf=v=>{v=norm(v);for(const[o,r]of OPS)if(r.test(v))return o;return ''};
const norm=v=>{v=(v||'').replace(/\D/g,'');if(v.startsWith('62'))v='0'+v.slice(2);return v};
function price(nom,sub){const h=H[cat];if(!h)return null;const x=(sub&&h[sub])?h[sub]:h;return x&&x[nom]!=null?x[nom]:null}
function render(){
 const c=C[cat];document.querySelectorAll('#pp-cats .chip').forEach(b=>b.classList.toggle('on',b.dataset.c===cat));
 $('#pp-sub-w').hidden=!c.sub;if(c.sub)$('#pp-sub').innerHTML=c.sub.map(s=>`<option>${s}</option>`).join('');
 $('#pp-idl').textContent=c.id;$('#pp-id').inputMode=c.t==='gid'?'text':'numeric';
 $('#pp-nom-w').hidden=!c.nom;$('#pp-qty-w').hidden=cat!=='game';
 $('#pp-note').textContent=c.note||'';$('#pp-err').textContent='';upd();
}
function upd(){
 const c=C[cat],v=$('#pp-id').value,sub=c.sub?$('#pp-sub').value:'';
 const o=c.t==='hp'?opOf(v):'';$('#pp-op').textContent=c.t==='hp'?(o?'Operator: '+o:(norm(v).length>=4?'Operator tidak dikenali':'')):'';
 if(c.nom){const key=cat==='pulsa'||cat==='data'?o:sub,cur=$('#pp-nom').value;
  $('#pp-nom').innerHTML=c.nom.map(n=>{const p=price(n,key);return `<option value="${n}">${rp(n)}${p?' — '+rp(p):''}</option>`}).join('');if(cur)$('#pp-nom').value=cur;
  const p=price($('#pp-nom').value,key);$('#pp-price').textContent=p?'Harga: '+rp(p):'Harga dikonfirmasi via WA';}
 else $('#pp-price').textContent='Harga dikonfirmasi via WA';
}
function send(e){e.preventDefault();
 const c=C[cat],raw=$('#pp-id').value.trim(),err=$('#pp-err');let id=raw;
 if(c.t==='hp'){id=norm(raw);if(!/^08\d{8,11}$/.test(id))return err.textContent='Nomor HP harus 10–13 digit, diawali 08.';}
 if(c.t==='meter'){id=raw.replace(/\D/g,'');if(!/^\d{11,12}$/.test(id))return err.textContent='Nomor meter/ID PLN harus 11–12 digit.';}
 if(c.t==='bill'){id=raw.replace(/\s/g,'');if(!/^\d{6,20}$/.test(id))return err.textContent='ID pelanggan tidak valid (angka saja).';}
 if(c.t==='gid'&&raw.length<3)return err.textContent='Isi User ID game.';
 if(cat==='game'&&!$('#pp-qty').value.trim())return err.textContent='Isi jumlah diamond/UC.';
 const sub=c.sub?$('#pp-sub').value:'',o=c.t==='hp'?opOf(id):'',nama=$('#pp-nama').value.trim(),cat2=$('#pp-cat2').value.trim();
 const L=['Halo iTAP, saya mau order *'+c.n.replace(/^\S+\s/,'')+'*',''];
 if(sub)L.push('Layanan: '+sub);if(o)L.push('Operator: '+o);
 L.push(c.id+': '+id);if(c.nom)L.push('Nominal: '+rp($('#pp-nom').value));
 if(cat==='game')L.push('Jumlah: '+$('#pp-qty').value.trim());
 if(cat2)L.push('Catatan: '+cat2);if(nama)L.push('Nama: '+nama);
 L.push('','Mohon info total harga & cara bayar (QRIS/transfer). Terima kasih 🙏');
 err.textContent='';window.open('https://wa.me/'+WA+'?text='+encodeURIComponent(L.join('\n')),'_blank','noopener');
}
function init(){if(!$('#ppob'))return;
 $('#pp-cats').innerHTML=Object.entries(C).map(([k,c])=>`<button type="button" class="chip" data-c="${k}">${c.n}</button>`).join('');
 $('#pp-cats').onclick=e=>{const b=e.target.closest('[data-c]');if(b){cat=b.dataset.c;render()}};
 $('#pp-id').oninput=upd;$('#pp-sub').onchange=upd;$('#pp-nom').onchange=upd;$('#pp-form').onsubmit=send;
 render();fetch('data/ppob-harga.json?v=19').then(r=>r.ok?r.json():{}).then(j=>{H=j||{};upd()}).catch(()=>{});
}
document.readyState==='loading'?document.addEventListener('DOMContentLoaded',init):init();
})();
