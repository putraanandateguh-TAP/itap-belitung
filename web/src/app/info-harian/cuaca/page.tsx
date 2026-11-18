// S28 Cuaca detail (F14) — prakiraan BMKG per jam, Tanjung Pandan.
// Baca dari cache daily_info_snapshots (diisi cron); tanpa cache tampilkan
// pesan jujur, bukan prakiraan karangan.
import type { Metadata } from "next";
import { getDailySnapshot } from "@/lib/daily";
import { parseWeatherPayload } from "@/lib/daily-parse";
import { DailyEmpty, DailyStamp, DailyUnparsed } from "@/components/daily-ui";
import { formatDateWIB } from "@/lib/format";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Cuaca Belitung — Prakiraan BMKG",
  description: "Prakiraan cuaca BMKG per jam untuk Tanjung Pandan, Belitung.",
};

export default async function CuacaPage() {
  const snap = await getDailySnapshot("weather");
  const lang = await getServerLang();
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t(lang, "info.weatherTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t(lang, "info.forecastSource")}</p>
        {snap && <DailyStamp fetchedAt={snap.fetched_at} asOfDate={snap.as_of} />}
      </header>

      {!snap && (
        <DailyEmpty
          sourceName={t(lang, "info.weatherName")}
          reason={t(lang, "info.emptyReason")}
        />
      )}

      {snap && (() => {
        const parsed = parseWeatherPayload(snap.payload);
        if (!parsed) return <DailyUnparsed sourceName={t(lang, "info.weatherName")} />;
        return (
          <div className="flex flex-col gap-6">
            <p className="text-sm text-muted">{t(lang, "info.forecastLocation")}: <span className="font-semibold text-ink">{parsed.location}</span></p>
            {parsed.days.map((day) => (
              <section key={day.date} aria-labelledby={`cuaca-${day.date}`}>
                <h2 id={`cuaca-${day.date}`} className="text-base font-bold text-ink">
                  {formatDateWIB(`${day.date}T00:00:00+07:00`, lang)}
                </h2>
                <div className="mt-2 overflow-x-auto rounded-lg border border-line bg-canvas" tabIndex={0} role="region" aria-label={`Prakiraan cuaca ${day.date}`}>
                  <table className="w-full text-left text-sm">
                    <caption className="sr-only">{t(lang, "info.hourlyForecast")}</caption>
                    <thead>
                      <tr className="border-b border-line bg-surface text-xs uppercase text-muted">
                        <th scope="col" className="px-4 py-3">{t(lang, "info.hour")}</th>
                        <th scope="col" className="px-4 py-3">{t(lang, "info.weather")}</th>
                        <th scope="col" className="px-4 py-3">{t(lang, "info.temp")}</th>
                        <th scope="col" className="px-4 py-3">{t(lang, "info.rain")}</th>
                        <th scope="col" className="px-4 py-3">{t(lang, "info.humidity")}</th>
                        <th scope="col" className="px-4 py-3">{t(lang, "info.wind")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {day.items.map((it) => (
                        <tr key={it.time} className="border-b border-line last:border-0">
                          <td className="px-4 py-3 font-semibold text-ink">{it.time}</td>
                          <td className="px-4 py-3 text-ink">{it.desc}</td>
                          <td className="px-4 py-3 text-ink">{it.temp !== null ? `${it.temp}°C` : "—"}</td>
                          <td className="px-4 py-3 text-ink">{it.rainMm !== null ? `${it.rainMm} mm` : "—"}</td>
                          <td className="px-4 py-3 text-ink">{it.humidity !== null ? `${it.humidity}%` : "—"}</td>
                          <td className="px-4 py-3 text-ink">{it.windKmh !== null ? `${it.windKmh} ${lang === "en" ? "km/h" : "km/jam"} ${it.windDir}` : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))}
            <p className="text-xs text-muted">
              {t(lang, "info.waveNote")}
            </p>
          </div>
        );
      })()}
    </div>
  );
}
