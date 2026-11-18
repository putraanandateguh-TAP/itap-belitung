// S38 Gempa (F14) — info gempa terbaru BMKG + kualitas udara.
// Gempa: dari cache daily_info_snapshots (cron, endpoint BMKG TEWS).
// Kualitas udara: JUJUR belum tersedia — tidak ada API publik BMKG untuk
// kualitas udara; halaman ini tidak menampilkan angka karangan.
import type { Metadata } from "next";
import { getDailySnapshot } from "@/lib/daily";
import { parseQuakePayload } from "@/lib/daily-parse";
import { DailyEmpty, DailyStamp, DailyUnparsed } from "@/components/daily-ui";
import { Banner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Info Gempa Belitung",
  description: "Gempa terbaru dari BMKG dan kualitas udara Belitung.",
};

export default async function GempaPage() {
  const snap = await getDailySnapshot("earthquake");
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">Gempa</h1>
        <p className="mt-1 text-sm text-muted">Gempa terbaru dari BMKG (TEWS). Sumber: data.bmkg.go.id.</p>
        {snap && <DailyStamp fetchedAt={snap.fetched_at} asOfDate={snap.as_of} />}
      </header>

      {!snap && (
        <DailyEmpty
          sourceName="Info gempa"
          reason="cron daily-info-fetch belum pernah mengisi cache (butuh database Supabase live, P1)."
        />
      )}

      {snap && (() => {
        const parsed = parseQuakePayload(snap.payload);
        if (!parsed) return <DailyUnparsed sourceName="Info gempa" />;
        return (
          <div className="flex flex-col gap-4">
            <article className="rounded-lg border border-line bg-canvas p-4 shadow-card">
              <h2 className="text-base font-bold text-ink">
                Magnitudo {parsed.magnitude} · {parsed.date} {parsed.time}
              </h2>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex gap-2"><dt className="w-28 shrink-0 font-semibold text-muted">Wilayah</dt><dd className="text-ink">{parsed.region}</dd></div>
                <div className="flex gap-2"><dt className="w-28 shrink-0 font-semibold text-muted">Kedalaman</dt><dd className="text-ink">{parsed.depth}</dd></div>
                <div className="flex gap-2"><dt className="w-28 shrink-0 font-semibold text-muted">Koordinat</dt><dd className="text-ink">{parsed.coordinates}</dd></div>
                {parsed.felt && <div className="flex gap-2"><dt className="w-28 shrink-0 font-semibold text-muted">Dirasakan</dt><dd className="text-ink">{parsed.felt}</dd></div>}
                {parsed.potential && <div className="flex gap-2"><dt className="w-28 shrink-0 font-semibold text-muted">Potensi</dt><dd className="text-ink">{parsed.potential}</dd></div>}
              </dl>
            </article>
            <p className="text-xs text-muted">
              Ini gempa terbaru yang tercatat BMKG secara nasional, belum tentu berpusat di
              Belitung — periksa kolom wilayah di atas. Bila gempa dirasakan di Belitung,
              ikuti arahan resmi BPBD/BMKG.
            </p>
          </div>
        );
      })()}

      <Banner tone="info">
        Kualitas udara: belum tersedia. Tidak ada API publik BMKG untuk kualitas udara
        Belitung, jadi halaman ini tidak menampilkan angka perkiraan.
      </Banner>
    </div>
  );
}
