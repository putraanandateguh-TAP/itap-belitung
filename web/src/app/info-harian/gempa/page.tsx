// S38 Gempa (F14) — info gempa terbaru BMKG + kualitas udara.
// Gempa: dari cache daily_info_snapshots (cron, endpoint BMKG TEWS).
// Kualitas udara: JUJUR belum tersedia — tidak ada API publik BMKG untuk
// kualitas udara; halaman ini tidak menampilkan angka karangan.
import type { Metadata } from "next";
import { getDailySnapshot } from "@/lib/daily";
import { parseQuakePayload } from "@/lib/daily-parse";
import { DailyEmpty, DailyStamp, DailyUnparsed } from "@/components/daily-ui";
import { Banner } from "@/components/ui";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  alternates: { canonical: "/info-harian/gempa" },
  title: "Info Gempa Belitung",
  description: "Gempa terbaru dari BMKG dan kualitas udara Belitung.",
};

export default async function GempaPage() {
  const snap = await getDailySnapshot("earthquake");
  const lang = await getServerLang();
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t(lang, "info.quakeTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t(lang, "info.quakeDesc")}</p>
        {snap && <DailyStamp fetchedAt={snap.fetched_at} asOfDate={snap.as_of} />}
      </header>

      {!snap && (
        <DailyEmpty
          sourceName={t(lang, "info.quakeName")}
          reason={t(lang, "info.emptyReason")}
        />
      )}

      {snap && (() => {
        const parsed = parseQuakePayload(snap.payload);
        if (!parsed) return <DailyUnparsed sourceName={t(lang, "info.quakeName")} />;
        return (
          <div className="flex flex-col gap-4">
            <article className="rounded-lg border border-line bg-canvas p-4 shadow-card">
              <h2 className="text-base font-bold text-ink">
                {t(lang, "info.magnitude")} {parsed.magnitude} · {parsed.date} {parsed.time}
              </h2>
              <dl className="mt-3 flex flex-col gap-2 text-sm">
                <div className="flex gap-2"><dt className="w-28 shrink-0 font-semibold text-muted">{t(lang, "info.quakeRegion")}</dt><dd className="text-ink">{parsed.region}</dd></div>
                <div className="flex gap-2"><dt className="w-28 shrink-0 font-semibold text-muted">{t(lang, "info.quakeDepth")}</dt><dd className="text-ink">{parsed.depth}</dd></div>
                <div className="flex gap-2"><dt className="w-28 shrink-0 font-semibold text-muted">{t(lang, "info.quakeCoords")}</dt><dd className="text-ink">{parsed.coordinates}</dd></div>
                {parsed.felt && <div className="flex gap-2"><dt className="w-28 shrink-0 font-semibold text-muted">{t(lang, "info.quakeFelt")}</dt><dd className="text-ink">{parsed.felt}</dd></div>}
                {parsed.potential && <div className="flex gap-2"><dt className="w-28 shrink-0 font-semibold text-muted">{t(lang, "info.quakePotential")}</dt><dd className="text-ink">{parsed.potential}</dd></div>}
              </dl>
            </article>
            <p className="text-xs text-muted">
              {t(lang, "info.quakeNote")}
            </p>
          </div>
        );
      })()}

      <Banner tone="info">
        {t(lang, "info.airQuality")}
      </Banner>
    </div>
  );
}
