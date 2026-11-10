(function () {
  const cfg = window.ITAP_UNDANGAN;
  const rp = (n) => 'Rp' + Number(n).toLocaleString('id-ID');
  const sel = document.getElementById('package');
  sel.innerHTML = cfg.packages.filter((p) => p.price > 0).map((p) => '<option value="' + p.id + '">' + p.name + ' · ' + rp(p.price) + '</option>').join('');
  const preset = new URLSearchParams(location.search).get('paket');
  if (preset && [...sel.options].some((o) => o.value === preset)) sel.value = preset;
  const digits = (s) => String(s || '').replace(/\D/g, '');

  // Desain katalog -> gaya dasar yang diterima database (melayu/emas/pantai/islami).
  const evName = { pernikahan: 'Pernikahan', khitanan: 'Khitanan', aqiqah: 'Aqiqah', ultah: 'Ulang tahun', wisuda: 'Wisuda', syukuran: 'Syukuran', lainnya: 'Acara sendiri' };
  const designs = window.ITAP_TEMA.themes.map((t) => ({ id: t.id, theme: t.theme, name: t.name, demo: t.demo, event: evName[t.cats[0]] || 'Pernikahan' }));
  const form = document.getElementById('order');
  const pick = document.getElementById('pickTheme');
  pick.innerHTML = designs.map((d, i) => '<label><input type="radio" name="design" value="' + d.id + '"' + (i === 0 ? ' checked' : '') + '><img src="../img/mock/' + d.id + '-1.webp" alt="" width="270" height="570" loading="lazy">' + d.name + '</label>').join('');
  const qTema = new URLSearchParams(location.search).get('tema');
  const pre = designs.find((d) => d.id === qTema) || designs.find((d) => d.theme === qTema);
  if (pre) { form.elements.design.value = pre.id; form.elements.event.value = pre.event; }
  const current = () => designs.find((d) => d.id === form.elements.design.value) || designs[0];
  function sync() {
    const d = current();
    document.getElementById('theme').value = d.theme;
    document.getElementById('themeNote').textContent = 'Tema terpilih: ' + d.name + '. Foto contoh diganti fotomu sendiri.';
    document.getElementById('sumPreview').href = '../../u/?s=' + d.demo + '&to=Tamu+Undangan';
    const p = cfg.packages.find((x) => x.id === sel.value) || {};
    document.getElementById('sumName').textContent = 'Paket ' + (p.name || '') + ' · ' + d.name;
    document.getElementById('sumPrice').innerHTML = '<small>Rp</small>' + Number(p.price || 0).toLocaleString('id-ID');
    document.getElementById('sumBlurb').textContent = p.blurb || '';
  }
  form.addEventListener('change', sync);
  sync();

  document.getElementById('order').onsubmit = async (e) => {
    e.preventDefault();
    const f = new FormData(e.target);
    const wa = digits(f.get('wa'));
    if (!/^0\d{9,13}$/.test(wa) && !/^62\d{8,13}$/.test(wa)) {
      document.getElementById('status').textContent = 'Nomor WhatsApp belum lengkap.';
      return;
    }
    const contact = wa.startsWith('0') ? '62' + wa.slice(1) : wa;
    const pack = cfg.packages.find((p) => p.id === f.get('package'));
    const payload = {
      names: String(f.get('names') || '').trim(),
      date: String(f.get('date') || ''),
      venue: String(f.get('venue') || '').trim(),
      maps: String(f.get('maps') || '').trim(),
      note: String(f.get('note') || '').trim(),
      design: current().id,
      photos: (f.getAll('photos') || []).filter((file) => file && file.name).map((file) => file.name)
    };
    sync();
    const row = { event_type: String(f.get('event')), theme: current().theme, package: String(f.get('package')), contact_wa: contact, payload };
    let saved = false;
    try {
      const site = window.ITAP_CONFIG || {};
      if (site.SUPABASE_URL && site.SUPABASE_ANON_KEY) {
        const lib = await import('https://esm.sh/@supabase/supabase-js@2.119.0');
        const sb = lib.createClient(site.SUPABASE_URL, site.SUPABASE_ANON_KEY);
        const ins = await sb.from('invitation_orders').insert(row);
        saved = !ins.error;
      }
    } catch (err) { saved = false; }
    const text = [
      'Halo iTAP, saya mau pesan undangan digital.',
      'Acara: ' + row.event_type,
      'Tema: ' + current().name + ' (' + row.theme + ')',
      'Paket: ' + (pack ? pack.name + ' ' + rp(pack.price) : row.package),
      'Nama: ' + payload.names,
      'Tanggal: ' + payload.date,
      'Tempat: ' + payload.venue,
      payload.maps ? 'Peta: ' + payload.maps : '',
      payload.note ? 'Catatan: ' + payload.note : '',
      payload.photos.length ? 'Foto menyusul di chat ini: ' + payload.photos.join(', ') : ''
    ].filter(Boolean).join('\n');
    document.getElementById('status').textContent = saved
      ? 'Pesanan tersimpan. WhatsApp terbuka untuk dilanjutkan.'
      : 'WhatsApp terbuka. Kalau server belum siap, kirim ringkasan dari chat ini.';
    window.open('https://wa.me/' + cfg.wa + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
  };
})();
