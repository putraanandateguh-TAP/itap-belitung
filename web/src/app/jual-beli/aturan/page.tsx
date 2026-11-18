// S12 — Persetujuan aturan marketplace (F04).
// Teks aturan ditulis baru untuk iTAP (bukan copy Satam). Persetujuan dicatat
// lewat POST /api/auth/marketplace-rules/accept. Gerbang M3: email
// terverifikasi; verifikasi WhatsApp (P2) belum tersedia dan bukan syarat.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session-client";
import { Banner, Button, ButtonLink, EmptyState } from "@/components/ui";

const RULES: { title: string; body: string }[] = [
  {
    title: "Barang yang dijual harus legal",
    body: "Hanya barang yang boleh diperjualbelikan menurut hukum yang berlaku. Barang curian, palsu, terlarang, atau berbahaya tidak boleh dipasang.",
  },
  {
    title: "Deskripsi dan harga harus jujur",
    body: "Tulis kondisi barang apa adanya, cantumkan harga dalam Rupiah, dan sertakan foto barang yang sebenarnya — bukan foto dari internet.",
  },
  {
    title: "Transaksi langsung antar pihak",
    body: "Kesepakatan, pembayaran, dan penyerahan barang diatur langsung antara penjual dan pembeli. iTAP tidak menyediakan pembayaran, escrow, atau pengiriman, dan bukan pihak dalam transaksi.",
  },
  {
    title: "Bertemu dengan aman",
    body: "Periksa barang sebelum membayar. Sebaiknya bertemu di tempat ramai pada siang hari, dan jangan membayar penuh sebelum barang diterima.",
  },
  {
    title: "Foto milik sendiri, data dijaga",
    body: "Unggah hanya foto milikmu. Foto dikompresi dan metadata lokasi dibuang sebelum diunggah. Nomor kontak dan titik lokasimu hanya terlihat oleh pembeli yang sudah masuk dan emailnya terverifikasi.",
  },
  {
    title: "Satu penawaran, satu barang",
    body: "Satu penawaran untuk satu barang (atau satu paket yang jelas). Bila barang sudah terjual, segera tandai terjual di Penawaranku.",
  },
  {
    title: "Dilarang menipu dan mengganggu",
    body: "Penipuan, harga pancingan, spam, dan ujaran yang merendahkan tidak ditoleransi. Penawaran bisa disembunyikan dan akun bisa dinonaktifkan oleh redaksi.",
  },
  {
    title: "Laporan ditinjau redaksi",
    body: "Pembeli bisa melaporkan penawaran yang mencurigakan. Laporan ditinjau redaksi; bila terbukti melanggar, penawaran disembunyikan dan penjual diberitahu alasannya.",
  },
];

export default function AturanPage() {
  const { session, loading } = useSession();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/marketplace-rules/accept", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? `Gagal menyimpan persetujuan (HTTP ${res.status}).`);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Gagal menyimpan persetujuan.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div aria-busy="true" className="py-8"><div className="skeleton h-64 w-full" /></div>;
  }
  if (!session) {
    return (
      <div className="py-8">
        <EmptyState
          title="Masuk dulu untuk menyetujui aturan."
          desc="Persetujuan aturan marketplace dicatat pada akunmu, jadi kamu perlu masuk terlebih dahulu."
          action={<ButtonLink href="/masuk">Masuk / daftar</ButtonLink>}
          titleAs="h1"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-xl font-bold text-ink">Aturan marketplace iTAP Belitung</h1>
        <p className="mt-1 text-sm text-muted">
          Baca dan setujui aturan ini sebelum memasang penawaran atau mengirim pesan pertama.
          Persetujuan dicatat pada akun {session.email}.
        </p>
      </div>

      <Banner tone="info">
        Verifikasi yang berlaku saat ini: <strong>email terverifikasi</strong>. Verifikasi WhatsApp
        belum tersedia (layanan OTP WhatsApp masih disiapkan) dan bukan syarat untuk berjualan saat ini.
      </Banner>

      <ol className="flex flex-col gap-3">
        {RULES.map((r, i) => (
          <li key={r.title} className="rounded-lg border border-line bg-canvas p-4">
            <p className="font-semibold text-ink">{i + 1}. {r.title}</p>
            <p className="mt-1 text-sm text-muted">{r.body}</p>
          </li>
        ))}
      </ol>

      {session.marketplaceRulesAccepted ? (
        <Banner tone="success">
          Kamu sudah menyetujui aturan marketplace.{" "}
          <Link href="/jual-beli/pasang" className="font-semibold underline">Pasang penawaran</Link>
        </Banner>
      ) : done ? (
        <Banner tone="success">
          Persetujuan tersimpan.{" "}
          <Link href="/jual-beli/pasang" className="font-semibold underline">Lanjutkan pasang penawaran</Link>
        </Banner>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-canvas p-4">
          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-4 accent-accent"
            />
            Saya sudah membaca dan menyetujui seluruh aturan marketplace di atas.
          </label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={!agreed} loading={busy} onClick={accept}>Saya setuju</Button>
            <ButtonLink href="/jual-beli" variant="secondary">Kembali ke Jual Beli</ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}
