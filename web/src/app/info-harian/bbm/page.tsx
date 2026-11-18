// S33 Harga BBM (F14) — harga BBM Pertamina.
// JUJUR: Pertamina mempublikasikan harga hanya sebagai halaman web
// (pertamina.com/id/harga-bbm), tanpa API JSON publik yang stabil —
// scraping halaman itu rapuh dan bisa berubah sewaktu-waktu. Sampai ada
// sumber stabil, halaman ini menampilkan pesan jujur, bukan harga karangan.
import type { Metadata } from "next";
import { getDailySnapshot } from "@/lib/daily";
import { DailyStamp } from "@/components/daily-ui";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = {
  title: "Harga BBM Belitung",
  description: "Harga BBM Pertamina yang berlaku di Belitung.",
};

export default async function BbmPage() {
  const snap = await getDailySnapshot("fuel");
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">Harga BBM</h1>
        <p className="mt-1 text-sm text-muted">Harga BBM Pertamina yang berlaku di Belitung.</p>
        {snap && <DailyStamp fetchedAt={snap.fetched_at} asOfDate={snap.as_of} />}
      </header>

      {!snap && (
        <EmptyState
          title="Harga BBM belum tersedia"
          desc="Pertamina mempublikasikan harga BBM hanya sebagai halaman web, tanpa API publik yang stabil untuk diambil otomatis. iTAP tidak menampilkan harga perkiraan. Silakan periksa harga resmi di situs Pertamina atau SPBU terdekat."
        />
      )}

      {snap && (
        <EmptyState
          title="Harga BBM belum bisa dibaca"
          desc="Cache harga sudah tersimpan, tapi bentuk datanya belum dikenali halaman ini. Redaksi sudah mencatatnya lewat cron daily-info-fetch."
        />
      )}
    </div>
  );
}
