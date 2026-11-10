// Dasbor admin Undangan iTAP: masuk, tab, pesanan, harga. Editor undangan ada di editor.js.
// Semua hak akses ditegakkan di database (RLS, peran admin). Halaman ini hanya antarmuka.
(function () {
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const $ = (id) => document.getElementById(id);
  const U = window.ITAP_UNDANGAN || { packages: [], plans: [] };
  const rp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
  let sb = null; let user = null; let orders = []; let orderFilter = 'baru';
  const msg = (t) => { $('msg').textContent = t; };
  const flash = (t) => { const n = $('flash'); n.textContent = t; n.classList.add('on'); clearTimeout(flash.t); flash.t = setTimeout(() => n.classList.remove('on'), 3500); };
  window.ITAP_ADMIN = { flash, esc };
  async function client() {
    if (sb) return sb;
    const cfg = window.ITAP_CONFIG || {};
    const lib = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
    sb = lib.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return sb;
  }
  $('login').onsubmit = async (e) => {
    e.preventDefault();
    await client();
    const email = new FormData(e.target).get('email');
    const res = await sb.auth.signInWithOtp({ email: String(email), options: { emailRedirectTo: location.href.split('#')[0] } });
    msg(res.error ? 'Tautan belum terkirim. Coba lagi sebentar lagi.' : 'Tautan masuk sudah dikirim ke email. Buka email itu di HP/browser ini, lalu klik tautannya.');
  };
  $('logout').onclick = async () => { await sb.auth.signOut(); location.reload(); };

  // Tab
  function tab(name) {
    document.querySelectorAll('[data-tab]').forEach((b) => b.classList.toggle('on', b.dataset.tab === name));
    document.querySelectorAll('.pane').forEach((p) => { p.hidden = p.id !== 'pane-' + name; });
    if (history.replaceState) history.replaceState(null, '', '#' + name);
  }
  document.querySelectorAll('[data-tab]').forEach((b) => { b.onclick = () => tab(b.dataset.tab); });
  window.ITAP_ADMIN.tab = tab;

  // Pesanan
  const statusLabel = { baru: 'Baru', dibayar: 'Dibayar', selesai: 'Selesai', batal: 'Batal' };
  const waLink = (num, text) => 'https://wa.me/' + String(num || '').replace(/\D/g, '') + '?text=' + encodeURIComponent(text);
  async function loadOrders() {
    const res = await sb.from('invitation_orders').select('*').order('created_at', { ascending: false }).limit(200);
    if (res.error) { $('orders').innerHTML = '<p class="note">Pesanan belum bisa dimuat: ' + esc(res.error.message) + '</p>'; return; }
    orders = res.data || [];
    paintOrders();
  }
  function paintOrders() {
    const hasStatus = orders.some((o) => 'status' in o);
    const counts = {};
    orders.forEach((o) => { const s = o.status || 'baru'; counts[s] = (counts[s] || 0) + 1; });
    $('orderChips').innerHTML = ['baru', 'dibayar', 'selesai', 'batal', 'semua'].map((s) => '<button type="button" class="chip' + (s === orderFilter ? ' on' : '') + '" data-of="' + s + '">' + (s === 'semua' ? 'Semua' : statusLabel[s]) + ' <small>' + (s === 'semua' ? orders.length : (counts[s] || 0)) + '</small></button>').join('');
    const q = ($('orderQ').value || '').toLowerCase().trim();
    const list = orders.filter((o) => (orderFilter === 'semua' || (o.status || 'baru') === orderFilter) && (!q || JSON.stringify([o.contact_wa, o.event_type, o.payload]).toLowerCase().includes(q)));
    const pkgName = (id) => (U.packages.find((p) => p.id === id) || {}).name || id;
    $('orders').innerHTML = (hasStatus || !orders.length ? '' : '<p class="warn">Status pesanan belum aktif. Jalankan sekali file supabase/undangan-admin.sql (lihat Panduan, bagian Persiapan).</p>')
      + (list.map((o) => {
        const p = o.payload || {};
        const st = o.status || 'baru';
        const hello = 'Halo kak, ini admin iTAP Undangan. Pesanan undangan ' + (o.event_type || '') + ' atas nama ' + (p.names || '-') + ' (paket ' + pkgName(o.package) + ') sudah kami terima.';
        return '<article class="ocard st-' + esc(st) + '" data-id="' + esc(o.id) + '">'
          + '<div class="ohead"><b>' + esc(p.names || '(tanpa nama)') + '</b><span class="badge">' + esc(statusLabel[st] || st) + '</span></div>'
          + '<p class="note">' + esc(new Date(o.created_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })) + ' WIB · ' + esc(o.event_type) + ' · tema ' + esc(p.design || o.theme) + ' · paket ' + esc(pkgName(o.package)) + '</p>'
          + '<dl><dt>WA</dt><dd>' + esc(o.contact_wa) + '</dd><dt>Tanggal</dt><dd>' + esc(p.date || '-') + '</dd><dt>Tempat</dt><dd>' + esc(p.venue || '-') + '</dd>'
          + (p.maps ? '<dt>Peta</dt><dd><a href="' + esc(p.maps) + '" target="_blank" rel="noopener">buka</a></dd>' : '')
          + (p.note ? '<dt>Catatan</dt><dd>' + esc(p.note) + '</dd>' : '')
          + (p.photos && p.photos.length ? '<dt>Foto</dt><dd>' + esc(p.photos.join(', ')) + ' (dikirim lewat WA)</dd>' : '') + '</dl>'
          + (hasStatus ? '<div class="orow"><label>Status<select data-ostatus>' + Object.keys(statusLabel).map((s) => '<option value="' + s + '"' + (s === st ? ' selected' : '') + '>' + statusLabel[s] + '</option>').join('') + '</select></label><label>Catatan admin<input data-onote value="' + esc(o.admin_note || '') + '" maxlength="1000" placeholder="mis. lunas via BCA 10/11"></label></div>' : '')
          + '<p class="act">' + (hasStatus ? '<button type="button" data-osave>Simpan status</button>' : '')
          + '<a class="btnl wa" href="' + esc(waLink(o.contact_wa, hello)) + '" target="_blank" rel="noopener">Chat WA pembeli</a>'
          + (o.invitation_id ? '<button type="button" data-oinv="' + esc(o.invitation_id) + '">Buka undangannya</button>' : '<button type="button" class="pri" data-ofrom>Buat undangan dari pesanan</button>')
          + '<button type="button" class="danger" data-odel>Hapus</button></p></article>';
      }).join('') || '<p class="note">Tidak ada pesanan di filter ini.</p>');
  }
  $('orderChips').onclick = (e) => { const b = e.target.closest('[data-of]'); if (b) { orderFilter = b.dataset.of; paintOrders(); } };
  $('orderQ').oninput = paintOrders;
  $('orderReload').onclick = loadOrders;
  $('orders').onclick = async (e) => {
    const card = e.target.closest('.ocard'); if (!card) return;
    const o = orders.find((x) => x.id === card.dataset.id); if (!o) return;
    if (e.target.matches('[data-osave]')) {
      const status = card.querySelector('[data-ostatus]').value;
      const admin_note = card.querySelector('[data-onote]').value.trim();
      const r = await sb.from('invitation_orders').update({ status, admin_note, updated_at: new Date().toISOString() }).eq('id', o.id).select('id');
      if (r.error || !r.data || !r.data.length) { flash('Status belum tersimpan. ' + (r.error ? r.error.message : 'Jalankan supabase/undangan-admin.sql dulu.')); return; }
      Object.assign(o, { status, admin_note }); paintOrders(); flash('Status pesanan: ' + statusLabel[status] + '.');
    }
    if (e.target.matches('[data-odel]')) {
      if (!confirm('Hapus pesanan ini? Undangan yang sudah dibuat tidak ikut terhapus.')) return;
      const r = await sb.from('invitation_orders').delete().eq('id', o.id).select('id');
      if (r.error || !r.data || !r.data.length) { flash('Belum terhapus. Jalankan supabase/undangan-admin.sql dulu.'); return; }
      orders = orders.filter((x) => x.id !== o.id); paintOrders(); flash('Pesanan dihapus.');
    }
    if (e.target.matches('[data-ofrom]')) { tab('undangan'); document.dispatchEvent(new CustomEvent('itap-from-order', { detail: o })); }
    if (e.target.matches('[data-oinv]')) { tab('undangan'); document.dispatchEvent(new CustomEvent('itap-edit', { detail: e.target.dataset.oinv })); }
  };
  // editor.js memanggil ini setelah undangan dari pesanan tersimpan
  window.ITAP_ADMIN.linkOrder = async (orderId, invitationId) => {
    const o = orders.find((x) => x.id === orderId);
    const r = await sb.from('invitation_orders').update({ invitation_id: invitationId, updated_at: new Date().toISOString() }).eq('id', orderId).select('id');
    if (!r.error && o) { o.invitation_id = invitationId; paintOrders(); }
  };

  // Harga
  async function loadPrices() {
    const r = await sb.from('undangan_settings').select('value,updated_at').eq('key', 'prices').maybeSingle();
    const v = (r.data && r.data.value) || {};
    const ok = !r.error;
    const defs = U.defaults || { packages: {}, plans: {} };
    const row = (kind, p) => { const def = (defs[kind] || {})[p.id] ?? p.price; const cur = (v[kind] || {})[p.id] ?? def; return '<label class="prow"><span><b>' + esc(p.name) + '</b><small>bawaan ' + rp(def) + '</small></span><input type="number" min="0" step="1000" inputmode="numeric" data-kind="' + kind + '" data-id="' + esc(p.id) + '" value="' + esc(cur) + '"></label>'; };
    $('priceForm').innerHTML = (ok ? '' : '<p class="warn">Tabel harga belum ada. Jalankan sekali supabase/undangan-admin.sql. Sebelum itu harga hanya bisa diubah di undangan/config.js lewat GitHub.</p>')
      + '<h3>Paket satuan</h3>' + U.packages.map((p) => row('packages', p)).join('')
      + '<h3>Langganan</h3>' + (U.plans || []).map((p) => row('plans', p)).join('')
      + '<p class="note">' + (r.data ? 'Terakhir diubah ' + esc(new Date(r.data.updated_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })) + ' WIB.' : 'Saat ini memakai harga bawaan dari config.js.') + '</p>'
      + '<p class="act"><button type="submit" class="pri"' + (ok ? '' : ' disabled') + '>Simpan harga</button><button type="button" id="priceReset"' + (ok ? '' : ' disabled') + '>Kembalikan ke harga bawaan</button></p>';
    const reset = $('priceReset');
    if (reset) reset.onclick = async () => {
      if (!confirm('Kembalikan semua harga ke bawaan config.js?')) return;
      const d = await sb.from('undangan_settings').delete().eq('key', 'prices');
      flash(d.error ? 'Gagal: ' + d.error.message : 'Harga kembali ke bawaan.'); localStorage.removeItem('itap_prices'); loadPrices();
    };
  }
  $('priceForm').onsubmit = async (e) => {
    e.preventDefault();
    const value = { packages: {}, plans: {} };
    for (const inp of $('priceForm').querySelectorAll('input[data-kind]')) {
      const n = Number(inp.value);
      if (!Number.isFinite(n) || n < 0 || n > 100000000) { flash('Harga ' + inp.dataset.id + ' tidak sah.'); return; }
      value[inp.dataset.kind][inp.dataset.id] = Math.round(n);
    }
    const r = await sb.from('undangan_settings').upsert({ key: 'prices', value, updated_at: new Date().toISOString() }).select('key');
    if (r.error) { flash('Harga belum tersimpan: ' + r.error.message); return; }
    localStorage.setItem('itap_prices', JSON.stringify(value));
    flash('Harga tersimpan. Halaman jualan memakai harga baru saat dibuka ulang.'); loadPrices();
  };

  async function draw() {
    const session = await sb.auth.getSession();
    user = session.data.session && session.data.session.user;
    if (!user) return;
    const profile = await sb.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (!profile.data || profile.data.role !== 'admin') { msg('Akun ' + (user.email || '') + ' bukan admin. Keluar lalu masuk dengan email admin.'); $('logout').hidden = false; return; }
    if (draw.done) return; draw.done = true;
    $('gate').hidden = true;
    $('board').hidden = false;
    $('who').textContent = user.email || '';
    $('logout').hidden = false;
    const start = (location.hash || '').slice(1);
    tab(['pesanan', 'undangan', 'harga', 'panduan'].includes(start) ? start : 'pesanan');
    document.dispatchEvent(new CustomEvent('itap-admin', { detail: user }));
    loadOrders(); loadPrices();
  }
  client().then(() => { sb.auth.onAuthStateChange(() => draw()); draw(); }).catch(() => msg('Layanan belum tersambung. Periksa internet lalu muat ulang.'));
})();
