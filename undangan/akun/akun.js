// Dasbor pemilik undangan iTAP: Beranda, RSVP, Sebar, Layanan, Profil.
// Pembeli melihat undangan miliknya (owner_id / owner_email), admin melihat semua dengan pemilih undangan.
// Fitur yang butuh supabase/undangan-dashboard.sql (sembunyikan ucapan, daftar tamu di server, transaksi pembeli,
// masa aktif) menyesuaikan diri bila file itu belum dijalankan.
(function () {
  const U = window.ITAP_UNDANGAN || { packages: [] };
  const T = window.ITAP_TEMA || {};
  const esc = T.esc || ((s) => String(s ?? ''));
  const rp = T.rp || ((n) => 'Rp' + Number(n || 0).toLocaleString('id-ID'));
  const wa = T.wa || ((t) => 'https://wa.me/6287749476651?text=' + encodeURIComponent(t || ''));
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);
  const DEMO = params.has('demo');
  const TABS = ['beranda', 'rsvp', 'sebar', 'layanan', 'profil'];
  const activeText = U.activeText || ((p) => (p && p.days > 0 ? 'Aktif ' + p.days + ' hari' : 'Aktif selamanya'));
  const S = { sb: null, user: null, admin: false, rows: [], cur: null, rsvps: [], wishes: [], hiddenOk: false, dashOk: false, guests: [], guestsServer: false, orders: null, ordersNote: '' };
  let timer = null;

  const toast = (t) => { const n = $('toast'); n.textContent = t; n.classList.add('on'); clearTimeout(toast.t); toast.t = setTimeout(() => n.classList.remove('on'), 2600); };
  const pkgById = (id) => U.packages.find((p) => p.id === id) || U.packages[U.packages.length - 1] || {};
  const ownedByAdmin = (row) => !!(row && S.admin && S.user && row.owner_id === S.user.id);
  // Paket untuk membatasi fitur: admin selalu setara Penuh.
  const gatePkg = (row) => (S.admin ? pkgById('penuh') : pkgById(row && row.package));
  const expiryOf = (row) => (row && row.expires_at && !ownedByAdmin(row) ? new Date(row.expires_at) : null);
  const expired = (row) => { const e = expiryOf(row); return !!(e && e.getTime() <= Date.now()); };
  const themeOf = (row) => { const d = (row && row.data) || {}; const list = T.themes || []; return list.find((t) => t.id === d.design) || list.find((t) => t.theme === (row && row.theme)) || { name: (row && row.theme) || '-' }; };
  const uBase = () => new URL('../../u/', location.href);
  const guestLink = (row, name) => uBase().href + '?s=' + encodeURIComponent(row.slug) + (name ? '&to=' + encodeURIComponent(name).replace(/%20/g, '+') : '');
  const fmtDate = (d) => new Date(d).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
  const fmtTime = (d) => new Date(d).toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }) + ' WIB';
  const ago = (d) => { const s = Math.max(0, (Date.now() - new Date(d).getTime()) / 1000); if (s < 60) return 'baru saja'; if (s < 3600) return Math.floor(s / 60) + ' menit lalu'; if (s < 86400) return Math.floor(s / 3600) + ' jam lalu'; if (s < 2592000) return Math.floor(s / 86400) + ' hari lalu'; return fmtDate(d); };
  const digits = (s) => String(s || '').replace(/\D/g, '');
  const waNum = (s) => { const d = digits(s); if (!d) return ''; return d.startsWith('0') ? '62' + d.slice(1) : d; };

  const DEFAULT_TPL = 'Kepada Yth.\n{nama}\n{keterangan}\n\nDengan hormat, kami mengundang Bapak/Ibu/Saudara/i untuk hadir di acara {acara} kami:\n*{judul}*\n{tanggal}\n\nDetail acara, lokasi, dan konfirmasi kehadiran ada di tautan berikut:\n{tautan}\n\nKehadiran dan doa restu Anda sangat berarti bagi kami. Terima kasih.';
  const fillTpl = (tpl, row, g) => { const d = row.data || {}; return String(tpl || DEFAULT_TPL)
    .replace(/\{nama\}/g, g.n || 'Tamu Undangan').replace(/\{keterangan\}/g, g.c || '').replace(/\{tautan\}/g, guestLink(row, g.n))
    .replace(/\{judul\}/g, d.title || '').replace(/\{tanggal\}/g, d.dateLabel || '').replace(/\{acara\}/g, (d.eventType || 'acara').toLowerCase())
    .replace(/\n{3,}/g, '\n\n').trim(); };

  // ---------- data contoh (mode ?demo=1, tanpa server) ----------
  function demoData() {
    const now = Date.now();
    const iso = (min) => new Date(now - min * 60000).toISOString();
    S.user = { id: 'demo', email: 'contoh@itapbelitung.my.id' };
    S.dashOk = true; S.hiddenOk = true;
    return Promise.all(['melayu', 'khitanan'].map((n) => fetch('../demo/' + n + '.json').then((r) => r.json()).catch(() => ({})))).then(([a, b]) => {
      delete a.demo; delete b.demo;
      S.rows = [
        { id: 'demo-1', slug: 'demo-melayu', theme: 'melayu', package: 'lengkap', status: 'active', data: a, owner_email: S.user.email, created_at: iso(60 * 24 * 12), expires_at: null },
        { id: 'demo-2', slug: 'demo-khitanan', theme: 'islami', package: 'dasar', status: 'active', data: b, owner_email: S.user.email, created_at: iso(60 * 24 * 3), expires_at: new Date(now + 27 * 86400000 + 5 * 3600000).toISOString() }
      ];
      S.demoGuests = {
        rsvps: [['Rahmat Hidayat', 'hadir', 2, 35], ['Bu Nurhayati', 'hadir', 4, 180], ['Andi Saputra', 'ragu', 1, 600], ['Keluarga Pak Yusri', 'hadir', 5, 1500], ['Dewi Anggraini', 'tidak', 1, 2900], ['Fajar Ramadhan', 'hadir', 2, 4300]].map((x, i) => ({ id: 'r' + i, guest_name: x[0], attendance: x[1], guests: x[2], created_at: iso(x[3]) })),
        wishes: [['Rahmat Hidayat', 'Barakallah, semoga menjadi keluarga sakinah, mawaddah, warahmah. Aamiin.', 35], ['Bu Nurhayati', 'Selamat menempuh hidup baru, semoga langgeng sampai kakek nenek.', 180], ['Andi Saputra', 'Mohon maaf belum pasti bisa datang, doa terbaik dari jauh.', 600], ['Akun Iseng', 'promo pinjol cepat cair klik link ini', 900], ['Keluarga Pak Yusri', 'Selamat ya, ditunggu kabar baik berikutnya!', 1500]].map((x, i) => ({ id: 'w' + i, guest_name: x[0], message: x[1], created_at: iso(x[2]), hidden: i === 3 })),
        orders: [{ id: 'o1', created_at: iso(60 * 24 * 13), event_type: 'Pernikahan', package: 'lengkap', status: 'selesai', invitation_id: 'demo-1', names: a.title || '' }, { id: 'o2', created_at: iso(60 * 24 * 4), event_type: 'Khitanan', package: 'dasar', status: 'dibayar', invitation_id: 'demo-2', names: b.title || '' }]
      };
    });
  }

  // ---------- server ----------
  async function client() {
    if (S.sb) return S.sb;
    const c = window.ITAP_CONFIG || {};
    if (!c.SUPABASE_URL || !c.SUPABASE_ANON_KEY) throw new Error('config');
    const lib = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
    S.sb = lib.createClient(c.SUPABASE_URL, c.SUPABASE_ANON_KEY);
    return S.sb;
  }
  async function loadRows() {
    const sb = S.sb;
    const ready = await sb.rpc('undangan_dashboard_ready');
    S.dashOk = !ready.error && ready.data === 1;
    const prof = await sb.from('profiles').select('role').eq('id', S.user.id).maybeSingle();
    S.admin = !!(prof.data && prof.data.role === 'admin');
    const cols = 'id,slug,theme,package,data,status,owner_id,owner_email,created_at' + (S.dashOk ? ',expires_at' : '');
    const res = await sb.from('invitations').select(cols).order('created_at', { ascending: false }).limit(500);
    const email = (S.user.email || '').toLowerCase();
    const all = res.data || [];
    S.rows = S.admin ? all : all.filter((r) => r.owner_id === S.user.id || (r.owner_email || '').toLowerCase() === email);
    // Tautkan akun ke undangan yang baru dicocokkan lewat email (sekali, dijaga trigger database).
    S.rows.filter((r) => !r.owner_id && !S.admin).forEach((r) => sb.from('invitations').update({ owner_id: S.user.id }).eq('id', r.id).then(() => {}));
  }
  async function loadGuests(row) {
    S.rsvps = []; S.wishes = []; S.orders = null; S.ordersNote = '';
    if (DEMO) {
      const g = S.demoGuests;
      const k = 'itap_demo_hidden';
      const hid = JSON.parse(localStorage.getItem(k) || 'null');
      if (hid) g.wishes.forEach((w) => { if (w.id in hid) w.hidden = hid[w.id]; });
      S.rsvps = row.id === 'demo-1' ? g.rsvps : g.rsvps.slice(0, 2);
      S.wishes = row.id === 'demo-1' ? g.wishes : g.wishes.slice(0, 1);
      S.orders = g.orders;
      S.guests = readLocalGuests(row);
      S.guestsServer = false;
      return;
    }
    const sb = S.sb;
    const r = await sb.from('invitation_rsvps').select('id,guest_name,attendance,guests,created_at').eq('invitation_id', row.id).order('created_at', { ascending: false }).limit(1000);
    S.rsvps = r.data || [];
    let w = await sb.from('invitation_wishes').select('id,guest_name,message,created_at,hidden').eq('invitation_id', row.id).order('created_at', { ascending: false }).limit(500);
    S.hiddenOk = !w.error;
    if (w.error) w = await sb.from('invitation_wishes').select('id,guest_name,message,created_at').eq('invitation_id', row.id).order('created_at', { ascending: false }).limit(500);
    S.wishes = w.data || [];
    S.guests = readLocalGuests(row); S.guestsServer = false;
    if (S.dashOk) {
      const p = await sb.from('invitation_private').select('guests').eq('invitation_id', row.id).maybeSingle();
      if (!p.error) {
        S.guestsServer = true;
        const server = (p.data && Array.isArray(p.data.guests)) ? p.data.guests : [];
        // Daftar yang sempat tersimpan di HP ini sebelum fitur server aktif ikut dipindahkan sekali.
        if (!server.length && S.guests.length) { S.guests = S.guests.slice(); saveGuests(row, true); } else S.guests = server;
      }
    }
    if (S.admin) {
      const o = await sb.from('invitation_orders').select('id,created_at,event_type,theme,package,status,invitation_id,payload').eq('invitation_id', row.id).order('created_at', { ascending: false });
      S.orders = (o.data || []).map((x) => Object.assign(x, { names: (x.payload && x.payload.names) || '' }));
      if (o.error) S.ordersNote = 'Pesanan belum bisa dimuat.';
    } else if (S.dashOk) {
      const o = await sb.rpc('my_invitation_orders');
      S.orders = o.data || [];
      if (o.error) S.ordersNote = 'Riwayat transaksi belum bisa dimuat. Coba muat ulang.';
    } else {
      S.orders = null;
      S.ordersNote = 'Riwayat transaksi sedang disiapkan. Untuk bukti pembayaran, tanyakan admin lewat WhatsApp.';
    }
  }
  const localKey = (row) => 'itap_guestlist_' + row.id;
  function readLocalGuests(row) { try { const v = JSON.parse(localStorage.getItem(localKey(row)) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  async function saveGuests(row, quiet) {
    const list = S.guests.slice(0, 2000);
    if (S.guestsServer && !DEMO) {
      const up = await S.sb.from('invitation_private').upsert({ invitation_id: row.id, guests: list, updated_at: new Date().toISOString() });
      if (up.error) { localStorage.setItem(localKey(row), JSON.stringify(list)); if (!quiet) toast('Server menolak, disimpan di HP ini dulu.'); return; }
      localStorage.removeItem(localKey(row));
    } else localStorage.setItem(localKey(row), JSON.stringify(list));
    if (!quiet) toast('Daftar tamu tersimpan.');
  }
  async function saveData(row, patch) {
    const data = Object.assign({}, row.data || {}, patch);
    if (DEMO) { row.data = data; return true; }
    const up = await S.sb.from('invitations').update({ data }).eq('id', row.id);
    if (up.error) return false;
    row.data = data; return true;
  }

  // ---------- tampilan ----------
  function cdParts(ms) { const s = Math.max(0, Math.floor(ms / 1000)); return [Math.floor(s / 86400), Math.floor(s % 86400 / 3600), Math.floor(s % 3600 / 60), s % 60]; }
  const cdHtml = (id) => '<div class="cd" id="' + id + '">' + ['Hari', 'Jam', 'Menit', 'Detik'].map((l) => '<span><b>0</b><small>' + l + '</small></span>').join('') + '</div>';
  function tick() {
    const row = S.cur; if (!row) return;
    const put = (id, to) => { const el = $(id); if (!el || !to) return; cdParts(to - Date.now()).forEach((n, i) => { el.children[i].firstChild.textContent = String(n).padStart(2, '0'); }); };
    const e = expiryOf(row); if (e) put('cdA', e.getTime());
    const h = row.data && row.data.countdownTo && new Date(row.data.countdownTo); if (h && !isNaN(h)) put('cdH', h.getTime());
    if (e && e.getTime() <= Date.now() && !tick.flipped) { tick.flipped = true; paint(); }
  }
  function editHref(row) {
    if (S.admin) return '../admin/?edit=' + encodeURIComponent(row.id) + '#undangan';
    return '../sunting/?id=' + encodeURIComponent(row.id);
  }
  function hiName() {
    const m = (S.user && S.user.user_metadata) || {};
    const raw = m.full_name || m.name || String((S.user && S.user.email) || '').split('@')[0].replace(/[._-]+/g, ' ');
    return raw.replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 40);
  }
  function stats() {
    const c = (k) => S.rsvps.filter((x) => x.attendance === k);
    const people = (a) => a.reduce((n, x) => n + (Number(x.guests) || 0), 0);
    return { total: S.rsvps.length, hadir: c('hadir').length, hadirOrang: people(c('hadir')), ragu: c('ragu').length, tidak: c('tidak').length };
  }

  function paintBeranda(row) {
    const d = row.data || {};
    const p = pkgById(row.package);
    const hosts = Array.isArray(d.hosts) ? d.hosts.slice(0, 2) : [];
    const e = expiryOf(row);
    const exp = expired(row);
    const cover = d.cover ? new URL(d.cover, uBase()).href : '';
    const st = stats();
    let aktif;
    if (ownedByAdmin(row)) aktif = '<div class="dcard aktif forever"><p class="lbl">Masa aktif</p><p class="inf">∞</p><p><b>Aktif selamanya</b> · undangan akun admin tidak pernah habis.</p></div>';
    else if (!e) aktif = '<div class="dcard aktif forever"><p class="lbl">Masa aktif</p><p class="inf">∞</p><p><b>Aktif selamanya</b>' + (row.status === 'active' ? '' : ' · mulai dihitung saat undangan diaktifkan') + '</p></div>';
    else if (exp) aktif = '<div class="dcard aktif over"><p class="lbl">Masa aktif</p><p><b>Masa aktif habis</b> sejak ' + esc(fmtDate(e)) + '. Tamu tidak bisa membuka undangan, tetapi data RSVP dan ucapan tetap tersimpan.</p><a class="btn sm" href="#layanan">Perpanjang atau upgrade</a></div>';
    else aktif = '<div class="dcard aktif"><p class="lbl">Masa aktif berakhir dalam</p>' + cdHtml('cdA') + '<p class="note">Sampai ' + esc(fmtTime(e)) + ' · paket ' + esc(p.name || row.package) + '. <a href="#layanan">Perpanjang</a></p></div>';
    const hday = d.countdownTo && !isNaN(new Date(d.countdownTo)) && new Date(d.countdownTo).getTime() > Date.now();
    $('t-beranda').innerHTML = '<p class="hi">Halo, <b>' + esc(hiName()) + '</b> 👋</p><p class="note sub">' + (S.admin ? 'Akun admin · semua fitur paket Penuh terbuka.' : 'Kelola undanganmu dari sini.') + '</p>'
      + '<article class="dcard inv">' + (cover ? '<div class="cov" style="background-image:url(\'' + esc(cover) + '\')"></div>' : '<div class="cov none"><img src="../../logo-sm.png" alt=""></div>')
      + '<div class="invb"><div class="chips"><span class="chip ' + (exp ? 'bad' : row.status === 'active' ? 'ok' : 'warn') + '">' + (exp ? 'Masa aktif habis' : row.status === 'active' ? 'Aktif' : 'Draf') + '</span><span class="chip">Paket ' + esc(p.name || row.package) + '</span>' + (ownedByAdmin(row) ? '<span class="chip">Milik admin</span>' : '') + '</div>'
      + '<p class="kick">' + esc(d.kicker || d.eventType || 'Undangan') + '</p><h1>' + esc(d.title || row.slug) + '</h1>'
      + (hosts.length ? '<div class="hosts">' + hosts.map((h) => '<div><small>' + esc(h.role || '') + '</small><b>' + esc(h.name || '') + '</b></div>').join('') + '</div>' : '')
      + '<dl class="meta"><div><dt>Tema</dt><dd>' + esc(themeOf(row).name) + '</dd></div><div><dt>Tanggal</dt><dd>' + esc(d.dateLabel || '-') + '</dd></div></dl>'
      + '<div class="url"><span>' + esc(guestLink(row).replace(/^https?:\/\//, '')) + '</span><button type="button" class="btn out xs" id="copyUrl">Salin</button></div>'
      + '<div class="two"><a class="btn sm" href="' + esc(guestLink(row, 'Tamu Undangan')) + '" target="_blank" rel="noopener">👁 Lihat Undangan</a>' + editBtn(row) + '</div></div></article>'
      + aktif
      + (hday ? '<div class="dcard"><p class="lbl">Menuju hari-H</p>' + cdHtml('cdH') + '<p class="note">' + esc(d.dateLabel || '') + '</p></div>' : '')
      + '<div class="qstats"><a href="#rsvp"><b>' + st.total + '</b><small>RSVP masuk</small></a><a href="#rsvp"><b>' + S.wishes.length + '</b><small>Ucapan</small></a><a href="#sebar"><b>' + S.guests.length + '</b><small>Tamu di daftar</small></a></div>';
    $('copyUrl').onclick = () => copy(guestLink(row), 'Tautan undangan disalin.');
  }
  function editBtn(row) {
    const g = gatePkg(row);
    if (S.admin || g.editor) return '<a class="btn out sm" href="' + esc(editHref(row)) + '">✏️ Edit Undangan</a>';
    const rev = g.revisions == null ? 'leluasa' : g.revisions + ' kali';
    return '<a class="btn out sm" href="' + esc(wa('Halo iTAP, saya mau revisi undangan ' + row.slug + ' (paket ' + (g.name || row.package) + ', jatah revisi ' + rev + '). Yang diubah: ')) + '" target="_blank" rel="noopener">✏️ Minta Revisi</a>';
  }

  function paintRsvp(row) {
    const st = stats();
    const lbl = { hadir: 'Hadir', ragu: 'Ragu', tidak: 'Tidak hadir' };
    const note = S.hiddenOk ? '' : '<p class="wbox">' + (S.admin ? 'Tombol Sembunyikan aktif setelah supabase/undangan-dashboard.sql dijalankan di Supabase. Sementara itu ucapan spam bisa dihapus dari dasbor admin.' : 'Fitur sembunyikan ucapan sedang disiapkan. Untuk ucapan yang tidak pantas, minta admin menghapusnya lewat WhatsApp.') + '</p>';
    $('t-rsvp').innerHTML = '<h2 class="th">RSVP &amp; ucapan</h2>'
      + '<div class="sgrid"><div class="s tot"><b>' + st.total + '</b><small>Total respons</small></div><div class="s ok"><b>' + st.hadir + '</b><small>Hadir · ' + st.hadirOrang + ' orang</small></div><div class="s warn"><b>' + st.ragu + '</b><small>Masih ragu</small></div><div class="s bad"><b>' + st.tidak + '</b><small>Tidak hadir</small></div></div>'
      + '<details class="dcard rlist"><summary>Daftar konfirmasi (' + st.total + ')</summary>' + (S.rsvps.length ? '<ul>' + S.rsvps.map((x) => '<li><b>' + esc(x.guest_name) + '</b><span class="chip ' + (x.attendance === 'hadir' ? 'ok' : x.attendance === 'ragu' ? 'warn' : 'bad') + '">' + esc(lbl[x.attendance] || x.attendance) + '</span><small>' + esc(x.guests) + ' org · ' + esc(ago(x.created_at)) + '</small></li>').join('') + '</ul><button type="button" class="btn out xs" id="csv">Unduh CSV</button>' : '<p class="note">Belum ada tamu yang konfirmasi.</p>') + '</details>'
      + '<h3 class="th2">Ucapan &amp; doa (' + S.wishes.length + ')</h3>' + note
      + '<div class="feed">' + (S.wishes.length ? S.wishes.map((w) => '<article class="wish' + (w.hidden ? ' off' : '') + '"><span class="av">' + esc((w.guest_name || '?').trim().charAt(0).toUpperCase()) + '</span><div class="wb"><p class="wn"><b>' + esc(w.guest_name) + '</b><small>' + esc(ago(w.created_at)) + '</small></p><p>' + esc(w.message) + '</p>'
        + '<label class="sw"><input type="checkbox" data-hide="' + esc(w.id) + '"' + (w.hidden ? ' checked' : '') + (S.hiddenOk ? '' : ' disabled') + '><span></span>' + (w.hidden ? 'Disembunyikan dari tamu' : 'Sembunyikan') + '</label></div></article>').join('') : '<p class="note">Belum ada ucapan. Sebar undangan supaya tamu bisa mengirim doa.</p>') + '</div>';
    const csv = $('csv');
    if (csv) csv.onclick = () => {
      const q = (v) => '"' + String(v ?? '').replace(/"/g, '""') + '"';
      const lines = [['nama', 'kehadiran', 'jumlah', 'waktu']].concat(S.rsvps.map((x) => [x.guest_name, x.attendance, x.guests, fmtTime(x.created_at)]));
      const a = document.createElement('a');
      a.href = URL.createObjectURL(new Blob(['\ufeff' + lines.map((l) => l.map(q).join(',')).join('\n')], { type: 'text/csv' }));
      a.download = 'rsvp-' + row.slug + '.csv'; a.click();
    };
    $('t-rsvp').querySelectorAll('[data-hide]').forEach((cb) => cb.onchange = async () => {
      const w = S.wishes.find((x) => String(x.id) === cb.dataset.hide); if (!w) return;
      const v = cb.checked; cb.disabled = true;
      let ok = true;
      if (DEMO) { const k = 'itap_demo_hidden'; const m = JSON.parse(localStorage.getItem(k) || '{}'); m[w.id] = v; localStorage.setItem(k, JSON.stringify(m)); }
      else { const up = await S.sb.from('invitation_wishes').update({ hidden: v }).eq('id', w.id).select('id'); ok = !up.error && up.data && up.data.length === 1; }
      if (ok) { w.hidden = v; toast(v ? 'Ucapan disembunyikan dari tamu.' : 'Ucapan tampil lagi di undangan.'); } else toast('Belum tersimpan. Coba lagi.');
      paintRsvp(row);
    });
  }

  let sebarQ = '';
  function paintSebar(row) {
    const g = gatePkg(row);
    const exp = expired(row);
    const can = !!g.share && !exp && row.status === 'active';
    const why = !g.share ? 'Paket ' + esc(g.name || row.package) + ' belum bisa disebar ke tamu. <a href="#layanan">Upgrade paket</a>.'
      : exp ? 'Masa aktif undangan sudah habis, jadi tamu tidak bisa membukanya. <a href="#layanan">Perpanjang dulu</a>.'
      : row.status !== 'active' ? 'Undangan masih draf. Tamu baru bisa membuka setelah admin mengaktifkannya.' : '';
    const tpl = (row.data && row.data.waTemplate) || DEFAULT_TPL;
    const list = S.guests.map((x, i) => Object.assign({ i }, x)).filter((x) => !sebarQ || (x.n + ' ' + (x.c || '')).toLowerCase().includes(sebarQ.toLowerCase()));
    const sent = S.guests.filter((x) => x.s).length;
    $('t-sebar').innerHTML = '<h2 class="th">Sebar undangan</h2>'
      + (why ? '<p class="wbox">' + why + '</p>' : '')
      + (S.guestsServer || DEMO ? '' : '<p class="note">Daftar tamu tersimpan di HP/browser ini saja untuk sementara. Setelah pembaruan server, daftar otomatis ikut tersimpan di akun.</p>')
      + '<form class="dcard gform" id="gAdd"><div class="gfields"><label>Nama tamu<input name="n" required maxlength="60" placeholder="Bapak Rahmat"></label><label>Keterangan<input name="c" maxlength="80" placeholder="dan Keluarga, Di Tempat"></label><label>No. WhatsApp <small>(opsional)</small><input name="p" inputmode="tel" maxlength="16" placeholder="08xxxxxxxxxx"></label></div><button class="btn sm" type="submit">+ Tambah tamu</button>'
      + '<details class="bulk"><summary>Tempel banyak nama sekaligus</summary><p class="note">Satu tamu per baris. Format: <code>Nama | Keterangan | No. WA</code>. Keterangan dan nomor boleh dikosongkan.</p><textarea id="bulk" rows="5" placeholder="Bapak Rahmat | dan Keluarga | 081234567890&#10;Ibu Siti | Di Tempat"></textarea><button type="button" class="btn out sm" id="bulkAdd">Tambahkan semua</button></details></form>'
      + '<details class="dcard tpl"><summary>✉️ Ubah pesan WhatsApp</summary><p class="note">Kode yang diganti otomatis: <code>{nama}</code> <code>{keterangan}</code> <code>{tautan}</code> <code>{judul}</code> <code>{tanggal}</code> <code>{acara}</code>.</p><textarea id="tpl" rows="10" maxlength="2000">' + esc(tpl) + '</textarea><div class="two"><button type="button" class="btn sm" id="tplSave">Simpan pesan</button><button type="button" class="btn out sm" id="tplReset">Pakai pesan bawaan</button></div><p class="lbl">Pratinjau</p><pre class="prev" id="tplPrev"></pre></details>'
      + '<div class="ghead"><input type="search" id="gq" placeholder="Cari nama tamu…" value="' + esc(sebarQ) + '" aria-label="Cari tamu"><span>' + S.guests.length + ' tamu · ' + sent + ' terkirim</span></div>'
      + '<div class="glist">' + (list.length ? list.map((x) => '<article class="grow"><div><b>' + esc(x.n) + '</b><small>' + esc(x.c || '—') + (x.p ? ' · ' + esc(x.p) : '') + '</small>' + (x.s ? '<span class="chip ok">Terkirim ' + esc(ago(x.s)) + '</span>' : '') + '</div><div class="gb"><button type="button" class="btn xs" data-send="' + x.i + '"' + (can ? '' : ' disabled') + '>Kirim</button><button type="button" class="btn out xs" data-copy="' + x.i + '" aria-label="Salin tautan untuk ' + esc(x.n) + '">Salin</button><button type="button" class="xbtn" data-del="' + x.i + '" aria-label="Hapus ' + esc(x.n) + '">×</button></div></article>').join('')
        : '<p class="note center">' + (S.guests.length ? 'Tidak ada tamu dengan nama itu.' : 'Belum ada tamu. Tambahkan nama di atas, lalu klik Kirim untuk membuka WhatsApp dengan pesan dan tautan bernama tamu.') + '</p>') + '</div>';
    const prev = () => { $('tplPrev').textContent = fillTpl($('tpl').value, row, S.guests[0] || { n: 'Bapak Rahmat', c: 'dan Keluarga' }); };
    prev(); $('tpl').oninput = prev;
    $('tplSave').onclick = async () => { const ok = await saveData(row, { waTemplate: $('tpl').value.trim() }); toast(ok ? 'Pesan WhatsApp tersimpan.' : 'Pesan belum tersimpan.'); };
    $('tplReset').onclick = () => { $('tpl').value = DEFAULT_TPL; prev(); };
    $('gAdd').onsubmit = (e) => {
      e.preventDefault(); const f = new FormData(e.target);
      const n = String(f.get('n') || '').trim(); if (n.length < 2) return;
      S.guests.unshift({ n: n.slice(0, 60), c: String(f.get('c') || '').trim().slice(0, 80), p: digits(f.get('p')).slice(0, 15) });
      saveGuests(row); paintSebar(row); $('gAdd').elements.n.focus();
    };
    $('bulkAdd').onclick = () => {
      const rows = $('bulk').value.split('\n').map((l) => l.split('|').map((s) => s.trim())).filter((a) => a[0] && a[0].length >= 2);
      rows.reverse().forEach((a) => S.guests.unshift({ n: a[0].slice(0, 60), c: (a[1] || '').slice(0, 80), p: digits(a[2]).slice(0, 15) }));
      if (rows.length) { saveGuests(row); paintSebar(row); toast(rows.length + ' tamu ditambahkan.'); }
    };
    $('gq').oninput = (e) => { sebarQ = e.target.value; const pos = e.target.selectionStart; paintSebar(row); const q = $('gq'); q.focus(); q.setSelectionRange(pos, pos); };
    $('t-sebar').querySelectorAll('[data-send]').forEach((b) => b.onclick = () => {
      const x = S.guests[Number(b.dataset.send)]; if (!x) return;
      const text = fillTpl(tpl, row, x);
      window.open('https://wa.me/' + waNum(x.p) + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
      x.s = new Date().toISOString(); saveGuests(row, true); paintSebar(row);
    });
    $('t-sebar').querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => { const x = S.guests[Number(b.dataset.copy)]; if (x) copy(guestLink(row, x.n), 'Tautan untuk ' + x.n + ' disalin.'); });
    $('t-sebar').querySelectorAll('[data-del]').forEach((b) => b.onclick = () => { const x = S.guests[Number(b.dataset.del)]; if (!x || !confirm('Hapus ' + x.n + ' dari daftar?')) return; S.guests.splice(Number(b.dataset.del), 1); saveGuests(row); paintSebar(row); });
  }

  const FEATS = [['share', 'Sebar ke tamu tanpa batas'], ['share', 'Nama tamu di sampul'], [null, 'RSVP & ucapan tamu'], ['music', 'Musik latar'], ['gallery', 'Galeri foto'], ['gift', 'Amplop digital'], ['editor', 'Sunting sendiri'], ['stream', 'Siaran langsung'], ['autoscroll', 'Gulir otomatis'], ['checkin', 'Catat hadir di pintu'], ['story', 'Kisah perjalanan'], ['mapsEmbed', 'Peta tertanam'], ['customColor', 'Warna aksen sendiri']];
  function paintLayanan(row) {
    const curP = pkgById(row.package);
    const idx = U.packages.indexOf(curP);
    const cards = U.packages.filter((p) => p.price > 0).map((p) => {
      const i = U.packages.indexOf(p);
      const mine = !S.admin && p.id === curP.id;
      const li = FEATS.map((f) => { const on = f[0] == null ? true : f[0] === 'gallery' ? p.gallery > 0 : !!p[f[0]]; return '<li class="' + (on ? 'y' : 'n') + '">' + (f[0] === 'gallery' && p.gallery ? 'Galeri ' + p.gallery + ' foto' : f[1]) + '</li>'; }).join('')
        + '<li class="y">' + (p.revisions == null ? 'Revisi leluasa' : p.revisions + '× revisi') + '</li>';
      let cta = '';
      if (S.admin) cta = '';
      else if (mine && p.days > 0) cta = '<a class="btn sm wide" target="_blank" rel="noopener" href="' + esc(wa('Halo iTAP, saya mau perpanjang masa aktif undangan ' + row.slug + ' (paket ' + p.name + ', ' + activeText(p).toLowerCase() + ', ' + rp(p.price) + ').')) + '">Perpanjang ' + p.days + ' hari</a>';
      else if (mine) cta = '<p class="note center">Paket yang sedang kamu pakai</p>';
      else if (i > idx) cta = '<a class="btn sm wide" target="_blank" rel="noopener" href="' + esc(wa('Halo iTAP, saya mau upgrade undangan ' + row.slug + ' dari paket ' + (curP.name || row.package) + ' ke ' + p.name + ' (' + rp(p.price) + ', ' + activeText(p).toLowerCase() + ').')) + '">Upgrade ke ' + p.name + '</a>';
      else cta = '<p class="note center">Di bawah paketmu</p>';
      return '<article class="pk' + (mine ? ' mine' : '') + (i < idx && !S.admin ? ' low' : '') + '">' + (mine ? '<span class="ribbon">Paket kamu</span>' : '') + '<h3>' + esc(p.name) + '</h3><p class="pp">' + rp(p.price) + '</p><p class="pa">⏳ ' + esc(activeText(p)) + '</p><ul class="pl">' + li + '</ul>' + cta + '</article>';
    }).join('');
    const e = expiryOf(row);
    $('t-layanan').innerHTML = '<h2 class="th">Layanan &amp; paket</h2>'
      + '<div class="dcard"><p class="lbl">Undangan ini</p><p><b>Paket ' + esc(curP.name || row.package) + '</b> · ' + (ownedByAdmin(row) ? 'aktif selamanya (akun admin)' : e ? (expired(row) ? 'masa aktif habis ' + esc(fmtDate(e)) : 'aktif sampai ' + esc(fmtDate(e))) : 'aktif selamanya') + '</p>'
      + (S.admin ? '<p class="note">Kamu masuk sebagai admin: semua fitur Penuh terbuka. Masa aktif undangan pembeli diatur di dasbor admin, tab Undangan.</p>' : '<p class="note">Upgrade atau perpanjangan dipesan lewat WhatsApp admin. Setelah dibayar, admin menaikkan paket dan masa aktif dihitung ulang dari hari itu.</p>') + '</div>'
      + '<div class="pkgs">' + cards + '</div>'
      + '<p class="note center">Harga dan masa aktif mengikuti daftar terbaru di <a href="../#harga">halaman harga</a>. Masa aktif dihitung sejak undangan diaktifkan.</p>';
  }

  const ORDER_LBL = { baru: ['Menunggu', 'warn'], dibayar: ['Dibayar', 'ok'], selesai: ['Selesai', 'ok'], batal: ['Batal', 'bad'] };
  const FAQ = [
    ['Bagaimana tamu membuka undangan?', 'Buka tab Sebar, tambahkan nama tamu, lalu klik Kirim. WhatsApp terbuka dengan pesan dan tautan yang sudah memuat nama tamu di sampul.'],
    ['Apakah nama tamu dibatasi?', 'Tidak. Mulai paket Dasar kamu boleh membuat tautan untuk tamu sebanyak apa pun.'],
    ['Berapa lama undangan aktif?', 'Paket Dasar aktif ' + (pkgById('dasar').days || 30) + ' hari dan Klasik ' + (pkgById('klasik').days || 90) + ' hari sejak diaktifkan. Lengkap ke atas aktif selamanya. Masa aktif bisa diperpanjang atau di-upgrade dari tab Layanan.'],
    ['Apa yang terjadi saat masa aktif habis?', 'Tamu melihat pemberitahuan bahwa masa aktif sudah habis. Data RSVP dan ucapan tetap aman dan kamu tetap bisa masuk ke dasbor. Setelah diperpanjang, undangan bisa dibuka lagi.'],
    ['Bagaimana menyembunyikan ucapan yang tidak pantas?', 'Di tab RSVP, geser tombol Sembunyikan pada ucapan itu. Ucapan hilang dari undangan tetapi tetap tersimpan di sini.'],
    ['Bisakah saya mengubah isi undangan?', 'Mulai paket Lengkap kamu bisa menyunting sendiri lewat tombol Edit Undangan. Paket Dasar dan Klasik mengirim revisi ke admin lewat WhatsApp.'],
    ['Saya tidak menerima email masuk.', 'Cek folder Spam atau Promosi, dan pastikan email sama dengan yang didaftarkan saat memesan. Bila tetap tidak ada, hubungi admin.']
  ];
  function paintProfil(row) {
    const ord = S.orders;
    const orders = ord == null ? '<p class="note">' + esc(S.ordersNote) + '</p>'
      : ord.length ? '<ul class="olist">' + ord.map((o) => { const s = ORDER_LBL[o.status] || [o.status || 'Baru', 'warn']; const p = pkgById(o.package); return '<li><div><b>Paket ' + esc(p.name || o.package) + '</b><small>' + esc(o.event_type || '') + (o.names ? ' · ' + esc(o.names) : '') + '</small><small>' + esc(fmtTime(o.created_at)) + ' · #' + esc(String(o.id).slice(0, 8)) + '</small></div><span class="chip ' + s[1] + '">' + esc(s[0]) + '</span></li>'; }).join('') + '</ul>' + (S.ordersNote ? '<p class="note">' + esc(S.ordersNote) + '</p>' : '')
      : '<p class="note">' + esc(S.ordersNote || 'Belum ada transaksi tercatat untuk ' + (S.admin ? 'undangan ini.' : 'akun ini. Pesanan baru tercatat bila memakai email yang sama atau sudah ditautkan admin.')) + '</p>';
    $('t-profil').innerHTML = '<div class="dcard me"><span class="av big">' + esc(hiName().charAt(0) || '?') + '</span><div><b>' + esc(hiName()) + '</b><small>' + esc((S.user && S.user.email) || '') + '</small><span class="chip">' + (DEMO ? 'Mode contoh' : S.admin ? 'Admin' : 'Pemilik undangan') + '</span></div></div>'
      + '<div class="menu">'
      + '<details class="dcard" id="trx"><summary>🧾 Daftar Transaksi</summary>' + orders + '</details>'
      + '<details class="dcard"><summary>❓ Pusat Bantuan</summary><div class="faq">' + FAQ.map((f) => '<details><summary>' + esc(f[0]) + '</summary><p>' + esc(f[1]) + '</p></details>').join('') + '</div><a class="btn out sm wide" target="_blank" rel="noopener" href="' + esc(wa('Halo iTAP, saya butuh bantuan soal undangan ' + row.slug + '.')) + '">💬 Tanya admin lewat WhatsApp</a></details>'
      + '<a class="dcard mi" href="../syarat/">📄 Syarat &amp; Ketentuan<span>›</span></a>'
      + '<a class="dcard mi" href="../refund/">↩️ Kebijakan Refund<span>›</span></a>'
      + '<a class="dcard mi" href="../privasi/">🔒 Kebijakan Privasi<span>›</span></a>'
      + (S.admin ? '<a class="dcard mi" href="../admin/">🛠 Dasbor admin<span>›</span></a>' : '')
      + '<button type="button" class="dcard mi" id="swap">🔁 Ganti akun<span>›</span></button>'
      + '<button type="button" class="dcard mi out" id="logout">🚪 Keluar<span>›</span></button>'
      + '</div><p class="note center small">Masuk tanpa kata sandi: setiap kali masuk, kami kirim tautan ke email kamu.<br>iTAP Undangan · dasbor pemilik</p>';
    $('logout').onclick = async () => { if (DEMO) { location.href = './'; return; } await S.sb.auth.signOut(); location.href = './'; };
    $('swap').onclick = async () => { if (!DEMO) await S.sb.auth.signOut(); location.href = '../masuk/'; };
  }

  function copy(text, ok) {
    const done = () => toast(ok);
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, () => prompt('Salin tautan ini:', text));
    else prompt('Salin tautan ini:', text);
  }
  function paint() {
    const row = S.cur; if (!row) return;
    paintBeranda(row); paintRsvp(row); paintSebar(row); paintLayanan(row); paintProfil(row);
    clearInterval(timer); tick(); timer = setInterval(tick, 1000);
  }
  function show(tab) {
    if (!TABS.includes(tab)) tab = 'beranda';
    TABS.forEach((t) => { $('t-' + t).hidden = t !== tab; });
    document.querySelectorAll('#dnav a').forEach((a) => { const on = a.dataset.t === tab; a.classList.toggle('on', on); if (on) a.setAttribute('aria-current', 'page'); else a.removeAttribute('aria-current'); });
    scrollTo(0, 0);
  }
  addEventListener('hashchange', () => { if (S.cur) show(location.hash.slice(1)); });
  function picker() {
    const wrap = $('pickerWrap'); const sel = $('picker');
    if (S.rows.length < 2) { wrap.hidden = true; return; }
    wrap.hidden = false;
    sel.innerHTML = S.rows.map((r) => '<option value="' + esc(r.id) + '">' + esc(((r.data && r.data.title) || r.slug).slice(0, 34)) + (S.admin ? ' · ' + esc(r.owner_id === S.user.id ? 'milik saya' : (r.owner_email || 'tanpa pemilik')) : '') + '</option>').join('');
    sel.value = S.cur.id;
    sel.onchange = async () => { await pick(sel.value); };
  }
  async function pick(id) {
    S.cur = S.rows.find((r) => r.id === id) || S.rows[0];
    tick.flipped = false;
    try { localStorage.setItem('itap_dash_inv', S.cur.id); } catch (e) { /* abaikan */ }
    await loadGuests(S.cur);
    paint();
  }
  function gate(text) {
    $('loading').hidden = true; $('gate').hidden = false; $('dnav').hidden = true;
    if (text) $('gateMsg').textContent = text;
  }
  $('login').onsubmit = async (e) => {
    e.preventDefault();
    const email = String(new FormData(e.target).get('email') || '').trim();
    const btn = e.target.querySelector('button'); btn.disabled = true;
    $('gateMsg').textContent = 'Mengirim tautan…';
    try {
      await client();
      // Halaman masuk sudah terdaftar sebagai alamat kembali di Supabase; dari sana pembeli diteruskan ke dasbor.
      const res = await S.sb.auth.signInWithOtp({ email, options: { emailRedirectTo: new URL('../masuk/', location.href).href, shouldCreateUser: true } });
      $('gateMsg').textContent = res.error ? 'Tautan belum terkirim. Coba lagi sebentar lagi.' : 'Tautan masuk dikirim ke ' + email + '. Buka email itu dari HP ini.';
    } catch (err) { $('gateMsg').textContent = 'Tautan belum terkirim. Periksa internet lalu coba lagi.'; }
    btn.disabled = false;
  };

  async function start() {
    if (DEMO) { $('demoBar').hidden = false; await demoData(); }
    else {
      try { await client(); } catch (e) { gate('Layanan belum tersambung. Periksa internet lalu muat ulang.'); return; }
      const s = await S.sb.auth.getSession();
      S.user = s.data.session && s.data.session.user;
      if (!S.user) { gate(); return; }
      await loadRows();
      if (!S.rows.length) {
        $('loading').hidden = true;
        $('t-beranda').hidden = false;
        $('t-beranda').innerHTML = '<div class="dcard empty"><p class="hi">Halo, <b>' + esc(hiName()) + '</b></p><p>Belum ada undangan yang tertaut ke <b>' + esc(S.user.email || '') + '</b>.</p><p class="note">Pesan undangan dulu, atau minta admin menautkan email ini ke undanganmu.</p><div class="two"><a class="btn sm" href="../pesan/">Pesan undangan</a><a class="btn out sm" target="_blank" rel="noopener" href="' + esc(wa('Halo iTAP, tolong tautkan undangan saya ke email ' + (S.user.email || '') + '.')) + '">Hubungi admin</a></div><button type="button" class="btn out sm wide" id="out2" style="margin-top:10px">Keluar</button></div>';
        $('out2').onclick = async () => { await S.sb.auth.signOut(); location.reload(); };
        return;
      }
    }
    let want = params.get('inv') || '';
    try { want = want || localStorage.getItem('itap_dash_inv') || ''; } catch (e) { /* abaikan */ }
    S.cur = S.rows.find((r) => r.id === want || r.slug === want) || S.rows[0];
    await pick(S.cur.id);
    picker();
    $('loading').hidden = true; $('dnav').hidden = false;
    show(location.hash.slice(1));
  }
  addEventListener('itap-prices', () => { if (S.cur) paint(); });
  start().catch(() => gate('Dasbor belum bisa dimuat. Periksa internet lalu muat ulang.'));
})();
