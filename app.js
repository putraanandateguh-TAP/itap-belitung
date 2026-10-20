const $=id=>document.getElementById(id);const now=new Date();
$('yr').textContent=now.getFullYear();$('today').textContent=now.toLocaleDateString('id-ID',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
function go(id){$(id).scrollIntoView({behavior:'smooth'});if(id==='cari')setTimeout(()=>$('q').focus(),400)}
const EMO={Wisata:'🏝️',Kuliner:'🍜',Sejarah:'⛏️',Legenda:'📜',Budaya:'🥁',Praktis:'🧭',Ibadah:'🛐'};
KB.forEach((e,i)=>e.id=i);
const REAL=[0,1,2,5,6,8,9,10,13,14,15,16,17,18,20,21,22,23,24,26,28,29,33,34,39,42,44],GEN=[30,31,32,3,4,7,11,12,25,27,35,36,37,38,40,41,43];
const AG={Masjid:'🕌',Katolik:'⛪',Protestan:'✝️',Klenteng:'🏮'};
const imgOf=e=>e.img?e.img:e.id===19?'img/kedai.webp':(REAL.includes(e.id)||GEN.includes(e.id))?`img/e${e.id}.webp`:null;
const thumb=e=>{const u=imgOf(e);if(!u&&e.a)return `<div class="thumb ag ag-${e.a}"><span>${AG[e.a]}</span><small>${e.a}</small></div>`;return u?`<div class="thumb ph"><img src="${u}" alt="${e.t}" loading="lazy">${(GEN.includes(e.id)||e.ai)?'<span class="ai">Ilustrasi AI</span>':''}</div>`:`<div class="thumb c-${e.c} fb"><img src="logo-sm.png" alt="" loading="lazy"><span>Foto menyusul</span></div>`};
const ls=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(_){return d}};const ss=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(_){}};
let saved=ls('itap_saved',[]);
const maps0=t=>'https://www.google.com/maps/search/'+encodeURIComponent(t+' Belitung');
const maps=t=>t==='Bakso Aci iTAP'?'https://www.google.com/maps/dir/?api=1&destination=-2.719012,107.677769':maps0(t);
function card(e){const s=saved.includes(e.id);return `<div class="it" data-vid="${e.id}">${thumb(e)}<div class="bd"><button class="save" data-s="${e.id}" title="Simpan">${s?'🔖':'📑'}</button><span class="tag">${e.c}</span>${e.cek?'<span class="tag cek">perlu dicek</span>':''}<h3>${e.t}</h3><p>${e.d}</p>${window.viewTag?viewTag(e.id):""}<a class="sm" style="color:var(--blue)" target="_blank" rel="noopener" href="${maps(e.t)}">📍 Lihat di peta</a></div></div>`}
document.addEventListener('click',ev=>{const b=ev.target.closest('[data-s]');if(!b)return;const id=+b.dataset.s;saved=saved.includes(id)?saved.filter(x=>x!==id):[...saved,id];ss('itap_saved',saved);renderAll()});
// Featured + sorotan
const FEAT=[0,16,2,34,6,9];const f=KB[FEAT[now.getDate()%FEAT.length]];
$('feat').innerHTML=`<img class="bg" src="${imgOf(f)}" alt="${f.t}"><span class="tag" style="background:#fff3;color:#fff">${f.c} · Sorotan hari ini</span><h2>${f.t}</h2><p>${f.d}</p><a class="cta" style="width:max-content" target="_blank" rel="noopener" href="${maps(f.t)}">📍 Buka peta</a>`;
$('sorotan').innerHTML=[1,9,33,19,40].map((i,n)=>`<div class="li" data-vid="${i}" onclick="q.value='${KB[i].t.split(' ').slice(0,2).join(' ')}';render();go('cari')"><span class="n">0${n+1}</span><div><span class="tag">${KB[i].c}</span><div><b>${KB[i].t}</b></div></div></div>`).join('');
// Rows
const row=(id,cs)=>$(id).innerHTML=KB.filter(e=>cs.includes(e.c)).map(card).join('');
// Search
const CATS=Object.keys(EMO);let cat='';const q=$('q');const norm=s=>s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'');
function setCat(c){cat=c;q.value='';render()}
let recent=ls('itap_recent',[]),rt;
function render(){const t=norm(q.value.trim()),ws=t.split(/\s+/).filter(Boolean);
 const list=KB.filter(e=>(!cat||e.c===cat)&&ws.every(w=>norm(e.t+' '+e.d+' '+e.k+' '+e.c).includes(w)));
 const sh=(!t&&!cat)?list.slice(0,8):list;$('res').innerHTML=sh.length?sh.map(card).join(''):'<p class="mu">Belum ada di database kami — coba cari di web.</p>';if(sh.length<list.length)$('res').innerHTML+=`<button class="more" onclick="setCat('Wisata')">Lihat semua ${list.length} info →</button>`;
 const s=encodeURIComponent((q.value||cat||'wisata')+' Belitung');$('gs').href='https://www.google.com/search?q='+s;$('gm').href='https://www.google.com/maps/search/'+s;
 document.querySelectorAll('#chips .chip').forEach(b=>b.classList.toggle('on',b.dataset.c===cat));
 clearTimeout(rt);if(t.length>2)rt=setTimeout(()=>{recent=[q.value.trim(),...recent.filter(x=>x!==q.value.trim())].slice(0,6);ss('itap_recent',recent);showRecent()},1500)}
function showRecent(){$('recent').innerHTML=recent.length?'Terakhir kamu cari: '+recent.map(r=>`<a class="pill" onclick="q.value=this.textContent;render()">${r}</a>`).join(' '):'Populer: '+['mie belitung','island hopping','laskar pelangi','danau kaolin','tarsius'].map(r=>`<a class="pill" onclick="q.value=this.textContent;render()">${r}</a>`).join(' ')}
$('chips').innerHTML=['',...CATS].map(c=>`<button class="chip" data-c="${c}">${c?EMO[c]+' '+c:'Semua'}</button>`).join('');
$('chips').onclick=e=>{const b=e.target.closest('.chip');if(b){cat=b.dataset.c;render()}};q.oninput=render;
function renderAll(){row('row-wisata',['Wisata']);row('row-kuliner',['Kuliner']);row('row-sejarah',['Sejarah','Legenda','Budaya']);render();
 $('saved').innerHTML=saved.length?KB.filter(e=>saved.includes(e.id)).map(card).join(''):'<p class="mu">Belum ada. Tekan 📑 di kartu mana pun untuk menyimpan.</p>'}
renderAll();showRecent();
// Weather
const WC={0:'☀️ Cerah',1:'🌤️ Cerah berawan',2:'⛅ Berawan',3:'☁️ Mendung',45:'🌫️ Berkabut',48:'🌫️ Berkabut',51:'🌦️ Gerimis',53:'🌦️ Gerimis',55:'🌦️ Gerimis',61:'🌧️ Hujan ringan',63:'🌧️ Hujan',65:'🌧️ Hujan lebat',80:'🌦️ Hujan lokal',81:'🌧️ Hujan lokal',82:'⛈️ Hujan deras',95:'⛈️ Badai petir',96:'⛈️ Badai petir',99:'⛈️ Badai petir'};
const wc=c=>WC[c]||'🌡️',hari=d=>new Date(d).toLocaleDateString('id-ID',{weekday:'short',day:'numeric'}),hm=s=>s.slice(11,16);
const chip=(i,l,v)=>`<div class="ic">${i} <small>${l}</small><b>${v}</b></div>`;const INFO={};
function drawInfo(){$('infochips').innerHTML=[INFO.wx&&chip('🌡️','Tanjung Pandan',INFO.wx),INFO.next&&chip('🕌','Sholat berikutnya',INFO.next),INFO.sun&&chip('🌅','Terbit · terbenam',INFO.sun),INFO.wave&&chip('🌊','Gelombang utara',INFO.wave),`<a href="tel:+6281741191119">${chip('🚑','PSC 119 Belitung','0817-4119-119')}</a>`,chip('🛒','Promo ebook -70%','Rp29.700')].filter(Boolean).join('')}
const CITIES=[{n:'Tanjung Pandan',la:-2.7487,lo:107.6516},{n:'Manggar',la:-2.8833,lo:108.2667}];
(async()=>{const box=$('wx');box.innerHTML='';
 for(const c of CITIES){const el=document.createElement('div');el.className='card wx';el.textContent='Memuat '+c.n+'…';box.appendChild(el);
  try{const r=await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${c.la}&longitude=${c.lo}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,uv_index&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset&timezone=Asia%2FJakarta&forecast_days=4`).then(r=>r.json());
   const cu=r.current,d=r.daily;if(c.n==='Tanjung Pandan'){INFO.wx=Math.round(cu.temperature_2m)+'°C '+wc(cu.weather_code).split(' ')[0];INFO.sun=hm(d.sunrise[0])+' · '+hm(d.sunset[0]);drawInfo()}
   el.innerHTML=`<div class="eyebrow">${c.n}</div><div class="big">${Math.round(cu.temperature_2m)}°C</div><div>${wc(cu.weather_code)}</div><div class="mu sm">Lembap ${cu.relative_humidity_2m}% · Angin ${Math.round(cu.wind_speed_10m)} km/j · UV ${cu.uv_index??'-'}</div><div class="mu sm">🌅 ${hm(d.sunrise[0])} · 🌇 ${hm(d.sunset[0])} WIB</div><div class="fc">${[1,2,3].map(i=>`<div>${hari(d.time[i])}<br>${wc(d.weather_code[i]).split(' ')[0]}<br>${Math.round(d.temperature_2m_min[i])}–${Math.round(d.temperature_2m_max[i])}°<br>💧${d.precipitation_probability_max[i]??'-'}%</div>`).join('')}</div>`}catch(e){el.textContent=c.n+': cuaca gagal dimuat.'}}
 const m=document.createElement('div');m.className='card wx';box.appendChild(m);
 try{const r=await fetch('https://marine-api.open-meteo.com/v1/marine?latitude=-2.55&longitude=107.68&current=wave_height,wave_period&daily=wave_height_max&timezone=Asia%2FJakarta&forecast_days=4').then(r=>r.json());
  const h=r.current.wave_height,v=h<0.5?0:h<1.25?1:2,txt=['Tenang — cocok island hopping','Sedang — hati-hati perahu kecil','Tinggi — tunda penyeberangan'][v];INFO.wave=h+' m';drawInfo();
  m.innerHTML=`<div class="eyebrow">🌊 Laut utara (Tj. Kelayang)</div><div class="big">${h} m</div><span class="verdict v${v}">${txt}</span><div class="mu sm">Periode ${r.current.wave_period}s</div><div class="fc">${[1,2,3].map(i=>`<div>${hari(r.daily.time[i])}<br>maks ${r.daily.wave_height_max[i]} m</div>`).join('')}</div><p class="mu sm" style="margin-top:8px">Estimasi model, bukan pengganti info resmi BMKG/syahbandar.</p>`}catch(e){m.textContent='Data gelombang gagal dimuat.'}})();
// Prayer
(()=>{const dd=String(now.getDate()).padStart(2,'0')+'-'+String(now.getMonth()+1).padStart(2,'0')+'-'+now.getFullYear();
fetch('https://api.aladhan.com/v1/timings/'+dd+'?latitude=-2.7487&longitude=107.6516&method=20&timezonestring=Asia%2FJakarta').then(r=>r.json()).then(r=>{const t=r.data.timings,h=r.data.date.hijri;$('sd').textContent=h.day+' '+h.month.en+' '+h.year+' H';
 const L=[['Subuh','Fajr'],['Terbit','Sunrise'],['Dzuhur','Dhuhr'],['Ashar','Asr'],['Maghrib','Maghrib'],['Isya','Isha']];const cur=now.getHours()*60+now.getMinutes();const mins=s=>+s.slice(0,2)*60+ +s.slice(3,5);
 const nx=L.find(([a,b])=>b!=='Sunrise'&&mins(t[b])>cur)||L[0];INFO.next=nx[0]+' '+t[nx[1]];drawInfo();
 $('pt').innerHTML=L.map(([a,b])=>`<div class="pt${a===nx[0]?' nx':''}"><span>${a}${a===nx[0]?' · berikutnya':''}</span><b>${t[b]}</b></div>`).join('')}).catch(()=>{$('pt').textContent='Jadwal sholat gagal dimuat.'})})();
drawInfo();
// Trip planner
const TRIP={1:[['Hari 1 — Pesisir utara & island hopping',['Pagi: berangkat dari Pantai Tanjung Kelayang, island hopping ke Batu Berlayar, Pulau Lengkuas (mercusuar), Pulau Burung — cek gelombang di atas dulu','Siang: makan seafood / gangan','Sore: Pantai Tanjung Tinggi (batu granit Laskar Pelangi)','Malam: Mie Belitung & ngopi di Tanjung Pandan, atau Bakso Aci iTAP']]],
2:[['Hari 1 — Pesisir utara',['Island hopping dari Tanjung Kelayang','Sore di Pantai Tanjung Tinggi']],['Hari 2 — Kota & sekitar',['Pagi: Danau Kaolin','Siang: Mie Belitung, Museum Tanjung Pandan','Sore: sunset di Pantai Tanjung Pendam (lihat jam terbenam di atas)','Malam: kuliner & oleh-oleh']]],
3:[['Hari 1 — Pesisir utara',['Island hopping dari Tanjung Kelayang','Sore di Pantai Tanjung Tinggi']],['Hari 2 — Alam & kota',['Pagi: trekking Bukit Peramun (bawa air, sepatu nyaman)','Siang: Danau Kaolin','Sore: Pantai Tanjung Pendam']],['Hari 3 — Belitung Timur',['Gantong: Replika SD Laskar Pelangi & Museum Kata Andrea Hirata','Manggar: ngopi di Kota 1001 Warung Kopi','Vihara Dewi Kwan Im di Burung Mandi, pulang lewat Open Pit Nam Salu (opsional)']]]};
function trip(d){$('tripout').innerHTML=TRIP[d].map(([h,l])=>`<div class="day"><h3>${h}</h3><ul>${l.map(x=>`<li>${x}</li>`).join('')}</ul></div>`).join('')+'<p class="mu sm">Saran umum. Jarak Tanjung Pandan–Manggar ±1,5 jam berkendara (perkiraan). Sewa mobil/motor paling praktis.</p>';document.querySelectorAll('#tripbtn .chip').forEach(b=>b.classList.toggle('on',b.dataset.d==d))}
$('tripbtn').onclick=e=>{const b=e.target.closest('.chip');if(b)trip(b.dataset.d)};trip(1);
// active tab on scroll
const tabs=[...document.querySelectorAll('.tabs a')];addEventListener('scroll',()=>{let a=tabs[0];tabs.forEach(t=>{const s=document.querySelector(t.getAttribute('href'));if(s&&s.getBoundingClientRect().top<160)a=t});tabs.forEach(t=>t.classList.toggle('on',t===a))},{passive:true});

// Music
(()=>{const a=new Audio('audio/belitung-bg.mp3');a.loop=true;a.preload='none';a.volume=0;const b=$('music');let on=false;
const ui=()=>{b.textContent=on?'🎵 Musik: on':'🔇 Putar musik';b.classList.toggle('on',on)};
const fade=(to,cb)=>{const st=a.volume,t0=performance.now();const f=()=>{const k=Math.min(1,(performance.now()-t0)/1500);a.volume=st+(to-st)*k;k<1?requestAnimationFrame(f):cb&&cb()};f()};
const play=()=>a.play().then(()=>{on=true;ui();fade(.35)}).catch(()=>{});
const stop=()=>{on=false;ui();fade(0,()=>a.pause())};
b.onclick=e=>{e.stopPropagation();if(on){stop();ss('itap_music','off')}else{ss('itap_music','on');play()}};ui();
if(ls('itap_music','on')!=='off'){a.preload='auto';play();const ev=['pointerdown','keydown','scroll','touchstart'];const once=()=>{ev.forEach(x=>removeEventListener(x,once,true));if(!on&&ls('itap_music','on')!=='off')play()};ev.forEach(x=>addEventListener(x,once,{capture:true,passive:true}))}})();

// Tempat ibadah
(()=>{let ag='';const draw=()=>{$('ib-res').innerHTML=KB.filter(e=>e.c==='Ibadah'&&(!ag||e.a===ag)).map(card).join('');document.querySelectorAll('#ib-chips .chip').forEach(b=>b.classList.toggle('on',b.dataset.a===ag))};
$('ib-chips').innerHTML=['',...Object.keys(AG)].map(a=>`<button class="chip" data-a="${a}">${a?AG[a]+' '+a:'Semua'}</button>`).join('');
$('ib-chips').onclick=e=>{const b=e.target.closest('.chip');if(b){ag=b.dataset.a;draw()}};draw();
const ra=renderAll;renderAll=function(){ra();draw()}})();

(()=>{const t=document.getElementById('wc-time'),d=document.getElementById('wc-date');if(!t)return;const ft=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}),fd=new Intl.DateTimeFormat('id-ID',{timeZone:'Asia/Jakarta',weekday:'long',day:'numeric',month:'long',year:'numeric'});const u=()=>{const n=new Date();t.textContent=ft.format(n).replace(/\./g,':');d.textContent=fd.format(n)};u();setInterval(u,1000)})();
