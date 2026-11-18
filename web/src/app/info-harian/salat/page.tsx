// S29 Jadwal salat (F14) — jadwal Kemenag (via MyQuran) untuk Kab. Belitung.
// Baca dari cache daily_info_snapshots (diisi cron); tanpa cache tampilkan
// pesan jujur, bukan jadwal karangan.
import type { Metadata } from "next";
import { getDailySnapshot } from "@/lib/daily";
import { parsePrayerPayload } from "@/lib/daily-parse";
import { DailyEmpty, DailyStamp, DailyUnparsed } from "@/components/daily-ui";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Jadwal Salat Belitung",
  description: "Jadwal salat Kab. Belitung hari ini — data Kemenag.",
};

export default async function SalatPage() {
  const snap = await getDailySnapshot("prayer");
  const lang = await getServerLang();
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t(lang, "info.prayerTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t(lang, "info.prayerSource")}</p>
        {snap && <DailyStamp fetchedAt={snap.fetched_at} asOfDate={snap.as_of} />}
      </header>

      {!snap && (
        <DailyEmpty
          sourceName={t(lang, "info.prayerName")}
          reason={t(lang, "info.emptyReason")}
        />
      )}

      {snap && (() => {
        const parsed = parsePrayerPayload(snap.payload);
        if (!parsed) return <DailyUnparsed sourceName={t(lang, "info.prayerName")} />;
        const terbit = parsed.times.find((t) => t.label === "Terbit");
        return (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-muted">
              {parsed.location}{parsed.region ? `, ${parsed.region}` : ""} · {parsed.dateLabel}
              {terbit ? ` · ${t(lang, "info.sunrise", { time: terbit.time })}` : ""}
            </p>
            <div className="overflow-x-auto rounded-lg border border-line bg-canvas" tabIndex={0} role="region" aria-label={t(lang, "info.prayerToday")}>
              <table className="w-full text-left text-sm">
                <caption className="sr-only">{t(lang, "info.prayerToday")}</caption>
                <thead>
                  <tr className="border-b border-line bg-surface text-xs uppercase text-muted">
                    <th scope="col" className="px-4 py-3">{t(lang, "info.prayerTime")}</th>
                    <th scope="col" className="px-4 py-3">{t(lang, "info.time")}</th>
                  </tr>
                </thead>
                <tbody>
                  {parsed.times.map((t) => (
                    <tr key={t.label} className="border-b border-line last:border-0">
                      <td className="px-4 py-3 font-semibold text-ink">{t.label}</td>
                      <td className="px-4 py-3 text-base font-bold text-ink">{t.time}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted">
              {t(lang, "info.prayerNote")}
            </p>
          </div>
        );
      })()}
    </div>
  );
}
