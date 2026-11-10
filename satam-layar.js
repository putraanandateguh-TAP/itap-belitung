// Tampilan ala portal: hitung mundur salat (data Aladhan dari app.js) dan bilah "Tanya AI" di beranda.
(function () {
  // Hitung mundur ke salat berikutnya, Asia/Jakarta.
  function target() {
    const s = window.ITAP_SHOLAT; if (!s) return null;
    const m = String(s.time || '').match(/(\d{1,2}):(\d{2})/); if (!m) return null;
    return { name: s.name, at: Date.parse(s.day + 'T' + m[1].padStart(2, '0') + ':' + m[2] + ':00+07:00') };
  }
  function tick() {
    const card = document.getElementById('sholat'); const t = target(); if (!card || !t || isNaN(t.at)) return;
    let el = document.getElementById('sholat-cd');
    if (!el) { el = document.createElement('div'); el.id = 'sholat-cd'; el.className = 'sholat-cd'; el.setAttribute('aria-live', 'off'); const pt = document.getElementById('pt'); card.insertBefore(el, pt); }
    let d = Math.max(0, Math.floor((t.at - Date.now()) / 1000));
    const h = Math.floor(d / 3600); d -= h * 3600; const mi = Math.floor(d / 60); const se = d - mi * 60;
    const p = (n) => String(n).padStart(2, '0');
    el.innerHTML = '<small>Menuju ' + t.name + '</small><b>' + p(h) + ':' + p(mi) + ':' + p(se) + '</b>';
  }
  setInterval(tick, 1000); tick();

  // Bilah Tanya AI: buka panel Asisten dan isi pertanyaan bila formulir chat tersedia.
  const f = document.getElementById('askbar');
  if (f) f.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = String((f.elements.q || {}).value || '').trim();
    location.hash = 'chat';
    setTimeout(() => {
      const form = document.getElementById('chat-form');
      if (form && q) { form.elements.message.value = q; form.requestSubmit ? form.requestSubmit() : form.submit(); }
      const root = document.getElementById('chat'); if (root) root.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 250);
  });
})();
