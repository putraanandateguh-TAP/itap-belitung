// Akun iTAP: satu sistem akun (Supabase Auth). Peran di tabel profiles menentukan akses:
// role = 'admin' -> Admin/Owner (akses semua produk selamanya + moderasi); selain itu -> Pengunjung.
// Tidak ada kode bersama. Kunci di config.js adalah kunci publik; data dijaga RLS (supabase/*.sql).
(function () {
  'use strict';
  const cfg = window.ITAP_CONFIG || {};
  const KAT = window.ITAP_KATALOG || { wa: '6287749476651', items: [] };
  const ITEMS = KAT.items;
  const app = document.getElementById('app');
  const params = new URLSearchParams(location.search);
  const S = {
    sb: null, user: null, profile: null, admin: false, google: false,
    mode: params.get('peran') === 'admin' ? 'admin' : 'pengunjung', authTab: 'masuk', tab: '', recovery: false,
    ready: { orders: true, ent: true, reviews: true, fav: true },
    orders: [], ents: [], reviews: [], favs: [], listings: [], stories: [], emails: {},
    a: { orders: [], ents: [], reviews: [], stories: [], listings: [], reports: [], files: {} },
    note: '', noteKind: ''
  };

  // ---------- util ----------
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const money = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const wa62 = (d) => { d = digits(d); return d.startsWith('0') ? '62' + d.slice(1) : d; };
  const waLink = (num, text) => 'https://wa.me/' + wa62(num) + '?text=' + encodeURIComponent(text);
  const item = (id) => ITEMS.find((x) => x.id === id) || { id, name: id, cat: '', label: '', kind: '' };
  const dt = (s) => { try { return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(s)) + ' WIB'; } catch (e) { return ''; } };
  const dOnly = (s) => { try { return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s)); } catch (e) { return ''; } };
  const short = (id) => String(id || '').slice(0, 8).toUpperCase();
  const stars = (n) => '★★★★★'.slice(0, n) + '☆☆☆☆☆'.slice(0, 5 - n);
  const EMO = { pdf: '📘', kelas: '🎓', app: '🧩', undangan: '💌', ppob: '📱', jasa: '🛠️', kedai: '🥣' };
  const thumb = (it) => '<div class="th">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" loading="lazy">' : (EMO[it.kind] || '⭐')) + '</div>';
  const missing = (err) => !!err && (err.code === 'PGRST205' || err.code === '42P01' || err.status === 404 || /does not exist|schema cache/i.test(String(err.message || '')));
  const ORDER_ST = { baru: ['Baru', 'warn'], dibayar: ['Dibayar', 'ok'], diproses: ['Diproses', ''], selesai: ['Selesai', 'ok'], batal: ['Batal', 'mu'] };
  const REV_ST = { pending: ['Menunggu tinjauan', 'warn'], approved: ['Tayang', 'ok'], hidden: ['Disembunyikan', 'mu'] };
  const STORY_ST = { pending: ['Menunggu', 'warn'], approved: ['Disetujui', 'ok'], rejected: ['Ditolak', 'bad'] };
  const badge = (pair) => '<span class="badge ' + pair[1] + '">' + esc(pair[0]) + '</span>';
  const SOON = (what) => '<p class="note warn">Fitur ' + esc(what) + ' sedang disiapkan. Belum ada data yang dikirim atau disimpan.</p>';
  const redirectUrl = () => new URL('./', location.href).href + (S.mode === 'admin' ? '?peran=admin' : '');

  function setNote(text, kind) { S.note = text || ''; S.noteKind = kind || ''; const n = document.getElementById('note'); if (n) { n.textContent = S.note; n.className = 'note ' + S.noteKind; } }
  const noteHtml = () => '<p id="note" class="note ' + S.noteKind + '" role="status">' + esc(S.note) + '</p>';

  (function today() { const el = document.getElementById('today'); if (el) el.textContent = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()); })();

  // ---------- data ----------
  async function q(promise, flag) {
    const res = await promise;
    if (res.error) {
      if (missing(res.error)) { if (flag) S.ready[flag] = false; return []; }
      throw res.error;
    }
    return res.data || [];
  }

  async function loadUser() {
    S.orders = []; S.ents = []; S.reviews = []; S.favs = []; S.listings = []; S.stories = [];
    if (!S.user) return;
    const uid = S.user.id;
    const jobs = [
      q(S.sb.from('shop_orders').select('*').eq('user_id', uid).order('created_at', { ascending: false }), 'orders').then((d) => { S.orders = d; }),
      q(S.sb.from('entitlements').select('*').eq('user_id', uid), 'ent').then((d) => { S.ents = d; }),
      q(S.sb.from('reviews').select('*').eq('user_id', uid).order('created_at', { ascending: false }), 'reviews').then((d) => { S.reviews = d; }),
      q(S.sb.from('favorites').select('*').eq('user_id', uid).order('created_at', { ascending: false }), 'fav').then((d) => { S.favs = d; }),
      q(S.sb.from('listings').select('id,title,price,hidden,flagged').eq('owner_id', uid)).then((d) => { S.listings = d; }).catch(() => {}),
      q(S.sb.from('stories').select('id,title,status,created_at').eq('owner_id', uid).order('created_at', { ascending: false })).then((d) => { S.stories = d; }).catch(() => {})
    ];
    await Promise.all(jobs.map((j) => j.catch(() => {})));
  }

  async function loadAdmin() {
    if (!S.admin) return;
    const A = S.a;
    await Promise.all([
      q(S.sb.from('shop_orders').select('*').order('created_at', { ascending: false }).limit(200), 'orders').then((d) => { A.orders = d; }),
      q(S.sb.from('entitlements').select('*').order('created_at', { ascending: false }).limit(300), 'ent').then((d) => { A.ents = d; }),
      q(S.sb.from('reviews').select('*').order('created_at', { ascending: false }).limit(200), 'reviews').then((d) => { A.reviews = d; }),
      q(S.sb.from('stories').select('id,owner_id,title,body,category,status,created_at').order('created_at', { ascending: false }).limit(100)).then((d) => { A.stories = d; }),
      q(S.sb.from('listings').select('id,owner_id,title,price,category,wa,hidden,flagged,created_at').order('created_at', { ascending: false }).limit(100)).then((d) => { A.listings = d; }),
      q(S.sb.from('listing_reports').select('id,listing_id,reason,created_at').order('created_at', { ascending: false }).limit(100)).then((d) => { A.reports = d; })
    ].map((j) => j.catch(() => {})));
    const ids = [...new Set(A.orders.map((o) => o.user_id).concat(A.ents.map((e) => e.user_id)))];
    if (ids.length) {
      const r = await S.sb.rpc('admin_user_emails', { p_ids: ids });
      if (!r.error) (r.data || []).forEach((row) => { S.emails[row.id] = row.email; });
    }
  }

  // ---------- render: belum masuk ----------
  function renderAuth() {
    document.getElementById('hero-t').innerHTML = S.mode === 'admin' ? 'Masuk Admin / Owner.<br>Kelola semua iTAP.' : 'Satu akun.<br>Semua layanan iTAP.';
    if (S.recovery) {
      app.innerHTML = '<div class="card"><h2>Buat kata sandi baru</h2><p class="mu sm">Tautan pemulihan diterima. Tulis kata sandi baru, minimal 8 karakter.</p><form id="f-newpass" class="form"><label>Kata sandi baru<input type="password" name="password" minlength="8" required autocomplete="new-password"></label><button class="btn block" type="submit">Simpan kata sandi</button></form>' + noteHtml() + '</div>';
      return;
    }
    const admin = S.mode === 'admin';
    const tabs = admin ? '' : '<div class="seg" role="tablist" aria-label="Masuk atau daftar"><button type="button" role="tab" data-authtab="masuk" aria-selected="' + (S.authTab === 'masuk') + '">Masuk</button><button type="button" role="tab" data-authtab="daftar" aria-selected="' + (S.authTab === 'daftar') + '">Daftar</button></div>';
    const google = S.google ? '<button type="button" class="btn line block" id="b-google"><svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true"><path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/><path fill="#FF3D00" d="m6.3 14.7 6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/><path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/><path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z"/></svg> Lanjutkan dengan Google</button><p class="mu sm" style="text-align:center;margin:8px 0">atau pakai email</p>' : '';
    let form;
    if (!admin && S.authTab === 'daftar') {
      form = '<h2>Buat akun pengunjung</h2><p class="mu sm">Gratis. Untuk pesan produk iTAP, pasang iklan jual beli, menulis ulasan, dan kirim kabar.</p>' + google +
        '<form id="f-daftar" class="form"><label>Nama<input name="name" maxlength="60" required autocomplete="name"></label><label>Email<input type="email" name="email" required autocomplete="email"></label><label>Kata sandi (min. 8 karakter)<input type="password" name="password" minlength="8" required autocomplete="new-password"></label><button class="btn block" type="submit">Daftar</button></form><p class="mu sm" style="margin-top:8px">Kami kirim email konfirmasi. Buka tautannya sekali, lalu kamu bisa masuk.</p>';
    } else {
      form = '<h2>' + (admin ? 'Masuk Admin / Owner' : 'Selamat datang kembali') + '</h2><p class="mu sm">' + (admin ? 'Khusus akun pemilik iTAP. Akses ditentukan peran admin di database, bukan kode yang bisa dibagikan.' : 'Masuk ke akun pengunjung iTAP.') + '</p>' + google +
        '<form id="f-masuk" class="form"><label>Email<input type="email" name="email" required autocomplete="email"></label><label>Kata sandi<input type="password" name="password" autocomplete="current-password" placeholder="Kosongkan bila pakai tautan email"></label><button class="btn block" type="submit">Masuk</button><button class="btn ghost block" type="button" id="b-magic">Kirim tautan masuk ke email</button></form><p class="sm" style="margin-top:8px;text-align:center"><button type="button" class="btn line sm" id="b-lupa">Lupa kata sandi?</button></p>';
    }
    const perks = admin
      ? '<ul class="perks"><li><b class="i">∞</b><span>Semua produk iTAP terbuka selamanya: ebook, prompt, modul, Generator, Kasir, Undangan.</span></li><li><b class="i">✓</b><span>Setujui kabar warga, rapikan iklan jual beli, tinjau ulasan.</span></li><li><b class="i">🧾</b><span>Lihat pesanan, beri akses produk ke pembeli setelah bayar dicek.</span></li></ul>'
      : '<ul class="perks"><li><b class="i">🛒</b><span>Pesan produk iTAP, lacak status, unduh produk yang sudah dibayar.</span></li><li><b class="i">🏷</b><span>Pasang iklan jual beli dengan foto dan nomor WhatsApp.</span></li><li><b class="i">★</b><span>Tulis ulasan produk iTAP dan Kedai Bakso Aci.</span></li><li><b class="i">✎</b><span>Kirim kabar. Tayang setelah disetujui admin.</span></li></ul>';
    app.innerHTML = '<div class="seg" role="tablist" aria-label="Jenis akun"><button type="button" role="tab" data-mode="pengunjung" aria-selected="' + !admin + '">Masuk Pengunjung</button><button type="button" role="tab" data-mode="admin" aria-selected="' + admin + '">Masuk Admin / Owner</button></div>' +
      '<div class="card">' + tabs + form + noteHtml() + '</div><div class="card"><h3>' + (admin ? 'Yang bisa dilakukan owner' : 'Yang bisa kamu lakukan') + '</h3>' + perks + '</div>' +
      '<p class="mu sm">Dengan masuk, kamu setuju dengan <a href="../privasi.html" style="text-decoration:underline">privasi dan ketentuan</a> iTAP.</p>';
  }

  // ---------- render: sudah masuk ----------
  function tabsFor() {
    return S.admin
      ? [['produk', 'Produk'], ['pesanan', 'Pesanan'], ['moderasi', 'Moderasi'], ['akses', 'Akses'], ['profil', 'Profil']]
      : [['beranda', 'Beranda'], ['belanja', 'Belanja'], ['pesanan', 'Pesanan'], ['ulasan', 'Ulasan'], ['favorit', 'Favorit'], ['profil', 'Profil']];
  }
  function dots(id) {
    if (!S.admin) return 0;
    if (id === 'pesanan') return S.a.orders.filter((o) => o.status === 'baru').length;
    if (id === 'moderasi') return S.a.stories.filter((s) => s.status === 'pending').length + S.a.reviews.filter((r) => r.status === 'pending').length + S.a.reports.length;
    return 0;
  }

  function renderIn() {
    const name = (S.profile && S.profile.display_name) || (S.user.email || '').split('@')[0];
    document.getElementById('hero-t').innerHTML = (S.admin ? 'Halo, Owner.<br>' : 'Halo, ' + esc(name) + '.<br>') + (S.admin ? 'Semua iTAP di tanganmu.' : 'Mau apa hari ini?');
    const tabs = tabsFor();
    if (!tabs.some((t) => t[0] === S.tab)) S.tab = tabs[0][0];
    const role = S.admin ? '<span class="badge owner">Admin / Owner</span>' : '<span class="badge">Pengunjung</span>';
    const warn = (!S.admin && S.mode === 'admin') ? '<p class="note warn" style="margin-top:10px">Akun ini belum berperan admin, jadi yang tampil area pengunjung. Peran admin hanya bisa diubah pemilik database.</p>' : '';
    const head = '<div class="card"><div class="who"><div class="av">' + esc(name.charAt(0).toUpperCase() || '☺') + '</div><div><b>' + esc(name) + '</b> ' + role + '<div class="mu sm">' + esc(S.user.email || '') + '</div></div></div>' + warn + '</div>';
    const nav = '<div class="dtabs" role="tablist">' + tabs.map((t) => { const n = dots(t[0]); return '<button type="button" role="tab" data-tab="' + t[0] + '" aria-selected="' + (S.tab === t[0]) + '">' + t[1] + (n ? '<span class="dot">' + n + '</span>' : '') + '</button>'; }).join('') + '</div>';
    const body = ({ beranda: vBeranda, belanja: vBelanja, pesanan: S.admin ? aPesanan : vPesanan, ulasan: vUlasan, favorit: vFavorit, profil: vProfil, produk: aProduk, moderasi: aModerasi, akses: aAkses })[S.tab]();
    app.innerHTML = head + nav + noteHtml() + '<div id="tabbody">' + body + '</div>';
  }

  function vBeranda() {
    const aktif = S.orders.filter((o) => o.status !== 'selesai' && o.status !== 'batal').length;
    const tiles = [['belanja', '🛒', 'Belanja'], ['pesanan', '🧾', 'Pesanan'], ['../#jualbeli', '🏷', 'Jual Beli'], ['../#kabar', '✎', 'Kirim kabar'], ['../undangan/akun/', '💌', 'Undangan saya'], ['ulasan', '★', 'Ulasan'], ['favorit', '♡', 'Favorit'], ['../#ppob', '📱', 'Pulsa & PLN'], ['../#chat', '💬', 'Asisten'], ['../#kedai', '🥣', 'Kedai'], ['../#loker', '💼', 'Lowongan'], ['profil', '☺', 'Profil']];
    return '<div class="stat"><div><b>' + aktif + '</b><span>Pesanan aktif</span></div><div><b>' + S.ents.length + '</b><span>Produk saya</span></div><div><b>' + S.listings.length + '</b><span>Iklan saya</span></div><div><b>' + S.stories.length + '</b><span>Kabar terkirim</span></div></div>' +
      '<div class="sec-h"><h2>Layanan</h2></div><nav class="tiles" aria-label="Layanan akun">' + tiles.map((t) => t[0].includes('/') || t[0].includes('#') ? '<a href="' + t[0] + '"><b>' + t[1] + '</b>' + t[2] + '</a>' : '<button type="button" data-tab="' + t[0] + '"><b>' + t[1] + '</b>' + t[2] + '</button>').join('') + '</nav>' +
      (S.stories.length ? '<div class="sec-h"><h2>Kabar saya</h2><a class="btn line sm" href="../#kabar">Tulis kabar</a></div><div class="list">' + S.stories.slice(0, 5).map((s) => '<div class="item"><h3>' + esc(s.title) + '</h3><p class="sm">' + badge(STORY_ST[s.status] || STORY_ST.pending) + ' <span class="mu">' + dOnly(s.created_at) + '</span></p></div>').join('') + '</div>' : '');
  }

  function favOn(id) { return S.favs.some((f) => f.kind === 'produk' && f.item_id === id); }
  function prodCard(it, acts) {
    return '<div class="card prod">' + thumb(it) + '<div class="bd"><span class="badge mu">' + esc(it.cat) + '</span><h3>' + esc(it.name) + '</h3><p class="pr">' + esc(it.label) + '</p><p class="mu sm">' + esc(it.blurb || '') + '</p><div class="row acts">' + acts + '</div></div></div>';
  }
  function vBelanja() {
    const list = ITEMS.filter((it) => it.kind !== 'kedai').map((it) => {
      let a = '';
      if (it.noOrder) a += '<a class="btn sm" href="' + esc(it.page) + '">Buka</a>';
      else a += '<button type="button" class="btn sm" data-order="' + it.id + '">Pesan</button>';
      if (it.page && !it.noOrder) a += '<a class="btn line sm" href="' + esc(it.page) + '">Detail</a>';
      if (it.buy) a += '<a class="btn line sm" href="' + esc(it.buy) + '" target="_blank" rel="noopener">Bayar di Lynk</a>';
      a += '<button type="button" class="btn ghost sm" data-fav="' + it.id + '" aria-pressed="' + favOn(it.id) + '">' + (favOn(it.id) ? '♥ Disimpan' : '♡ Simpan') + '</button>';
      return prodCard(it, a);
    }).join('');
    return '<p class="note">Pesanan dicatat di akunmu, lalu WhatsApp iTAP (0877-4947-6651) terbuka untuk konfirmasi dan cara bayar (QRIS/transfer). iTAP tidak memproses pembayaran otomatis di situs.</p>' + (S.ready.orders ? '' : SOON('riwayat pesanan')) + '<div class="grid">' + list + '</div>';
  }

  function openTarget(it) {
    if (it.id === 'generator') return '<button type="button" class="btn sm" data-open="generator">Buka Generator</button><button type="button" class="btn line sm" data-open="generator" data-two="1">Buka Studio</button>';
    if (it.id === 'kasir') return '<button type="button" class="btn sm" data-open="kasir">Buka Kasir FULL</button>';
    if (it.kind === 'pdf') return '<button type="button" class="btn sm" data-files="' + it.id + '">Lihat berkas</button>';
    if (it.open) return '<a class="btn sm" href="' + esc(it.open) + '">Buka</a>';
    if (it.page) return '<a class="btn sm" href="' + esc(it.page) + '">Buka</a>';
    return '';
  }
  function filesBox(id) { const f = S.a.files[id]; if (!f) return '<div class="files" id="files-' + id + '"></div>'; return '<div class="files" id="files-' + id + '">' + f + '</div>'; }

  function vPesanan() {
    const now = Date.now();
    const mine = S.ents.map((e) => {
      const it = item(e.product_id); const live = !e.expires_at || new Date(e.expires_at).getTime() > now;
      return prodCard(it, (live ? openTarget(it) : '<span class="badge bad">Masa aktif habis</span>') + '<span class="mu sm">' + (e.expires_at ? 'Aktif sampai ' + dOnly(e.expires_at) : 'Akses selamanya') + '</span>' + filesBox(it.id));
    }).join('');
    const orders = S.orders.map((o) => {
      const st = ORDER_ST[o.status] || ORDER_ST.baru;
      const msg = 'Halo iTAP, saya mau konfirmasi pesanan ' + short(o.id) + ' (' + o.product_name + ', ' + money(o.price * o.qty) + ').';
      return '<div class="item"><div class="row" style="justify-content:space-between"><b>' + esc(o.product_name) + '</b>' + badge(st) + '</div><p class="mu sm">No. ' + short(o.id) + ' · ' + dt(o.created_at) + ' · ' + (o.price ? money(o.price * o.qty) : 'harga dikonfirmasi admin') + '</p>' + (o.note ? '<p class="sm">Catatan: ' + esc(o.note) + '</p>' : '') + (o.admin_note ? '<p class="sm"><b>Dari admin:</b> ' + esc(o.admin_note) + '</p>' : '') +
        '<div class="row" style="margin-top:6px"><a class="btn wa sm" target="_blank" rel="noopener" href="' + waLink(KAT.wa, msg) + '">Chat WhatsApp</a>' + (o.status === 'baru' ? '<button type="button" class="btn bad sm" data-cancel="' + o.id + '">Batalkan</button>' : '') + '</div></div>';
    }).join('');
    return '<div class="sec-h"><h2>Produk saya</h2></div>' + (!S.ready.ent ? SOON('produk saya') : (mine ? '<div class="grid">' + mine + '</div>' : '<p class="card mu">Belum ada produk aktif. Setelah pembayaran dicek, admin membuka akses produk di sini.</p>')) +
      '<div class="sec-h"><h2>Riwayat pesanan</h2><button type="button" class="btn line sm" data-tab="belanja">Pesan lagi</button></div>' + (!S.ready.orders ? SOON('riwayat pesanan') : (orders ? '<div class="list">' + orders + '</div>' : '<p class="card mu">Belum ada pesanan.</p>')) +
      '<p class="mu sm" style="margin-top:10px">Pesanan undangan digital ada di <a href="../undangan/akun/" style="text-decoration:underline">dasbor undangan</a>. Pulsa & token lewat <a href="../#ppob" style="text-decoration:underline">formulir PPOB</a>.</p>';
  }

  function vUlasan() {
    if (!S.ready.reviews) return SOON('ulasan');
    const opts = ITEMS.filter((it) => it.kind !== 'ppob').map((it) => '<option value="' + it.id + '">' + esc(it.name) + '</option>').join('');
    const mine = S.reviews.map((r) => '<div class="item"><div class="row" style="justify-content:space-between"><b>' + esc(item(r.product_id).name) + '</b>' + badge(REV_ST[r.status] || REV_ST.pending) + '</div><p class="stars" aria-label="' + r.rating + ' dari 5">' + stars(r.rating) + '</p><p class="sm">' + esc(r.body) + '</p><div class="row" style="margin-top:6px"><button type="button" class="btn line sm" data-editrev="' + r.id + '">Ubah</button><button type="button" class="btn bad sm" data-delrev="' + r.id + '">Hapus</button></div></div>').join('');
    return '<div class="card"><h2>Tulis ulasan</h2><p class="mu sm">Satu ulasan per produk. Ulasan tampil di situs setelah ditinjau admin. Ulasan yang diubah ditinjau ulang.</p><form id="f-review" class="form"><label>Produk<select name="product">' + opts + '</select></label><div><span class="sm" style="font-weight:600">Nilai</span><div class="rate" id="rate" role="radiogroup" aria-label="Nilai bintang">' + [1, 2, 3, 4, 5].map((n) => '<button type="button" role="radio" aria-checked="false" data-rate="' + n + '" aria-label="' + n + ' bintang">★</button>').join('') + '</div><input type="hidden" name="rating" value="0"></div><label>Ulasan<textarea name="body" minlength="10" maxlength="1000" required placeholder="Ceritakan pengalamanmu"></textarea></label><button class="btn block" type="submit">Kirim ulasan</button></form></div>' +
      '<div class="sec-h"><h2>Ulasan saya</h2></div>' + (mine ? '<div class="list">' + mine + '</div>' : '<p class="card mu">Belum ada ulasan.</p>');
  }

  function vFavorit() {
    if (!S.ready.fav) return SOON('favorit');
    const list = S.favs.map((f) => { const it = f.kind === 'produk' ? item(f.item_id) : { name: f.label || f.item_id, cat: f.kind, label: '', kind: '' }; return prodCard(it, (it.page ? '<a class="btn sm" href="' + esc(it.page) + '">Buka</a>' : '') + '<button type="button" class="btn line sm" data-unfav="' + esc(f.kind) + '|' + esc(f.item_id) + '">Hapus</button>'); }).join('');
    return (list ? '<div class="grid">' + list + '</div>' : '<p class="card mu">Belum ada favorit. Tekan ♡ Simpan di tab Belanja.</p>') + '<p class="mu sm" style="margin-top:8px">Tempat wisata yang kamu simpan dengan 📑 tetap ada di <a href="../#tersimpan" style="text-decoration:underline">Tersimpan</a> (di perangkat ini).</p>';
  }

  function vProfil() {
    const p = S.profile || {};
    return '<div class="card"><h2>Profil</h2><form id="f-profil" class="form"><label>Nama<input name="name" maxlength="60" required value="' + esc(p.display_name) + '"></label><label>WhatsApp<input name="phone" inputmode="numeric" placeholder="08…" value="' + esc(p.phone) + '"></label><button class="btn" type="submit">Simpan profil</button></form></div>' +
      '<div class="card"><h2>Kata sandi</h2><p class="mu sm">Atur kata sandi supaya bisa masuk tanpa menunggu email.</p><form id="f-pass" class="form"><label>Kata sandi baru<input type="password" name="password" minlength="8" required autocomplete="new-password"></label><button class="btn line" type="submit">Simpan kata sandi</button></form></div>' +
      '<div class="card"><div class="row"><button type="button" class="btn navy" id="b-out">Keluar</button><button type="button" class="btn bad" id="b-del">Hapus akun</button></div><p class="mu sm" style="margin-top:8px"><a href="../privasi.html" style="text-decoration:underline">Privasi dan ketentuan</a></p></div>';
  }

  // ---------- admin ----------
  function aProduk() {
    const cards = ITEMS.map((it) => {
      let a = openTarget(it);
      if (it.admin) a += '<a class="btn navy sm" href="' + esc(it.admin) + '">Admin ' + esc(it.cat) + '</a>';
      if (it.page && it.kind !== 'ppob' && it.kind !== 'kedai') a += '<a class="btn line sm" href="' + esc(it.page) + '">Halaman jual</a>';
      if (it.kind === 'pdf') a += '<label class="btn ghost sm">Unggah berkas<input type="file" hidden data-up="' + it.id + '" accept=".pdf,.zip,.epub,.png,.jpg,.mp4"></label>';
      return prodCard(it, '<span class="badge owner">Owner · selamanya</span>' + a + filesBox(it.id));
    }).join('');
    return '<p class="note ok">Akses owner aktif: semua produk iTAP terbuka tanpa bayar dan tanpa kedaluwarsa. Dicek dari peran admin akun ini di database, bukan kode yang bisa dibagikan.</p>' +
      '<div class="sec-h"><h2>Semua yang dijual di iTAP</h2></div><div class="grid">' + cards + '</div>' +
      '<p class="mu sm" style="margin-top:10px">Berkas PDF disimpan privat di Supabase Storage (bucket <code>produk</code>). Pembeli hanya bisa mengunduh setelah kamu beri akses di tab Pesanan atau Akses.' + (S.ready.ent ? '' : ' <b>Bucket dan tabel akses belum dipasang (supabase/itap-akun.sql).</b>') + '</p>';
  }

  function aPesanan() {
    if (!S.ready.orders) return SOON('pesanan produk') + '<p><a class="btn navy" href="../undangan/admin/">Buka pesanan undangan</a></p>';
    const A = S.a;
    const count = (st) => A.orders.filter((o) => o.status === st).length;
    const omzet = A.orders.filter((o) => o.status === 'dibayar' || o.status === 'diproses' || o.status === 'selesai').reduce((s, o) => s + o.price * o.qty, 0);
    const list = A.orders.map((o) => {
      const it = item(o.product_id); const email = S.emails[o.user_id] || '';
      const has = A.ents.some((e) => e.user_id === o.user_id && e.product_id === o.product_id);
      const grant = (it.kind === 'pdf' || it.kind === 'app') ? (has ? '<span class="badge ok">Akses diberikan</span>' : '<button type="button" class="btn sm" data-grant="' + o.id + '">Beri akses</button>') : '';
      const waBuyer = o.wa ? '<a class="btn wa sm" target="_blank" rel="noopener" href="' + waLink(o.wa, 'Halo, ini iTAP soal pesanan ' + short(o.id) + ' (' + o.product_name + ').') + '">WA pembeli</a>' : '';
      return '<div class="item"><div class="row" style="justify-content:space-between"><b>' + esc(o.product_name) + '</b>' + badge(ORDER_ST[o.status] || ORDER_ST.baru) + '</div><p class="mu sm">No. ' + short(o.id) + ' · ' + dt(o.created_at) + ' · ' + (o.price ? money(o.price * o.qty) : '-') + '</p><p class="sm">' + esc(email) + (o.wa ? ' · ' + esc(o.wa) : '') + '</p>' + (o.note ? '<p class="sm">Catatan: ' + esc(o.note) + '</p>' : '') +
        '<div class="row" style="margin-top:6px"><select data-ost="' + o.id + '" aria-label="Status pesanan">' + Object.keys(ORDER_ST).map((k) => '<option value="' + k + '"' + (k === o.status ? ' selected' : '') + '>' + ORDER_ST[k][0] + '</option>').join('') + '</select>' + grant + waBuyer + '<button type="button" class="btn bad sm" data-odel="' + o.id + '">Hapus</button></div></div>';
    }).join('');
    return '<div class="stat"><div><b>' + count('baru') + '</b><span>Baru</span></div><div><b>' + count('dibayar') + '</b><span>Dibayar</span></div><div><b>' + count('selesai') + '</b><span>Selesai</span></div><div><b>' + money(omzet) + '</b><span>Total dibayar (tercatat)</span></div></div>' +
      '<div class="sec-h"><h2>Pesanan produk</h2><a class="btn navy sm" href="../undangan/admin/">Pesanan undangan</a></div>' + (list ? '<div class="list">' + list + '</div>' : '<p class="card mu">Belum ada pesanan produk dari akun pengunjung.</p>');
  }

  function aModerasi() {
    const A = S.a;
    const pend = A.stories.filter((s) => s.status === 'pending');
    const stories = pend.map((s) => '<div class="item"><h3>' + esc(s.title) + '</h3><p class="mu sm">' + esc(s.category) + ' · ' + dt(s.created_at) + '</p><p class="sm">' + esc(s.body) + '</p><div class="row" style="margin-top:6px"><button type="button" class="btn sm" data-story="' + s.id + '" data-st="approved">Setujui</button><button type="button" class="btn bad sm" data-story="' + s.id + '" data-st="rejected">Tolak</button></div></div>').join('');
    const reps = {}; A.reports.forEach((r) => { (reps[r.listing_id] = reps[r.listing_id] || []).push(r); });
    const lst = A.listings.map((l) => '<div class="item"><div class="row" style="justify-content:space-between"><b>' + esc(l.title) + '</b>' + (l.flagged ? badge(['Disembunyikan admin', 'bad']) : l.hidden ? badge(['Disembunyikan pemilik', 'mu']) : badge(['Tayang', 'ok'])) + '</div><p class="mu sm">' + money(l.price) + ' · ' + esc(l.category) + ' · ' + dOnly(l.created_at) + '</p>' + (reps[l.id] ? '<p class="note warn">' + reps[l.id].length + ' laporan: ' + reps[l.id].map((r) => esc(r.reason)).join(' · ') + '</p>' : '') + '<div class="row" style="margin-top:6px"><button type="button" class="btn line sm" data-flag="' + l.id + '" data-on="' + (l.flagged ? '0' : '1') + '">' + (l.flagged ? 'Tayangkan lagi' : 'Sembunyikan') + '</button><button type="button" class="btn bad sm" data-ldel="' + l.id + '">Hapus iklan</button></div></div>').join('');
    const revs = A.reviews.map((r) => '<div class="item"><div class="row" style="justify-content:space-between"><b>' + esc(item(r.product_id).name) + '</b>' + badge(REV_ST[r.status] || REV_ST.pending) + '</div><p class="stars">' + stars(r.rating) + '</p><p class="sm">' + esc(r.body) + '</p><p class="mu sm">' + esc(r.author_name || 'Pengunjung') + ' · ' + dOnly(r.created_at) + '</p><div class="row" style="margin-top:6px">' + (r.status !== 'approved' ? '<button type="button" class="btn sm" data-rev="' + r.id + '" data-st="approved">Tayangkan</button>' : '') + (r.status !== 'hidden' ? '<button type="button" class="btn line sm" data-rev="' + r.id + '" data-st="hidden">Sembunyikan</button>' : '') + '<button type="button" class="btn bad sm" data-delrev="' + r.id + '">Hapus</button></div></div>').join('');
    return '<div class="sec-h"><h2>Kabar menunggu</h2><span class="badge warn">' + pend.length + '</span></div>' + (stories ? '<div class="list">' + stories + '</div>' : '<p class="card mu">Tidak ada kabar yang menunggu.</p>') +
      '<div class="sec-h"><h2>Ulasan</h2></div>' + (!S.ready.reviews ? SOON('ulasan') : revs ? '<div class="list">' + revs + '</div>' : '<p class="card mu">Belum ada ulasan masuk.</p>') +
      '<div class="sec-h"><h2>Iklan jual beli</h2><a class="btn line sm" href="../#jualbeli">Buka Jual Beli</a></div>' + (lst ? '<div class="list">' + lst + '</div>' : '<p class="card mu">Belum ada iklan.</p>');
  }

  function aAkses() {
    if (!S.ready.ent) return SOON('akses produk');
    const opts = ITEMS.filter((it) => it.kind === 'pdf' || it.kind === 'app' || it.kind === 'kelas').map((it) => '<option value="' + it.id + '">' + esc(it.name) + '</option>').join('');
    const list = S.a.ents.map((e) => '<div class="item"><div class="row" style="justify-content:space-between"><b>' + esc(item(e.product_id).name) + '</b><span class="badge ' + (e.expires_at && new Date(e.expires_at) < new Date() ? 'bad' : 'ok') + '">' + (e.expires_at ? 's.d. ' + dOnly(e.expires_at) : 'Selamanya') + '</span></div><p class="sm">' + esc(S.emails[e.user_id] || e.user_id) + '</p><div class="row" style="margin-top:6px"><button type="button" class="btn bad sm" data-revoke="' + e.id + '">Cabut akses</button></div></div>').join('');
    return '<div class="card"><h2>Beri akses produk</h2><p class="mu sm">Untuk pembeli yang bayar lewat WhatsApp/QRIS/Lynk. Pembeli harus sudah punya akun iTAP dengan email itu.</p><form id="f-grant" class="form"><label>Email pembeli<input type="email" name="email" required></label><label>Produk<select name="product">' + opts + '</select></label><label>Masa aktif<select name="days"><option value="0">Selamanya</option><option value="30">30 hari</option><option value="90">90 hari</option><option value="365">1 tahun</option></select></label><button class="btn" type="submit">Beri akses</button></form></div>' +
      '<div class="sec-h"><h2>Akses aktif</h2></div>' + (list ? '<div class="list">' + list + '</div>' : '<p class="card mu">Belum ada akses yang diberikan.</p>');
  }

  // ---------- paint ----------
  function paint() { if (!S.sb) return; if (S.user && !S.recovery) renderIn(); else renderAuth(); }
  function soonAll(msg) {
    app.innerHTML = '<div class="card"><h2>Akun iTAP</h2><p class="note warn">' + esc(msg) + '</p><p><a class="btn wa" href="https://wa.me/' + KAT.wa + '">Hubungi iTAP lewat WhatsApp</a></p></div>';
  }

  // ---------- aksi ----------
  async function act(fn, ok) {
    try { await fn(); if (ok) setNote(ok, 'ok'); } catch (e) { setNote(e && e.message ? 'Gagal: ' + e.message : 'Gagal. Coba lagi.', 'bad'); }
  }
  async function refresh() { await loadUser(); await loadAdmin(); paint(); }

  async function signIn(form) {
    const d = new FormData(form); const email = String(d.get('email') || '').trim(); const password = String(d.get('password') || '');
    if (!password) return magic(email);
    const r = await S.sb.auth.signInWithPassword({ email, password });
    if (r.error) { setNote(/confirm/i.test(r.error.message) ? 'Email belum dikonfirmasi. Buka tautan di email pendaftaran dulu.' : 'Email atau kata sandi salah. Bisa juga pakai tautan email.', 'bad'); return; }
  }
  async function magic(email) {
    if (!email) { setNote('Isi email dulu.', 'warn'); return; }
    const r = await S.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: redirectUrl() } });
    setNote(r.error ? 'Tautan belum terkirim: ' + r.error.message : 'Tautan masuk dikirim ke ' + email + '. Buka dari HP/browser ini.', r.error ? 'bad' : 'ok');
  }
  async function signUp(form) {
    const d = new FormData(form);
    const r = await S.sb.auth.signUp({ email: String(d.get('email') || '').trim(), password: String(d.get('password') || ''), options: { data: { full_name: String(d.get('name') || '').trim() }, emailRedirectTo: redirectUrl() } });
    setNote(r.error ? 'Belum bisa daftar: ' + r.error.message : 'Cek email untuk konfirmasi. Setelah itu kamu langsung masuk.', r.error ? 'bad' : 'ok');
  }

  function orderSheet(id) {
    const it = item(id); const p = S.profile || {};
    const box = document.createElement('div'); box.className = 'modal'; box.setAttribute('role', 'dialog'); box.setAttribute('aria-modal', 'true'); box.setAttribute('aria-label', 'Pesan ' + it.name);
    box.innerHTML = '<div class="sheet"><div class="row" style="justify-content:space-between"><h2>Pesan</h2><button type="button" class="btn line sm" data-close>Tutup</button></div>' + prodCard(it, '') + '<form id="f-order" class="form" data-id="' + it.id + '"><label>Jumlah<input name="qty" type="number" min="1" max="99" value="1"></label><label>WhatsApp kamu<input name="wa" inputmode="numeric" required placeholder="08…" value="' + esc(p.phone) + '"></label><label>Catatan (opsional)<textarea name="note" maxlength="500" placeholder="Misal: paket, jadwal, atau pertanyaan"></textarea></label><button class="btn wa block" type="submit">Catat & lanjut ke WhatsApp</button><p class="mu sm">Harga final dan cara bayar dikonfirmasi admin di WhatsApp 0877-4947-6651.</p></form></div>';
    document.body.appendChild(box);
    box.addEventListener('click', (e) => { if (e.target === box || e.target.closest('[data-close]')) box.remove(); });
  }
  async function placeOrder(form) {
    const it = item(form.dataset.id); const d = new FormData(form);
    const qty = Math.max(1, Math.min(99, Number(d.get('qty')) || 1)); const wa = digits(d.get('wa')); const note = String(d.get('note') || '').trim();
    if (!/^0\d{9,13}$|^62\d{8,13}$/.test(wa)) { alert('Nomor WhatsApp belum lengkap.'); return; }
    const win = window.open('about:blank', '_blank');
    let ref = '';
    if (S.ready.orders) {
      const r = await S.sb.from('shop_orders').insert({ user_id: S.user.id, product_id: it.id, product_name: it.name, price: it.price, qty, note, wa }).select('id').single();
      if (r.error && missing(r.error)) S.ready.orders = false; else if (r.error) { if (win) win.close(); setNote('Pesanan belum tercatat: ' + r.error.message, 'bad'); return; } else ref = r.data.id;
    }
    const text = 'Halo iTAP, saya pesan ' + it.name + (qty > 1 ? ' x' + qty : '') + ' (' + it.label + ').' + (ref ? ' No. pesanan: ' + short(ref) + '.' : '') + ' Akun: ' + (S.user.email || '') + '.' + (note ? ' Catatan: ' + note : '');
    const url = waLink(KAT.wa, text);
    if (win) win.location.href = url; else location.href = url;
    document.querySelectorAll('.modal').forEach((m) => m.remove());
    setNote(ref ? 'Pesanan ' + short(ref) + ' tercatat. Lanjutkan konfirmasi di WhatsApp.' : 'Riwayat pesanan sedang disiapkan, jadi pesanan ini hanya dikirim lewat WhatsApp.', ref ? 'ok' : 'warn');
    S.tab = 'pesanan'; await refresh();
  }

  async function openApp(id, two) {
    const it = item(id);
    if (!S.admin) {
      const e = S.ents.find((x) => x.product_id === id);
      if (!e || (e.expires_at && new Date(e.expires_at) < new Date())) { setNote('Akses produk ini belum aktif.', 'warn'); return; }
      if (id === 'kasir') { localStorage.setItem('itap_kasir_full', '1'); localStorage.removeItem('itap_kasir_owner'); if (e.expires_at) localStorage.setItem('itap_kasir_exp', new Date(e.expires_at).toLocaleDateString('sv-SE')); else localStorage.setItem('itap_kasir_owner', '1'); localStorage.setItem('itap_kasir_plan', 'Akun iTAP'); }
    } else if (id === 'kasir') { localStorage.setItem('itap_kasir_full', '1'); localStorage.setItem('itap_kasir_owner', '1'); localStorage.removeItem('itap_kasir_exp'); localStorage.setItem('itap_kasir_plan', 'Owner'); }
    if (id === 'generator') localStorage.setItem('itap_full', '1');
    location.href = two && it.open2 ? it.open2 : it.open;
  }

  async function listFiles(id) {
    const el = document.getElementById('files-' + id);
    if (el) el.innerHTML = '<span class="mu">Memuat berkas…</span>';
    const r = await S.sb.storage.from('produk').list(id, { limit: 50, sortBy: { column: 'name', order: 'asc' } });
    let html;
    if (r.error) html = '<span class="mu">Berkas belum bisa dibuka' + (missing(r.error) || /bucket/i.test(r.error.message || '') ? ': bucket produk belum dipasang.' : '.') + '</span>';
    else {
      const files = (r.data || []).filter((f) => f.name && !f.name.startsWith('.'));
      html = files.length ? files.map((f) => '<div class="f"><button type="button" class="btn line sm" data-dl="' + esc(id + '/' + f.name) + '">Unduh</button><span>' + esc(f.name) + '</span>' + (S.admin ? '<button type="button" class="btn bad sm" data-fdel="' + esc(id + '/' + f.name) + '">Hapus</button>' : '') + '</div>').join('') : '<span class="mu">' + (S.admin ? 'Belum ada berkas. Unggah PDF produk ini.' : 'Berkas belum diunggah admin. Hubungi iTAP lewat WhatsApp.') + '</span>';
      const it = item(id); if (it.buy && S.admin) html += '<a class="sm" href="' + esc(it.buy) + '" target="_blank" rel="noopener" style="color:var(--blue)">Halaman Lynk produk ini ↗</a>';
    }
    S.a.files[id] = html;
    const el2 = document.getElementById('files-' + id); if (el2) el2.innerHTML = html;
  }
  async function download(path) {
    const r = await S.sb.storage.from('produk').createSignedUrl(path, 600, { download: true });
    if (r.error) { setNote('Berkas belum bisa diunduh: ' + r.error.message, 'bad'); return; }
    location.href = r.data.signedUrl;
  }
  async function upload(id, file) {
    if (!file) return;
    if (file.size > 50 * 1024 * 1024) { setNote('Berkas lebih dari 50 MB.', 'bad'); return; }
    const name = file.name.replace(/[^A-Za-z0-9._-]+/g, '-').slice(-80);
    setNote('Mengunggah ' + name + '…', '');
    const r = await S.sb.storage.from('produk').upload(id + '/' + name, file, { upsert: true, contentType: file.type || 'application/octet-stream' });
    setNote(r.error ? 'Unggah gagal: ' + r.error.message : 'Berkas ' + name + ' tersimpan privat.', r.error ? 'bad' : 'ok');
    await listFiles(id);
  }

  async function grant(userId, productId, days, orderId) {
    const expires_at = days > 0 ? new Date(Date.now() + days * 864e5).toISOString() : null;
    const r = await S.sb.from('entitlements').upsert({ user_id: userId, product_id: productId, expires_at, order_id: orderId || null }, { onConflict: 'user_id,product_id' });
    if (r.error) throw r.error;
  }

  // ---------- event ----------
  document.addEventListener('submit', async (e) => {
    const f = e.target; if (!(f instanceof HTMLFormElement) || !f.id.startsWith('f-')) return;
    e.preventDefault();
    const btn = f.querySelector('[type=submit]'); if (btn) btn.disabled = true;
    try {
      if (f.id === 'f-masuk') await signIn(f);
      if (f.id === 'f-daftar') await signUp(f);
      if (f.id === 'f-newpass') await act(async () => { const r = await S.sb.auth.updateUser({ password: String(new FormData(f).get('password')) }); if (r.error) throw r.error; S.recovery = false; history.replaceState(null, '', location.pathname + location.search); await refresh(); }, 'Kata sandi baru tersimpan.');
      if (f.id === 'f-pass') await act(async () => { const r = await S.sb.auth.updateUser({ password: String(new FormData(f).get('password')) }); if (r.error) throw r.error; f.reset(); }, 'Kata sandi tersimpan.');
      if (f.id === 'f-profil') await act(async () => { const d = new FormData(f); const phone = digits(d.get('phone')); if (phone && !/^[0-9]{10,15}$/.test(phone)) throw new Error('nomor WhatsApp belum lengkap'); const display_name = String(d.get('name') || '').trim(); const r = await S.sb.from('profiles').update({ display_name, phone }).eq('id', S.user.id); if (r.error) throw r.error; S.profile = Object.assign({}, S.profile, { display_name, phone }); paint(); }, 'Profil tersimpan.');
      if (f.id === 'f-order') await placeOrder(f);
      if (f.id === 'f-review') await act(async () => {
        const d = new FormData(f); const rating = Number(d.get('rating')); const body = String(d.get('body') || '').trim(); const product_id = String(d.get('product'));
        if (rating < 1) throw new Error('pilih jumlah bintang');
        if (body.length < 10) throw new Error('ulasan minimal 10 huruf');
        const author_name = ((S.profile && S.profile.display_name) || '').slice(0, 60);
        const r = await S.sb.from('reviews').upsert({ user_id: S.user.id, product_id, rating, body, author_name, status: 'pending' }, { onConflict: 'user_id,product_id' });
        if (r.error) throw r.error; await refresh();
      }, 'Ulasan terkirim. Tampil setelah ditinjau admin.');
      if (f.id === 'f-grant') await act(async () => {
        const d = new FormData(f); const r = await S.sb.rpc('admin_find_user', { p_email: String(d.get('email') || '') });
        if (r.error) throw r.error; const u = (r.data || [])[0]; if (!u) throw new Error('akun dengan email itu belum ada. Minta pembeli daftar dulu.');
        await grant(u.id, String(d.get('product')), Number(d.get('days')) || 0); await refresh();
      }, 'Akses diberikan.');
    } finally { if (btn && btn.isConnected) btn.disabled = false; }
  });

  document.addEventListener('click', async (e) => {
    const t = e.target instanceof Element ? e.target.closest('button,[data-tab]') : null; if (!t) return;
    const ds = t.dataset;
    if (ds.mode) { S.mode = ds.mode; S.authTab = 'masuk'; setNote(''); history.replaceState(null, '', ds.mode === 'admin' ? '?peran=admin' : location.pathname); paint(); return; }
    if (ds.authtab) { S.authTab = ds.authtab; setNote(''); paint(); return; }
    if (ds.tab) { S.tab = ds.tab; setNote(''); paint(); window.scrollTo({ top: 0, behavior: 'smooth' }); return; }
    if (t.id === 'b-magic') { const em = (document.querySelector('#f-masuk [name=email]') || {}).value; t.disabled = true; await magic(String(em || '').trim()); t.disabled = false; return; }
    if (t.id === 'b-lupa') { const em = String((document.querySelector('#f-masuk [name=email]') || {}).value || '').trim(); if (!em) { setNote('Isi email dulu, lalu tekan Lupa kata sandi.', 'warn'); return; } const r = await S.sb.auth.resetPasswordForEmail(em, { redirectTo: redirectUrl() }); setNote(r.error ? 'Belum terkirim: ' + r.error.message : 'Tautan atur ulang kata sandi dikirim ke ' + em + '.', r.error ? 'bad' : 'ok'); return; }
    if (t.id === 'b-google') { const r = await S.sb.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: redirectUrl() } }); if (r.error) setNote('Google belum bisa dipakai.', 'bad'); return; }
    if (t.id === 'b-out') { await S.sb.auth.signOut(); S.user = null; S.profile = null; S.admin = false; S.tab = ''; setNote('Kamu sudah keluar.', 'ok'); paint(); return; }
    if (t.id === 'b-del') { if (!confirm('Hapus akun beserta iklan, ulasan, dan pesanan yang tercatat?')) return; await act(async () => { const r = await S.sb.functions.invoke('delete-account', { body: {} }); if (r.error) throw r.error; await S.sb.auth.signOut(); S.user = null; paint(); }, 'Akun dihapus.'); return; }
    if (ds.rate) { const n = Number(ds.rate); const f = document.getElementById('f-review'); f.elements.rating.value = n; document.querySelectorAll('#rate button').forEach((b) => { const on = Number(b.dataset.rate) <= n; b.classList.toggle('on', on); b.setAttribute('aria-checked', String(Number(b.dataset.rate) === n)); }); return; }
    if (ds.order) { orderSheet(ds.order); return; }
    if (ds.fav) { await act(async () => { const on = favOn(ds.fav); const r = on ? await S.sb.from('favorites').delete().eq('user_id', S.user.id).eq('kind', 'produk').eq('item_id', ds.fav) : await S.sb.from('favorites').insert({ user_id: S.user.id, kind: 'produk', item_id: ds.fav, label: item(ds.fav).name }); if (r.error) { if (missing(r.error)) { S.ready.fav = false; throw new Error('favorit sedang disiapkan'); } throw r.error; } await refresh(); }); return; }
    if (ds.unfav) { const [kind, id] = ds.unfav.split('|'); await act(async () => { const r = await S.sb.from('favorites').delete().eq('user_id', S.user.id).eq('kind', kind).eq('item_id', id); if (r.error) throw r.error; await refresh(); }, 'Favorit dihapus.'); return; }
    if (ds.cancel) { if (!confirm('Batalkan pesanan ini?')) return; await act(async () => { const r = await S.sb.from('shop_orders').update({ status: 'batal' }).eq('id', ds.cancel); if (r.error) throw r.error; await refresh(); }, 'Pesanan dibatalkan.'); return; }
    if (ds.open) { await openApp(ds.open, ds.two === '1'); return; }
    if (ds.files) { await listFiles(ds.files); return; }
    if (ds.dl) { await download(ds.dl); return; }
    if (ds.fdel) { if (!confirm('Hapus berkas ' + ds.fdel + '?')) return; const r = await S.sb.storage.from('produk').remove([ds.fdel]); setNote(r.error ? 'Gagal hapus berkas.' : 'Berkas dihapus.', r.error ? 'bad' : 'ok'); await listFiles(ds.fdel.split('/')[0]); return; }
    if (ds.editrev) { const r = S.reviews.find((x) => x.id === ds.editrev); const f = document.getElementById('f-review'); if (!r || !f) return; f.elements.product.value = r.product_id; f.elements.body.value = r.body; const b = document.querySelector('#rate [data-rate="' + r.rating + '"]'); if (b) b.click(); f.scrollIntoView({ behavior: 'smooth' }); return; }
    if (ds.delrev) { if (!confirm('Hapus ulasan ini?')) return; await act(async () => { const r = await S.sb.from('reviews').delete().eq('id', ds.delrev); if (r.error) throw r.error; await refresh(); }, 'Ulasan dihapus.'); return; }
    if (ds.rev) { await act(async () => { const r = await S.sb.from('reviews').update({ status: ds.st }).eq('id', ds.rev); if (r.error) throw r.error; await refresh(); }, ds.st === 'approved' ? 'Ulasan ditayangkan.' : 'Ulasan disembunyikan.'); return; }
    if (ds.story) { await act(async () => { const r = await S.sb.from('stories').update({ status: ds.st }).eq('id', ds.story); if (r.error) throw r.error; await refresh(); }, ds.st === 'approved' ? 'Kabar disetujui dan tayang.' : 'Kabar ditolak.'); return; }
    if (ds.flag) { await act(async () => { const r = await S.sb.from('listings').update({ flagged: ds.on === '1' }).eq('id', ds.flag); if (r.error) throw r.error; await refresh(); }, ds.on === '1' ? 'Iklan disembunyikan.' : 'Iklan tayang lagi.'); return; }
    if (ds.ldel) { if (!confirm('Hapus iklan ini permanen?')) return; await act(async () => { const r = await S.sb.from('listings').delete().eq('id', ds.ldel); if (r.error) throw r.error; await refresh(); }, 'Iklan dihapus.'); return; }
    if (ds.grant) { const o = S.a.orders.find((x) => x.id === ds.grant); if (!o) return; const days = o.product_id === 'kasir' ? 30 : 0; await act(async () => { await grant(o.user_id, o.product_id, days, o.id); if (o.status === 'baru') await S.sb.from('shop_orders').update({ status: 'dibayar' }).eq('id', o.id); await refresh(); }, 'Akses diberikan' + (days ? ' (30 hari)' : ' (selamanya)') + '.'); return; }
    if (ds.revoke) { if (!confirm('Cabut akses ini?')) return; await act(async () => { const r = await S.sb.from('entitlements').delete().eq('id', ds.revoke); if (r.error) throw r.error; await refresh(); }, 'Akses dicabut.'); return; }
    if (ds.odel) { if (!confirm('Hapus pesanan ini dari catatan?')) return; await act(async () => { const r = await S.sb.from('shop_orders').delete().eq('id', ds.odel); if (r.error) throw r.error; await refresh(); }, 'Pesanan dihapus.'); return; }
  });
  document.addEventListener('change', async (e) => {
    const el = e.target; if (!(el instanceof HTMLElement)) return;
    if (el.dataset.ost) await act(async () => { const r = await S.sb.from('shop_orders').update({ status: el.value }).eq('id', el.dataset.ost); if (r.error) throw r.error; await refresh(); }, 'Status pesanan diubah.');
    if (el.dataset.up) await upload(el.dataset.up, el.files && el.files[0]);
  });

  // ---------- boot ----------
  async function loadSession() {
    const s = await S.sb.auth.getSession();
    S.user = (s.data && s.data.session && s.data.session.user) || null;
    S.profile = null; S.admin = false;
    if (S.user) {
      const p = await S.sb.from('profiles').select('display_name,phone,role').eq('id', S.user.id).maybeSingle();
      S.profile = p.data || { display_name: '', phone: '', role: 'user' };
      S.admin = S.profile.role === 'admin';
    }
  }
  async function boot() {
    const urlOk = /^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(cfg.SUPABASE_URL || ''));
    if (!window.ITAP_AKUN_SB && !urlOk) { soonAll('Akun sedang disiapkan. Belum ada data yang dikirim.'); return; }
    if (/type=recovery/.test(location.hash)) S.recovery = true;
    try {
      if (window.ITAP_AKUN_SB) S.sb = await window.ITAP_AKUN_SB();
      else { const lib = await import('https://esm.sh/@supabase/supabase-js@2.119.0'); S.sb = lib.createClient(String(cfg.SUPABASE_URL).replace(/\/$/, ''), cfg.SUPABASE_ANON_KEY); }
    } catch (e) { soonAll(navigator.onLine ? 'Layanan akun belum bisa dimuat. Coba muat ulang.' : 'Akun butuh internet. Sambungkan lalu muat ulang.'); return; }
    if (!window.ITAP_AKUN_SB) {
      fetch(String(cfg.SUPABASE_URL).replace(/\/$/, '') + '/auth/v1/settings', { headers: { apikey: cfg.SUPABASE_ANON_KEY } }).then((r) => r.json()).then((j) => { S.google = !!(j && j.external && j.external.google); if (!S.user) paint(); }).catch(() => {});
    }
    S.sb.auth.onAuthStateChange(async (ev) => {
      if (ev === 'PASSWORD_RECOVERY') { S.recovery = true; paint(); return; }
      if (ev === 'SIGNED_IN' || ev === 'SIGNED_OUT') { await loadSession(); await refresh(); }
    });
    try { await loadSession(); await loadUser(); await loadAdmin(); } catch (e) { setNote('Sebagian data akun belum termuat. Periksa koneksi.', 'warn'); }
    paint();
  }
  boot();
})();
