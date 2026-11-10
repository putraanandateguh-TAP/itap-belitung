// Harga dari dasbor admin (tabel undangan_settings, kunci 'prices') menimpa harga bawaan di config.js.
// Bila tabel belum ada atau gagal dimuat, harga bawaan di config.js yang dipakai.
(function () {
  const U = window.ITAP_UNDANGAN; if (!U) return;
  const C = window.ITAP_CONFIG || {};
  const URL_ = C.SUPABASE_URL || 'https://mmtxxztkezbuissxembl.supabase.co';
  const KEY = C.SUPABASE_ANON_KEY || 'sb_publishable__1FyoGH0-q564WInyZZBQg_YP0SIYt4';
  const rp = (n) => 'Rp' + Number(n || 0).toLocaleString('id-ID');
  U.defaults = U.defaults || { packages: Object.fromEntries(U.packages.map((p) => [p.id, p.price])), plans: Object.fromEntries((U.plans || []).map((p) => [p.id, p.price])) };
  function apply(v) {
    if (!v || typeof v !== 'object') return false;
    let changed = false;
    ['packages', 'plans'].forEach((k) => (U[k] || []).forEach((p) => {
      const n = v[k] && Number(v[k][p.id]);
      if (Number.isFinite(n) && n >= 0 && n <= 100000000 && p.price !== n) { p.price = Math.round(n); changed = true; }
    }));
    return changed;
  }
  function paintStatic() {
    const min = Math.min.apply(null, U.packages.filter((p) => p.price > 0).map((p) => p.price));
    if (!Number.isFinite(min)) return;
    document.querySelectorAll('[data-minprice]').forEach((el) => { el.textContent = 'Mulai ' + rp(min); });
    document.querySelectorAll('.tprice').forEach((el) => { if (/^Mulai Rp/.test(el.textContent)) el.textContent = 'Mulai ' + rp(min); });
  }
  U.minPrice = () => Math.min.apply(null, U.packages.filter((p) => p.price > 0).map((p) => p.price));
  try { apply(JSON.parse(localStorage.getItem('itap_prices') || 'null')); } catch (e) { /* abaikan */ }
  const ready = (fn) => document.readyState === 'loading' ? document.addEventListener('DOMContentLoaded', fn) : fn();
  ready(paintStatic);
  fetch(URL_ + '/rest/v1/undangan_settings?key=eq.prices&select=value', { headers: { apikey: KEY } })
    .then((r) => r.ok ? r.json() : null)
    .then((rows) => {
      if (!Array.isArray(rows)) return;
      const v = rows[0] && rows[0].value;
      if (v) localStorage.setItem('itap_prices', JSON.stringify(v)); else localStorage.removeItem('itap_prices');
      const changed = v ? apply(v) : apply(U.defaults);
      if (changed) ready(() => { paintStatic(); dispatchEvent(new Event('itap-prices')); });
    })
    .catch(() => {});
})();
