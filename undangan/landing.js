(function () {
  const cfg = window.ITAP_UNDANGAN;
  const rp = (n) => n ? 'Rp' + Number(n).toLocaleString('id-ID') : 'Rp0';
  const card = (item, highlight) => '<article class="card' + (highlight ? ' pick' : '') + '"><h3>' + item.name + '</h3><p class="price">' + rp(item.price) + '</p><p>' + item.blurb + '</p><p><a class="cta" href="pesan/?paket=' + encodeURIComponent(item.id) + '">Pilih ' + item.name + '</a></p></article>';
  document.getElementById('prices').innerHTML = cfg.packages.filter((p) => p.id !== 'coba').map((p) => card(p, p.id === 'lengkap')).join('')
    + '<article class="card"><h3>Tema khusus</h3><p class="price">Lewat obrolan</p><p>Kalau keempat tema belum pas, ceritakan acaranya. Harga menyusul setelah brief jelas.</p><p><a class="cta ghost" href="https://wa.me/' + cfg.wa + '?text=' + encodeURIComponent('Halo iTAP, saya ingin tema undangan khusus.') + '">Tulis ke WhatsApp</a></p></article>';
  document.getElementById('plans').innerHTML = cfg.plans.map((p) => card(p, false)).join('');
})();
