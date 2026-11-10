// Katalog lagu bawaan undangan iTAP.
// Jalur relatif dari /u/ dan dari folder undangan/ (termasuk admin/ dan sunting/).
(function () {
  const prefix = '../audio/undangan/';
  const tracks = [
    { url: '', label: 'Tanpa musik', credit: '' },
    { url: prefix + 'gymnopedie-1.mp3', label: 'Gymnopédie No. 1 (public domain)', credit: 'Gymnopédie No. 1 — Erik Satie, rekaman Robin Alciatore (Musopen, public domain).' },
    { url: prefix + 'nocturne-op15-1.mp3', label: 'Nocturne Op. 15 No. 1 (CC0)', credit: 'Nocturne Op. 15 No. 1 — Frédéric Chopin, rekaman Luke Faulkner (Musopen, CC0).' },
    { url: prefix + 'cry-of-the-desert.mp3', label: 'Cry of the Desert — oud, nuansa Islami (CC BY 4.0)', credit: 'Cry of the Desert — Mark Wilson X, CC BY 4.0.' },
    { url: prefix + 'desert-city.mp3', label: 'Desert City — nuansa Timur Tengah (CC BY 3.0)', credit: 'Desert City — Kevin MacLeod (incompetech.com), CC BY 3.0.' },
    { url: prefix + 'tabuk.mp3', label: 'Tabuk — seruling, nuansa Timur Tengah (CC BY 3.0)', credit: 'Tabuk — Kevin MacLeod (incompetech.com), CC BY 3.0.' }
  ];
  function creditFor(url) {
    const file = String(url || '').split('?')[0].split('/').pop();
    if (!file) return '';
    const hit = tracks.find((t) => t.url && t.url.split('/').pop() === file);
    return (hit && hit.credit) || '';
  }
  function knownUrl(url) {
    return tracks.some((t) => t.url === url);
  }
  function options(selected) {
    const cur = String(selected || '');
    const known = knownUrl(cur);
    return tracks.map((t) => '<option value="' + t.url.replace(/"/g, '&quot;') + '"' + (t.url === cur ? ' selected' : '') + '>' + t.label + '</option>').join('')
      + '<option value="custom"' + (cur && !known ? ' selected' : '') + '>Tautan sendiri (bebas royalti)</option>';
  }
  window.ITAP_UNDANGAN_MUSIC = { tracks, creditFor, knownUrl, options, prefix };
})();
