import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Ketentuan Penggunaan",
  description: "Ketentuan penggunaan portal iTAP Belitung: akun, jual beli, kontribusi, dan poin.",
};

const SECTIONS: { h: string; body: string[] }[] = [
  {
    h: "Akun",
    body: [
      "Satu akun untuk satu orang. Jaga kata sandimu; aktivitas di akunmu adalah tanggung jawabmu.",
      "Verifikasi email wajib sebelum berkomentar atau menulis. Verifikasi WhatsApp wajib sebelum berjualan di marketplace (Fase 2).",
      "Registrasi tetap bisa tanpa izin lokasi — lokasi hanya nama wilayah yang kamu isi sendiri.",
    ],
  },
  {
    h: "Jual beli (Fase 2)",
    body: [
      "Sebelum memasang penawaran atau mengirim pesan pertama, kamu menyetujui aturan marketplace.",
      "Penjual wajib mengonfirmasi ketersediaan barang secara berkala; tanpa jawaban dalam batas waktu, penawaran dinonaktifkan.",
      "Barang terjual hilang dari daftar setelah 24 jam dan tidak bisa diaktifkan kembali.",
      "Tidak ada pembayaran atau escrow di dalam aplikasi — pembayaran dan pengiriman diatur langsung antara pembeli dan penjual.",
      "Nomor penjual tersamarkan; hubungi penjual lewat chat aplikasi.",
    ],
  },
  {
    h: "Kontribusi dan poin",
    body: [
      "Artikel yang kamu kirim ditinjau redaksi sebelum terbit. Artikel terkunci sampai ada keputusan redaksi.",
      "Perubahan setelah terbit ditinjau ulang, kecuali akunmu punya persetujuan otomatis dari redaksi.",
      "Satu poin diberikan per artikel atau informasi yang disetujui. Penukaran poin belum tersedia.",
    ],
  },
  {
    h: "Moderasi",
    body: [
      "Konten yang dilaporkan ditinjau moderator; materi bisa disembunyikan dan akun bisa dinonaktifkan.",
      "Kata-kata dalam kamus moderasi superadmin bisa menahan materi secara otomatis — hasil penandaan bisa diperiksa ulang.",
      "Kritik yang sopan tidak ditolak; label sentimen AI hanya membantu redaksi, bukan memutuskan.",
    ],
  },
  {
    h: "Pelanggaran dan penghapusan akun",
    body: [
      "Pelanggaran berulang (penipuan, spam, ujaran kebencian) bisa membuat akun dinonaktifkan.",
      "Kamu bisa menghapus akunmu kapan saja dari Pengaturan — semua data terkait ikut terhapus (lihat Privasi).",
    ],
  },
];

export default function KetentuanPage() {
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-xl font-bold text-ink">Ketentuan Penggunaan</h1>
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
