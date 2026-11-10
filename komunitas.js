(function () {
  const WA = 'https://wa.me/6285141121283?text=Halo%20iTAP';
  const cfg = window.ITAP_CONFIG || {};
  const mock = window.ITAP_AUTH_MOCK || null;
  const urlOk = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(cfg.SUPABASE_URL || ''));
  const keyOk = /^[A-Za-z0-9_\-\.]{20,}$/.test(String(cfg.SUPABASE_ANON_KEY || ''));
  const configured = Boolean(mock) || (urlOk && keyOk);
  const aiName = String(cfg.AI_FUNCTION || '');
  const aiReady = mock ? Boolean(mock.ai) : (urlOk && keyOk && /^[a-z0-9_-]{1,40}$/i.test(aiName));
  // 11 kategori iklan + Lowongan (tautan ke Loker), dari usulan kategori Jual Beli iTAP. 'rumah' = kategori lama, tetap terbaca.
  const CATS = [['kuliner', 'Kuliner & oleh-oleh'], ['hasil-laut', 'Hasil laut & olahan'], ['kerajinan', 'Kerajinan & batu satam'], ['pertanian', 'Pertanian & kebun'], ['properti', 'Properti, kos & kontrak'], ['kendaraan', 'Kendaraan'], ['elektronik', 'Elektronik & HP'], ['sewa', 'Sewa alat & trip'], ['jasa', 'Jasa lokal'], ['rumah-tangga', 'Rumah tangga & perlengkapan'], ['lainnya', 'Lain-lain']];
  const LEGACY = [['rumah', 'Rumah (kategori lama)']];
  const BASIC = ['elektronik', 'kendaraan', 'jasa', 'lainnya', 'rumah'];
  const SCATS = [['kabar', 'Kabar'], ['wisata', 'Wisata'], ['kuliner', 'Kuliner'], ['budaya', 'Budaya']];

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const waHref = (raw) => {
    const d = digits(raw);
    if (!/^0\d{9,13}$/.test(d) && !/^62\d{8,13}$/.test(d)) return '';
    return 'https://wa.me/' + (d.startsWith('0') ? '62' + d.slice(1) : d);
  };
  const safeImg = (url) => {
    const value = String(url || '');
    if (/^data:image\/(png|jpeg|webp);base64,[a-z0-9+/=]+$/i.test(value)) return value;
    if (/^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\/object\/public\/listings\/[A-Za-z0-9._/-]+$/i.test(value)) return value;
    return '';
  };
  const soon = (title, text) => '<div class="card soon"><h2>' + esc(title) + '</h2><p>' + esc(text) + '</p><p class="mu sm">Belum ada data yang dikirim.</p></div>';
  const SOON = 'Segera hadir. Akun belum dihubungkan, jadi tombol ini tidak mengirim apa pun.';

  let sb = null;
  let user = null;
  let profile = null;
  let listings = [];
  let mine = [];
  let stories = [];
  let queue = [];
  let notice = '';

  function mockDb() {
    try {
      return JSON.parse(sessionStorage.getItem('itap_mock_db') || '') || {};
    } catch (e) {
      return {};
    }
  }
  function saveMock(db) { sessionStorage.setItem('itap_mock_db', JSON.stringify(db)); }

  function paint() {
    const jual = document.getElementById('jual-root');
    const kabar = document.getElementById('kabar-root');
    const akun = document.getElementById('akun-root');
    const chat = document.getElementById('chat-root');
    const masuk = document.querySelector('#menu a[data-akun] span');
    if (masuk) masuk.textContent = user ? 'Akun' : 'Masuk';
    if (!configured) {
      if (jual) jual.innerHTML = soon('Jual Beli', SOON);
      if (kabar) kabar.innerHTML = soon('Kirim kabar', SOON);
      if (akun) akun.innerHTML = soon('Masuk', SOON);
      if (chat) chat.innerHTML = soon('Asisten', 'Asisten belum dipasang. Tanya iTAP lewat WhatsApp.') + '<p><a class="cta" href="' + WA + '">Buka WhatsApp</a></p>';
      return;
    }
    if (jual) jual.innerHTML = renderJual();
    if (kabar) kabar.innerHTML = renderKabar();
    if (akun) akun.innerHTML = renderAkun();
    if (chat) chat.innerHTML = renderChat();
  }

  function renderAkun() {
    if (!user) {
      return '<div class="card"><h2>Masuk</h2><p class="mu sm">Satu akun iTAP untuk belanja, jual beli, ulasan, dan kirim kabar. Masuk dengan email + kata sandi atau tautan email.</p><p><a class="cta" href="akun/">Masuk Pengunjung</a> <a class="cta" style="background:var(--navy)" href="akun/?peran=admin">Masuk Admin / Owner</a></p><p class="mu sm"><a href="privasi.html">Privasi dan ketentuan</a></p></div>';
    }
    return '<div class="card"><h2>Akun</h2><p class="mu sm">' + esc(user.email || '') + (profile && profile.role === 'admin' ? ' · admin' : '') + '</p><p><a class="cta" href="akun/">' + (profile && profile.role === 'admin' ? 'Buka dasbor Owner' : 'Buka dasbor akun') + '</a></p><form id="profile-form" class="cm-form"><label>Nama<input name="name" maxlength="60" required value="' + esc(profile && profile.display_name) + '"></label><label>WhatsApp<input name="phone" inputmode="numeric" placeholder="08…" value="' + esc(profile && profile.phone) + '"></label><button class="cta" type="submit">Simpan profil</button></form><p><button type="button" id="signout">Keluar</button> <button type="button" id="delete-account">Hapus akun</button></p><p id="auth-note" class="mu sm" role="status">' + esc(notice) + '</p><p class="mu sm"><a href="privasi.html">Privasi dan ketentuan</a></p></div>';
  }

  function itemHtml(row, owner) {
    const photos = (row.photos || []).map(safeImg).filter(Boolean);
    const thumb = photos[0]
      ? '<div class="cm-ph"><img src="' + esc(photos[0]) + '" alt=""></div>'
      : '<div class="cm-ph cm-ph-empty" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="14" rx="2"/><path d="m7 15 3-3 2 2 3-4 3 5"/><circle cx="9" cy="9" r="1"/></svg></div>';
    const href = waHref(row.wa);
    let tools = '';
    if (owner && user && row.owner_id === user.id) {
      tools = '<p class="cm-tools"><button type="button" data-edit="' + esc(row.id) + '">Ubah</button> <button type="button" data-del="' + esc(row.id) + '">Hapus</button></p>';
    } else if (user) {
      tools = '<details class="lapor"><summary>Laporkan</summary><form class="cm-form report-form" data-report="' + esc(row.id) + '"><input name="reason" required minlength="5" maxlength="500" placeholder="Alasan laporan"><button type="submit">Kirim laporan</button></form></details>';
    }
    if (profile && profile.role === 'admin') {
      tools += '<p class="cm-tools"><button type="button" data-flag="' + esc(row.id) + '" data-on="' + (row.flagged ? '1' : '0') + '">' + (row.flagged ? 'Tayangkan lagi' : 'Sembunyikan') + '</button></p>';
    }
    return '<article class="cm-item">' + thumb + '<div class="cm-bd"><h3>' + esc(row.title) + '</h3><p class="price">' + money(row.price) + '</p><p class="mu sm">' + esc(labelCat(row.category)) + (row.flagged ? ' · disembunyikan' : '') + (row.hidden ? ' · tersembunyi' : '') + '</p><p>' + esc(row.description) + '</p>' + (href ? '<p><a class="cta" href="' + href + '" target="_blank" rel="noopener">WhatsApp</a></p>' : '') + tools + '</div></article>';
  }

  function labelCat(id) {
    return (CATS.find((row) => row[0] === id) || LEGACY.find((row) => row[0] === id) || SCATS.find((row) => row[0] === id) || ['', id])[1];
  }

  function renderJual() {
    const q = (document.getElementById('jual-q') || {}).value || '';
    const cat = (document.getElementById('jual-cat') || {}).value || '';
    const rows = listings.filter((row) => {
      const hay = (row.title + ' ' + row.description).toLowerCase();
      return (!q || hay.includes(q.toLowerCase())) && (!cat || row.category === cat);
    });
    const options = '<option value="">Semua kategori</option>' + CATS.concat(listings.some((r) => r.category === 'rumah') ? LEGACY : []).map((row) => '<option value="' + row[0] + '"' + (row[0] === cat ? ' selected' : '') + '>' + esc(row[1]) + '</option>').join('');
    const form = user ? '<form id="listing-form" class="cm-form card"><h3>Pasang iklan</h3><input type="hidden" name="id"><label>Judul<input name="title" required minlength="3" maxlength="80"></label><label>Harga (Rp)<input name="price" inputmode="numeric" required></label><label>Kategori<select name="category">' + CATS.map((row) => '<option value="' + row[0] + '">' + row[1] + '</option>').join('') + '</select></label><label>Deskripsi<textarea name="description" required minlength="10" maxlength="2000"></textarea></label><label>WhatsApp<input name="wa" inputmode="numeric" required placeholder="08…"></label><div class="up"><label class="up-btn">Pilih foto<input name="photos" type="file" accept="image/jpeg,image/png,image/webp" multiple></label><p class="mu sm">Paling banyak 3 foto. Foto diperkecil dan data lokasi/EXIF dihapus otomatis sebelum diunggah.</p><div class="up-previews" id="up-previews"></div></div><button class="cta" type="submit">Tayangkan</button></form>' : '<p class="card"><a href="akun/" style="text-decoration:underline">Masuk</a> dulu untuk memasang iklan.</p>';
    const own = mine.length ? '<h3 class="cm-own">Iklan saya</h3><div class="cm-grid">' + mine.map((row) => itemHtml(row, true)).join('') + '</div>' : '';
    return '<div class="card"><div class="jb-h"><h2>Ruang jual beli</h2><a class="cta jb-add" href="' + (user ? '#listing-form' : 'akun/') + '">+ Jual</a></div><p class="mu sm">Iklan warga. Pembayaran tidak lewat iTAP. Sumber: akun yang memasang.</p><form id="jual-filter" class="cm-form"><input id="jual-q" type="search" placeholder="Cari judul" value="' + esc(q) + '"><select id="jual-cat">' + options + '</select></form><p class="mu sm" style="margin-top:6px">Cari kerja? Lowongan ada di <a href="#loker" style="text-decoration:underline">Loker</a>, tidak dipasang di Jual Beli.</p></div>' + form + '<div class="cm-grid">' + (rows.map((row) => itemHtml(row, false)).join('') || '<p class="card cm-empty">Belum ada iklan yang tampil.</p>') + '</div>' + own + '<p id="jual-note" class="mu sm" role="status">' + esc(notice) + '</p>';
  }

  function renderKabar() {
    if (!user) return '<div class="card"><h2>Kirim kabar</h2><p>Masuk dulu. Kabar baru berstatus menunggu dan tidak tayang sebelum admin menyetujui.</p><p><a class="cta" href="akun/">Masuk</a></p></div>';
    const own = stories.map((row) => '<article class="cm-item"><h3>' + esc(row.title) + '</h3><p class="mu sm">' + esc(labelCat(row.category)) + ' · ' + statusText(row.status) + '</p><p>' + esc(row.body) + '</p></article>').join('');
    const admin = profile && profile.role === 'admin' ? '<h3>Antrean admin</h3>' + (queue.map((row) => '<article class="cm-item"><h3>' + esc(row.title) + '</h3><p>' + esc(row.body) + '</p><p><button type="button" data-story="' + esc(row.id) + '" data-status="approved">Setujui</button> <button type="button" data-story="' + esc(row.id) + '" data-status="rejected">Tolak</button></p></article>').join('') || '<p>Tidak ada yang menunggu.</p>') : '';
    return '<div class="card"><h2>Kirim kabar</h2><form id="story-form" class="cm-form"><label>Judul<input name="title" required minlength="8" maxlength="120"></label><label>Kategori<select name="category">' + SCATS.map((row) => '<option value="' + row[0] + '">' + row[1] + '</option>').join('') + '</select></label><label>Isi<textarea name="body" required minlength="40" maxlength="8000"></textarea></label><button class="cta" type="submit">Kirim draf</button></form><p id="kabar-note" class="mu sm" role="status">' + esc(notice) + '</p></div><div class="cm-list">' + own + admin + '</div>';
  }

  function statusText(status) {
    return status === 'approved' ? 'disetujui' : status === 'rejected' ? 'ditolak' : 'menunggu';
  }

  function renderChat() {
    if (!aiReady) {
      return '<div class="card soon"><h2>Asisten</h2><p>Asisten belum dipasang. Tanya iTAP lewat WhatsApp.</p><p><a class="cta" href="' + WA + '">Buka WhatsApp</a></p></div>';
    }
    if (!user) return '<div class="card"><h2>Asisten iTAP</h2><p>Masuk dulu untuk bertanya. Setiap akun dibatasi 12 pertanyaan per jam.</p><p><a class="cta" href="akun/">Masuk</a></p><p class="mu sm">Atau <a href="' + WA + '">tanya lewat WhatsApp</a>.</p></div>';
    return '<div class="card"><h2>Asisten iTAP</h2><p class="mu sm">Jawaban lewat Gemini. Percakapan tidak disimpan di iTAP.</p><div id="chat-log" class="chat-log"></div><form id="chat-form" class="cm-form"><input name="message" required maxlength="800" placeholder="Tanya singkat"><button class="cta" type="submit">Kirim</button></form><p id="chat-note" class="mu sm" role="status"></p><p class="mu sm"><a href="' + WA + '">Tanya lewat WhatsApp</a></p></div>';
  }

  async function loadPublic() {
    if (!configured) return;
    if (mock) {
      const db = mockDb();
      listings = (db.listings || []).filter((row) => !row.hidden && !row.flagged);
      return;
    }
    const { data, error } = await sb.from('listings').select('id,owner_id,title,price,category,description,wa,hidden,flagged,created_at,listing_photos(path)').eq('hidden', false).eq('flagged', false).order('created_at', { ascending: false }).limit(50);
    if (error) throw error;
    listings = (data || []).map(fromRow);
  }

  function fromRow(row) {
    const base = String(cfg.SUPABASE_URL || '').replace(/\/$/, '');
    return {
      id: row.id,
      owner_id: row.owner_id,
      title: row.title,
      price: row.price,
      category: row.category,
      description: row.description,
      wa: row.wa,
      hidden: row.hidden,
      flagged: row.flagged,
      status: row.status,
      body: row.body,
      photos: (row.listing_photos || row.photos || []).map((photo) => photo.path ? base + '/storage/v1/object/public/listings/' + photo.path : photo)
    };
  }

  async function loadMine() {
    mine = [];
    stories = [];
    queue = [];
    if (!user) return;
    if (mock) {
      const db = mockDb();
      mine = (db.listings || []).filter((row) => row.owner_id === user.id);
      stories = (db.stories || []).filter((row) => row.owner_id === user.id);
      queue = profile && profile.role === 'admin' ? (db.stories || []).filter((row) => row.status === 'pending' && row.owner_id !== user.id) : [];
      if (profile && profile.role === 'admin') listings = db.listings || [];
      return;
    }
    const own = await sb.from('listings').select('id,owner_id,title,price,category,description,wa,hidden,flagged,listing_photos(path)').eq('owner_id', user.id).order('created_at', { ascending: false });
    if (own.error) throw own.error;
    mine = (own.data || []).map(fromRow);
    const story = await sb.from('stories').select('id,owner_id,title,body,category,status,created_at').eq('owner_id', user.id).order('created_at', { ascending: false });
    if (story.error) throw story.error;
    stories = story.data || [];
    if (profile && profile.role === 'admin') {
      const pending = await sb.from('stories').select('id,owner_id,title,body,category,status').eq('status', 'pending').order('created_at', { ascending: true });
      if (pending.error) throw pending.error;
      queue = pending.data || [];
      const flagged = await sb.from('listings').select('id,owner_id,title,price,category,description,wa,hidden,flagged,listing_photos(path)').order('created_at', { ascending: false }).limit(50);
      if (!flagged.error) listings = (flagged.data || []).map(fromRow);
    }
  }

  async function boot() {
    const mid = document.querySelector('.bnav-mid');
    if (mid && aiReady) {
      mid.href = '#chat';
      mid.removeAttribute('target');
      mid.removeAttribute('rel');
      const label = mid.querySelector('span:last-child');
      if (label) { label.textContent = 'Asisten'; label.removeAttribute('data-i18n'); }
      mid.setAttribute('aria-label', 'Asisten iTAP');
    }
    if (!configured) {
      paint();
      return;
    }
    try {
      if (mock) {
        const db = mockDb();
        user = db.user || null;
        profile = db.profile || null;
      } else {
        const lib = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
        sb = lib.createClient(String(cfg.SUPABASE_URL).replace(/\/$/, ''), cfg.SUPABASE_ANON_KEY);
        const session = await sb.auth.getSession();
        user = session.data.session && session.data.session.user;
        if (user) {
          const row = await sb.from('profiles').select('display_name,phone,role').eq('id', user.id).single();
          profile = row.data || { display_name: '', phone: '', role: 'user' };
        }
        if (!window.__itapAuthListen) {
          window.__itapAuthListen = true;
          sb.auth.onAuthStateChange((event) => {
            if (event !== 'INITIAL_SESSION') boot();
          });
        }
      }
      await loadPublic();
      await loadMine();
    } catch (err) {
      notice = 'Data akun belum bisa dimuat. Periksa koneksi.';
    }
    paint();
  }

  // Foto dibuat ulang lewat canvas sebelum diunggah: metadata EXIF/GPS (lokasi rumah, merek HP) tidak ikut.
  async function cleanImage(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (e) { bmp = await createImageBitmap(file); }
    const max = 1600;
    const k = Math.min(1, max / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k));
    const h = Math.max(1, Math.round(bmp.height * k));
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, w, h);
    ctx.drawImage(bmp, 0, 0, w, h);
    if (bmp.close) bmp.close();
    const blob = await new Promise((res) => canvas.toBlob(res, 'image/jpeg', 0.85));
    if (!blob) throw new Error('Foto belum bisa diproses. Coba foto lain.');
    return new File([blob], 'foto.jpg', { type: 'image/jpeg' });
  }

  // Hapus file foto di bucket publik "listings" untuk iklan tertentu (pemilik: folder sendiri; admin: lewat kebijakan admin).
  async function removePhotoFiles(listingIds) {
    if (mock || !sb || !listingIds.length) return;
    const { data } = await sb.from('listing_photos').select('path').in('listing_id', listingIds);
    const paths = (data || []).map((row) => row.path).filter(Boolean);
    if (paths.length) await sb.storage.from('listings').remove(paths);
  }

  async function filePayload(file, ownerId, listingId) {
    if (!file) return null;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type) || file.size > 12000000) throw new Error('Foto harus JPG, PNG, atau WebP.');
    file = await cleanImage(file);
    if (file.size > 1500000) throw new Error('Foto masih lebih dari 1,5 MB setelah diperkecil. Coba foto lain.');
    const ext = 'jpg';
    const path = ownerId + '/' + listingId + '/' + crypto.randomUUID() + '.' + ext;
    if (mock) {
      const data = await file.arrayBuffer();
      const bytes = new Uint8Array(data);
      let bin = '';
      bytes.forEach((b) => { bin += String.fromCharCode(b); });
      return { path, url: 'data:' + file.type + ';base64,' + btoa(bin) };
    }
    const up = await sb.storage.from('listings').upload(path, file, { contentType: file.type, upsert: false });
    if (up.error) throw up.error;
    return { path };
  }

  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement)) return;
    const formId = form.getAttribute('id') || '';
    if (formId === 'login-form' || formId === 'profile-form' || formId === 'listing-form' || formId === 'story-form' || formId === 'chat-form' || formId === 'jual-filter' || form.classList.contains('report-form')) {
      event.preventDefault();
    } else return;
    if (formId === 'login-form') sendLink(form);
    if (formId === 'profile-form') saveProfile(form);
    if (formId === 'listing-form') saveListing(form);
    if (formId === 'story-form') saveStory(form);
    if (formId === 'chat-form') sendChat(form);
    if (form.classList.contains('report-form')) sendReport(form);
  });

  document.addEventListener('click', (event) => {
    const t = event.target;
    if (!(t instanceof Element)) return;
    if (t.id === 'google-btn') google();
    if (t.id === 'signout') signOut();
    if (t.id === 'delete-account') removeAccount();
    if (t.dataset && t.dataset.del) removeListing(t.dataset.del);
    if (t.dataset && t.dataset.edit) startEdit(t.dataset.edit);
    if (t.dataset && t.dataset.flag) setFlag(t.dataset.flag, t.dataset.on !== '1');
    if (t.dataset && t.dataset.story) reviewStory(t.dataset.story, t.dataset.status);
  });

  document.addEventListener('change', (event) => {
    const input = event.target;
    if (input && input.id === 'jual-cat') input.dispatchEvent(new Event('input', { bubbles: true }));
    if (input && input.name === 'photos' && input.type === 'file') {
      const box = document.getElementById('up-previews');
      if (!box) return;
      box.replaceChildren();
      [...input.files].slice(0, 3).forEach((file) => {
        const img = document.createElement('img');
        img.alt = '';
        img.src = URL.createObjectURL(file);
        box.appendChild(img);
      });
    }
  });
  document.addEventListener('input', (event) => {
    if (event.target && (event.target.id === 'jual-q' || event.target.id === 'jual-cat')) {
      const note = notice;
      notice = '';
      const jual = document.getElementById('jual-root');
      if (jual) {
        const q = document.getElementById('jual-q').value;
        const cat = document.getElementById('jual-cat').value;
        jual.innerHTML = renderJual();
        const qEl = document.getElementById('jual-q');
        const cEl = document.getElementById('jual-cat');
        if (qEl) qEl.value = q;
        if (cEl) cEl.value = cat;
      }
      notice = note;
    }
  });

  async function sendLink(form) {
    const email = new FormData(form).get('email');
    notice = '';
    try {
      if (mock) {
        const db = mockDb();
        db.pendingEmail = String(email || '');
        saveMock(db);
        notice = 'Tautan masuk dikirim ke email itu. Buka dari perangkat ini.';
      } else {
        const { error } = await sb.auth.signInWithOtp({
          email: String(email || ''),
          options: { emailRedirectTo: location.origin + location.pathname }
        });
        if (error) throw error;
        notice = 'Tautan masuk dikirim ke email itu. Buka dari perangkat ini.';
      }
    } catch (err) {
      notice = 'Tautan belum terkirim.';
    }
    paint();
  }

  async function google() {
    notice = '';
    try {
      if (mock) {
        notice = 'Google membuka jendela penyedia. Di mode uji, akun tidak dibuat.';
        paint();
        return;
      }
      const { error } = await sb.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: location.origin + location.pathname }
      });
      if (error) throw error;
    } catch (err) {
      notice = 'Google belum bisa dibuka.';
      paint();
    }
  }

  async function saveProfile(form) {
    const data = new FormData(form);
    const display_name = String(data.get('name') || '').trim();
    const phone = digits(data.get('phone'));
    if (phone && !/^[0-9]{10,15}$/.test(phone)) {
      notice = 'Nomor WhatsApp belum lengkap.';
      paint();
      return;
    }
    try {
      if (mock) {
        const db = mockDb();
        db.profile = Object.assign({}, db.profile, { display_name, phone });
        profile = db.profile;
        saveMock(db);
      } else {
        const { error } = await sb.from('profiles').update({ display_name, phone }).eq('id', user.id);
        if (error) throw error;
        profile = Object.assign({}, profile, { display_name, phone });
      }
      notice = 'Profil tersimpan.';
    } catch (err) {
      notice = 'Profil belum tersimpan.';
    }
    paint();
  }

  async function signOut() {
    if (mock) {
      const db = mockDb();
      db.user = null;
      db.profile = null;
      saveMock(db);
      user = null;
      profile = null;
    } else if (sb) await sb.auth.signOut();
    notice = '';
    await loadPublic();
    await loadMine();
    paint();
  }

  async function removeAccount() {
    if (!confirm('Hapus akun dan iklan yang terpasang?')) return;
    try {
      if (mock) {
        const db = mockDb();
        db.listings = (db.listings || []).filter((row) => row.owner_id !== user.id);
        db.stories = (db.stories || []).filter((row) => row.owner_id !== user.id);
        db.user = null;
        db.profile = null;
        saveMock(db);
        user = null;
        profile = null;
        notice = 'Akun uji dihapus di perangkat ini.';
      } else {
        const own = await sb.from('listings').select('id').eq('owner_id', user.id);
        await removePhotoFiles((own.data || []).map((row) => row.id)).catch(() => {});
        const { error } = await sb.functions.invoke('delete-account', { body: {} });
        if (error) throw error;
        user = null;
        profile = null;
        notice = 'Akun dihapus.';
      }
    } catch (err) {
      notice = '';
      location.href = WA + '%2C%20saya%20minta%20akun%20dihapus';
      return;
    }
    await loadPublic();
    paint();
  }

  async function saveListing(form) {
    const data = new FormData(form);
    const id = String(data.get('id') || '') || crypto.randomUUID();
    const title = String(data.get('title') || '').trim();
    const price = Number(digits(data.get('price')));
    const category = String(data.get('category') || '');
    const description = String(data.get('description') || '').trim();
    const wa = digits(data.get('wa'));
    if (title.length < 3 || description.length < 10 || !waHref(wa) || !CATS.some((row) => row[0] === category) || !Number.isFinite(price)) {
      notice = 'Lengkapi judul, harga, kategori, deskripsi, dan WhatsApp.';
      paint();
      return;
    }
    const files = [...(form.photos ? form.photos.files : [])].slice(0, 3);
    try {
      const photos = [];
      for (const file of files) photos.push(await filePayload(file, user.id, id));
      if (mock) {
        const db = mockDb();
        const row = { id, owner_id: user.id, title, price, category, description, wa, hidden: false, flagged: false, photos: photos.map((photo) => photo.url) };
        db.listings = [row].concat((db.listings || []).filter((item) => item.id !== id));
        saveMock(db);
      } else {
        const existing = String(data.get('id') || '');
        const payload = { title, price, category, description, wa, hidden: false };
        if (existing) {
          const upd = await sb.from('listings').update(payload).eq('id', existing).eq('owner_id', user.id);
          if (upd.error) throw upd.error;
        } else {
          const ins = await sb.from('listings').insert(Object.assign({ id, owner_id: user.id }, payload));
          if (ins.error) throw ins.error;
        }
        if (photos.length) {
          const rows = photos.map((photo) => ({ listing_id: id, path: photo.path }));
          const pic = await sb.from('listing_photos').insert(rows);
          if (pic.error) throw pic.error;
        }
      }
      notice = 'Iklan tersimpan.';
    } catch (err) {
      notice = err && err.code === '23514' && !BASIC.includes(category) ? 'Kategori ini sedang disiapkan. Untuk sementara pilih Elektronik & HP, Kendaraan, Jasa lokal, atau Lain-lain.' : (err && err.message ? err.message : 'Iklan belum tersimpan.');
    }
    await loadPublic();
    await loadMine();
    paint();
  }

  function startEdit(id) {
    const row = mine.find((item) => item.id === id);
    const form = document.getElementById('listing-form');
    if (!row || !form) return;
    form.elements.id.value = row.id;
    form.elements.title.value = row.title;
    form.elements.price.value = row.price;
    form.elements.category.value = row.category;
    form.elements.description.value = row.description;
    form.elements.wa.value = row.wa;
    form.querySelector('h3').textContent = 'Ubah iklan';
  }

  async function removeListing(id) {
    if (!confirm('Hapus iklan ini?')) return;
    try {
      if (mock) {
        const db = mockDb();
        db.listings = (db.listings || []).filter((row) => row.id !== id);
        saveMock(db);
      } else {
        await removePhotoFiles([id]).catch(() => {});
        const { error } = await sb.from('listings').delete().eq('id', id);
        if (error) throw error;
      }
      notice = 'Iklan dan fotonya dihapus.';
    } catch (err) {
      notice = 'Iklan belum terhapus.';
    }
    await loadPublic();
    await loadMine();
    paint();
  }

  async function setFlag(id, flagged) {
    try {
      if (mock) {
        const db = mockDb();
        db.listings = (db.listings || []).map((row) => row.id === id ? Object.assign({}, row, { flagged }) : row);
        saveMock(db);
      } else {
        const { error } = await sb.from('listings').update({ flagged }).eq('id', id);
        if (error) throw error;
      }
      notice = flagged ? 'Iklan disembunyikan dari pengunjung.' : 'Iklan ditayangkan lagi.';
    } catch (err) {
      notice = 'Status moderasi belum berubah.';
    }
    await loadPublic();
    await loadMine();
    paint();
  }

  async function sendReport(form) {
    const reason = String(new FormData(form).get('reason') || '').trim();
    const listing_id = form.getAttribute('data-report');
    if (reason.length < 5) return;
    try {
      if (mock) {
        const db = mockDb();
        db.reports = (db.reports || []).concat([{ listing_id, reporter_id: user.id, reason }]);
        saveMock(db);
      } else {
        const { error } = await sb.from('listing_reports').insert({ listing_id, reporter_id: user.id, reason });
        if (error) throw error;
      }
      notice = 'Laporan terkirim ke admin.';
    } catch (err) {
      notice = 'Laporan belum terkirim.';
    }
    paint();
  }

  async function saveStory(form) {
    const data = new FormData(form);
    const title = String(data.get('title') || '').trim();
    const body = String(data.get('body') || '').trim();
    const category = String(data.get('category') || '');
    if (title.length < 8 || body.length < 40) {
      notice = 'Judul dan isi masih terlalu pendek.';
      paint();
      return;
    }
    try {
      if (mock) {
        const db = mockDb();
        db.stories = [{ id: crypto.randomUUID(), owner_id: user.id, title, body, category, status: 'pending' }].concat(db.stories || []);
        saveMock(db);
      } else {
        const { error } = await sb.from('stories').insert({ owner_id: user.id, title, body, category, status: 'pending' });
        if (error) throw error;
      }
      notice = 'Draf menunggu tinjauan. Belum tayang.';
    } catch (err) {
      notice = 'Draf belum terkirim.';
    }
    await loadMine();
    paint();
  }

  async function reviewStory(id, status) {
    try {
      if (mock) {
        const db = mockDb();
        db.stories = (db.stories || []).map((row) => row.id === id ? Object.assign({}, row, { status }) : row);
        saveMock(db);
      } else {
        const { error } = await sb.from('stories').update({ status }).eq('id', id);
        if (error) throw error;
      }
      notice = status === 'approved' ? 'Kabar disetujui.' : 'Kabar ditolak.';
    } catch (err) {
      notice = 'Status kabar belum berubah.';
    }
    await loadMine();
    paint();
  }

  async function sendChat(form) {
    const input = form.elements.message;
    const message = String(input.value || '').trim();
    if (message.length < 2) return;
    const log = document.getElementById('chat-log');
    const note = document.getElementById('chat-note');
    log.insertAdjacentHTML('beforeend', '<p class="me">' + esc(message) + '</p>');
    input.value = '';
    try {
      let text = '';
      if (mock) {
        const db = mockDb();
        db.aiCount = (db.aiCount || 0) + 1;
        saveMock(db);
        if (db.aiCount > 12) throw new Error('limit');
        text = mock.reply || 'Jawaban uji. Bukan model sungguhan, dan bukan data live.';
      } else {
        const { data, error } = await sb.functions.invoke(aiName, { body: { message } });
        if (error) throw error;
        text = data && data.text;
        if (!text) throw new Error(data && data.error || 'empty');
      }
      log.insertAdjacentHTML('beforeend', '<p class="bot">' + esc(text) + '</p>');
      if (note) note.textContent = '';
    } catch (err) {
      const limited = String(err && err.message || '').includes('limit') || (err && err.context && err.context.status === 429);
      if (note) note.textContent = limited ? 'Cukup dulu. Coba lagi sekitar satu jam.' : 'Asisten belum menjawab.';
      log.insertAdjacentHTML('beforeend', '<p class="bot"><a href="' + WA + '">Tanya lewat WhatsApp</a></p>');
    }
  }

  function armCctv() {
    if ((location.hash || '') !== '#cctv') return;
    document.querySelectorAll('#cctv iframe[data-src]').forEach((frame) => {
      if (frame.getAttribute('src') !== frame.dataset.src) frame.src = frame.dataset.src;
    });
  }
  addEventListener('hashchange', armCctv);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', () => { boot(); armCctv(); });
  else { boot(); armCctv(); }
})();
