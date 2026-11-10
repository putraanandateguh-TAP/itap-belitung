// Editor lengkap untuk admin: buat & sunting undangan tanpa batas dengan semua fitur paket Penuh.
// Hak akses ditegakkan di database (RLS + trigger, lihat supabase/undangan-admin.sql); halaman ini hanya antarmuka.
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (id) => document.getElementById(id);
  const cfg = window.ITAP_CONFIG || {};
  const designs = [
    ['melayu', 'melayu', 'Melayu Belitong'], ['emas', 'emas', 'Putih Emas'], ['hijab', 'islami', 'Syar\u2019i Hijau'], ['masjid', 'islami', 'Kubah Krem'],
    ['pantai', 'pantai', 'Pantai Tanjung'], ['khitanan', 'islami', 'Khitanan Ceria'], ['islami', 'islami', 'Aqiqah Lembut'],
    ['ultah', 'pantai', 'Ulang Tahun Laut'], ['wisuda', 'emas', 'Wisuda Emas'], ['syukuran', 'melayu', 'Selamatan Rumah']
  ];
  // Pustaka kutipan: terjemahan ayat (Kemenag, bebas dikutip) dan kalimat buatan iTAP.
  const QUOTES = [
    ['QS Ar-Rum: 21', '“Dan di antara tanda-tanda kebesaran-Nya ialah Dia menciptakan pasangan untukmu dari jenismu sendiri, agar kamu merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang.” (QS Ar-Rum: 21)'],
    ['QS Adz-Dzariyat: 49', '“Dan segala sesuatu Kami ciptakan berpasang-pasangan agar kamu mengingat kebesaran Allah.” (QS Adz-Dzariyat: 49)'],
    ['QS An-Nur: 32', '“Dan nikahkanlah orang-orang yang masih membujang di antara kamu… Jika mereka miskin, Allah akan memampukan mereka dengan karunia-Nya.” (QS An-Nur: 32)'],
    ['QS Yasin: 36', '“Mahasuci Allah yang telah menciptakan semuanya berpasang-pasangan.” (QS Yasin: 36)'],
    ['Doa pengantin (hadis riwayat Abu Dawud)', '“Semoga Allah memberkahimu dan menetapkan keberkahan atasmu, serta mengumpulkan kalian berdua dalam kebaikan.”'],
    ['Kalimat iTAP · dua hati', 'Dua hati dipertemukan, dua keluarga disatukan. Dengan doa dan restu Anda, kami memulai langkah baru.'],
    ['Kalimat iTAP · rumah', 'Rumah bukan soal tempat, melainkan dengan siapa kita pulang. Terima kasih telah menjadi bagian dari perjalanan kami.'],
    ['Kalimat iTAP · khitanan/aqiqah', 'Dengan penuh syukur atas karunia-Nya, kami mohon doa agar buah hati kami tumbuh menjadi anak yang saleh dan berbakti.']
  ];
  const music = window.ITAP_UNDANGAN_MUSIC || { tracks: [], options: () => '', knownUrl: () => false };
  let sb = null; let user = null; let current = null; let all = []; let invFilter = 'semua'; let fromOrder = null;
  const pkgs = ((window.ITAP_UNDANGAN || {}).packages || []).filter((p) => p.id !== 'coba');
  const flash = (t) => (window.ITAP_ADMIN && window.ITAP_ADMIN.flash ? window.ITAP_ADMIN.flash(t) : say(t));
  const say = (t) => { const n = $('edMsg'); if (n) n.textContent = t; else { const m = $('msg'); if (m) m.textContent = t; } };

  async function client() {
    if (sb) return sb;
    const lib = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
    sb = lib.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return sb;
  }
  const slugOk = (s) => /^[a-z0-9-]{3,48}$/.test(s);
  const slugify = (t) => (String(t || 'acara').toLowerCase().replace(/&/g, 'dan').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'acara');
  const toLocal = (iso) => { if (!iso) return ''; const d = new Date(iso); if (isNaN(d)) return ''; const p = (n) => String(n).padStart(2, '0'); return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + 'T' + p(d.getHours()) + ':' + p(d.getMinutes()); };
  const fromLocal = (v) => v ? v + ':00+07:00' : '';
  // Kolom masa aktif (expires_at) ada setelah supabase/undangan-dashboard.sql dijalankan.
  let hasExp = false;
  const COLS = () => 'id,slug,theme,package,status,data,owner_id,owner_email,edit_token_hash' + (hasExp ? ',expires_at' : '');
  const expLabel = (r) => { if (!hasExp || r.owner_id === (user && user.id)) return ''; if (!r.expires_at) return ' · aktif selamanya'; const d = new Date(r.expires_at); return d.getTime() <= Date.now() ? ' · <span class="bad">masa aktif habis</span>' : ' · aktif s.d. ' + d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' }); };

  async function listMine() {
    const res = await sb.from('invitations').select(COLS() + ',created_at').order('created_at', { ascending: false }).limit(500);
    all = res.data || [];
    paintList();
  }
  function paintList() {
    const q = (($('invQ') || {}).value || '').toLowerCase().trim();
    const f = { semua: () => true, saya: (r) => r.owner_id === user.id, pembeli: (r) => r.owner_id !== user.id, aktif: (r) => r.status === 'active', draf: (r) => r.status !== 'active' };
    const n = (k) => all.filter(f[k]).length;
    $('invChips').innerHTML = [['semua', 'Semua'], ['saya', 'Milik saya'], ['pembeli', 'Pembeli'], ['aktif', 'Aktif'], ['draf', 'Draf']].map(([k, l]) => '<button type="button" class="chip' + (k === invFilter ? ' on' : '') + '" data-if="' + k + '">' + l + ' <small>' + n(k) + '</small></button>').join('');
    const rows = all.filter(f[invFilter]).filter((r) => !q || (r.slug + ' ' + ((r.data && r.data.title) || '') + ' ' + (r.owner_email || '')).toLowerCase().includes(q));
    $('mineList').innerHTML = rows.length ? rows.map((r) => '<article class="mrow"><div><b>' + esc((r.data && r.data.title) || r.slug) + '</b><small>' + esc(r.slug) + ' · ' + (r.status === 'active' ? '<span class="ok">aktif</span>' : 'draf') + ' · paket ' + esc(r.package) + expLabel(r) + (r.owner_id === user.id ? ' · milik saya' : (r.owner_email ? ' · ' + esc(r.owner_email) : '')) + (r.edit_token_hash ? ' · ada tautan sunting' : '') + '</small></div><div class="mbtn"><a href="../../u/?s=' + esc(r.slug) + '" target="_blank" rel="noopener">Buka</a><button type="button" data-ed="' + esc(r.id) + '">Sunting</button></div></article>').join('') : '<p class="note">Belum ada undangan di filter ini. Klik "Buat undangan baru".</p>';
  }

  function json(v) { return JSON.stringify(v ?? [], null, 2); }
  function form(row) {
    const d = row.data || {};
    const design = d.design || row.theme;
    return '<h2>' + (row.id ? 'Sunting: ' + esc(row.slug) : 'Undangan baru') + '</h2>'
      + '<p class="note">Undangan milik admin otomatis paket Penuh (semua fitur), gratis, aktif selamanya. Untuk pembeli, pilih paket sesuai pesanan; masa aktif ikut paket (atur hari di tab Harga).</p>'
      + '<form id="edForm" class="ed">'
      + (row.id ? '' : '<label>Mulai dari contoh tema<select name="template">' + designs.map((x) => '<option value="' + x[0] + '"' + (x[0] === design ? ' selected' : '') + '>' + esc(x[2]) + '</option>').join('') + '</select></label><p><button type="button" id="loadTpl">Isi dari contoh</button> <small class="note">Mengisi semua kolom dengan data contoh tema itu, lalu tinggal diganti.</small></p>')
      + '<div class="g2"><label>Tautan (slug)<input name="slug" required pattern="[a-z0-9\\-]{3,48}" value="' + esc(row.slug || '') + '" ' + (row.id ? 'readonly' : '') + ' placeholder="adi-sari"></label>'
      + '<label>Desain<select name="design">' + designs.map((x) => '<option value="' + x[0] + '"' + (x[0] === design ? ' selected' : '') + '>' + esc(x[2]) + '</option>').join('') + '</select></label></div>'
      + '<div class="g2"><label>Jenis acara<input name="eventType" value="' + esc(d.eventType || 'Pernikahan') + '"></label><label>Status<select name="status"><option value="active"' + (row.status !== 'draft' ? ' selected' : '') + '>Aktif (bisa dibuka tamu)</option><option value="draft"' + (row.status === 'draft' ? ' selected' : '') + '>Draf (tersembunyi)</option></select></label></div>'
      + (function () {
        const mine = row.id ? row.owner_id === user.id : !row.fromOrder;
        return '<fieldset class="own"><legend>Pemilik & paket</legend><label class="chk"><input type="checkbox" name="mine"' + (mine ? ' checked' : '') + '> Undangan untuk saya sendiri (paket Penuh otomatis, gratis, aktif selamanya)</label>'
          + '<div class="g2"><label>Paket<select name="package"' + (mine ? ' disabled' : '') + '>' + pkgs.map((p) => '<option value="' + p.id + '"' + (p.id === (mine ? 'penuh' : (row.package || 'lengkap')) ? ' selected' : '') + '>' + esc(p.name) + ' · Rp' + Number(p.price).toLocaleString('id-ID') + '</option>').join('') + '</select></label>'
          + '<label>Email pembeli (untuk masuk & sunting sendiri)<input type="email" name="owner_email" value="' + esc(mine ? '' : (row.owner_email || '')) + '"' + (mine ? ' disabled' : '') + ' placeholder="pembeli@gmail.com"></label></div>'
          + (hasExp ? '<div class="g2 exp"><label>Masa aktif sampai (WIB) <small>kosong = selamanya</small><input type="datetime-local" name="expires_at" value="' + esc(toLocal(row.expires_at)) + '"' + (mine ? ' disabled' : '') + '></label><p class="expbtn"' + (mine ? ' hidden' : '') + '><button type="button" data-ext="30">+30 hari</button> <button type="button" data-ext="90">+90 hari</button> <button type="button" data-ext="0">Selamanya</button></p></div>'
            + '<p class="note">' + (row.expires_at && new Date(row.expires_at).getTime() <= Date.now() ? '<b class="bad">Masa aktif habis.</b> Tamu melihat halaman "masa aktif habis". Perpanjang lalu Simpan. ' : '') + 'Saat undangan pertama kali diaktifkan, tanggal diisi otomatis sesuai paket. Ganti paket = dihitung ulang dari hari ini. Tombol +hari menambah dari tanggal habis (atau dari sekarang bila sudah lewat).</p>'
            : '<p class="note">Masa aktif belum aktif di database: jalankan <code>supabase/undangan-dashboard.sql</code>. Sampai saat itu semua undangan aktif selamanya.</p>')
          + (row.fromOrder ? '<p class="note">Dari pesanan WA ' + esc(row.fromOrder.contact_wa) + '. Setelah disimpan, pesanan ditautkan ke undangan ini.</p>' : '') + '</fieldset>';
      })()
      + '<label>Judul<input name="title" required value="' + esc(d.title || '') + '" placeholder="Adi & Sari"></label>'
      + '<div class="g2"><label>Teks kecil di atas judul<input name="kicker" value="' + esc(d.kicker || '') + '" placeholder="The Wedding of"></label><label>Kalimat undangan<input name="inviteLine" value="' + esc(d.inviteLine || '') + '"></label></div>'
      + '<div class="g2"><label>Tanggal tampilan<input name="dateLabel" value="' + esc(d.dateLabel || '') + '" placeholder="Sabtu, 20 Desember 2026"></label><label>Hitung mundur ke (WIB)<input type="datetime-local" name="countdownTo" value="' + esc(toLocal(d.countdownTo)) + '"></label></div>'
      + '<label>Foto sampul (URL)<input name="cover" value="' + esc(d.cover || '') + '"></label><p><input type="file" accept="image/*" id="upCover"> <small class="note">Unggah foto sampul</small></p>'
      + '<label>Galeri (satu URL per baris)<textarea name="gallery" rows="4">' + esc((d.gallery || []).join('\n')) + '</textarea></label><p><input type="file" accept="image/*" multiple id="upGallery"> <small class="note">Unggah foto galeri (maks 3 MB per foto)</small></p>'
      + '<div class="g2"><label>Musik<select name="musicPick">' + music.options(d.musicUrl || '') + '</select></label><label>Tautan musik sendiri<input name="musicUrl" value="' + esc(music.knownUrl(d.musicUrl) ? '' : (d.musicUrl || '')) + '"></label></div>'
      + '<div class="g2"><label>Video YouTube (opsional)<input name="youtube" value="' + esc(d.youtube || '') + '" placeholder="https://youtu.be/…"></label><label>Siaran langsung (opsional)<input name="streamUrl" value="' + esc(d.streamUrl || '') + '"></label></div>'
      + '<label><input type="checkbox" name="autoscroll"' + (d.autoscroll === false ? '' : ' checked') + ' style="width:auto"> Auto scroll menyala setelah undangan dibuka</label>'
      + '<label>Kalimat pembuka (kosongkan untuk otomatis)<textarea name="opening" rows="3">' + esc(d.opening || '') + '</textarea></label>'
      + '<label>Kutipan / ayat (kosongkan untuk otomatis)<textarea name="quote" rows="2">' + esc(d.quote || '') + '</textarea></label>'
      + '<label>Pustaka kutipan <small>pilih untuk mengisi kolom di atas</small><select id="quoteLib"><option value="">— pilih kutipan —</option>' + QUOTES.map((q, i) => '<option value="' + i + '">' + esc(q[0]) + '</option>').join('') + '</select></label>'
      + '<fieldset class="own"><legend>Tampilan</legend>'
      + [['hostsReverse', 'Balik urutan mempelai (wanita dulu, lalu pria)'], ['hideStoryPhotos', 'Sembunyikan foto di Cerita Kami'], ['hideRsvp', 'Sembunyikan RSVP (formulir hanya untuk ucapan)'], ['hideWishes', 'Sembunyikan ucapan tamu']].map((o) => '<label class="chk"><input type="checkbox" name="' + o[0] + '"' + (d[o[0]] ? ' checked' : '') + '> ' + o[1] + '</label>').join('')
      + '</fieldset>'
      + '<label>Penutup<textarea name="closing" rows="2">' + esc(d.closing || '') + '</textarea></label>'
      + '<details open><summary>Data bertingkat (JSON)</summary><p class="note">Format sama dengan contoh. Tiap kolom harus JSON yang sah.</p>'
      + '<label>Mempelai / tuan rumah <small>[{role, name, detail, instagram, photo}]</small><textarea name="hosts" rows="6" class="mono">' + esc(json(d.hosts)) + '</textarea></label>'
      + '<label>Acara <small>[{name, start, end, timeLabel, place, address, maps}] · start/end format 20261220T090000</small><textarea name="events" rows="8" class="mono">' + esc(json(d.events)) + '</textarea></label>'
      + '<label>Susunan acara <small>[{time, title, text}]</small><textarea name="schedule" rows="5" class="mono">' + esc(json(d.schedule)) + '</textarea></label>'
      + '<label>Cerita Kami <small>[{when, title, text, photo}] · photo = URL foto (opsional)</small><textarea name="story" rows="5" class="mono">' + esc(json(d.story)) + '</textarea></label>'
      + '<label>Rekening amplop <small>[{bank, number, holder}] · bank: BCA, BRI, Mandiri, BNI, BSI, DANA, GoPay, OVO, ShopeePay, dll.</small><textarea name="gifts" rows="5" class="mono">' + esc(json(d.gifts || (d.gift && d.gift.number ? [d.gift] : []))) + '</textarea></label>'
      + '<label>Alamat kado fisik <small>{name, address, note} atau kosongkan</small><textarea name="giftAddress" rows="3" class="mono">' + esc(d.giftAddress ? JSON.stringify(d.giftAddress, null, 2) : '') + '</textarea></label>'
      + '</details>'
      + '<p class="act"><button class="cta" type="submit">Simpan</button> <button type="button" id="edClose">Tutup</button>' + (row.id ? ' <button type="button" id="edDel" class="danger">Hapus</button>' : '') + '</p>'
      + '<p id="edMsg" class="note" role="status"></p>'
      + (row.id ? '<div class="share"><b>1. Tautan untuk tamu</b><p class="note">Ketik nama tamu, salin, lalu kirim. Bisa sebanyak apa pun.</p><label>Nama tamu<input id="guestName" placeholder="Bapak Rahman"></label><p><code id="guestLink"></code></p><p class="act"><button type="button" id="copyLink">Salin tautan</button><a class="btnl wa" id="waGuest" target="_blank" rel="noopener">Kirim lewat WA</a></p></div>'
        + '<div class="share"><b>2. Tautan sunting untuk pembeli</b><p class="note">Pembeli bisa mengubah judul, tanggal, musik, dan rekening sendiri lewat tautan ini (paket dengan fitur sunting). Tautan hanya tampil sekali; yang disimpan hanya sidik acaknya.</p><p id="editLinkBox" class="note">' + (row.edit_token_hash ? 'Sudah ada tautan sunting aktif.' : 'Belum ada tautan sunting.') + '</p><p class="act"><button type="button" id="mkEdit">' + (row.edit_token_hash ? 'Buat tautan baru' : 'Buat tautan sunting') + '</button>' + (row.edit_token_hash ? '<button type="button" id="rmEdit" class="danger">Cabut tautan</button>' : '') + '</p></div>'
        + '<div class="share"><b>3. RSVP & ucapan tamu</b><div id="guestData"><p class="note">Memuat…</p></div></div>' : '')
      + '</form>';
  }

  async function upload(files, slug) {
    const urls = [];
    for (const file of files) {
      if (file.size > 3 * 1024 * 1024) { say(file.name + ' lebih dari 3 MB, dilewati.'); continue; }
      const ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
      const path = user.id + '/' + (slug || 'umum') + '/' + Date.now() + '-' + Math.random().toString(36).slice(2, 6) + '.' + ext;
      const up = await sb.storage.from('invitations').upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) { say('Unggah gagal: ' + up.error.message); continue; }
      urls.push(sb.storage.from('invitations').getPublicUrl(path).data.publicUrl);
    }
    return urls;
  }

  function copy(text, done) {
    const ok = () => say(done);
    if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(text).then(ok, () => prompt('Salin tautan ini:', text));
    else prompt('Salin tautan ini:', text);
  }
  async function makeEditLink(row) {
    if (row.edit_token_hash && !confirm('Buat tautan baru? Tautan sunting lama otomatis tidak berlaku.')) return;
    const raw = new Uint8Array(32); crypto.getRandomValues(raw);
    const token = btoa(String.fromCharCode.apply(null, raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(token));
    const hash = [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
    const r = await sb.from('invitations').update({ edit_token_hash: hash }).eq('id', row.id).select('id');
    if (r.error) { say('Tautan belum terbuat: ' + r.error.message); return; }
    row.edit_token_hash = hash; listMine();
    const link = new URL('../sunting/', location.href).href + '?s=' + row.slug + '&k=' + token;
    const box = $('editLinkBox');
    box.innerHTML = '<b>Salin sekarang, tautan ini tidak bisa ditampilkan lagi:</b><br><code></code>';
    box.querySelector('code').textContent = link;
    const act = $('mkEdit').parentNode;
    if (!act.querySelector('.cp')) {
      const b = document.createElement('button'); b.type = 'button'; b.className = 'cp'; b.textContent = 'Salin tautan sunting'; b.onclick = () => copy(link, 'Tautan sunting tersalin.'); act.prepend(b);
      const w = document.createElement('a'); w.className = 'btnl wa'; w.target = '_blank'; w.rel = 'noopener'; w.textContent = 'Kirim ke pembeli via WA'; act.prepend(w);
      w.href = 'https://wa.me/' + ((row.fromOrderWa || '').replace(/\D/g, '')) + '?text=' + encodeURIComponent('Halo kak, undanganmu sudah jadi. Tautan untuk mengubah isi sendiri (jangan dibagikan ke tamu):\n' + link);
    } else { act.querySelector('.cp').onclick = () => copy(link, 'Tautan sunting tersalin.'); }
    say('Tautan sunting baru siap. Salin dan kirim ke pembeli.');
  }
  async function loadGuests(row) {
    const box = $('guestData'); if (!box) return;
    const [rs, ws] = await Promise.all([
      sb.from('invitation_rsvps').select('id,guest_name,attendance,guests,created_at').eq('invitation_id', row.id).order('created_at', { ascending: false }),
      sb.from('invitation_wishes').select('id,guest_name,message,created_at').eq('invitation_id', row.id).order('created_at', { ascending: false })
    ]);
    const r = rs.data || []; const w = ws.data || [];
    const sum = (k) => r.filter((x) => x.attendance === k).reduce((a, x) => a + (x.guests || 0), 0);
    const lbl = { hadir: 'Hadir', tidak: 'Tidak hadir', ragu: 'Masih ragu' };
    box.innerHTML = '<p class="note">' + r.length + ' RSVP · hadir ' + sum('hadir') + ' orang · ragu ' + sum('ragu') + ' · tidak ' + r.filter((x) => x.attendance === 'tidak').length + ' · ' + w.length + ' ucapan</p>'
      + (r.length ? '<table class="gt"><tr><th>Nama</th><th>Status</th><th>Jml</th><th></th></tr>' + r.map((x) => '<tr><td>' + esc(x.guest_name) + '</td><td>' + esc(lbl[x.attendance] || x.attendance) + '</td><td>' + esc(x.guests) + '</td><td><button type="button" class="danger sm" data-delr="' + esc(x.id) + '" aria-label="Hapus RSVP">×</button></td></tr>').join('') + '</table>' : '')
      + (w.length ? '<ul class="wl">' + w.map((x) => '<li><b>' + esc(x.guest_name) + '</b> ' + esc(x.message) + ' <button type="button" class="danger sm" data-delw="' + esc(x.id) + '">Hapus</button></li>').join('') + '</ul>' : '')
      + (r.length ? '<p><button type="button" id="csv">Unduh daftar tamu (CSV)</button></p>' : '');
    box.onclick = async (e) => {
      const id = e.target.dataset.delw || e.target.dataset.delr; if (!id) return;
      const table = e.target.dataset.delw ? 'invitation_wishes' : 'invitation_rsvps';
      if (!confirm('Hapus ' + (e.target.dataset.delw ? 'ucapan' : 'RSVP') + ' ini?')) return;
      const d = await sb.from(table).delete().eq('id', id).select('id');
      if (d.error || !d.data || !d.data.length) { say('Belum terhapus. Pastikan supabase/undangan-admin.sql sudah dijalankan.'); return; }
      say('Terhapus.'); loadGuests(row);
    };
    const csv = $('csv');
    if (csv) csv.onclick = () => {
      const lines = [['nama', 'status', 'jumlah', 'waktu']].concat(r.map((x) => [x.guest_name, x.attendance, x.guests, new Date(x.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })]));
      const blob = new Blob([lines.map((l) => l.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(',')).join('\n')], { type: 'text/csv' });
      const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'rsvp-' + row.slug + '.csv'; a.click();
    };
  }

  function open(row) {
    current = row;
    const box = $('editor');
    box.hidden = false;
    box.innerHTML = form(row);
    box.scrollIntoView({ behavior: 'smooth' });
    const f = $('edForm');
    const tpl = $('loadTpl');
    if (tpl) tpl.onclick = async () => {
      const id = f.elements.template.value;
      const res = await fetch('../demo/' + id + '.json');
      const d = await res.json();
      delete d.demo; delete d.slug;
      d.closing = (d.closing || '').replace(/ini hanya contoh tampilan itap\.?/i, '').trim();
      const keep = f.elements.slug.value;
      open(Object.assign({}, row, { slug: keep, theme: d.theme, data: d }));
      say('Kolom terisi dari contoh. Ganti nama, tanggal, dan alamat dengan data asli.');
    };
    f.elements.title.addEventListener('input', () => { if (!row.id && !f.elements.slug.dataset.touched) f.elements.slug.value = slugify(f.elements.title.value); });
    f.elements.slug.addEventListener('input', () => { f.elements.slug.dataset.touched = '1'; });
    $('upCover').onchange = async (e) => { say('Mengunggah…'); const u = await upload(e.target.files, f.elements.slug.value); if (u[0]) { f.elements.cover.value = u[0]; say('Foto sampul terunggah. Klik Simpan.'); } };
    $('upGallery').onchange = async (e) => { say('Mengunggah…'); const u = await upload(e.target.files, f.elements.slug.value); if (u.length) { f.elements.gallery.value = (f.elements.gallery.value.trim() + '\n' + u.join('\n')).trim(); say(u.length + ' foto terunggah. Klik Simpan.'); } };
    $('edClose').onclick = () => { $('editor').hidden = true; };
    const del = $('edDel');
    if (del) del.onclick = async () => {
      if (!confirm('Hapus undangan ' + row.slug + ' beserta RSVP dan ucapannya? Tidak bisa dibatalkan.')) return;
      const r = await sb.from('invitations').delete().eq('id', row.id).select('id');
      if (r.error || !r.data || !r.data.length) { say('Belum terhapus. Pastikan supabase/undangan-admin.sql sudah dijalankan.'); return; }
      $('editor').hidden = true; listMine();
    };
    const mineBox = f.elements.mine;
    mineBox.onchange = () => { f.elements.package.disabled = mineBox.checked; f.elements.owner_email.disabled = mineBox.checked; if (mineBox.checked) f.elements.package.value = 'penuh'; };
    const gl = $('guestName');
    if (gl) {
      const paint = () => {
        const link = new URL('../../u/', location.href).href + '?s=' + row.slug + (gl.value.trim() ? '&to=' + encodeURIComponent(gl.value.trim()).replace(/%20/g, '+') : '');
        $('guestLink').textContent = link;
        $('waGuest').href = 'https://wa.me/?text=' + encodeURIComponent('Assalamu\u2019alaikum / Salam hangat ' + (gl.value.trim() || 'Bapak/Ibu/Saudara/i') + ',\nTanpa mengurangi rasa hormat, kami mengundang Anda ke acara kami. Detail acara ada di tautan berikut:\n' + link + '\nTerima kasih.');
      };
      gl.oninput = paint; paint();
      $('copyLink').onclick = () => copy($('guestLink').textContent, 'Tautan tamu tersalin.');
      $('mkEdit').onclick = () => makeEditLink(row);
      if ($('rmEdit')) $('rmEdit').onclick = async () => {
        if (!confirm('Cabut tautan sunting? Tautan lama tidak bisa dipakai lagi.')) return;
        const r = await sb.from('invitations').update({ edit_token_hash: null }).eq('id', row.id).select('id');
        if (r.error) { say('Belum tercabut: ' + r.error.message); return; }
        row.edit_token_hash = null; open(row); listMine(); say('Tautan sunting dicabut.');
      };
      loadGuests(row);
    }
    const ql = $('quoteLib');
    if (ql) ql.onchange = () => { const q = QUOTES[Number(ql.value)]; if (q) { f.elements.quote.value = q[1]; say('Kutipan diisi. Klik Simpan.'); } };
    f.querySelectorAll('[data-ext]').forEach((b) => b.onclick = () => {
      const n = Number(b.dataset.ext); const inp = f.elements.expires_at;
      if (!n) { inp.value = ''; say('Masa aktif: selamanya. Klik Simpan.'); return; }
      const cur = inp.value ? new Date(fromLocal(inp.value)) : null;
      const from = cur && cur.getTime() > Date.now() ? cur : new Date();
      inp.value = toLocal(new Date(from.getTime() + n * 86400000).toISOString());
      say('Masa aktif diperpanjang ' + n + ' hari. Klik Simpan.');
    });
    f.onsubmit = save;
  }

  async function save(e) {
    e.preventDefault();
    const f = e.target;
    const v = (n) => String(f.elements[n].value || '').trim();
    const parse = (n, fallback) => { const t = v(n); if (!t) return fallback; try { return JSON.parse(t); } catch (err) { throw new Error('Kolom "' + n + '" bukan JSON yang sah.'); } };
    let data;
    try {
      const design = designs.find((x) => x[0] === v('design')) || designs[0];
      const pick = v('musicPick');
      data = Object.assign({}, current.data || {}, {
        design: design[0], eventType: v('eventType'), title: v('title'), kicker: v('kicker'), inviteLine: v('inviteLine'),
        dateLabel: v('dateLabel'), countdownTo: fromLocal(v('countdownTo')), cover: v('cover'),
        gallery: v('gallery').split(/\n+/).map((x) => x.trim()).filter(Boolean),
        musicUrl: pick === 'custom' ? v('musicUrl') : pick, youtube: v('youtube'), streamUrl: v('streamUrl'),
        autoscroll: f.elements.autoscroll.checked, opening: v('opening'), quote: v('quote'), closing: v('closing'),
        hosts: parse('hosts', []), events: parse('events', []), schedule: parse('schedule', []), story: parse('story', []),
        gifts: parse('gifts', []), giftAddress: parse('giftAddress', null),
        hostsReverse: f.elements.hostsReverse.checked, hideStoryPhotos: f.elements.hideStoryPhotos.checked, hideRsvp: f.elements.hideRsvp.checked, hideWishes: f.elements.hideWishes.checked
      });
      delete data.demo;
      data.gift = Object.assign({ bank: '', number: '', holder: '', qris: '' }, (data.gifts && data.gifts[0]) || {}, { qris: (current.data && current.data.gift && current.data.gift.qris) || '' });
      const mine = f.elements.mine.checked;
      const email = mine ? '' : v('owner_email').toLowerCase();
      if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error('Email pembeli tidak sah.');
      const row = { theme: design[1], package: mine ? 'penuh' : v('package'), status: v('status') === 'draft' ? 'draft' : 'active', data, owner_email: mine ? (user.email || '').toLowerCase() : (email || null) };
      if (mine) row.owner_id = user.id; else if (current.id && current.owner_id === user.id) row.owner_id = null;
      if (hasExp && !mine && f.elements.expires_at) { const ex = v('expires_at'); row.expires_at = ex ? new Date(fromLocal(ex)).toISOString() : null; }
      if (JSON.stringify(data).length > 100000) throw new Error('Data terlalu besar.');
      let res;
      if (current.id) {
        res = await sb.from('invitations').update(row).eq('id', current.id).select(COLS()).single();
      } else {
        const slug = v('slug');
        if (!slugOk(slug)) throw new Error('Slug hanya huruf kecil, angka, dan tanda minus (3–48 karakter).');
        res = await sb.from('invitations').insert(Object.assign(row, { slug })).select(COLS()).single();
      }
      if (res.error) throw new Error(/duplicate|unique/i.test(res.error.message) ? 'Slug sudah dipakai, ganti yang lain.' : 'Belum tersimpan: ' + res.error.message);
      const ok = 'Tersimpan · paket ' + res.data.package + ' · ' + (res.data.status === 'active' ? 'aktif' : 'draf') + '.';
      if (!current.id && current.fromOrder && window.ITAP_ADMIN && window.ITAP_ADMIN.linkOrder) await window.ITAP_ADMIN.linkOrder(current.fromOrder.id, res.data.id);
      const wa = current.fromOrderWa || (current.fromOrder && current.fromOrder.contact_wa) || '';
      listMine();
      open(Object.assign(res.data, { fromOrderWa: wa }));
      say(ok);
    } catch (err) { say(err.message); }
  }

  async function openById(id) {
    await client();
    const r = await sb.from('invitations').select(COLS()).eq('id', id).single();
    if (r.error) { say('Undangan tidak bisa dibuka.'); return; }
    open(r.data);
  }

  document.addEventListener('itap-admin', async (e) => {
    user = e.detail; await client();
    const probe = await sb.from('invitations').select('expires_at').limit(1);
    hasExp = !probe.error;
    $('newInv').onclick = () => open({ slug: '', theme: 'melayu', status: 'active', data: { design: 'melayu', eventType: 'Pernikahan' } });
    $('mineList').onclick = (ev) => { const b = ev.target.closest('[data-ed]'); if (b) openById(b.dataset.ed); };
    $('invChips').onclick = (ev) => { const b = ev.target.closest('[data-if]'); if (b) { invFilter = b.dataset.if; paintList(); } };
    $('invQ').oninput = paintList;
    listMine();
    // Dari dasbor pemilik: /undangan/admin/?edit=<id> langsung membuka editor undangan itu.
    const want = new URLSearchParams(location.search).get('edit');
    if (want) openById(want);
  });
  document.addEventListener('itap-edit', (e) => openById(e.detail));
  document.addEventListener('itap-from-order', async (e) => {
    const o = e.detail; const p = o.payload || {};
    const design = (designs.find((x) => x[0] === p.design) || designs.find((x) => x[1] === o.theme) || designs[0])[0];
    let d = {};
    try { d = await (await fetch('../demo/' + design + '.json')).json(); } catch (err) { d = {}; }
    delete d.demo; delete d.slug;
    d.closing = (d.closing || '').replace(/ini hanya contoh tampilan itap\.?/i, '').trim();
    const names = p.names || '';
    const date = p.date || '';
    Object.assign(d, { design, eventType: o.event_type || d.eventType, title: names || d.title });
    if (date) {
      const dt = new Date(date + 'T09:00:00+07:00');
      d.countdownTo = date + 'T09:00:00+07:00';
      d.dateLabel = isNaN(dt) ? date : dt.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
      (d.events || []).forEach((ev) => { if (ev.start) ev.start = date.replace(/-/g, '') + ev.start.slice(8); if (ev.end) ev.end = date.replace(/-/g, '') + ev.end.slice(8); });
    }
    if (p.venue && d.events && d.events[0]) { d.events[0].place = p.venue; d.events[0].address = p.venue; }
    if (p.maps && d.events && d.events[0]) d.events[0].maps = p.maps;
    const pkg = pkgs.some((x) => x.id === o.package) ? o.package : 'lengkap';
    open({ slug: slugify(names), theme: o.theme, package: pkg, status: 'draft', data: d, owner_email: (p.email || '').toLowerCase() || null, fromOrder: o, fromOrderWa: o.contact_wa });
    say('Terisi dari pesanan dan contoh tema. Ganti teks contoh (mempelai, rekening, alamat) dengan data asli, lalu Simpan. Status awal: Draf.');
  });
})();
