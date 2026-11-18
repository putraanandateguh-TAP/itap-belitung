// S30 Pesawat & Kapal (F14) — jadwal penerbangan & kapal.
// JUJUR: tidak ada API publik stabil yang memetakan jadwal pesawat/kapal
// Belitung (jadwal berubah dan tersebar di maskapai/operator). Halaman ini
// menampilkan pesan jujur sampai sumber stabil ditemukan — tidak ada jadwal
// karangan. Cache transport (bila suatu hari terisi cron) tetap dibaca.
import type { Metadata } from "next";
import { getDailySnapshot } from "@/lib/daily";
import { DailyStamp } from "@/components/daily-ui";
import { EmptyState } from "@/components/ui";

export const metadata: Metadata = {
  title: "Jadwal Pesawat & Kapal Belitung",
  description: "Jadwal penerbangan dan kapal dari dan ke Belitung.",
};

export default async function TransportPage() {
  const snap = await getDailySnapshot("transport");
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">Pesawat &amp; Kapal</h1>
        <p className="mt-1 text-sm text-muted">Jadwal penerbangan &amp; kapal dari dan ke Belitung (Bandara H.A.S. Hanandjoeddin &amp; Pelabuhan Tanjung Pandan).</p>
        {snap && <DailyStamp fetchedAt={snap.fetched_at} asOfDate={snap.as_of} />}
      </header>

      {!snap && (
        <EmptyState
          title="Jadwal pesawat & kapal belum tersedia"
          desc="Belum ada sumber publik yang stabil untuk jadwal pesawat dan kapal Belitung — jadwal berubah-ubah dan tersebar di maskapai serta operator kapal. iTAP tidak menampilkan jadwal perkiraan. Silakan periksa langsung ke maskapai atau operator kapal untuk jadwal hari ini."
        />
      )}

      {snap && (
        <EmptyState
          title="Jadwal pesawat & kapal belum bisa dibaca"
          desc="Cache jadwal sudah tersimpan, tapi bentuk datanya belum dikenali halaman ini. Redaksi sudah mencatatnya lewat cron daily-info-fetch."
        />
      )}
    </div>
  );
}
