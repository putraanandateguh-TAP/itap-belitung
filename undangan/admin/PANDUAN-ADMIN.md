# Panduan Admin Undangan iTAP

Alamat dasbor: **https://itapbelitung.my.id/undangan/admin/**
Akun admin: **putraanandateguh@gmail.com** (peran `admin` di database). Semua bisa dikerjakan dari browser HP atau laptop, tanpa SQL dan tanpa GitHub.

## A. Persiapan (sekali saja)

1. Buka Supabase → SQL Editor → tempel isi file `supabase/undangan-admin.sql` → **Run**. Ini menyalakan: status pesanan, hapus ucapan/RSVP, ubah harga dari dasbor, dan paket Penuh otomatis untuk undanganmu sendiri. Cukup sekali; aman bila terjalankan dua kali.
2. Supabase → Authentication → URL Configuration → tambahkan ke **Redirect URLs**:
   `https://itapbelitung.my.id/undangan/admin/`, `https://itapbelitung.my.id/undangan/sunting/`, `https://itapbelitung.my.id/undangan/masuk/`.
3. Selesai. Setelah ini semua kerja harian lewat dasbor.

## B. Masuk ke dasbor

1. Buka `/undangan/admin/`, ketik email admin, klik **Kirim tautan**.
2. Buka email dari Supabase **di HP/browser yang sama**, klik tautannya. Dasbor terbuka.
3. Tombol **Keluar** ada di kanan atas. Sesi tersimpan, jadi biasanya tidak perlu masuk ulang.

## C. Alur kerja harian (SOP)

**1. Pesanan masuk.** Pembeli mengisi formulir di `/undangan/pesan/` lalu chat WhatsApp ke 0877-4947-6651. Pesanan muncul di tab **Pesanan** dengan status **Baru**.

**2. Balas WA.** Klik **Chat WA pembeli**. Pesan pembuka sudah terisi. Minta: nama lengkap, nama orang tua, jam acara, alamat, foto, rekening amplop (bila paketnya ada amplop). Sebutkan total harga paket.

**3. Buat draf.** Klik **Buat undangan dari pesanan**. Tab **Undangan** terbuka dengan isi dari pesanan + contoh tema. Ganti semua teks contoh dengan data asli:
   - Judul, tanggal tampilan, hitung mundur.
   - Unggah foto sampul dan galeri (maks 3 MB per foto).
   - Kolom JSON: mempelai/tuan rumah, acara, susunan acara, kisah, rekening, alamat kado. Ikuti format yang sudah ada; cukup ganti teks di antara tanda kutip.
   - Pilih paket sesuai pesanan dan isi email pembeli bila dia mau sunting sendiri.
   - Status biarkan **Draf**, klik **Simpan**.

**4. Kirim draf untuk dicek.** Klik **Buka** untuk melihat draf (hanya kamu yang bisa, ada pita merah "Pratinjau draf"). Untuk dicek pembeli, ambil tangkapan layar, atau sementara ubah status ke **Aktif** lalu kirim tautannya (tautan tidak tercantum di mana pun). Revisi sesuai permintaan (jumlah revisi ikut paket).

**5. Pembayaran.** Setelah pembeli setuju, kirim nomor rekening/QRIS resmi lewat WA. Setelah dana masuk: di tab **Pesanan**, ubah status ke **Dibayar**, isi catatan (mis. "lunas BCA 10/11"), klik **Simpan status**.

**6. Terbitkan.** Di editor undangan, status **Aktif** → **Simpan**. Masa aktif mulai dihitung saat itu: Dasar 30 hari, Klasik 90 hari, Lengkap ke atas selamanya (angka hari diatur di tab **Harga**).

**7. Kirim tautan sunting (paket Lengkap ke atas).** Di editor, bagian **Tautan sunting untuk pembeli** → **Buat tautan sunting** → **Salin** atau **Kirim ke pembeli via WA**. Tautan hanya tampil sekali. Bila bocor/hilang: **Buat tautan baru** (yang lama mati) atau **Cabut tautan**. Alternatif: isi email pembeli; dia bisa masuk di `/undangan/masuk/`.

**8. Bagikan ke tamu.** Bagian **Tautan untuk tamu**: ketik nama tamu → **Salin tautan** atau **Kirim lewat WA**. Nama tamu tampil di sampul (`?to=Nama+Tamu`). Ajari pembeli caranya; jumlah tamu tanpa batas.

**9. Pantau tamu.** Bagian **RSVP & ucapan tamu**: jumlah hadir, daftar RSVP, ucapan. Hapus ucapan spam dengan **Hapus**. **Unduh daftar tamu (CSV)** untuk dikirim ke pembeli.

**Dasbor pembeli.** Pembeli masuk di `/undangan/akun/` (tombol Login di menu bawah) dengan email yang tertaut. Tab: **Beranda** (kartu undangan, sisa masa aktif, hitung mundur), **RSVP** (statistik, sembunyikan ucapan), **Sebar** (daftar tamu + Kirim WhatsApp dengan pesan yang bisa diubah), **Layanan** (paket, upgrade/perpanjang via WA), **Profil** (Daftar Transaksi, Pusat Bantuan, S&K, refund, privasi). Admin juga bisa membukanya dengan pemilih undangan. Contoh tanpa login: `/undangan/akun/?demo=1`.

**Masa aktif habis / perpanjang.** Tamu melihat halaman "Masa aktif undangan sudah habis"; data tetap tersimpan, pembeli tetap bisa masuk. Perpanjang di editor: **+30 hari** / **+90 hari** / **Selamanya** atau isi tanggal → **Simpan**. Upgrade paket menghitung ulang dari hari itu.

**10. Selesai.** Setelah acara, ubah status pesanan ke **Selesai**. Pesanan batal → **Batal**.

## D. Undangan untuk diri sendiri (akses penuh seumur hidup)

Tab **Undangan** → **+ Buat undangan baru** → centang **Undangan untuk saya sendiri**. Paket otomatis **Penuh** (semua fitur), gratis, aktif selamanya, tanpa batas jumlah. Ini dijaga database berdasarkan peran admin, bukan kode rahasia.

## E. Mengubah harga

Tab **Harga** → ubah angka → **Simpan harga**. Halaman jualan (beranda, katalog, pesan) memakai harga baru begitu dibuka ulang. **Kembalikan ke harga bawaan** memakai harga di `undangan/config.js`.
Catatan: teks deskripsi paket, nama paket, dan fitur tiap paket masih di `undangan/config.js` (perlu GitHub untuk diubah).

## F. Tips & masalah umum

- **Tautan masuk tidak datang:** cek folder Spam; tunggu 1 menit; Supabase membatasi beberapa email per jam.
- **"Akun ini bukan admin":** kamu masuk dengan email lain. Klik Keluar, masuk lagi dengan email admin.
- **"Slug sudah dipakai":** ganti tautan, mis. `adi-sari-2`.
- **Kolom JSON salah:** pesan merah menyebut kolom yang salah. Periksa koma dan tanda kutip.
- **Musik:** pilih lagu bebas royalti bawaan (piano public domain/CC0, atau tiga lagu bernuansa Islami/Timur Tengah berlisensi CC BY), atau tempel tautan MP3 bebas royalti. Jangan pakai lagu berhak cipta tanpa izin. Kredit CC BY tampil otomatis di kaki undangan.
- **Hapus undangan:** tombol **Hapus** di editor. RSVP dan ucapannya ikut terhapus, tidak bisa dibatalkan.
- **Jangan pernah** membagikan tautan sunting ke grup tamu.

## G. Yang masih perlu SQL/GitHub

- Sekali saja, setelah `undangan-admin.sql`: jalankan `supabase/undangan-dashboard.sql` (masa aktif, sembunyikan ucapan, daftar tamu di server, transaksi pembeli). Aman dijalankan ulang.

- Sekali saja: menjalankan `supabase/undangan-admin.sql` dan menambah Redirect URLs (bagian A).
- Menambah admin baru: ubah `profiles.role` menjadi `admin` di Supabase (Table Editor, tanpa SQL).
- Mengubah nama/fitur/deskripsi paket, menambah tema baru, atau mengubah tampilan halaman: lewat GitHub (`undangan/config.js`, `undangan/common.js`, `u/`).
