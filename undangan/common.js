// Bagian bersama halaman jualan Undangan iTAP: katalog tema, footer, navigasi bawah, menu, tombol WhatsApp.
(function () {
  const cfg = window.ITAP_UNDANGAN || {};
  const base = document.body.dataset.base || './';
  const VERSION = 'Undangan iTAP v2.3 · 10 Nov 2026';
  const wa = (text) => 'https://wa.me/' + (cfg.wa || '6287749476651') + '?text=' + encodeURIComponent(text || 'Halo iTAP');
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  // id = varian desain, theme = gaya dasar di database (melayu/emas/pantai/islami).
  // rating: isi hanya dari ulasan pembeli sungguhan. Kosong = tidak ditampilkan.
  const themes = [
    { id: 'melayu', theme: 'melayu', name: 'Melayu Belitong', cats: ['pernikahan'], styles: ['budaya', 'elegan'], colors: ['#4a1c24', '#8c2f3b', '#e8c98a'], photo: true, popular: true, rec: false, tag: 'Unggulan', bg: '#f3e3d3', words: 'melayu belitung adat songket marun emas tradisional' },
    { id: 'emas', theme: 'emas', name: 'Putih Emas', cats: ['pernikahan'], styles: ['elegan', 'formal'], colors: ['#1c1a17', '#a6843d', '#fbf8f2'], photo: true, popular: true, rec: false, tag: 'Elegan', bg: '#efe8dc', words: 'putih emas gold klasik mewah modern' },
    { id: 'hijab', theme: 'islami', name: 'Syar\u2019i Hijau', cats: ['pernikahan'], styles: ['elegan', 'simpel'], colors: ['#0c3b2e', '#2f6b4f', '#e1ede5'], photo: true, popular: true, rec: true, tag: 'Baru', bg: '#e1ede5', words: 'islami muslim syari hijab hijau sage walimah' },
    { id: 'masjid', theme: 'islami', name: 'Kubah Krem', cats: ['pernikahan'], styles: ['budaya', 'elegan'], colors: ['#2f6b4f', '#f1e8cf', '#c9b47a'], photo: true, popular: false, rec: true, tag: 'Baru', bg: '#efe6cc', words: 'islami masjid kubah krem hijau walimatul ursy pintu' },
    { id: 'pantai', theme: 'pantai', name: 'Pantai Tanjung', cats: ['pernikahan'], styles: ['simpel'], colors: ['#0c4c5a', '#0f6e78', '#d7efe8'], photo: true, popular: false, rec: true, tag: 'Baru', bg: '#d9eeee', words: 'pantai laut belitung tanjung tinggi biru outdoor' },
    { id: 'khitanan', theme: 'islami', name: 'Khitanan Ceria', cats: ['khitanan'], styles: ['simpel'], colors: ['#0c3b2e', '#2f6b4f', '#d8c48a'], photo: true, popular: true, rec: false, tag: 'Baru', bg: '#e4eadf', words: 'khitanan sunatan anak laki islami' },
    { id: 'islami', theme: 'islami', name: 'Aqiqah Lembut', cats: ['aqiqah'], styles: ['simpel'], colors: ['#0c3b2e', '#2f6b4f', '#e6ece6'], photo: true, popular: false, rec: true, tag: 'Baru', bg: '#e6ece6', words: 'aqiqah bayi syukuran kelahiran islami' },
    { id: 'ultah', theme: 'pantai', name: 'Ulang Tahun Laut', cats: ['ultah', 'lainnya'], styles: ['simpel'], colors: ['#0c4c5a', '#0f6e78', '#d7efe8'], photo: false, popular: false, rec: false, tag: 'Tanpa foto', bg: '#dceff0', words: 'ulang tahun ultah birthday anak pesta' },
    { id: 'wisuda', theme: 'emas', name: 'Wisuda Emas', cats: ['wisuda', 'lainnya'], styles: ['formal', 'elegan'], colors: ['#1c1a17', '#a6843d', '#fbf8f2'], photo: false, popular: false, rec: false, tag: 'Tanpa foto', bg: '#efe8dc', words: 'wisuda kelulusan sarjana syukuran formal' },
    { id: 'syukuran', theme: 'melayu', name: 'Selamatan Rumah', cats: ['syukuran', 'lainnya'], styles: ['budaya', 'simpel'], colors: ['#4a1c24', '#8c2f3b', '#e8c98a'], photo: false, popular: false, rec: false, tag: 'Tanpa foto', bg: '#f3e3d3', words: 'syukuran selamatan rumah baru doa bersama tasyakuran' }
  ];
  themes.forEach((t) => { t.demo = 'demo-' + t.id; });
  const cats = [
    ['pernikahan', 'Pernikahan', '💍'], ['khitanan', 'Khitanan', '🕌'], ['aqiqah', 'Aqiqah', '👶'], ['ultah', 'Ulang Tahun', '🎂'],
    ['wisuda', 'Wisuda', '🎓'], ['syukuran', 'Syukuran', '🍚'], ['lainnya', 'Lainnya', '🎉']
  ];
  const styles = [['elegan', 'Elegan'], ['budaya', 'Budaya'], ['formal', 'Formal'], ['simpel', 'Simpel']];
  const minPrice = Math.min.apply(null, (cfg.packages || [{ price: 39000 }]).filter((p) => p.price > 0).map((p) => p.price));
  const rp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');

  function card(t) {
    return '<article class="tcard"><div class="tshot" style="background:' + t.bg + '"><span class="tag">' + esc(t.tag) + '</span>'
      + '<div class="phone a"><img src="' + base + 'img/mock/' + t.id + '-2.webp" alt="" loading="lazy" width="270" height="570"></div>'
      + '<div class="phone b"><img src="' + base + 'img/mock/' + t.id + '-1.webp" alt="Pratinjau tema ' + esc(t.name) + '" loading="lazy" width="270" height="570"></div></div>'
      + '<div class="tbody"><p class="tprice">Mulai ' + rp(minPrice) + '</p><h3>' + esc(t.name) + '</h3>'
      + (t.rating ? '<span class="stars" aria-label="Rating ' + t.rating + ' dari 5">' + '★★★★★'.slice(0, Math.round(t.rating)) + '</span>' : '<span class="dots" aria-label="Warna tema">' + t.colors.map((c) => '<i style="background:' + c + '"></i>').join('') + '</span>')
      + '<div class="tbtn"><a class="btn out xs" href="' + base + '../u/?s=' + t.demo + '&to=Tamu+Undangan" target="_blank" rel="noopener">👁 Preview</a><a class="btn xs" href="' + base + 'pesan/?tema=' + t.id + '">Gunakan Tema</a></div></div></article>';
  }
  function row(t) {
    return '<article class="trow"><img src="' + base + 'img/mock/' + t.id + '-1.webp" alt="" loading="lazy" width="270" height="570"><div><h3>' + esc(t.name) + '</h3>'
      + '<p class="meta">' + t.cats.map((c) => (cats.find((x) => x[0] === c) || [, c])[1]).join(', ') + ' · ' + t.styles.map((s) => (styles.find((x) => x[0] === s) || [, s])[1]).join(', ') + (t.photo ? '' : ' · tanpa foto') + '</p>'
      + '<span class="dots">' + t.colors.map((c) => '<i style="background:' + c + '"></i>').join('') + '</span>'
      + '<div class="tbtn"><a class="btn out xs" href="' + base + '../u/?s=' + t.demo + '&to=Tamu+Undangan" target="_blank" rel="noopener">👁 Preview</a><a class="btn xs" href="' + base + 'pesan/?tema=' + t.id + '">Gunakan Tema</a></div></div></article>';
  }
  function customCard(label) {
    return '<article class="tcard custom"><div class="tshot cbox"><span>🎨</span><p>Tema ' + esc(label) + ' bisa dibuatkan</p></div><div class="tbody"><p class="tprice">Harga ikut paket</p><h3>Tema custom</h3><span class="muted-stars">Desain sesuai acaramu</span><div class="tbtn"><a class="btn xs wide" href="' + wa('Halo iTAP, saya ingin undangan ' + label + ' dengan tema custom.') + '" target="_blank" rel="noopener">Minta via WhatsApp</a></div></div></article>';
  }
  function search(text) {
    const words = String(text || '').toLowerCase().split(/\s+/).filter(Boolean);
    if (!words.length) return themes.slice();
    return themes.filter((t) => {
      const hay = [t.name, t.words, t.cats.map((c) => (cats.find((x) => x[0] === c) || [, c])[1]).join(' '), t.styles.join(' '), t.photo ? 'foto' : 'tanpa foto'].join(' ').toLowerCase();
      return words.every((w) => hay.includes(w));
    });
  }
  window.ITAP_TEMA = { themes, cats, styles, card, row, customCard, search, wa, esc, rp, minPrice, base };

  // Footer
  const foot = document.getElementById('foot');
  if (foot) {
    foot.className = 'foot';
    foot.innerHTML = '<div class="w fcols">'
      + '<div><a class="logo" href="' + base + '"><img src="' + base + '../logo-sm.png" alt="" width="34" height="34"><span><b>iTAP</b> Undangan</span></a><p>Layanan undangan digital dari iTAP Belitung. Dirakit admin, dibuka dari HP, dibayar setelah kamu setuju.</p><p class="hl"><b>Undangan digital, tanpa ribet.</b></p></div>'
      + '<div><h3>Pembayaran</h3><div class="paychips"><span>Transfer bank</span><span>QRIS</span></div><p>Rekening atau kode QRIS resmi dikirim admin lewat WhatsApp setelah draf kamu setujui. Jangan transfer ke nomor yang tidak dikirim admin iTAP.</p></div>'
      + '<div><h3>Kontak</h3><p>📍 Belitung, Air Merbau<br>💬 <a href="' + wa('Halo iTAP, saya mau tanya soal undangan digital.') + '" target="_blank" rel="noopener">WhatsApp 0877-4947-6651</a>'
      + (cfg.email ? '<br>✉️ <a href="mailto:' + esc(cfg.email) + '">' + esc(cfg.email) + '</a>' : '') + '<br>🌐 <a href="' + base + '../">itapbelitung.my.id</a></p>'
      + '<p><a href="' + base + 'syarat/">Syarat &amp; Ketentuan</a> · <a href="' + base + 'refund/">Kebijakan Refund</a></p></div>'
      + '</div><p class="w copy">© iTAP Belitung · ' + VERSION + ' · Foto contoh tema adalah ilustrasi buatan, bukan orang sungguhan.</p>';
  }
  // Navigasi bawah + WA mengambang (disisipkan sekali)
  const onLanding = document.body.dataset.page === 'landing';
  const ic = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/></svg>',
    price: '<svg viewBox="0 0 24 24"><path d="M12 3v18M16.5 7.5C16 6 14.4 5 12 5c-2.8 0-4.5 1.3-4.5 3.3 0 4.7 9.5 2.4 9.5 7.2 0 2-1.9 3.5-5 3.5-2.6 0-4.4-1-5-2.8"/></svg>',
    tpl: '<svg viewBox="0 0 24 24"><rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m4 19 6-6 4 4 3-3 4 4"/></svg>',
    user: '<svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4.4 4.2-6.5 8-6.5s7 2.1 8 6.5"/></svg>'
  };
  if (!document.querySelector('.bnav')) {
    const page = document.body.dataset.page || '';
    const nav = document.createElement('nav');
    nav.className = 'bnav'; nav.setAttribute('aria-label', 'Navigasi cepat');
    nav.innerHTML = '<a href="' + (onLanding ? '#top' : base) + '"' + (onLanding ? ' class="on"' : '') + '>' + ic.home + 'Beranda</a><a href="' + (onLanding ? '#harga' : base + '#harga') + '" data-smooth>' + ic.price + 'Harga</a><a href="' + base + 'tema/"' + (page === 'tema' ? ' class="on"' : '') + '>' + ic.tpl + 'Template</a><a href="' + base + 'masuk/"' + (page === 'masuk' ? ' class="on"' : '') + '>' + ic.user + 'Login</a>';
    document.body.appendChild(nav);
  }
  if (!document.querySelector('.wa-fab')) {
    const a = document.createElement('a');
    a.className = 'wa-fab'; a.href = wa('Halo iTAP, saya mau pesan undangan digital.'); a.target = '_blank'; a.rel = 'noopener'; a.setAttribute('aria-label', 'Chat admin di WhatsApp');
    a.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true"><path d="M16 3a13 13 0 0 0-11.2 19.6L3 29l6.6-1.7A13 13 0 1 0 16 3z" fill="#fff"/><path d="M16 5.2a10.8 10.8 0 0 0-9.2 16.5l.3.4-1.1 4 4.1-1.1.4.2A10.8 10.8 0 1 0 16 5.2z" fill="#25d366"/><path d="M12 10.3c-.3-.6-.6-.6-.9-.6h-.7c-.3 0-.7.1-1 .5-.4.4-1.3 1.3-1.3 3.1s1.3 3.6 1.5 3.9c.2.2 2.6 4.1 6.4 5.6 3.2 1.2 3.8 1 4.5.9.7-.1 2.2-.9 2.5-1.8.3-.9.3-1.6.2-1.8-.1-.2-.3-.3-.7-.5l-2.4-1.2c-.3-.1-.6-.2-.8.2l-1.1 1.4c-.2.2-.4.3-.8.1-.4-.2-1.5-.6-2.9-1.8-1.1-1-1.8-2.1-2-2.5-.2-.4 0-.6.2-.8l.6-.7.4-.6c.1-.2 0-.5 0-.7z" fill="#fff"/></svg>';
    document.body.appendChild(a);
    // Saat digulir, gelembung WA menyingkir supaya tidak menutupi isi; muncul lagi saat berhenti.
    let t = 0;
    const footEl = () => document.getElementById('foot');
    addEventListener('scroll', () => {
      a.classList.add('away');
      clearTimeout(t);
      t = setTimeout(() => { const f = footEl(); const nearFoot = f && f.getBoundingClientRect().top < innerHeight - 40; a.classList.toggle('away', !!nearFoot); }, 700);
    }, { passive: true });
  }
  // Gulir halus ke harga (dengan jarak header)
  document.addEventListener('click', (e) => {
    const a = e.target.closest('a[href^="#"]');
    if (!a) return;
    const el = document.getElementById(a.getAttribute('href').slice(1));
    if (!el) return;
    e.preventDefault();
    scrollTo({ top: el.getBoundingClientRect().top + scrollY - 70, behavior: 'smooth' });
    history.replaceState(null, '', a.getAttribute('href'));
  });
  // Menu burger & tautan WA berlabel data-wa
  const burger = document.querySelector('.burger');
  const menu = document.getElementById('menu');
  if (burger) burger.onclick = () => { const open = document.body.classList.toggle('menu-open'); burger.setAttribute('aria-expanded', String(open)); };
  if (menu) menu.addEventListener('click', (e) => { if (e.target.tagName === 'A') { document.body.classList.remove('menu-open'); if (burger) burger.setAttribute('aria-expanded', 'false'); } });
  document.querySelectorAll('[data-wa]').forEach((a) => { a.href = wa(a.dataset.wa); a.target = '_blank'; a.rel = 'noopener'; });
})();
