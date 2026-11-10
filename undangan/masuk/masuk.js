(function () {
  const $ = (id) => document.getElementById(id);
  // Datang dari tautan email (Supabase menaruh token di hash atau ?code=): setelah sesi terbaca, langsung ke dasbor.
  const fromLink = /access_token=|type=magiclink|[?&]code=/.test(location.hash + location.search);
  let sb = null;
  async function client() {
    if (sb) return sb;
    const cfg = window.ITAP_CONFIG || {};
    if (!cfg.SUPABASE_URL || !cfg.SUPABASE_ANON_KEY) throw new Error('config');
    const lib = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
    sb = lib.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
    return sb;
  }
  async function draw() {
    try {
      await client();
      const s = await sb.auth.getSession();
      const user = s.data.session && s.data.session.user;
      $('signed').hidden = !user;
      $('login').hidden = !!user;
      if (user) $('who').textContent = user.email || '';
      if (user && fromLink) location.replace('../akun/');
    } catch (e) { $('msg').textContent = 'Layanan masuk belum tersambung. Coba lagi nanti.'; }
  }
  $('login').onsubmit = async (e) => {
    e.preventDefault();
    const email = String(new FormData(e.target).get('email') || '').trim();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    $('msg').textContent = 'Mengirim tautan…';
    try {
      await client();
      // Tautan di email kembali ke halaman ini (sudah terdaftar di Supabase), lalu diteruskan ke dasbor /undangan/akun/.
      const res = await sb.auth.signInWithOtp({ email, options: { emailRedirectTo: new URL('./', location.href).href, shouldCreateUser: true } });
      $('msg').textContent = res.error ? 'Tautan belum terkirim. Periksa email lalu coba lagi sebentar lagi.' : 'Tautan masuk sudah dikirim ke ' + email + '. Buka email itu dari HP ini.';
    } catch (err) { $('msg').textContent = 'Tautan belum terkirim. Periksa internet lalu coba lagi.'; }
    btn.disabled = false;
  };
  $('logout').onclick = async () => { await client(); await sb.auth.signOut(); draw(); };
  draw();
  client().then(() => sb.auth.onAuthStateChange(() => draw())).catch(() => {});
})();
