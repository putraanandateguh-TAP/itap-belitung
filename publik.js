// Tampilan publik dari data akun: ulasan yang sudah disetujui admin dan kabar warga yang disetujui.
// Tidak ada angka atau ulasan contoh. Bila tabel belum dipasang atau kosong, bagian ini tetap tersembunyi.
(function () {
  const cfg = window.ITAP_CONFIG || {};
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co\/?$/i.test(String(cfg.SUPABASE_URL || ''))) return;
  const base = String(cfg.SUPABASE_URL).replace(/\/$/, '') + '/rest/v1/';
  const H = { apikey: cfg.SUPABASE_ANON_KEY };
  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const tgl = (s) => { try { return new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(s)); } catch (e) { return ''; } };
  const NAMA = {}; (window.ITAP_KATALOG && window.ITAP_KATALOG.items || []).forEach((i) => { NAMA[i.id] = i.name; });
  const get = (path) => fetch(base + path, { headers: H }).then((r) => (r.ok ? r.json() : []));
  function revHtml(rows) {
    return rows.map((r) => '<div class="card rv"><div class="rv-h"><b>' + esc(r.author_name || 'Pengunjung') + '</b><span class="rv-s" aria-label="' + r.rating + ' dari 5">' + '★★★★★'.slice(0, r.rating) + '<i>' + '★★★★★'.slice(0, 5 - r.rating) + '</i></span></div><p class="mu sm">' + esc(NAMA[r.product_id] || '') + ' · ' + tgl(r.created_at) + '</p><p class="sm">' + esc(r.body) + '</p></div>').join('');
  }
  function fill(id, rows, title) {
    const el = document.getElementById(id); if (!el || !rows.length) return;
    const avg = (rows.reduce((s, r) => s + r.rating, 0) / rows.length).toFixed(1).replace('.', ',');
    el.innerHTML = '<div class="sh"><div><div class="eyebrow">ULASAN PEMBELI</div><h2>' + esc(title) + '</h2><p class="mu sm">Rata-rata ' + avg + ' dari ' + rows.length + ' ulasan yang sudah ditinjau. <a href="akun/" style="text-decoration:underline">Tulis ulasan</a></p></div></div><div class="hrow rv-row">' + revHtml(rows) + '</div>';
    el.hidden = false;
  }
  get('reviews?select=product_id,author_name,rating,body,created_at&status=eq.approved&order=created_at.desc&limit=60').then((rows) => {
    if (!Array.isArray(rows)) return;
    fill('ulasan-produk', rows.filter((r) => r.product_id !== 'kedai'), 'Kata pembeli produk iTAP');
    fill('ulasan-kedai', rows.filter((r) => r.product_id === 'kedai'), 'Kata pelanggan kedai');
  }).catch(() => {});
  get('stories?select=title,body,category,created_at&status=eq.approved&order=created_at.desc&limit=10').then((rows) => {
    const el = document.getElementById('kabar-warga'); if (!el || !Array.isArray(rows) || !rows.length) return;
    el.innerHTML = '<div class="eyebrow">KABAR WARGA · DITINJAU ADMIN</div><div class="list-kw">' + rows.map((s) => '<details class="fold"><summary>' + esc(s.title) + ' <span class="mu sm">· ' + tgl(s.created_at) + '</span></summary><div class="fold-b"><p class="sm" style="white-space:pre-line">' + esc(s.body) + '</p></div></details>').join('') + '</div>';
    el.hidden = false;
  }).catch(() => {});
})();
