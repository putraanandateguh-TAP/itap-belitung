(function () {
  const cfg = window.ITAP_UNDANGAN;
  const rp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
  const wa = (text) => 'https://wa.me/' + cfg.wa + '?text=' + encodeURIComponent(text);
  const $ = (id) => document.getElementById(id);

  // Desain katalog. "theme" = gaya dasar di sistem (melayu/emas/pantai/islami), "id" = varian foto & warna.
  // rating: isi angka 1-5 hanya dari ulasan pembeli sungguhan. Selama kosong, kartu memakai label.
  const themes = [
    { id: 'melayu', theme: 'melayu', name: 'Melayu Belitong', cats: ['pernikahan'], demo: 'demo-melayu', tag: 'Favorit', bg: '#f3e3d3', rating: null },
    { id: 'emas', theme: 'emas', name: 'Putih Emas', cats: ['pernikahan'], demo: 'demo-emas', tag: 'Elegan', bg: '#efe8dc', rating: null },
    { id: 'pantai', theme: 'pantai', name: 'Pantai Tanjung', cats: ['pernikahan'], demo: 'demo-pantai', tag: 'Baru', bg: '#d9eeee', rating: null },
    { id: 'hijab', theme: 'islami', name: 'Syar\u2019i Hijau', cats: ['pernikahan'], demo: 'demo-hijab', tag: 'Baru', bg: '#e1ede5', rating: null },
    { id: 'khitanan', theme: 'islami', name: 'Khitanan Ceria', cats: ['khitanan'], demo: 'demo-khitanan', tag: 'Baru', bg: '#e4eadf', rating: null },
    { id: 'islami', theme: 'islami', name: 'Aqiqah Lembut', cats: ['aqiqah'], demo: 'demo-islami', tag: 'Baru', bg: '#e6ece6', rating: null }
  ];
  const cats = [
    ['semua', 'Semua', '✨'], ['pernikahan', 'Pernikahan', '💍'], ['khitanan', 'Khitanan', '🕌'], ['aqiqah', 'Aqiqah', '👶'],
    ['ultah', 'Ulang Tahun', '🎂'], ['wisuda', 'Wisuda', '🎓'], ['syukuran', 'Syukuran', '🍚'], ['kantor', 'Acara Kantor', '🏢'], ['lain', 'Acara Lain', '🎉']
  ];
  const minPrice = Math.min.apply(null, cfg.packages.filter((p) => p.price > 0).map((p) => p.price));
  const stars = (n) => '<span class="stars" aria-label="Rating ' + n + ' dari 5">' + '★★★★★'.slice(0, Math.round(n)) + '<i>' + '★★★★★'.slice(Math.round(n)) + '</i></span>';

  function themeCard(t) {
    return '<article class="tcard"><div class="tshot" style="background:' + t.bg + '"><span class="tag">' + t.tag + '</span>'
      + '<div class="phone a"><img src="img/mock/' + t.id + '-2.webp" alt="" loading="lazy" width="270" height="570"></div>'
      + '<div class="phone b"><img src="img/mock/' + t.id + '-1.webp" alt="Pratinjau tema ' + t.name + '" loading="lazy" width="270" height="570"></div></div>'
      + '<div class="tbody"><p class="tprice">Mulai ' + rp(minPrice) + '</p><h3>' + t.name + '</h3>'
      + (t.rating ? stars(t.rating) : '<span class="stars muted-stars" title="Belum ada ulasan">Tema asli iTAP</span>')
      + '<div class="tbtn"><a class="btn out xs" href="../u/?s=' + t.demo + '&to=Tamu+Undangan" target="_blank" rel="noopener">👁 Preview</a><a class="btn xs" href="pesan/?tema=' + t.id + '">Gunakan Tema</a></div></div></article>';
  }
  function customCard(label) {
    return '<article class="tcard custom"><div class="tshot cbox"><span>🎨</span><p>Tema ' + label + ' sedang disiapkan</p></div><div class="tbody"><p class="tprice">Harga ikut paket</p><h3>Tema custom</h3><span class="stars muted-stars">Desain sesuai acaramu</span><div class="tbtn"><a class="btn xs wide" href="' + wa('Halo iTAP, saya ingin undangan ' + label + ' dengan tema custom.') + '" target="_blank" rel="noopener">Minta via WhatsApp</a></div></div></article>';
  }
  function paintGrid(cat) {
    const list = cat === 'semua' ? themes : themes.filter((t) => t.cats.includes(cat));
    const label = (cats.find((c) => c[0] === cat) || [, 'acara'])[1].toLowerCase();
    $('tgrid').innerHTML = list.map(themeCard).join('') + (list.length ? '' : customCard(label));
    document.querySelectorAll('.cat').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.cat === cat)));
  }
  $('cats').innerHTML = cats.map((c) => '<button type="button" role="tab" class="cat" data-cat="' + c[0] + '"><span class="ci">' + c[2] + '</span>' + c[1] + '</button>').join('');
  $('cats').addEventListener('click', (e) => { const b = e.target.closest('.cat'); if (b) paintGrid(b.dataset.cat); });
  document.querySelectorAll('[data-scroll]').forEach((b) => b.onclick = () => $('cats').scrollBy({ left: 240 * Number(b.dataset.scroll), behavior: 'smooth' }));
  paintGrid('semua');

  // Harga
  const featRows = (p) => [
    [true, 'Dirakit admin, terima beres'], [true, 'Akses semua tema'], [p.price > 0, 'Tanpa masa aktif'], [p.share, 'Boleh disebar ke tamu'],
    [p.share, 'Nama tamu tanpa batas'], [true, 'RSVP & ucapan'], [true, 'Peta lokasi & hitung mundur'], [true, 'Simpan ke Google Calendar'],
    [p.revisions !== 0, p.revisions == null ? 'Revisi leluasa' : (p.revisions ? p.revisions + '× revisi' : 'Revisi')],
    [p.music, 'Musik latar'], [p.gallery > 0, p.gallery ? 'Galeri ' + p.gallery + ' foto' : 'Galeri foto'], [p.gift, 'Amplop digital'],
    [p.editor, 'Sunting sendiri'], [p.stream, 'Tautan siaran langsung'], [p.autoscroll, 'Gulir otomatis'], [p.checkin, 'Catat hadir di pintu'],
    [p.story, 'Kisah perjalanan'], [p.mapsEmbed, 'Peta tertanam'], [p.customColor, 'Warna aksen sendiri']
  ];
  const sub = { coba: 'Uji tema, belum untuk disebar', dasar: 'Tanpa musik, galeri, dan amplop', klasik: 'Dengan musik, tanpa galeri', lengkap: 'Paling sering dipesan', luas: 'Untuk acara besar', penuh: 'Semua fitur terbuka' };
  const priceBand = (n) => '<div class="band"><small>Rp</small>' + Number(n).toLocaleString('id-ID') + '</div>';
  function pkgCard(p) {
    const rows = featRows(p).map((r) => '<li class="' + (r[0] ? 'y' : 'n') + '">' + r[1] + '</li>').join('');
    const cta = p.price > 0 ? '<a class="btn xs wide" href="pesan/?paket=' + p.id + '">Pilih ' + p.name + '</a>' : '<a class="btn out xs wide" href="#tema">Lihat tema</a>';
    return '<article class="pcard' + (p.id === 'lengkap' ? ' pick' : '') + '">' + (p.id === 'lengkap' ? '<span class="ribbon">Terlaris</span>' : '') + '<h3>' + p.name + '</h3><p class="psub">' + (sub[p.id] || p.blurb) + '</p>' + priceBand(p.price) + '<ul class="pl">' + rows + '</ul><button type="button" class="more">Tampilkan lebih banyak ⌄</button>' + cta + '</article>';
  }
  function planCard(p) {
    return '<article class="pcard"><h3>' + p.name + '</h3><p class="psub">' + p.blurb + '</p>' + priceBand(p.price) + '<ul class="pl"><li class="y">Banyak undangan dalam ' + p.name + '</li><li class="y">Fitur setara paket Penuh</li><li class="y">Semua tema iTAP</li><li class="y">Tanpa masa aktif per undangan</li><li class="y">Dibantu admin lewat WhatsApp</li></ul><a class="btn xs wide" href="' + wa('Halo iTAP, saya tertarik paket langganan ' + p.name + ' (' + rp(p.price) + ').') + '" target="_blank" rel="noopener">Tanya paket ' + p.name + '</a></article>';
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

  $('checks').innerHTML = ['Ganti nama tamu tanpa batas', 'Tanpa masa aktif', 'RSVP & ucapan tamu', 'Peta Google Maps', 'Hitung mundur hari-H', 'Simpan ke Google Calendar', 'Musik latar bebas royalti', 'Galeri foto', 'Amplop digital & QRIS', 'Tautan siaran langsung', 'Gulir otomatis', 'Catat hadir di pintu', 'Kisah perjalanan', 'Peta tertanam', 'Warna aksen sendiri', 'Sunting sendiri lewat email', 'Revisi leluasa (Lengkap+)', 'Dirakit admin, terima beres'].map((t) => '<li>' + t + '</li>').join('');

  // Teks berganti di hero
  const words = ['Pernikahan', 'Khitanan', 'Aqiqah', 'Ulang Tahun', 'Wisuda', 'Syukuran'];
  let wi = 0;
  if (!matchMedia('(prefers-reduced-motion: reduce)').matches) setInterval(() => { const r = $('rot'); r.classList.add('out'); setTimeout(() => { wi = (wi + 1) % words.length; r.textContent = words[wi]; r.classList.remove('out'); }, 250); }, 2400);

  // Menu, WhatsApp, tip
  const burger = document.querySelector('.burger');
  burger.onclick = () => { const open = document.body.classList.toggle('menu-open'); burger.setAttribute('aria-expanded', String(open)); };
  $('menu').addEventListener('click', (e) => { if (e.target.tagName === 'A') { document.body.classList.remove('menu-open'); burger.setAttribute('aria-expanded', 'false'); } });
  document.querySelectorAll('[data-wa]').forEach((a) => { a.href = wa(a.dataset.wa); a.target = '_blank'; a.rel = 'noopener'; });
  const tip = $('waTip');
  if (!sessionStorage.getItem('itap_wa_tip')) setTimeout(() => tip.classList.add('on'), 2500);
  $('waTipX').onclick = () => { tip.classList.remove('on'); sessionStorage.setItem('itap_wa_tip', '1'); };
})();
