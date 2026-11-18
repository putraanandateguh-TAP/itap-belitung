import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privasi & Data Akun",
  description: "Kebijakan privasi iTAP Belitung: data apa yang kami simpan, untuk apa, dan hakmu atas datamu.",
};

const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: "Data yang kami simpan",
    body: [
      "Nama, email, dan (bila kamu verifikasi) nomor WhatsApp — dipakai untuk masuk, verifikasi, dan menghubungi kamu soal akunmu.",
      "Kontribusi dan draf yang kamu tulis, beserta riwayat revisinya — terlihat olehmu dan redaksi.",
      "Tanggapan (komentar) beserta status moderasinya.",
      "Laporan yang kamu buat dan pilihan blokir.",
      "Foto yang kamu unggah untuk artikel atau penawaran — metadata lokasi dibuang sebelum disimpan.",
    ],
  },
  {
    h: "Data yang TIDAK kami simpan",
    body: [
      "Koordinat lokasi persis — hanya nama wilayah yang kamu tulis sendiri.",
      "Isi percakapan marketplace di luar yang diperlukan untuk menampilkan thread — nomor penjual tersamarkan dari pembeli.",
      "Kata sandi dalam bentuk yang bisa dibaca — hanya hash yang tersimpan di layanan auth.",
    ],
  },
  {
    h: "Notifikasi dan perangkat",
    body: [
      "Token perangkat untuk notifikasi push dikaitkan dengan sesi akunmu dan dihapus saat kamu keluar atau menghapus akun.",
      "Notifikasi chat berbunyi hanya setelah kamu mengizinkannya di perangkat.",
    ],
  },
  {
    h: "Retensi dan penghapusan",
    body: [
      "Penawaran yang terjual hilang dari daftar setelah 24 jam; penawaran yang kamu hapus dipulihkan paling lama 14 hari, lalu dihapus permanen beserta fotonya.",
      "Menghapus akun menghapus profil, kontribusi, draf, tanggapan, poin, percakapan, penawaran, dan sesi login — lihat halaman Hapus Akun.",
    ],
  },
  {
    h: "AI dan data pihak ketiga",
    body: [
      "Jawaban AI iTAP hanya memakai konten iTAP yang sudah dikurasi dan data publik — pertanyaanmu tersimpan sementara dan tidak dipakai untuk melatih model.",
      "Data cuaca, jadwal salat, harga BBM, dan jadwal transportasi berasal dari sumber publik (BMKG, Kemenag, Pertamina, operator) dan diambil lewat cache, bukan dari data akunmu.",
    ],
  },
  {
    h: "Pemroses data (pihak ketiga)",
    body: [
      "Supabase (Singapura) — database, autentikasi, dan penyimpanan file; data akunmu tersimpan di sana.",
      "Vercel — hosting situs ini.",
      "Resend — pengiriman email (verifikasi, reset kata sandi, notifikasi).",
      "Meta WhatsApp (lewat ZapClaw) — pengiriman kode OTP ke nomor WhatsAppmu, bila kamu memakai verifikasi WhatsApp.",
      "Google — login dengan Google (bila kamu memilihnya).",
      "Firebase — notifikasi push ke perangkatmu (bila kamu mengizinkannya).",
      "Kami tidak menjual datamu. Pemroses di atas hanya menerima data yang diperlukan untuk fungsinya.",
    ],
  },
];

export default function PrivasiPage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-xl font-bold text-ink">Privasi &amp; Data Akun</h1>
      <p className="mt-1 text-sm text-muted">Terakhir diperbarui: 18 November 2026. Teks ini ditulis baru untuk iTAP Belitung.</p>
      {SECTIONS.map((s) => (
        <section key={s.h} aria-labelledby={s.h} className="mt-6">
          <h2 id={s.h} className="text-lg font-semibold text-ink">{s.h}</h2>
          <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-base leading-7 text-ink">
            {s.body.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
