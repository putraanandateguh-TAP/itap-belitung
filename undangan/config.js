// Satu tempat harga Undangan Digital iTAP.
// Disetarakan dengan tingkat harga publik undangan digital (dicek 9 Nov 2026):
// coba Rp0, dasar 39rb, klasik 59rb, lengkap 69rb, luas 99rb, penuh 119rb,
// langganan 400rb / 1,15jt / 2,3jt / 4,6jt.
// days = masa aktif undangan setelah diaktifkan (hari). 0 = aktif selamanya. Bisa diubah di dasbor admin, tab Harga.
// Ubah angka di objek ini saja. Teguh bisa menyesuaikan tanpa menyentuh halaman lain.
window.ITAP_UNDANGAN = {
  wa: '6287749476651',
  // Email kontak publik. Kosongkan bila belum ada; footer hanya menampilkannya bila terisi.
  email: 'putraanandateguh@gmail.com',
  packages: [
    { id: 'coba', days: 0, name: 'Coba', price: 0, share: false, music: false, gallery: 0, gift: false, editor: false, stream: false, mapsEmbed: false, story: false, checkin: false, autoscroll: false, revisions: 0, blurb: 'Pratinjau tema di HP. Belum untuk disebar ke tamu.' },
    { id: 'dasar', days: 30, name: 'Dasar', price: 39000, share: true, music: false, gallery: 0, gift: false, editor: false, stream: false, mapsEmbed: false, story: false, checkin: false, autoscroll: false, revisions: 2, blurb: 'Sebar tanpa batas, nama tamu, RSVP, peta, hitung mundur. Dua kali revisi.' },
    { id: 'klasik', days: 90, name: 'Klasik', price: 59000, share: true, music: true, gallery: 0, gift: false, editor: false, stream: false, mapsEmbed: false, story: false, checkin: false, autoscroll: false, revisions: 3, blurb: 'Isi paket Dasar, plus musik dari tautan bebas royalti. Tiga kali revisi.' },
    { id: 'lengkap', days: 0, name: 'Lengkap', price: 69000, share: true, music: true, gallery: 10, gift: true, editor: true, stream: false, mapsEmbed: false, story: false, checkin: false, autoscroll: false, revisions: null, blurb: 'Galeri 10 foto, amplop digital, dan sunting sendiri. Revisi leluasa.' },
    { id: 'luas', days: 0, name: 'Luas', price: 99000, share: true, music: true, gallery: 15, gift: true, editor: true, stream: true, mapsEmbed: false, story: false, checkin: true, autoscroll: true, revisions: null, blurb: 'Galeri 15, siaran langsung, gulir pelan, dan catat hadir di pintu.' },
    { id: 'penuh', days: 0, name: 'Penuh', price: 119000, share: true, music: true, gallery: 20, gift: true, editor: true, stream: true, mapsEmbed: true, story: true, checkin: true, autoscroll: true, customColor: true, revisions: null, blurb: 'Semua fitur: kisah, peta tertanam, galeri 20, warna aksen sendiri.' }
  ],
  plans: [
    { id: 'bulan1', name: '1 bulan', price: 400000, months: 1, blurb: 'Banyak undangan dalam sebulan, setara paket Penuh.' },
    { id: 'bulan3', name: '3 bulan', price: 1150000, months: 3, blurb: 'Untuk musim acara atau beberapa klien.' },
    { id: 'bulan6', name: '6 bulan', price: 2300000, months: 6, blurb: 'Setengah tahun, tetap sekali bayar di muka.' },
    { id: 'tahun1', name: '1 tahun', price: 4600000, months: 12, blurb: 'Setahun penuh untuk yang sering bikin undangan.' }
  ]
};
