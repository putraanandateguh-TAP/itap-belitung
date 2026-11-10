(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (id) => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  const slug = (q.get('s') || '').trim();
  const guest = (q.get('to') || '').trim();
  // Undangan contoh: demo-<nama> membaca undangan/demo/<nama>.json
  const demoNames = ['melayu', 'emas', 'pantai', 'islami', 'hijab', 'khitanan', 'masjid', 'ultah', 'wisuda', 'syukuran'];
  const demos = Object.fromEntries(demoNames.map((n) => ['demo-' + n, n]));
  const app = $('app');
  let data = null;
  let flags = null;
  let audio = null;
  let scrolling = false;

  const ico = {
    home: '<svg viewBox="0 0 24 24"><path d="M3 11 12 4l9 7v9h-6v-6H9v6H3z"/></svg>',
    people: '<svg viewBox="0 0 24 24"><circle cx="8" cy="8" r="3.2"/><circle cx="16.5" cy="8" r="3.2"/><path d="M2 20c.6-4 3-6 6-6s5.4 2 6 6M12.5 14.6c1-.4 2.4-.6 4-.6 3 0 5.4 2 6 6"/></svg>',
    photo: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><circle cx="9" cy="10" r="1.8"/><path d="m4 18 5-5 4 4 3-3 4 4"/></svg>',
    pin: '<svg viewBox="0 0 24 24"><path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/></svg>',
    chat: '<svg viewBox="0 0 24 24"><path d="M4 5h16v11H9l-5 4z"/><path d="M8 9h8M8 12h5"/></svg>',
    gift: '<svg viewBox="0 0 24 24"><rect x="3" y="8" width="18" height="13" rx="1"/><path d="M3 12h18M12 8v13M12 8S10 3 7.5 4.5 9 8 12 8zm0 0s2-5 4.5-3.5S15 8 12 8z"/></svg>',
    clock: '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="8.5"/><path d="M12 7v5l3 2"/></svg>',
    music: '<svg viewBox="0 0 24 24"><path d="M9 18V6l11-2v12"/><circle cx="6.5" cy="18" r="2.5"/><circle cx="17.5" cy="16" r="2.5"/></svg>',
    play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
    pause: '<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>',
    mail: '<svg viewBox="0 0 24 24"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
    ig: '<svg viewBox="0 0 24 24"><rect x="3.5" y="3.5" width="17" height="17" rx="5"/><circle cx="12" cy="12" r="4"/><circle cx="17.2" cy="6.8" r=".8"/></svg>'
  };
  // Siluet masjid buatan iTAP (SVG sederhana: kubah, menara, gerbang).
  const MOSQUE = '<svg class="mosque" viewBox="0 0 480 120" preserveAspectRatio="xMidYMax slice" aria-hidden="true"><path d="M0 120V96h28V58l6-14 6 14v38h22V84c0-18 18-30 36-36 4-10 8-14 8-14s4 4 8 14c18 6 36 18 36 36v12h20V70c0-26 30-44 52-52 6-14 12-18 12-18s6 4 12 18c22 8 52 26 52 52v26h20V84c0-18 18-30 36-36 4-10 8-14 8-14s4 4 8 14c18 6 36 18 36 36v12h22V58l6-14 6 14v38h28v24z"/><path class="win" d="M222 120v-30a18 18 0 0 1 36 0v30zM112 120v-18a10 10 0 0 1 20 0v18zM348 120v-18a10 10 0 0 1 20 0v18z"/></svg>';

  function pkg(id) {
    const list = (window.ITAP_UNDANGAN && window.ITAP_UNDANGAN.packages) || [];
    return list.find((item) => item.id === id) || list.find((item) => item.id === 'penuh') || {};
  }
  function token() {
    let t = localStorage.getItem('itap_undangan_token');
    if (!t) { t = crypto.randomUUID(); localStorage.setItem('itap_undangan_token', t); }
    return t;
  }
  function ytId(v) {
    const m = String(v || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/) || String(v || '').match(/^([\w-]{11})$/);
    return m ? m[1] : '';
  }
  function igHandle(v) { return String(v || '').replace(/^https?:\/\/(www\.)?instagram\.com\//, '').replace(/[^\w.]/g, '').slice(0, 30); }

  function render() {
    flags = pkg(data.package || 'penuh');
    document.title = (data.title || 'Undangan') + ' · iTAP';
    const design = data.design || data.theme || '';
    const doors = design === 'masjid' || design === 'melayu' || data.coverDoors === true;
    app.className = 'sheet theme-' + (data.theme || 'emas') + ' design-' + design + (doors ? ' doors' : '');
    const isWedding = /nikah|wedding/i.test(data.eventType || '');
    const muslim = data.theme === 'islami' || data.theme === 'melayu';
    const cover = data.cover || '';
    const bg = cover ? ' style="--photo:url(\'' + esc(cover) + '\')"' : '';
    const cfgU = window.ITAP_UNDANGAN || {};
    const order = '../undangan/pesan/?tema=' + encodeURIComponent(design);
    const waAdmin = 'https://wa.me/' + (cfgU.wa || '6287749476651') + '?text=' + encodeURIComponent('Halo iTAP, saya mau dibuatkan undangan seperti contoh tema ' + design + '.');

    const events = (data.events || []).map((ev) => {
      const cal = 'https://calendar.google.com/calendar/render?action=TEMPLATE&text=' + encodeURIComponent((data.title || '') + ' · ' + ev.name) + '&dates=' + encodeURIComponent(ev.start + '/' + ev.end) + '&location=' + encodeURIComponent(ev.place + ', ' + ev.address);
      const mapBtn = ev.maps ? '<a class="ghost" href="' + esc(ev.maps) + '" target="_blank" rel="noopener">' + ico.pin + ' Buka di Maps</a>' : '';
      const embed = flags.mapsEmbed && (ev.address || ev.place) ? '<iframe class="map" title="Peta ' + esc(ev.name) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" src="https://maps.google.com/maps?q=' + encodeURIComponent(ev.address || ev.place) + '&z=14&output=embed"></iframe>' : '';
      return '<article class="event"><h3>' + esc(ev.name) + '</h3><p class="when">' + esc(ev.timeLabel) + '</p><p><b>' + esc(ev.place) + '</b><br>' + esc(ev.address) + '</p>' + embed + '<div class="row-actions">' + mapBtn + '<a href="' + cal + '" target="_blank" rel="noopener">Simpan ke kalender</a></div></article>';
    }).join('');
    const schedule = (data.schedule || []).length ? '<h3 class="sub center">Susunan acara</h3><ol class="sched">' + data.schedule.map((s) => '<li><span class="t">' + esc(s.time) + '</span><b>' + esc(s.title) + '</b>' + (s.text ? '<small>' + esc(s.text) + '</small>' : '') + '</li>').join('') + '</ol>' : '';
    const photos = (data.gallery || []).slice(0, flags.gallery || 0).map((src) => '<button type="button" class="pic" data-src="' + esc(src) + '"><img src="' + esc(src) + '" alt="" loading="lazy"></button>').join('');
    const yt = ytId(data.youtube);
    const video = yt && flags.gallery ? '<div class="yt"><iframe src="https://www.youtube-nocookie.com/embed/' + yt + '" title="Video" loading="lazy" allow="accelerometer; encrypted-media; picture-in-picture" allowfullscreen></iframe></div>' : '';
    const story = flags.story ? (data.story || []).map((s) => '<article class="step"><span class="when">' + esc(s.when) + '</span><b>' + esc(s.title) + '</b><p>' + esc(s.text) + '</p></article>').join('') : '';
    const accounts = (data.gifts && data.gifts.length ? data.gifts : (data.gift ? [data.gift] : [])).filter((g) => g && g.number);
    const addr = data.giftAddress && data.giftAddress.address ? data.giftAddress : null;
    const gift = flags.gift && (accounts.length || addr) ? '<section class="block gift" id="amplop"><p class="eyebrow center">Amplop digital</p><h2 class="script center">Tanda kasih</h2><p class="muted center">Doa restu Anda sudah lebih dari cukup. Bila ingin memberi tanda kasih, silakan lewat:</p>'
      + accounts.map((g) => '<article class="bank"><div class="chip"></div><p class="bname">' + esc(g.bank) + '</p><p class="bnum">' + esc(g.number) + '</p><p class="bholder">a.n. ' + esc(g.holder) + '</p><button type="button" class="copy" data-copy="' + esc(g.number) + '">Salin</button></article>').join('')
      + (data.gift && data.gift.qris ? '<img class="qris" src="' + esc(data.gift.qris) + '" alt="QRIS">' : '')
      + (addr ? '<article class="kado">' + ico.gift + '<b>Kirim kado fisik</b><p>' + esc(addr.name || '') + '<br>' + esc(addr.address) + '</p>' + (addr.note ? '<small>' + esc(addr.note) + '</small>' : '') + '<button type="button" class="copy" data-copy="' + esc((addr.name ? addr.name + ', ' : '') + addr.address) + '">Salin alamat</button></article>' : '')
      + (data.demo ? '<p class="muted center">Nomor dan alamat di atas hanya contoh.</p>' : '')
      + '</section>' : '';
    const stream = flags.stream && data.streamUrl ? '<p class="center"><a class="cta" href="' + esc(data.streamUrl) + '" target="_blank" rel="noopener">Tonton siaran</a></p>' : '';
    const opening = data.opening || (isWedding
      ? 'Dengan memohon rahmat dan rida Tuhan Yang Maha Esa, kami bermaksud menyelenggarakan pernikahan putra-putri kami. Kehadiran dan doa Bapak/Ibu/Saudara/i adalah hadiah terindah bagi kami.'
      : 'Dengan penuh rasa syukur, kami mengundang Bapak/Ibu/Saudara/i untuk hadir dan mendoakan acara keluarga kami.');
    const quote = data.quote || (isWedding && muslim ? '“Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan untukmu dari jenismu sendiri, agar kamu merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.” (QS Ar-Rum: 21)' : '');
    const hostCards = (data.hosts || []).map((h, i) => {
      const ig = igHandle(h.instagram);
      const pic = h.photo ? '<img class="avatar" src="' + esc(h.photo) + '" alt="">' : '<div class="avatar">' + esc((h.name || '?').trim().charAt(0)) + '</div>';
      return '<article class="person">' + (i > 0 && isWedding ? '<p class="amp">&amp;</p>' : '') + pic + '<p class="role">' + esc(h.role) + '</p><h3 class="script">' + esc(h.name) + '</h3><p class="muted">' + esc(h.detail) + '</p>'
        + (ig ? '<a class="ig" href="https://instagram.com/' + ig + '" target="_blank" rel="noopener">' + ico.ig + '@' + ig + '</a>' : (data.demo ? '<span class="ig off">' + ico.ig + 'Instagram (opsional)</span>' : '')) + '</article>';
    }).join('');
    const secs = [['beranda', 'Opening', ico.home], ['pembuka', isWedding ? 'Salam' : 'Pembuka', ico.mail], ['mempelai', isWedding ? 'Mempelai' : 'Keluarga', ico.people], ['acara', 'Acara', ico.pin], photos || video ? ['galeri', 'Galeri', ico.photo] : null, gift ? ['amplop', 'Kado', ico.gift] : null, ['rsvp-box', 'RSVP', ico.chat]].filter(Boolean);
    const nav = '<nav class="dock' + (design === 'masjid' ? ' textnav' : '') + '" aria-label="Navigasi undangan">' + secs.map((s) => '<a href="#' + s[0] + '">' + s[2] + '<span>' + s[1] + '</span></a>').join('') + '</nav>';

    app.innerHTML = ''
      + (data.demo ? '<div class="demobar"><span>Mau seperti ini?</span><a class="use" href="' + order + '">Gunakan Tema Ini</a><a class="wa" href="' + waAdmin + '" target="_blank" rel="noopener">Dibuatin Admin</a></div>' : '')
      + '<section class="cover' + (cover ? ' has-photo' : '') + '" id="cover"' + bg + '>' + (doors ? '<div class="half l"><i></i></div><div class="half r"><i></i></div>' : '') + (design === 'masjid' ? MOSQUE : '')
      + '<div class="cover-in">' + (design === 'masjid' && cover ? '<img class="ring" src="' + esc(cover) + '" alt="">' : '') + '<p class="kicker">' + esc(data.kicker || data.eventType || '') + '</p><h1 class="script">' + esc(data.title) + '</h1><p class="date">' + esc(data.dateLabel || '') + '</p><div class="guest"><span>Kepada Yth. Bapak/Ibu/Saudara/i</span><b id="to"></b></div><p class="small">Tanpa mengurangi rasa hormat, kami mengundang Anda untuk hadir di acara kami.</p><button class="open" id="buka" type="button">' + ico.mail + ' Buka Undangan</button></div></section>'
      + '<div class="inside" id="in">'
      + '<section class="hero' + (cover ? ' has-photo' : '') + '" id="beranda"' + bg + '>' + (design === 'masjid' ? MOSQUE : '') + '<div class="hero-in"><p class="kicker">' + esc(data.kicker || data.eventType || '') + '</p><h2 class="script big">' + esc(data.title) + '</h2><p class="date">' + esc(data.dateLabel || '') + '</p><div class="count" id="count"></div><a class="pill" href="#acara">Lihat acara</a></div></section>'
      + '<div class="body">'
      + (data.demo ? '<p class="demo-note">Contoh tampilan. Nama, foto, dan acara bukan sungguhan. Isian RSVP dan ucapan pratinjau hanya tersimpan di HP ini.</p>' : '')
      + '<section class="block center" id="pembuka"><p class="eyebrow">' + (isWedding ? 'Our Wedding' : esc(data.eventType || 'Undangan')) + '</p>' + (cover ? '<img class="ring sm" src="' + esc(cover) + '" alt="" loading="lazy">' : '') + '<h2 class="script">' + (muslim ? 'Assalamu&#39;alaikum' : (isWedding ? 'Salam bahagia' : 'Salam hangat')) + '</h2><p>' + esc(opening) + '</p>' + (quote ? '<blockquote>' + esc(quote) + '</blockquote>' : '') + '</section>'
      + '<section class="block center" id="mempelai"><p class="eyebrow">' + (isWedding ? 'Mempelai' : 'Yang mengundang') + '</p>' + hostCards + '</section>'
      + '<section class="block" id="acara"><p class="eyebrow center">Waktu &amp; tempat</p><h2 class="script center">Rangkaian acara</h2>' + events + schedule + stream + '</section>'
      + (photos || video ? '<section class="block" id="galeri"><p class="eyebrow center">Galeri</p><h2 class="script center">Momen kami</h2>' + video + '<div class="gallery">' + photos + '</div></section>' : '')
      + (story ? '<section class="block" id="kisah"><p class="eyebrow center">Kisah</p><h2 class="script center">Perjalanan kami</h2><div class="timeline">' + story + '</div></section>' : '')
      + gift
      + '<section class="block" id="rsvp-box"><p class="eyebrow center">RSVP</p><h2 class="script center">Konfirmasi &amp; ucapan</h2><form id="rsvp" class="cardform"><label>Nama<input name="name" required maxlength="60"></label><label>Pesan atau doa<textarea name="message" maxlength="400" placeholder="Tulis ucapan untuk tuan rumah (opsional)"></textarea></label><label>Kehadiran<select name="attendance"><option value="hadir">Hadir</option><option value="tidak">Tidak hadir</option><option value="ragu">Masih ragu</option></select></label><label>Jumlah tamu<select name="guests"><option>1</option><option>2</option><option>3</option><option>4</option><option>5</option></select></label><button class="cta" type="submit">Kirim</button><p id="rsvp-note" class="muted"></p></form>'
      + (flags.checkin ? '<p class="center"><button type="button" id="cek" class="ghost">Catat saya hadir</button></p>' : '')
      + '<h3 class="sub center">Ucapan &amp; doa</h3><p id="wish-note" class="muted center"></p><div id="wishes" class="feed"></div></section>'
      + '<section class="block center closing-box"><h2 class="script">Terima kasih</h2><p class="closing">' + esc(data.closing || '') + '</p><p><button type="button" id="share" class="ghost">Bagikan lewat WhatsApp</button></p></section>'
      + '<p class="foot"><a href="../undangan/">Dibuat dengan iTAP Undangan</a>' + (function () { const credit = window.ITAP_UNDANGAN_MUSIC && window.ITAP_UNDANGAN_MUSIC.creditFor(data.musicUrl); return credit ? '<br><small>Musik: ' + credit + '</small>' : ''; })() + '</p>'
      + '</div>'
      + nav
      + '<div class="fabs"><button type="button" id="musik" class="fab" aria-label="Musik" title="Musik">' + ico.music + '</button></div>'
      + (flags.autoscroll ? '<button type="button" id="gulir" class="scrollpill" aria-pressed="false">' + ico.play + '<span>Auto scroll</span></button><p class="tip" id="scrollTip">Matikan auto scroll untuk gulir manual</p>' : '')
      + '<p class="toast" id="toast" role="status"></p>'
      + '</div>';

    $('to').textContent = guest || 'Tamu undangan';
    if (guest) $('rsvp').elements.name.value = guest.slice(0, 60);
    $('buka').onclick = openInvite;
    $('rsvp').onsubmit = sendRsvp;
    app.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => navigator.clipboard.writeText(b.dataset.copy).then(() => { const t = b.textContent; b.textContent = 'Tersalin ✓'; setTimeout(() => { b.textContent = t; }, 1800); }).catch(() => toast('Salin manual: ' + b.dataset.copy)));
    $('musik').onclick = toggleMusic;
    const gulir = $('gulir');
    if (gulir) gulir.onclick = () => setScroll(!scrolling);
    $('share').onclick = share;
    const cek = $('cek');
    if (cek) cek.onclick = checkIn;
    app.querySelectorAll('.pic').forEach((btn) => btn.onclick = () => openPic(btn.dataset.src));
    ['touchstart', 'wheel'].forEach((ev) => addEventListener(ev, (e) => { if (scrolling && !(e.target.closest && e.target.closest('#gulir'))) setScroll(false, true); }, { passive: true }));
    tick();
    setInterval(tick, 1000);
    loadWall();
    const ld = $('loading');
    if (ld) { ld.classList.add('done'); setTimeout(() => ld.remove(), 600); }
  }

  function openInvite() {
    const c = $('cover');
    c.classList.add('gone');
    $('in').classList.add('on');
    document.body.classList.add('opened');
    scrollTo(0, 0);
    setTimeout(() => { c.style.display = 'none'; }, 1100);
    if (flags.music && data.musicUrl) toggleMusic();
    if (flags.autoscroll && data.autoscroll !== false) setTimeout(() => setScroll(true), 1400);
  }
  function toast(text) {
    const t = $('toast');
    if (!t) return;
    t.textContent = text; t.classList.add('on');
    clearTimeout(toast.t); toast.t = setTimeout(() => t.classList.remove('on'), 2600);
  }
  function tick() {
    const box = $('count');
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
    const btn = $('musik');
    if (!flags.music) { toast('Musik ada di paket Klasik ke atas'); return; }
    if (!data.musicUrl) { toast('Lagu belum diisi.'); return; }
    if (!audio) { audio = new Audio(data.musicUrl); audio.loop = true; audio.volume = 0.7; }
    if (audio.paused) { audio.play().then(() => { btn.classList.add('on'); }).catch(() => { btn.classList.remove('on'); }); }
    else { audio.pause(); btn.classList.remove('on'); }
  }
  let raf = 0;
  function setScroll(on, byUser) {
    scrolling = on;
    const b = $('gulir');
    if (b) { b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); b.querySelector('svg').outerHTML = on ? ico.pause : ico.play; b.querySelector('span').textContent = on ? 'Auto scroll aktif' : 'Auto scroll'; }
    const tip = $('scrollTip');
    if (tip) { tip.classList.toggle('on', on && !setScroll.shown); if (on && !setScroll.shown) { setScroll.shown = true; setTimeout(() => tip.classList.remove('on'), 4000); } }
    if (byUser) toast('Auto scroll berhenti. Ketuk tombol untuk lanjut.');
    cancelAnimationFrame(raf);
    let acc = 0;
    const step = () => {
      if (!scrolling) return;
      acc += 0.7;
      if (acc >= 1) { scrollBy(0, Math.floor(acc)); acc -= Math.floor(acc); }
      if (innerHeight + scrollY >= document.body.scrollHeight - 2) { setScroll(false); return; }
      raf = requestAnimationFrame(step);
    };
    if (on) raf = requestAnimationFrame(step);
  }
  function share() {
    const url = location.href;
    const text = 'Undangan ' + (data.title || '') + ' ' + url;
    window.open('https://wa.me/?text=' + encodeURIComponent(text), '_blank', 'noopener');
  }
  function openPic(src) {
    const dlg = $('light');
    dlg.querySelector('img').src = src;
    dlg.showModal();
    dlg.onclick = () => dlg.close();
  }
  function localKey(kind) { return 'itap_u_' + slug + '_' + kind; }
  function note(id, text) { const n = $(id); if (n) n.textContent = text; }

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
    const message = String(f.get('message') || '').trim();
    if (row.guest_name.length < 2) { note('rsvp-note', 'Nama belum diisi.'); return; }
    if (data.demo) {
      const all = JSON.parse(localStorage.getItem(localKey('rsvp')) || '[]');
      all.unshift(row);
      localStorage.setItem(localKey('rsvp'), JSON.stringify(all.slice(0, 20)));
      note('rsvp-note', 'Tersimpan di HP ini. Contoh tidak masuk server.');
      if (message.length >= 2) await sendWish(row.guest_name, message);
      return;
    }
    const client = await db();
    if (!client || !data.id) { note('rsvp-note', 'Belum tersambung. Coba lagi saat ada internet.'); return; }
    const ins = await client.from('invitation_rsvps').insert(Object.assign({ invitation_id: data.id }, row));
    note('rsvp-note', ins.error ? 'Kehadiran belum tercatat. Mungkin sudah pernah mengisi dari HP ini.' : 'Konfirmasi tercatat. Terima kasih.');
    if (message.length >= 2) await sendWish(row.guest_name, message);
  }
  async function sendWish(name, message) {
    const row = { guest_name: name, message: message.slice(0, 400), guest_token: token() };
    const last = Number(localStorage.getItem(localKey('wish-at')) || 0);
    if (Date.now() - last < 20000) { note('wish-note', 'Tunggu sebentar sebelum mengirim ucapan lagi.'); return; }
    if (data.demo) {
      const all = JSON.parse(localStorage.getItem(localKey('wish')) || '[]');
      all.unshift(row);
      localStorage.setItem(localKey('wish'), JSON.stringify(all.slice(0, 30)));
      localStorage.setItem(localKey('wish-at'), String(Date.now()));
      note('wish-note', 'Ucapan contoh tersimpan di HP ini.');
      paintWishes(all);
      $('rsvp').elements.message.value = '';
      return;
    }
    const client = await db();
    if (!client || !data.id) { note('wish-note', 'Belum tersambung.'); return; }
    const ins = await client.from('invitation_wishes').insert(Object.assign({ invitation_id: data.id }, row));
    if (ins.error) { note('wish-note', 'Ucapan belum masuk. Coba lagi nanti.'); return; }
    localStorage.setItem(localKey('wish-at'), String(Date.now()));
    note('wish-note', 'Ucapan terkirim.');
    $('rsvp').elements.message.value = '';
    loadWall();
  }
  function checkIn() {
    const form = $('rsvp');
    form.elements.attendance.value = 'hadir';
    if (!form.elements.name.value && guest) form.elements.name.value = guest.slice(0, 60);
    form.requestSubmit();
  }
  function paintWishes(rows) {
    const box = $('wishes');
    if (!box) return;
    box.innerHTML = (rows || []).map((w) => '<article class="wish"><span class="wa-av">' + esc((w.guest_name || '?').charAt(0)) + '</span><div><b>' + esc(w.guest_name) + '</b><p>' + esc(w.message) + '</p>' + (w.created_at ? '<small>' + esc(new Date(w.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })) + '</small>' : '') + '</div></article>').join('') || '<p class="muted center">Belum ada ucapan. Jadilah yang pertama.</p>';
  }
  async function loadWall() {
    if (data.demo) { paintWishes(JSON.parse(localStorage.getItem(localKey('wish')) || '[]')); return; }
    const client = await db();
    if (!client || !data.id) return;
    const res = await client.from('invitation_wishes').select('guest_name,message,created_at').eq('invitation_id', data.id).order('created_at', { ascending: false }).limit(40);
    if (!res.error) paintWishes(res.data || []);
  }
  function fail(text) { app.innerHTML = '<p class="loading-msg">' + esc(text) + '</p>'; const ld = $('loading'); if (ld) ld.remove(); }

  async function start() {
    if (!slug || !/^[a-z0-9-]{3,48}$/.test(slug)) { fail('Tautan undangan belum lengkap.'); return; }
    if (demos[slug]) {
      const res = await fetch('../undangan/demo/' + demos[slug] + '.json');
      data = await res.json();
      render();
      return;
    }
    const cfg = window.ITAP_CONFIG || {};
    if (!cfg.SUPABASE_URL) { fail('Undangan ini belum tersedia.'); return; }
    const lib = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
    const client = lib.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    let res = await client.from('invitations').select('id,slug,theme,package,data,status').eq('slug', slug).eq('status', 'active').maybeSingle();
    // Draf hanya terbaca oleh admin atau pemiliknya yang sedang masuk (dijaga RLS); tampil sebagai pratinjau.
    if (!res.error && !res.data) res = await client.from('invitations').select('id,slug,theme,package,data,status').eq('slug', slug).maybeSingle();
    if (res.error || !res.data) { fail('Undangan tidak ditemukan atau belum diaktifkan.'); return; }
    if (res.data.status !== 'active') setTimeout(() => { const b = document.createElement('div'); b.className = 'draftbar'; b.textContent = 'Pratinjau draf · belum bisa dibuka tamu'; document.body.appendChild(b); }, 0);
    data = Object.assign({ id: res.data.id, slug: res.data.slug, theme: res.data.theme, package: res.data.package }, res.data.data || {});
    render();
  }
  start().catch(() => fail('Undangan belum bisa dimuat. Periksa internet lalu muat ulang.'));
})();
