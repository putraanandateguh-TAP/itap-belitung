(function () {
  const cfg = window.ITAP_UNDANGAN;
  const rp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
  const wa = window.ITAP_TEMA.wa;
  const $ = (id) => document.getElementById(id);

  const T = window.ITAP_TEMA;
  const themes = T.themes;
  const cats = [['semua', 'Semua', '✨']].concat(T.cats);
  function paintGrid(cat) {
    const list = cat === 'semua' ? themes.slice(0, 8) : themes.filter((t) => t.cats.includes(cat));
    const label = (cats.find((c) => c[0] === cat) || [, 'acara'])[1].toLowerCase();
    $('tgrid').innerHTML = list.map(T.card).join('') + (cat !== 'semua' ? T.customCard(label) : '');
    document.querySelectorAll('.cat').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.cat === cat)));
  }
  $('cats').innerHTML = cats.map((c) => '<button type="button" role="tab" class="cat" data-cat="' + c[0] + '"><span class="ci">' + c[2] + '</span>' + c[1] + '</button>').join('');
  $('cats').addEventListener('click', (e) => { const b = e.target.closest('.cat'); if (b) paintGrid(b.dataset.cat); });
  document.querySelectorAll('[data-scroll]').forEach((b) => b.onclick = () => $('cats').scrollBy({ left: 240 * Number(b.dataset.scroll), behavior: 'smooth' }));
  paintGrid('semua');

  // Akordeon contoh per kelompok acara
  const groups = [
    ['Acara keluarga', ['pernikahan', 'khitanan', 'aqiqah', 'ultah']],
    ['Pendidikan & prestasi', ['wisuda']],
    ['Syukuran & acara lain', ['syukuran', 'lainnya']]
  ];
  const catName = (c) => (T.cats.find((x) => x[0] === c) || [, c])[1];
  $('acc').innerHTML = groups.map((g, gi) => '<details' + (gi === 0 ? ' open' : '') + '><summary>' + g[0] + '</summary><ul>' + g[1].map((c) => {
    const list = themes.filter((t) => t.cats.includes(c));
    return list.map((t) => '<li><a href="../u/?s=' + t.demo + '&to=Tamu+Undangan" target="_blank" rel="noopener">Contoh undangan ' + catName(c).toLowerCase() + ' · ' + T.esc(t.name) + ' <span aria-hidden="true">↗</span></a></li>').join('')
      || '<li><a href="' + T.wa('Halo iTAP, saya ingin undangan ' + catName(c).toLowerCase() + '.') + '" target="_blank" rel="noopener">Undangan ' + catName(c).toLowerCase() + ' · minta lewat admin <span aria-hidden="true">↗</span></a></li>';
  }).join('') + '</ul></details>').join('');

  // Harga
  const featRows = (p) => [
    [true, 'Dirakit admin, terima beres'], [true, 'Akses semua tema'], [p.price > 0, p.price > 0 ? (window.ITAP_UNDANGAN.activeText ? window.ITAP_UNDANGAN.activeText(p) : (p.days > 0 ? 'Aktif ' + p.days + ' hari' : 'Aktif selamanya')) : 'Masa aktif'], [p.share, 'Boleh disebar ke tamu'],
    [p.share, 'Nama tamu tanpa batas'], [true, 'RSVP & ucapan'], [true, 'Peta lokasi & hitung mundur'], [true, 'Simpan ke Google Calendar'],
    [p.revisions !== 0, p.revisions == null ? 'Revisi leluasa' : (p.revisions ? p.revisions + '× revisi' : 'Revisi')],
    [p.music, 'Musik latar'], [p.gallery > 0, p.gallery ? 'Galeri ' + p.gallery + ' foto' : 'Galeri foto'], [p.gift, 'Amplop digital'],
    [p.editor, 'Sunting sendiri'], [p.stream, 'Tautan siaran langsung'], [p.autoscroll, 'Gulir otomatis'], [p.checkin, 'Catat hadir di pintu'],
    [p.story, 'Kisah perjalanan'], [p.mapsEmbed, 'Peta tertanam'], [p.customColor, 'Warna aksen sendiri']
  ];
  const sub = { coba: 'Uji tema, belum untuk disebar', dasar: 'Tanpa musik, galeri, dan amplop', klasik: 'Dengan musik, tanpa galeri', lengkap: 'Pilihan paling seimbang', luas: 'Untuk acara besar', penuh: 'Semua fitur terbuka' };
  const priceBand = (n) => '<div class="band"><small>Rp</small>' + Number(n).toLocaleString('id-ID') + '</div>';
  function pkgCard(p) {
    const rows = featRows(p).map((r) => '<li class="' + (r[0] ? 'y' : 'n') + '">' + r[1] + '</li>').join('');
    const cta = p.price > 0 ? '<a class="btn xs wide" href="pesan/?paket=' + p.id + '">Pilih ' + p.name + '</a>' : '<a class="btn out xs wide" href="#tema">Lihat tema</a>';
    return '<article class="pcard' + (p.id === 'lengkap' ? ' pick' : '') + '">' + (p.id === 'lengkap' ? '<span class="ribbon">Disarankan</span>' : '') + '<h3>' + p.name + '</h3><p class="psub">' + (sub[p.id] || p.blurb) + '</p>' + priceBand(p.price) + '<ul class="pl">' + rows + '</ul><button type="button" class="more">Tampilkan lebih banyak ⌄</button>' + cta + '</article>';
  }
  function planCard(p) {
    return '<article class="pcard"><h3>' + p.name + '</h3><p class="psub">' + p.blurb + '</p>' + priceBand(p.price) + '<ul class="pl"><li class="y">Banyak undangan dalam ' + p.name + '</li><li class="y">Fitur setara paket Penuh</li><li class="y">Semua tema iTAP</li><li class="y">Undangan aktif selamanya</li><li class="y">Dibantu admin lewat WhatsApp</li></ul><a class="btn xs wide" href="' + wa('Halo iTAP, saya tertarik paket langganan ' + p.name + ' (' + rp(p.price) + ').') + '" target="_blank" rel="noopener">Tanya paket ' + p.name + '</a></article>';
  }
  function paintPrices(mode) {
    $('prices').innerHTML = mode === 'langganan' ? cfg.plans.map(planCard).join('') : cfg.packages.map(pkgCard).join('');
    document.querySelectorAll('.toggle button').forEach((b) => b.classList.toggle('on', b.dataset.mode === mode));
    $('prices').querySelectorAll('.more').forEach((b) => b.onclick = () => { const c = b.closest('.pcard'); c.classList.toggle('open'); b.textContent = c.classList.contains('open') ? 'Sembunyikan ⌃' : 'Tampilkan lebih banyak ⌄'; });
    const pick = $('prices').querySelector('.pick');
    if (pick && innerWidth < 900) $('prices').scrollLeft = pick.offsetLeft - 24;
  }
  document.querySelectorAll('.toggle button').forEach((b) => b.onclick = () => paintPrices(b.dataset.mode));
  document.querySelectorAll('[data-pscroll]').forEach((b) => b.onclick = () => $('prices').scrollBy({ left: 300 * Number(b.dataset.pscroll), behavior: 'smooth' }));
  $('toPlans').onclick = () => { paintPrices('langganan'); $('harga').scrollIntoView({ behavior: 'smooth' }); };
  paintPrices('satuan');
  addEventListener('itap-prices', () => { const on = document.querySelector('.toggle button.on'); paintPrices(on ? on.dataset.mode : 'satuan'); });

  $('checks').innerHTML = ['Ganti nama tamu tanpa batas', 'Aktif selamanya mulai paket Lengkap', 'Dasbor RSVP & sebar via WhatsApp', 'RSVP & ucapan tamu', 'Peta Google Maps', 'Hitung mundur hari-H', 'Simpan ke Google Calendar', 'Musik latar bebas royalti', 'Galeri foto', 'Amplop digital & QRIS', 'Tautan siaran langsung', 'Gulir otomatis', 'Catat hadir di pintu', 'Kisah perjalanan', 'Peta tertanam', 'Warna aksen sendiri', 'Sunting sendiri lewat email', 'Revisi leluasa (Lengkap+)', 'Dirakit admin, terima beres'].map((t) => '<li>' + t + '</li>').join('');

  // Teks berganti di hero
  const words = ['Pernikahan', 'Khitanan', 'Aqiqah', 'Ulang Tahun', 'Wisuda', 'Syukuran'];
  let wi = 0;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => { const r = $('rot'); r.classList.add('out'); setTimeout(() => { wi = (wi + 1) % words.length; r.textContent = words[wi]; r.classList.remove('out'); }, 180); }, 2600);

  // Tip WhatsApp
  const tip = $('waTip');
  // Muncul sekali, hanya saat pengunjung masih di atas halaman, lalu hilang sendiri supaya tidak menutupi isi.
  const hideTip = () => { tip.classList.remove('on'); sessionStorage.setItem('itap_wa_tip', '1'); };
  if (!sessionStorage.getItem('itap_wa_tip')) setTimeout(() => { if (scrollY < 200) { tip.classList.add('on'); setTimeout(hideTip, 6000); addEventListener('scroll', hideTip, { once: true, passive: true }); } }, 2500);
  $('waTipX').onclick = () => { tip.classList.remove('on'); sessionStorage.setItem('itap_wa_tip', '1'); };
})();
