// A4 (M8) — Kepercayaan marketplace tanpa escrow (entrepreneur.md).
// Semua teks ditulis baru untuk iTAP. TIDAK ada klaim "terverifikasi"
// umum: satu-satunya status verifikasi yang bisa dibaca lapisan aplikasi
// untuk penjual lain adalah WhatsApp (profiles.whatsappVerifiedAt);
// status email penjual lain hanya ada di auth.users dan tidak terbaca di
// sini. Badge yang tampil karena itu HANYA "WhatsApp terverifikasi" bila
// memang ada — bila tidak ada, tampil catatan jujur "belum terverifikasi".
// Umur akun + jumlah penawaran aktif berasal dari data nyata (profiles
// + hitung listings aktif). Panduan transaksi aman + checklist COD tampil
// di ruang chat; tombol "Laporkan penipuan" memakai modal S26 yang sudah
// ada (report-modal.tsx) dengan alasan awal "Penipuan atau mencurigakan".
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui";
import { formatDateWIB } from "@/lib/format";

export function SellerTrustBox({
  whatsappVerified,
  since,
  activeListings,
}: {
  whatsappVerified: boolean;
  since: string | null;
  activeListings: number;
}) {
  return (
    <section aria-labelledby="penjual-title" className="rounded-lg border border-line bg-canvas p-5">
      <h2 id="penjual-title" className="text-lg font-semibold text-ink">Penjual</h2>
      <div className="mt-3 flex flex-col gap-2 text-sm text-ink">
        {whatsappVerified ? (
          <p className="flex flex-wrap items-center gap-2">
            <Badge tone="active"><ShieldCheck className="size-3.5" aria-hidden="true" /> WhatsApp terverifikasi</Badge>
            <span className="text-muted">Nomor WhatsApp penjual sudah terverifikasi.</span>
          </p>
        ) : (
          <p>
            <Badge tone="example">Penjual belum terverifikasi WhatsApp</Badge>
            <span className="mt-1 block text-muted">
              Verifikasi WhatsApp penjual ini belum tercatat. Lebih berhati-hatilah: periksa barang sebelum membayar
              dan jangan transfer sebelum bertemu.
            </span>
          </p>
        )}
        <p className="text-muted">
          Bergabung sejak {since ? formatDateWIB(since) : "tidak tercatat"} · {activeListings} penawaran aktif
        </p>
        <p className="text-muted">
          iTAP tidak menyediakan pembayaran atau rekening penampung — kesepakatan dan pembayaran diatur langsung
          kedua pihak. Baca panduan transaksi aman di chat sebelum membayar.
        </p>
      </div>
    </section>
  );
}

/** Panduan transaksi aman + checklist sebelum COD — tampil di ruang chat. */
export function SafeTradeGuide() {
  return (
    <details className="rounded-lg border border-line bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-accent">
        Panduan transaksi aman &amp; checklist sebelum COD
      </summary>
      <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink">
        <li>Bertemu di tempat ramai dan terang, sebaiknya siang hari. Ajak teman bila memungkinkan.</li>
        <li>Periksa barang sampai puas sebelum membayar — coba nyalakan, cek kelengkapan dan kondisi fisiknya.</li>
        <li>Jangan transfer atau DP sebelum melihat barang. iTAP tidak menyediakan pembayaran atau rekening penampung.</li>
        <li>Jangan pernah bagikan kode OTP, kata sandi, atau kode verifikasi apa pun — penjual asli tidak pernah memintanya.</li>
        <li>Harga jauh di bawah pasaran, penjual mendesak, atau diminta pindah ke aplikasi lain adalah tanda waspada.</li>
        <li>Simpan bukti chat dan bukti pembayaran bila sudah membayar.</li>
        <li>Bila menemukan penipuan, pakai tombol “Laporkan penipuan” di atas — laporan ditinjau redaksi.</li>
      </ul>
    </details>
  );
}
