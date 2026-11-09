(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (id) => document.getElementById(id);
  const q = new URLSearchParams(location.search);
  const slug = (q.get('s') || '').trim();
  const guest = (q.get('to') || '').trim();
  const demos = { 'demo-melayu': 'melayu', 'demo-emas': 'emas', 'demo-pantai': 'pantai', 'demo-islami': 'islami' };
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
      return '<article class="event"><b>' + esc(ev.name) + '</b><p>' + esc(ev.timeLabel) + '</p><p>' + esc(ev.place) + '<br>' + esc(ev.address) + '</p><div class="row-actions"><a href="' + cal + '" target="_blank" rel="noopener">Simpan ke kalender</a>' + mapBtn + '</div>' + embed + '</article>';
    }).join('');
    const photos = (data.gallery || []).slice(0, flags.gallery || 0).map((src) => '<button type="button" class="pic" data-src="' + esc(src) + '"><img src="' + esc(src) + '" alt=""></button>').join('');
    const story = flags.story ? (data.story || []).map((s) => '<article class="host"><span class="muted">' + esc(s.when) + '</span><b>' + esc(s.title) + '</b><p>' + esc(s.text) + '</p></article>').join('') : '';
    const gift = flags.gift && data.gift ? '<section class="gift"><h2>Amplop digital</h2><p class="muted">Contoh nomor bila ini pratinjau. Transfer hanya ke rekening yang tertulis.</p><p><b>' + esc(data.gift.bank) + '</b><br><span id="rek">' + esc(data.gift.number) + '</span><br>' + esc(data.gift.holder) + '</p><button type="button" id="copy">Salin nomor</button>' + (data.gift.qris ? '<img src="' + esc(data.gift.qris) + '" alt="QRIS">' : '') + '</section>' : '';
    const stream = flags.stream && data.streamUrl ? '<p><a class="cta" href="' + esc(data.streamUrl) + '" target="_blank" rel="noopener">Tonton siaran</a></p>' : '';
    app.innerHTML = ''
      + '<section class="cover" id="cover"><p class="kicker">' + esc(data.kicker || '') + '</p><h1>' + esc(data.title) + '</h1><p>' + esc(data.inviteLine || '') + '</p><p>' + esc(data.dateLabel || '') + '</p><div class="guest"><span>Kepada</span><b id="to"></b></div><button class="open" id="buka" type="button">Buka undangan</button></section>'
      + '<div class="inside" id="in">'
      + (data.demo ? '<p class="demo-note">Contoh tampilan. Bukan acara sungguhan. Ucapan pratinjau hanya tersimpan di HP ini.</p>' : '')
      + '<h2>Yang mengundang</h2>' + hosts
      + '<h2>Menuju hari</h2><div class="count" id="count"></div>'
      + '<h2>Acara</h2>' + events
      + stream
      + (photos ? '<h2>Foto</h2><div class="gallery">' + photos + '</div>' : '')
      + (story ? '<h2>Kisah</h2>' + story : '')
      + gift
      + '<h2>Konfirmasi</h2><form id="rsvp"><label>Nama<input name="name" required maxlength="60"></label><label>Kehadiran<select name="attendance"><option value="hadir">Hadir</option><option value="tidak">Tidak hadir</option><option value="ragu">Masih ragu</option></select></label><label>Jumlah tamu<input name="guests" inputmode="numeric" value="1"></label><button class="cta" type="submit">Kirim</button><p id="rsvp-note" class="muted"></p></form>'
      + '<h2>Ucapan</h2><form id="wish"><label>Nama<input name="name" required maxlength="60"></label><label>Doa atau ucapan<textarea name="message" required maxlength="400"></textarea></label><button class="cta" type="submit">Kirim ucapan</button><p id="wish-note" class="muted"></p></form><div id="wishes"></div>'
      + (flags.checkin ? '<p><button type="button" id="cek" class="ghost">Catat saya hadir</button></p>' : '')
      + '<p class="closing">' + esc(data.closing || '') + '</p>'
      + '<div class="tools"><button type="button" id="musik">Musik</button>' + (flags.autoscroll ? '<button type="button" id="gulir" class="ghost">Gulir pelan</button>' : '') + '<button type="button" id="share" class="ghost">Bagikan</button></div>'
      + '<p class="foot"><a href="../undangan/">Dibuat dengan iTAP Undangan</a></p></div>';
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
    document.getElementById('cover').style.display = 'none';
    document.getElementById('in').classList.add('on');
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
    box.innerHTML = [['hari', d], ['jam', h], ['menit', m], ['detik', s]].map(([l, n]) => '<div><strong>' + n + '</strong><span class="muted">' + l + '</span></div>').join('');
  }
  function toggleMusic() {
    const btn = document.getElementById('musik');
    if (!flags.music) { btn.textContent = 'Musik ada di paket Klasik ke atas'; return; }
    if (!data.musicUrl) { btn.textContent = 'Isi tautan lagu bebas royalti'; return; }
    if (!audio) audio = new Audio(data.musicUrl);
    if (audio.paused) { audio.play().then(() => { btn.textContent = 'Hentikan musik'; }).catch(() => { btn.textContent = 'Musik tidak bisa diputar'; }); }
    else { audio.pause(); btn.textContent = 'Musik'; }
  }
  function toggleScroll() {
    scrolling = !scrolling;
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
