(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (id) => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  const slug = (q.get('s') || '').trim();
  const guest = (q.get('to') || '').trim();
  const demos = { 'demo-melayu': 'melayu', 'demo-emas': 'emas', 'demo-pantai': 'pantai', 'demo-islami': 'islami', 'demo-hijab': 'hijab', 'demo-khitanan': 'khitanan' };
  const app = $('app');
  let data = null;
  let flags = null;
  let audio = null;
  let scrolling = false;

  function pkg(id) {
    const list = (window.ITAP_UNDANGAN && window.ITAP_UNDANGAN.packages) || [];
    return list.find((item) => item.id === id) || list.find((item) => item.id === 'penuh') || {};
  }
  function token() {
    let t = localStorage.getItem('itap_undangan_token');
    if (!t) { t = crypto.randomUUID(); localStorage.setItem('itap_undangan_token', t); }
    return t;
  }
  function render() {
    flags = pkg(data.package || 'penuh');
    document.title = (data.title || 'Undangan') + ' · iTAP';
    app.className = 'sheet theme-' + (data.theme || 'emas');
    const hosts = (data.hosts || []).map((h) => '<article class="host"><span class="muted">' + esc(h.role) + '</span><b>' + esc(h.name) + '</b><p class="muted">' + esc(h.detail) + '</p></article>').join('');
    const events = (data.events || []).map((ev, i) => {
      const cal = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent((data.title || '') + ' · ' + ev.name) + '&dates=' + encodeURIComponent(ev.start + '/' + ev.end) + '&location=' + encodeURIComponent(ev.place + ', ' + ev.address);
      const mapBtn = ev.maps ? '<a class="ghost" href="' + esc(ev.maps) + '" target="_blank" rel="noopener">Peta</a>' : '';
      const embed = flags.mapsEmbed && ev.maps ? '<iframe class="map" title="Peta ' + esc(ev.name) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' + encodeURIComponent(ev.address || ev.place) + '&z=14&output=embed"></iframe>' : '';
      return '<article class="event"><h3>' + esc(ev.name) + '</h3><p class="when">' + esc(ev.timeLabel) + '</p><p><b>' + esc(ev.place) + '</b><br>' + esc(ev.address) + '</p><div class="row-actions"><a href="' + cal + '" target="_blank" rel="noopener">Simpan ke kalender</a>' + mapBtn + '</div>' + embed + '</article>';
    }).join('');
    const photos = (data.gallery || []).slice(0, flags.gallery || 0).map((src) => '<button type="button" class="pic" data-src="' + esc(src) + '"><img src="' + esc(src) + '" alt=""></button>').join('');
    const story = flags.story ? (data.story || []).map((s) => '<article class="step"><span class="when">' + esc(s.when) + '</span><b>' + esc(s.title) + '</b><p>' + esc(s.text) + '</p></article>').join('') : '';
    const gift = flags.gift && data.gift ? '<section class="block gift" id="amplop"><p class="eyebrow center">Amplop digital</p><h2 class="script center">Tanda kasih</h2><p class="muted">Contoh nomor bila ini pratinjau. Transfer hanya ke rekening yang tertulis.</p><p><b>' + esc(data.gift.bank) + '</b><br><span id="rek">' + esc(data.gift.number) + '</span><br>' + esc(data.gift.holder) + '</p><button type="button" id="copy">Salin nomor</button>' + (data.gift.qris ? '<img src="' + esc(data.gift.qris) + '" alt="QRIS">' : '') + '</section>' : '';
    const stream = flags.stream && data.streamUrl ? '<p><a class="cta" href="' + esc(data.streamUrl) + '" target="_blank" rel="noopener">Tonton siaran</a></p>' : '';
    const isWedding = /nikah|wedding/i.test(data.eventType || '');
    const cover = data.cover || '';
    const bg = cover ? ' style="--photo:url(\'' + esc(cover) + '\')"' : '';
    const ico = {
      home: '<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/></svg>',
      people: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3.2"/><circle cx="16.5" cy="8" r="3.2"/><path d="M2 20c.6-4 3-6 6-6s5.4 2 6 6M12.5 14.6c1-.4 2.4-.6 4-.6 3 0 5.4 2 6 6"/></svg>',
      photo: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 4 3-3 4 4"/></svg>',
      pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
      chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
      music: '<svg viewBox="0 0 24 24"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
      scroll: '<svg viewBox="0 0 24 24"><path d="M12 4v14M6 12l6 6 6-6"/></svg>'
    };
    const design = data.design || data.theme || '';
    const order = '../undangan/pesan/?tema=' + encodeURIComponent(design);
    const opening = data.opening || (isWedding
      ? 'Dengan memohon rahmat dan ridha Tuhan Yang Maha Esa, kami bermaksud menyelenggarakan pernikahan putra-putri kami. Kehadiran dan doa Bapak/Ibu/Saudara/i adalah hadiah terindah bagi kami.'
      : 'Dengan penuh rasa syukur, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan mendoakan acara keluarga kami.');
    const muslim = data.theme === 'islami' || data.theme === 'melayu';
    const quote = data.quote || (isWedding && muslim ? '“Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan untukmu dari jenismu sendiri, agar kamu merasa tenteram kepadanya.” (QS Ar-Rum: 21)' : '');
    const hostCards = (data.hosts || []).map((h, i) => '<article class="person">' + (i > 0 && isWedding ? '<p class="amp">&amp;</p>' : '') + '<div class="avatar">' + esc((h.name || '?').trim().charAt(0)) + '</div><p class="role">' + esc(h.role) + '</p><h3 class="script">' + esc(h.name) + '</h3><p class="muted">' + esc(h.detail) + '</p></article>').join('');
    app.innerHTML = ''
      + (data.demo ? '<div class="demobar"><span>Mau undangan seperti ini?</span><a href="' + order + '">Pesan tema ini</a></div>' : '')
      + '<section class="cover' + (cover ? ' has-photo' : '') + '" id="cover"' + bg + '><div class="cover-in"><p class="kicker">' + esc(data.kicker || data.eventType || '') + '</p><h1 class="script">' + esc(data.title) + '</h1><p class="date">' + esc(data.dateLabel || '') + '</p><div class="guest"><span>Kepada Yth. Bapak/Ibu/Saudara/i</span><b id="to"></b></div><p class="small">Tanpa mengurangi rasa hormat, kami mengundang Anda untuk hadir di acara kami.</p><button class="open" id="buka" type="button">' + ico.chat.replace('<svg', '<svg aria-hidden="true"') + ' Buka Undangan</button></div></section>'
      + '<div class="inside" id="in">'
      + '<section class="hero' + (cover ? ' has-photo' : '') + '" id="beranda"' + bg + '><div class="hero-in"><p class="kicker">' + esc(data.kicker || data.eventType || '') + '</p><h2 class="script big">' + esc(data.title) + '</h2><p class="date">' + esc(data.dateLabel || '') + '</p><div class="count" id="count"></div><a class="pill" href="#acara">Lihat acara</a></div></section>'
      + '<div class="body">'
      + (data.demo ? '<p class="demo-note">Contoh tampilan. Nama, foto, dan acara bukan sungguhan. Ucapan pratinjau hanya tersimpan di HP ini.</p>' : '')
      + '<section class="block center" id="pembuka"><p class="eyebrow">' + (isWedding ? 'Our Wedding' : esc(data.eventType || 'Undangan')) + '</p><h2 class="script">' + (muslim ? 'Assalamu&#39;alaikum' : (isWedding ? 'Salam bahagia' : 'Salam hangat')) + '</h2><p>' + esc(opening) + '</p>' + (quote ? '<blockquote>' + esc(quote) + '</blockquote>' : '') + '</section>'
      + '<section class="block center" id="mempelai"><p class="eyebrow">' + (isWedding ? 'Mempelai' : 'Yang mengundang') + '</p>' + hostCards + '</section>'
      + '<section class="block" id="acara"><p class="eyebrow center">Waktu &amp; tempat</p><h2 class="script center">Rangkaian acara</h2>' + events + stream + '</section>'
      + (photos ? '<section class="block" id="galeri"><p class="eyebrow center">Galeri</p><h2 class="script center">Momen kami</h2><div class="gallery">' + photos + '</div></section>' : '')
      + (story ? '<section class="block" id="kisah"><p class="eyebrow center">Kisah</p><h2 class="script center">Perjalanan kami</h2><div class="timeline">' + story + '</div></section>' : '')
      + gift
      + '<section class="block" id="rsvp-box"><p class="eyebrow center">RSVP</p><h2 class="script center">Konfirmasi kehadiran</h2><form id="rsvp" class="cardform"><label>Nama<input name="name" required maxlength="60"></label><label>Kehadiran<select name="attendance"><option value="hadir">Hadir</option><option value="tidak">Tidak hadir</option><option value="ragu">Masih ragu</option></select></label><label>Jumlah tamu<input name="guests" inputmode="numeric" value="1"></label><button class="cta" type="submit">Kirim konfirmasi</button><p id="rsvp-note" class="muted"></p></form>'
      + (flags.checkin ? '<p class="center"><button type="button" id="cek" class="ghost">Catat saya hadir</button></p>' : '')
      + '<h2 class="script center">Ucapan &amp; doa</h2><form id="wish" class="cardform"><label>Nama<input name="name" required maxlength="60"></label><label>Doa atau ucapan<textarea name="message" required maxlength="400"></textarea></label><button class="cta" type="submit">Kirim ucapan</button><p id="wish-note" class="muted"></p></form><div id="wishes"></div></section>'
      + '<section class="block center closing-box"><h2 class="script">Terima kasih</h2><p class="closing">' + esc(data.closing || '') + '</p><p><button type="button" id="share" class="ghost">Bagikan lewat WhatsApp</button></p></section>'
      + '<p class="foot"><a href="../undangan/">Dibuat dengan iTAP Undangan</a></p>'
      + '</div>'
      + '<nav class="dock" aria-label="Navigasi undangan"><a href="#beranda">' + ico.home + '<span>Beranda</span></a><a href="#mempelai">' + ico.people + '<span>' + (isWedding ? 'Mempelai' : 'Keluarga') + '</span></a>' + (photos ? '<a href="#galeri">' + ico.photo + '<span>Galeri</span></a>' : '') + '<a href="#acara">' + ico.pin + '<span>Lokasi</span></a><a href="#rsvp-box">' + ico.chat + '<span>RSVP</span></a></nav>'
      + '<div class="fabs"><button type="button" id="musik" class="fab" aria-label="Musik" title="Musik">' + ico.music + '</button>' + (flags.autoscroll ? '<button type="button" id="gulir" class="fab" aria-label="Gulir otomatis" title="Gulir otomatis">' + ico.scroll + '</button>' : '') + '</div>'
      + '<p class="toast" id="toast" role="status"></p>'
      + '</div>';
    const to = document.getElementById('to');
    to.textContent = guest || 'Tamu undangan';
    if (guest) document.getElementById('rsvp').elements.name.value = guest.slice(0, 60);
    document.getElementById('buka').onclick = openInvite;
    document.getElementById('rsvp').onsubmit = sendRsvp;
    document.getElementById('wish').onsubmit = sendWish;
    const copy = document.getElementById('copy');
    if (copy) copy.onclick = () => navigator.clipboard.writeText(data.gift.number).then(() => { copy.textContent = 'Tersalin'; });
    document.getElementById('musik').onclick = toggleMusic;
    const gulir = document.getElementById('gulir');
    if (gulir) gulir.onclick = toggleScroll;
    document.getElementById('share').onclick = share;
    const cek = document.getElementById('cek');
    if (cek) cek.onclick = checkIn;
    app.querySelectorAll('.pic').forEach((btn) => btn.onclick = () => openPic(btn.dataset.src));
    tick();
    setInterval(tick, 1000);
    loadWall();
  }

  function openInvite() {
    const c = document.getElementById('cover');
    c.classList.add('gone');
    document.getElementById('in').classList.add('on');
    document.body.classList.add('opened');
    scrollTo(0, 0);
    setTimeout(() => { c.style.display = 'none'; }, 700);
    if (flags.music && data.musicUrl) toggleMusic();
  }
  function toast(text) {
    const t = document.getElementById('toast');
    if (!t) return;
    t.textContent = text; t.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600);
  }
  function tick() {
    const box = document.getElementById('count');
    if (!box || !data.countdownTo) return;
    let diff = new Date(data.countdownTo) - new Date();
    if (diff < 0) diff = 0;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor(diff / 3600000) % 24;
    const m = Math.floor(diff / 60000) % 60;
    const s = Math.floor(diff / 1000) % 60;
    box.innerHTML = [['hari', d], ['jam', h], ['menit', m], ['detik', s]].map(([l, n]) => '<div><strong>' + n + '</strong><span>' + l + '</span></div>').join('');
  }
  function toggleMusic() {
    const btn = document.getElementById('musik');
    if (!flags.music) { toast('Musik ada di paket Klasik ke atas'); return; }
    if (!data.musicUrl) { toast(data.demo ? 'Contoh ini tanpa lagu. Lagu undanganmu dari tautan bebas royalti.' : 'Lagu belum diisi.'); return; }
    if (!audio) { audio = new Audio(data.musicUrl); audio.loop = true; }
    if (audio.paused) { audio.play().then(() => { btn.classList.add('on'); }).catch(() => { toast('Musik tidak bisa diputar'); }); }
    else { audio.pause(); btn.classList.remove('on'); }
  }
  function toggleScroll() {
    scrolling = !scrolling;
    const b = document.getElementById('gulir');
    if (b) b.classList.toggle('on', scrolling);
    toast(scrolling ? 'Gulir otomatis aktif' : 'Gulir otomatis berhenti');
    const step = () => { if (!scrolling) return; scrollBy(0, 0.6); requestAnimationFrame(step); };
    if (scrolling) requestAnimationFrame(step);
  }
  function share() {
    const url = location.href;
    const text = 'Undangan ' + (data.title || '') + ' ' + url;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }
  function openPic(src) {
    const dlg = document.getElementById('light');
    dlg.querySelector('img').src = src;
    dlg.showModal();
    dlg.onclick = () => dlg.close();
  }
  function localKey(kind) { return 'itap_u_' + slug + '_' + kind; }
  function note(id, text) { const n = document.getElementById(id); if (n) n.textContent = text; }

  async function db() {
    if (data.demo) return null;
    const cfg = window.ITAP_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) return null;
    const lib = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
    return lib.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  }

  async function sendRsvp(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const row = { guest_name: String(f.get('name') || '').trim(), attendance: String(f.get('attendance')), guests: Math.max(0, Math.min(10, Number(f.get('guests')) || 1)), guest_token: token() };
    if (row.guest_name.length < 2) return;
    if (data.demo) {
      const all = JSON.parse(localStorage.getItem(localKey('rsvp')) || '[]');
      all.unshift(row);
      localStorage.setItem(localKey('rsvp'), JSON.stringify(all.slice(0, 20)));
      note('rsvp-note', 'Tersimpan di HP ini. Contoh tidak masuk server.');
      return;
    }
    const client = await db();
    if (!client || !data.id) { note('rsvp-note', 'Belum tersambung. Coba lagi saat ada internet.'); return; }
    const ins = await client.from('invitation_rsvps').insert(Object.assign({ invitation_id: data.id }, row));
    note('rsvp-note', ins.error ? 'Belum terkirim. Mungkin sudah pernah mengisi dari HP ini.' : 'Konfirmasi tercatat.');
  }
  async function sendWish(e) {
    e.preventDefault();
    const f = new FormData(e.target);
    const row = { guest_name: String(f.get('name') || '').trim(), message: String(f.get('message') || '').trim(), guest_token: token() };
    if (row.guest_name.length < 2 || row.message.length < 2) return;
    const last = Number(localStorage.getItem(localKey('wish-at')) || 0);
    if (Date.now() - last < 20000) { note('wish-note', 'Tunggu sebentar sebelum mengirim lagi.'); return; }
    if (data.demo) {
      const all = JSON.parse(localStorage.getItem(localKey('wish')) || '[]');
      all.unshift(row);
      localStorage.setItem(localKey('wish'), JSON.stringify(all.slice(0, 30)));
      localStorage.setItem(localKey('wish-at'), String(Date.now()));
      note('wish-note', 'Ucapan contoh tersimpan di HP ini.');
      paintWishes(all);
      e.target.reset();
      return;
    }
    const client = await db();
    if (!client || !data.id) { note('wish-note', 'Belum tersambung.'); return; }
    const ins = await client.from('invitation_wishes').insert(Object.assign({ invitation_id: data.id }, row));
    if (ins.error) { note('wish-note', 'Ucapan belum masuk. Coba lagi nanti.'); return; }
    localStorage.setItem(localKey('wish-at'), String(Date.now()));
    note('wish-note', 'Ucapan terkirim.');
    e.target.reset();
    loadWall();
  }
  function checkIn() {
    const form = document.getElementById('rsvp');
    form.elements.attendance.value = 'hadir';
    if (!form.elements.name.value && guest) form.elements.name.value = guest.slice(0, 60);
    form.requestSubmit();
  }
  function paintWishes(rows) {
    const box = document.getElementById('wishes');
    if (!box) return;
    box.innerHTML = (rows || []).map((w) => '<article class="wish"><b>' + esc(w.guest_name) + '</b><p>' + esc(w.message) + '</p></article>').join('') || '<p class="muted">Belum ada ucapan.</p>';
  }
  async function loadWall() {
    if (data.demo) { paintWishes(JSON.parse(localStorage.getItem(localKey('wish')) || '[]')); return; }
    const client = await db();
    if (!client || !data.id) return;
    const res = await client.from('invitation_wishes').select('guest_name,message,created_at').eq('invitation_id', data.id).order('created_at', { ascending: false }).limit(40);
    if (!res.error) paintWishes(res.data || []);
  }

  async function start() {
    if (!slug || !/^[a-z0-9-]{3,48}$/.test(slug)) { app.textContent = 'Tautan undangan belum lengkap.'; return; }
    if (demos[slug]) {
      const res = await fetch('../undangan/demo/' + demos[slug] + '.json');
      data = await res.json();
      render();
      return;
    }
    const cfg = window.ITAP_CONFIG || {};
    if (!cfg.SUPABASE_URL) { app.textContent = 'Undangan ini belum tersedia.'; return; }
    const lib = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
    const client = lib.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    const res = await client.from('invitations').select('id,slug,theme,package,data,status').eq('slug', slug).eq('status', 'active').maybeSingle();
    if (res.error || !res.data) { app.textContent = 'Undangan tidak ditemukan atau belum diaktifkan.'; return; }
    data = Object.assign({ id: res.data.id, slug: res.data.slug, theme: res.data.theme, package: res.data.package }, res.data.data || {});
    render();
  }
  start();
})();
