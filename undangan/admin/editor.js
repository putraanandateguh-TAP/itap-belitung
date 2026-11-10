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
  const tracks = [['', 'Tanpa musik'], ['../audio/undangan/gymnopedie-1.mp3', 'Gymnopédie No. 1 (public domain)'], ['../audio/undangan/nocturne-op15-1.mp3', 'Nocturne Op. 15 No. 1 (CC0)']];
  let sb = null; let user = null; let current = null;
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

  async function listMine() {
    const res = await sb.from('invitations').select('id,slug,theme,package,status,data,created_at').eq('owner_id', user.id).order('created_at', { ascending: false });
    const rows = res.data || [];
    $('mineList').innerHTML = rows.length ? rows.map((r) => '<article class="mrow"><div><b>' + esc((r.data && r.data.title) || r.slug) + '</b><small>' + esc(r.slug) + ' · ' + esc(r.status) + ' · paket ' + esc(r.package) + '</small></div><div class="mbtn"><a href="../../u/?s=' + esc(r.slug) + '" target="_blank" rel="noopener">Buka</a><button type="button" data-ed="' + esc(r.id) + '">Sunting</button></div></article>').join('') : '<p class="note">Belum ada undangan milikmu. Klik "Buat undangan baru".</p>';
  }

  function json(v) { return JSON.stringify(v ?? [], null, 2); }
  function form(row) {
    const d = row.data || {};
    const design = d.design || row.theme;
    return '<h2>' + (row.id ? 'Sunting: ' + esc(row.slug) : 'Undangan baru') + '</h2>'
      + '<p class="note">Semua fitur paket Penuh aktif. Undangan milik admin otomatis paket Penuh, aktif tanpa bayar, tanpa masa aktif.</p>'
      + '<form id="edForm" class="ed">'
      + (row.id ? '' : '<label>Mulai dari contoh tema<select name="template">' + designs.map((x) => '<option value="' + x[0] + '"' + (x[0] === design ? ' selected' : '') + '>' + esc(x[2]) + '</option>').join('') + '</select></label><p><button type="button" id="loadTpl">Isi dari contoh</button> <small class="note">Mengisi semua kolom dengan data contoh tema itu, lalu tinggal diganti.</small></p>')
      + '<div class="g2"><label>Tautan (slug)<input name="slug" required pattern="[a-z0-9\\-]{3,48}" value="' + esc(row.slug || '') + '" ' + (row.id ? 'readonly' : '') + ' placeholder="adi-sari"></label>'
      + '<label>Desain<select name="design">' + designs.map((x) => '<option value="' + x[0] + '"' + (x[0] === design ? ' selected' : '') + '>' + esc(x[2]) + '</option>').join('') + '</select></label></div>'
      + '<div class="g2"><label>Jenis acara<input name="eventType" value="' + esc(d.eventType || 'Pernikahan') + '"></label><label>Status<select name="status"><option value="active"' + (row.status !== 'draft' ? ' selected' : '') + '>Aktif (bisa dibuka tamu)</option><option value="draft"' + (row.status === 'draft' ? ' selected' : '') + '>Draf (tersembunyi)</option></select></label></div>'
      + '<label>Judul<input name="title" required value="' + esc(d.title || '') + '" placeholder="Adi & Sari"></label>'
      + '<div class="g2"><label>Teks kecil di atas judul<input name="kicker" value="' + esc(d.kicker || '') + '" placeholder="The Wedding of"></label><label>Kalimat undangan<input name="inviteLine" value="' + esc(d.inviteLine || '') + '"></label></div>'
      + '<div class="g2"><label>Tanggal tampilan<input name="dateLabel" value="' + esc(d.dateLabel || '') + '" placeholder="Sabtu, 20 Desember 2026"></label><label>Hitung mundur ke (WIB)<input type="datetime-local" name="countdownTo" value="' + esc(toLocal(d.countdownTo)) + '"></label></div>'
      + '<label>Foto sampul (URL)<input name="cover" value="' + esc(d.cover || '') + '"></label><p><input type="file" accept="image/*" id="upCover"> <small class="note">Unggah foto sampul</small></p>'
      + '<label>Galeri (satu URL per baris)<textarea name="gallery" rows="4">' + esc((d.gallery || []).join('\n')) + '</textarea></label><p><input type="file" accept="image/*" multiple id="upGallery"> <small class="note">Unggah foto galeri (maks 3 MB per foto)</small></p>'
      + '<div class="g2"><label>Musik<select name="musicPick">' + tracks.map((t) => '<option value="' + t[0] + '"' + (t[0] === (d.musicUrl || '') ? ' selected' : '') + '>' + t[1] + '</option>').join('') + '<option value="custom"' + (d.musicUrl && !tracks.some((t) => t[0] === d.musicUrl) ? ' selected' : '') + '>Tautan sendiri (bebas royalti)</option></select></label><label>Tautan musik sendiri<input name="musicUrl" value="' + esc(tracks.some((t) => t[0] === d.musicUrl) ? '' : (d.musicUrl || '')) + '"></label></div>'
      + '<div class="g2"><label>Video YouTube (opsional)<input name="youtube" value="' + esc(d.youtube || '') + '" placeholder="https://youtu.be/…"></label><label>Siaran langsung (opsional)<input name="streamUrl" value="' + esc(d.streamUrl || '') + '"></label></div>'
      + '<label><input type="checkbox" name="autoscroll"' + (d.autoscroll === false ? '' : ' checked') + ' style="width:auto"> Auto scroll menyala setelah undangan dibuka</label>'
      + '<label>Kalimat pembuka (kosongkan untuk otomatis)<textarea name="opening" rows="3">' + esc(d.opening || '') + '</textarea></label>'
      + '<label>Kutipan / ayat (kosongkan untuk otomatis)<textarea name="quote" rows="2">' + esc(d.quote || '') + '</textarea></label>'
      + '<label>Penutup<textarea name="closing" rows="2">' + esc(d.closing || '') + '</textarea></label>'
      + '<details open><summary>Data bertingkat (JSON)</summary><p class="note">Format sama dengan contoh. Tiap kolom harus JSON yang sah.</p>'
      + '<label>Mempelai / tuan rumah <small>[{role, name, detail, instagram, photo}]</small><textarea name="hosts" rows="6" class="mono">' + esc(json(d.hosts)) + '</textarea></label>'
      + '<label>Acara <small>[{name, start, end, timeLabel, place, address, maps}] · start/end format 20261220T090000</small><textarea name="events" rows="8" class="mono">' + esc(json(d.events)) + '</textarea></label>'
      + '<label>Susunan acara <small>[{time, title, text}]</small><textarea name="schedule" rows="5" class="mono">' + esc(json(d.schedule)) + '</textarea></label>'
      + '<label>Kisah <small>[{when, title, text}]</small><textarea name="story" rows="5" class="mono">' + esc(json(d.story)) + '</textarea></label>'
      + '<label>Rekening amplop <small>[{bank, number, holder}]</small><textarea name="gifts" rows="5" class="mono">' + esc(json(d.gifts || (d.gift && d.gift.number ? [d.gift] : []))) + '</textarea></label>'
      + '<label>Alamat kado fisik <small>{name, address, note} atau kosongkan</small><textarea name="giftAddress" rows="3" class="mono">' + esc(d.giftAddress ? JSON.stringify(d.giftAddress, null, 2) : '') + '</textarea></label>'
      + '</details>'
      + '<p class="act"><button class="cta" type="submit">Simpan</button> <button type="button" id="edClose">Tutup</button>' + (row.id ? ' <button type="button" id="edDel" class="danger">Hapus</button>' : '') + '</p>'
      + '<p id="edMsg" class="note" role="status"></p>'
      + (row.id ? '<div class="share"><b>Tautan untuk tamu</b><label>Nama tamu<input id="guestName" placeholder="Bapak Rahman"></label><p><code id="guestLink"></code></p><button type="button" id="copyLink">Salin tautan</button></div>' : '')
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
      open({ slug: keep, theme: d.theme, status: 'active', data: d });
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
    const gl = $('guestName');
    if (gl) {
      const paint = () => { $('guestLink').textContent = new URL('../../u/', location.href).href + '?s=' + row.slug + (gl.value.trim() ? '&to=' + encodeURIComponent(gl.value.trim()).replace(/%20/g, '+') : ''); };
      gl.oninput = paint; paint();
      $('copyLink').onclick = () => navigator.clipboard.writeText($('guestLink').textContent).then(() => say('Tautan tersalin.'));
    }
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
        gifts: parse('gifts', []), giftAddress: parse('giftAddress', null)
      });
      delete data.demo;
      data.gift = Object.assign({ bank: '', number: '', holder: '', qris: '' }, (data.gifts && data.gifts[0]) || {}, { qris: (current.data && current.data.gift && current.data.gift.qris) || '' });
      const row = { theme: design[1], package: 'penuh', status: v('status') === 'draft' ? 'draft' : 'active', data };
      if (JSON.stringify(data).length > 100000) throw new Error('Data terlalu besar.');
      let res;
      if (current.id) {
        res = await sb.from('invitations').update(row).eq('id', current.id).select('id,slug,theme,package,status,data').single();
      } else {
        const slug = v('slug');
        if (!slugOk(slug)) throw new Error('Slug hanya huruf kecil, angka, dan tanda minus (3–48 karakter).');
        res = await sb.from('invitations').insert(Object.assign(row, { slug, owner_id: user.id, owner_email: (user.email || '').toLowerCase() })).select('id,slug,theme,package,status,data').single();
      }
      if (res.error) throw new Error(/duplicate|unique/i.test(res.error.message) ? 'Slug sudah dipakai, ganti yang lain.' : 'Belum tersimpan: ' + res.error.message);
      const ok = 'Tersimpan · paket ' + res.data.package + ' · ' + (res.data.status === 'active' ? 'aktif' : 'draf') + '.';
      listMine();
      if (!current.id) open(res.data);
      else current = res.data;
      say(ok);
    } catch (err) { say(err.message); }
  }

  async function openById(id) {
    await client();
    const r = await sb.from('invitations').select('id,slug,theme,package,status,data,owner_id').eq('id', id).single();
    if (r.error) { say('Undangan tidak bisa dibuka.'); return; }
    open(r.data);
  }

  document.addEventListener('itap-admin', async (e) => {
    user = e.detail; await client();
    $('newInv').onclick = () => open({ slug: '', theme: 'melayu', status: 'active', data: { design: 'melayu', eventType: 'Pernikahan' } });
    $('mineList').onclick = (ev) => { const b = ev.target.closest('[data-ed]'); if (b) openById(b.dataset.ed); };
    listMine();
  });
  document.addEventListener('itap-edit', (e) => openById(e.detail));
})();
