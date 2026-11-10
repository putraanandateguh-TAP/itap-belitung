// Katalog semua yang dijual di situs iTAP. Satu sumber untuk dasbor akun (pengunjung & admin/owner).
// id dipakai di tabel shop_orders, entitlements, reviews, dan folder berkas storage "produk/<id>/".
// Ubah harga di sini bila harga di halaman jual berubah.
window.ITAP_KATALOG = {
  wa: '6287749476651', // WhatsApp pesanan akun (0877-4947-6651)
  items: [
    { id: 'paket-kreator', name: 'Paket Kreator AI', cat: 'Produk digital', price: 59000, label: 'Rp59rb', kind: 'pdf', page: '../paket-kreator/', buy: 'https://lynk.id/itap025/3l891q93vjo9', img: '../img/pp-01.webp', blurb: 'AI Prompt Pack + 100 Prompt Sinematik dalam satu paket.' },
    { id: 'ebook-video-ai', name: 'Ebook Bikin Video Sinematik AI dari HP', cat: 'Produk digital', price: 20000, label: 'Rp20rb', was: 'Rp99.000', kind: 'pdf', buy: 'https://lynk.id/itap025/zx9v358qogmm', img: '../img/p-ebook.webp', blurb: 'Ebook langkah demi langkah video AI dari HP.' },
    { id: 'prompt-100', name: '100 Prompt Sinematik AI', cat: 'Produk digital', price: 36000, label: 'Rp36.000', was: 'Rp120.000', kind: 'pdf', buy: 'https://lynk.id/itap025/w6xr3v14l65m', img: '../img/p-prompt.webp', blurb: 'Prompt siap salin untuk video sinematik.' },
    { id: 'prompt-pack', name: 'iTAP AI Prompt Pack', cat: 'Produk digital', price: 35000, label: 'Rp35rb', kind: 'pdf', page: '../prompt-pack/', buy: 'https://lynk.id/itap025/zjq1lmvvqx73', img: '../img/pp-01.webp', blurb: 'PDF 13 halaman: formula 6 scene, 30 prompt, character sheet.' },
    { id: 'modul-kreator', name: 'Modul Kreator AI (PDF)', cat: 'Kelas', price: 79000, label: 'Rp79rb', kind: 'pdf', page: '../kelas-ai/', buy: 'https://lynk.id/itap025/10kjgpezmqoe', img: '../img/kelas-01.webp', blurb: 'Modul 10 bab: naskah, prompt, edit, upload, monetisasi.' },
    { id: 'kelas-k1', name: 'Kelas K1 Kreator Video AI', cat: 'Kelas', price: 149000, label: 'Rp149rb', kind: 'kelas', page: '../kelas-ai/', blurb: 'Kursus video + PDF + template, ±2–3 jam.' },
    { id: 'kelas-k2', name: 'Kelas K2 Kursus + Mentoring 30 Hari', cat: 'Kelas', price: 349000, label: 'Rp349rb', kind: 'kelas', page: '../kelas-ai/', blurb: 'Isi K1, grup WA batch, 4 sesi live, review video.' },
    { id: 'generator', name: 'iTAP Epic Video Generator + Story Studio', cat: 'Aplikasi', price: 49000, label: 'Rp49rb lifetime', kind: 'app', open: '../generator/', open2: '../generator/studio.html', blurb: 'Prompt video 6 scene, narasi, SRT. Satu akses untuk Generator dan Studio. Lifetime = akses selama produk/layanan iTAP masih beroperasi, tanpa biaya bulanan.' },
    { id: 'kasir', name: 'iTAP Kasir (AI)', cat: 'Aplikasi', price: 49000, label: 'Rp49rb/bln', kind: 'app', open: '../kasir/app.html', page: '../kasir/', blurb: 'Kasir HP untuk warung: stok, laba, struk WA.' },
    { id: 'undangan', name: 'Undangan Digital iTAP', cat: 'Undangan', price: 39000, label: 'mulai Rp39rb', kind: 'undangan', page: '../undangan/', open: '../undangan/akun/', admin: '../undangan/admin/', blurb: 'Undangan pernikahan, khitanan, syukuran. Tema, RSVP, musik.' },
    { id: 'ppob', name: 'Pulsa, Data, Top Up Game & Token PLN', cat: 'PPOB', price: 0, label: 'segera hadir', kind: 'ppob', page: '../#ppob', admin: '../admin/ppob/', noOrder: true, blurb: 'Daftar harga pulsa, data, game, e-wallet & token PLN segera hadir.' },
    { id: 'jasa-video-ai', name: 'Jasa Video AI Sinematik', cat: 'Jasa', price: 160000, label: 'Rp160rb / video', kind: 'jasa', page: '../#produk', blurb: '1 video 6 scene. Paket 6 dan 12 video tersedia.' },
    { id: 'jasa-web', name: 'Jasa Website UMKM', cat: 'Jasa', price: 350000, label: 'mulai Rp350rb', kind: 'jasa', page: '../jasa-web/', blurb: 'Landing page, toko/katalog, maintenance.' },
    { id: 'jasa-chatbot', name: 'Jasa Chatbot WhatsApp', cat: 'Jasa', price: 300000, label: 'mulai Rp300rb', kind: 'jasa', page: '../jasa-chatbot/', blurb: 'Auto-balas & terima pesanan 24 jam.' },
    { id: 'iklan', name: 'Slot Iklan iTAP', cat: 'Iklan', price: 50000, label: 'mulai Rp50rb/minggu', kind: 'jasa', page: '../iklan/', blurb: 'Promosikan usaha Belitung di situs iTAP.' },
    { id: 'kedai', name: 'Kedai Bakso Aci iTAP', cat: 'Kedai', price: 0, label: 'menu di GrabFood/GoFood', kind: 'kedai', page: '../#kedai', noOrder: true, img: '../img/kedai.webp', blurb: 'Bakso aci di Air Merbau, Tanjung Pandan. Buka 11.00–22.00 WIB.' }
  ]
};
