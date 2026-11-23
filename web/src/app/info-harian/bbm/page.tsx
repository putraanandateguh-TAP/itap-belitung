// S33 Harga BBM (F14) — harga BBM Pertamina untuk Provinsi Bangka Belitung.
// Pertamina hanya mempublikasikan harga sebagai halaman web (tanpa API JSON
// publik yang stabil), dan harga berubah paling sering sebulan sekali. Data
// dikurasi di src/data/bbm.json (sumber resmi + dicek silang beberapa media)
// dengan tanggal berlaku + tanggal dicek. Bila sudah >40 hari sejak dicek,
// halaman menandai "mungkin basi".
import type { Metadata } from "next";
import { Badge } from "@/components/ui";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import bbm from "@/data/bbm.json";

export const metadata: Metadata = {
  alternates: { canonical: "/info-harian/bbm" },
  title: "Harga BBM Belitung",
  description: "Harga BBM Pertamina yang berlaku di Belitung.",
};

function fmtDate(iso: string, lang: string): string {
  return new Date(`${iso}T00:00:00+07:00`).toLocaleDateString(lang === "en" ? "en-GB" : "id-ID", {
    day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta",
  });
}

export default async function BbmPage() {
  const lang = await getServerLang();
  const ageDays = (Date.now() - new Date(`${bbm.checked_at}T00:00:00+07:00`).getTime()) / 86_400_000;
  const stale = ageDays > 40;
  const rp = (n: number) => `Rp${n.toLocaleString("id-ID")}`;
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t(lang, "info.fuelTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t(lang, "info.fuelDesc")}</p>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted">
          <span>{t(lang, "info.fuelEffective", { date: fmtDate(bbm.effective_since, lang) })}</span>
          <span>· {t(lang, "info.fuelChecked", { date: fmtDate(bbm.checked_at, lang) })}</span>
          {stale && <Badge tone="example">{t(lang, "daily.stale")}</Badge>}
        </p>
      </header>

      <div className="overflow-hidden rounded-lg border border-line bg-canvas shadow-card">
        <table className="w-full text-sm">
          <caption className="sr-only">{t(lang, "info.fuelTitle")} — {bbm.region}</caption>
          <thead className="bg-surface text-left text-xs uppercase text-muted">
            <tr><th scope="col" className="px-4 py-2">{t(lang, "info.fuelProduct")}</th><th scope="col" className="px-4 py-2 text-right">{t(lang, "info.fuelPerLiter")}</th></tr>
          </thead>
          <tbody>
            {bbm.items.map((it) => (
              <tr key={it.name} className="border-t border-line">
                <th scope="row" className="px-4 py-3 text-left font-semibold text-ink">
                  {it.name}{" "}
                  <span className="text-xs font-normal text-muted">({it.type === "subsidi" ? t(lang, "info.fuelSubsidized") : t(lang, "info.fuelNonSubsidized")})</span>
                </th>
                <td className="px-4 py-3 text-right font-semibold text-ink tabular-nums">{rp(it.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-muted">
        {t(lang, "info.fuelSourceNote", { region: bbm.region })}{" "}
        <a href={bbm.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline">
          {bbm.source}
        </a>
      </p>
    </div>
  );
}
