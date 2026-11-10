(function () {
  const T = window.ITAP_TEMA;
  const $ = (id) => document.getElementById(id);
  const p = new URLSearchParams(location.search);
  let acara = p.get('acara') || '';
  let gaya = p.get('gaya') || '';
  $('bigcats').innerHTML = T.cats.map((c) => '<a class="bigcat" href="?acara=' + c[0] + '#daftar" data-acara="' + c[0] + '"><span>' + c[2] + '</span><b>Undangan ' + c[1] + '</b><i aria-hidden="true">›</i></a>').join('');
  $('pills').innerHTML = '<button type="button" data-gaya="">Semua gaya</button>' + T.styles.map((s) => '<button type="button" data-gaya="' + s[0] + '">' + s[1] + '</button>').join('');
  $('q').value = p.get('q') || '';
  function paint() {
    const list = T.search($('q').value).filter((t) => (!acara || t.cats.includes(acara)) && (!gaya || t.styles.includes(gaya)));
    const label = acara ? 'Tema ' + (T.cats.find((c) => c[0] === acara) || [, ''])[1] : 'Semua tema';
    $('listTitle').textContent = label + (gaya ? ' · ' + (T.styles.find((s) => s[0] === gaya) || [, ''])[1] : '');
    const groups = [
      ['Unggulan', list.filter((t) => t.popular), 'Tema andalan iTAP untuk mulai.'],
      ['Rekomendasi', list.filter((t) => t.rec && !t.popular), 'Pilihan admin iTAP untuk dicoba.'],
      ['Tanpa Foto', list.filter((t) => !t.photo), 'Cocok bila belum punya foto atau untuk acara keluarga.'],
      ['Tema lainnya', list.filter((t) => t.photo && !t.popular && !t.rec), '']
    ].filter((g) => g[1].length);
    $('sections').innerHTML = groups.map((g) => '<section class="tsec"><h3>' + g[0] + '</h3>' + (g[2] ? '<p class="note">' + g[2] + '</p>' : '') + '<div class="trows">' + g[1].map(T.row).join('') + '</div></section>').join('');
    $('empty').hidden = list.length > 0;
    document.querySelectorAll('[data-acara]').forEach((a) => a.classList.toggle('on', a.dataset.acara === acara));
    document.querySelectorAll('[data-gaya]').forEach((b) => b.classList.toggle('on', b.dataset.gaya === gaya));
    const u = new URLSearchParams();
    if (acara) u.set('acara', acara); if (gaya) u.set('gaya', gaya); if ($('q').value.trim()) u.set('q', $('q').value.trim());
    history.replaceState(null, '', '?' + u.toString() + location.hash);
  }
  $('bigcats').addEventListener('click', (e) => {
    const a = e.target.closest('[data-acara]'); if (!a) return;
    e.preventDefault(); acara = acara === a.dataset.acara ? '' : a.dataset.acara; paint();
    $('daftar').scrollIntoView({ behavior: 'smooth' });
  });
  $('pills').addEventListener('click', (e) => { const b = e.target.closest('[data-gaya]'); if (b) { gaya = b.dataset.gaya; paint(); } });
  $('q').addEventListener('input', paint);
  paint();
})();
