(function () {
  const T = window.ITAP_TEMA;
  const $ = (id) => document.getElementById(id);
  const q = $('q');
  q.value = new URLSearchParams(location.search).get('q') || '';
  function run() {
    const text = q.value.trim();
    const list = T.search(text);
    $('results').innerHTML = list.map(T.card).join('') + (list.length ? '' : T.customCard(text || 'acara'));
    $('count').textContent = text ? (list.length ? list.length + ' contoh cocok dengan “' + text + '”.' : 'Belum ada contoh untuk “' + text + '”. Admin bisa membuatkan tema custom.') : 'Menampilkan semua ' + list.length + ' contoh tema.';
    history.replaceState(null, '', text ? '?q=' + encodeURIComponent(text) : location.pathname);
  }
  $('sform').onsubmit = (e) => { e.preventDefault(); run(); };
  q.addEventListener('input', run);
  document.querySelectorAll('.chipq').forEach((b) => b.onclick = () => { q.value = b.textContent; run(); });
  run();
})();
