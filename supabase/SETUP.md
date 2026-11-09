# Akun iTAP di Supabase

Situs tetap di GitHub Pages. Supabase hanya menyimpan akun, iklan, draf kabar, dan batas pemakaian asisten. Selama `config.js` kosong, halaman akun menampilkan **segera hadir** dan tidak mengirim data.

Jangan menaruh `service_role` atau kunci AI di git, di `config.js`, atau di browser. Anon key memang publik; yang melindungi data adalah kebijakan di `schema.sql`.

## 1. Buat proyek

1. Daftar di [supabase.com](https://supabase.com) dan pilih **Free**.
2. Cek kuota di halaman harga sebelum lanjut. Angka gratis bisa berubah.
3. New project. Simpan kata sandi database di pengelola sandi, bukan di repo.
4. Tunggu status proyek hijau.

## 2. Jalankan skema

1. Buka **SQL Editor → New query**.
2. Tempel isi `supabase/schema.sql`, lalu **Run**.
3. Di **Table Editor** harus ada `profiles`, `listings`, `listing_photos`, `listing_reports`, `stories`, `ai_usage`.
4. Di **Storage** harus ada bucket `listings` (publik untuk dibaca).

## 3. Nyalakan masuk

1. **Authentication → Providers → Email**: nyalakan. Matikan konfirmasi sandi kalau yang dipakai hanya magic link.
2. **Authentication → URL Configuration**
   - Site URL: `https://itapbelitung.my.id`
   - Redirect URLs, tambahkan satu per satu:
     - `https://itapbelitung.my.id/**`
     - `https://putraanandateguh-tap.github.io/itap-belitung/**`
     - `http://127.0.0.1:8765/**` (hanya untuk uji di komputer)
3. Google (opsional, tombolnya tetap ada):
   - Di Google Cloud buat OAuth Client, jenis Web.
   - Authorized redirect: `https://<PROJECT-REF>.supabase.co/auth/v1/callback`
   - Tempel Client ID dan Client Secret di provider Google Supabase.

## 4. Isi config situs

Di **Project Settings → API** salin Project URL dan `anon` `public` key.

Edit `config.js` di repo (boleh di-commit; ini bukan kunci rahasia):

```js
window.ITAP_CONFIG = {
  SUPABASE_URL: 'https://NAMA-PROYEK.supabase.co',
  SUPABASE_ANON_KEY: 'eyJ...',
  AI_FUNCTION: ''
};
```

Biarkan `AI_FUNCTION` kosong sampai fungsi chat terpasang. Tombol tengah tetap membuka WhatsApp iTAP.

Dorong situs seperti biasa. Jangan men-deploy dari cabang uji sebelum PR disetujui.

## 5. Jadikan Teguh admin

1. Masuk sekali lewat situs supaya baris `profiles` terbuat.
2. Salin User UID di **Authentication → Users**.
3. SQL Editor:

```sql
update public.profiles
set role = 'admin'
where id = 'UUID-DI-SINI';
```

Peran admin tidak bisa diubah dari browser. Kebijakan menolaknya.

## 6. Asisten AI

Provider: **Google Gemini**. Kunci dari [Google AI Studio](https://aistudio.google.com/apikey). Ada jatah gratis; cek batasnya di sana. Perkiraan biaya di luar jatah tergantung model, biasanya di bawah satu sen per pertanyaan pendek, tetapi jangan dianggap tetap.

Pasang [Supabase CLI](https://supabase.com/docs/guides/cli), lalu dari folder repo:

```bash
supabase login
supabase link --project-ref NAMA-PROYEK
supabase secrets set GEMINI_API_KEY=ISI-KUNCI
supabase secrets set GEMINI_MODEL=gemini-2.5-flash
supabase secrets set RATE_SALT=kalimat-acak-panjang
supabase functions deploy chat
supabase functions deploy delete-account
```

`SUPABASE_URL`, `SUPABASE_ANON_KEY`, dan `SUPABASE_SERVICE_ROLE_KEY` sudah disediakan platform ke fungsi. Jangan menyalin service role ke laptop lalu ke git.

Setelah deploy berhasil, ubah `config.js`:

```js
AI_FUNCTION: 'chat'
```

Batas di fungsi: 12 pertanyaan per akun per jam, dan 30 per alamat IP per jam. Alamat IP disimpan sebagai hash, bukan teks mentah. Percakapan tidak ditulis ke tabel.

Kalau fungsi belum terpasang atau kunci kosong, fungsi membalas `unconfigured` dan situs menampilkan tautan WhatsApp, bukan jawaban palsu.

## 7. Hapus akun

Tombol di halaman akun memanggil fungsi `delete-account`. Itu menghapus user Auth; iklan dan draf ikut terhapus karena `on delete cascade`. Kalau fungsi belum terpasang, tombol mengarahkan ke WhatsApp iTAP supaya permintaan diurus manual.

## 8. Notifikasi

Web push tidak dipasang. Yang dibutuhkan nanti: pasangan kunci VAPID, tabel langganan, izin browser, dan fungsi yang mengirim push. Service worker saat ini tidak meminta izin notifikasi.

## 9. Cek cepat

1. Buka situs, menu **Masuk**, kirim tautan ke email sendiri.
2. Pasang satu iklan uji, lalu hapus.
3. Kirim kabar. Statusnya **menunggu** sampai akun admin mengetuk setujui.
4. Dengan akun lain, laporkan iklan. Sebagai admin, sembunyikan iklan itu. Pengunjung tidak melihat iklan yang ditandai.
5. Tanya asisten satu kalimat. Jawaban datang dari Gemini, bukan dari teks yang ditanam di situs.

## Biaya yang perlu diputuskan

| Bagian | Layanan | Biaya awal | Yang Teguh lakukan |
| --- | --- | --- | --- |
| Akun, iklan, kabar, foto | Supabase Free | Rp0 selama kuota cukup | Buat proyek, jalankan SQL, tempel URL dan anon key |
| Asisten | Gemini lewat Edge Function | Jatah gratis, lalu sesuai pemakaian | Buat kunci, simpan sebagai secret, deploy `chat` |
| Hapus akun | Edge Function yang sama | Termasuk kuota fungsi | Deploy `delete-account` |
| Google login | Google Cloud OAuth | Rp0 untuk pemakaian biasa | Buat client OAuth |
| Notifikasi push | Belum dibuat | Butuh VAPID + fungsi kirim | Putuskan nanti |
