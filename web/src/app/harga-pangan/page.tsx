// Halaman konten iTAP: Harga Pangan Harian — #24 Tabel Harga Pangan.
// Data ASLI dari data/harga-pangan.json situs lama (13 komoditas, Pasar
// Tanjung Pandan, sumber ADAT/Diskominfo). Harga kemarin tidak ada di sumber
// -> kolom perubahan memakai catatan sumber ("Harga tetap / baru").
import type { Metadata } from "next";
import { getDailyPrices } from "@/lib/data";
import { formatDateLoose, formatDateTimeLoose, formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  alternates: { canonical: "/harga-pangan" },
  title: "Harga Pangan Harian Belitung",
  description: "Harga pangan harian di Pasar Tanjung Pandan, Belitung — dari ADAT Belitung dan Diskominfo Kab. Belitung.",
};

export default async function HargaPanganPage() {
  const prices = await getDailyPrices();
  const lang = await getServerLang();
  const naik = prices.items.filter((i) => i.status === "naik").length;
  const turun = prices.items.filter((i) => i.status === "turun").length;

  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t(lang, "food.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {prices.market} · {t(lang, "food.marketLabel")}: {formatDateLoose(prices.source_date, lang)} · {t(lang, "food.fetchedLabel")}: {formatDateTimeLoose(prices.fetched_at, lang)}
        </p>
        <p className="mt-1 text-sm text-muted">
          {t(lang, "food.sourceLabel")}: {prices.source}
          {/* Tautan sumber hanya tampil bila URL-nya ada: sebelumnya href=""
              (source_url kosong di jalur DB) sehingga tautan mati. */}
          {prices.source_url ? (
            <>
              .{" "}
              <a href={prices.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                {t(lang, "food.viewSource")}
              </a>
            </>
          ) : (
            "."
          )}
        </p>
      </header>

      <div className="flex flex-wrap gap-2" aria-label="Ringkasan perubahan">
        <Badge tone="info">{t(lang, "food.commodities", { count: prices.items.length })}</Badge>
        <Badge tone="rejected">{t(lang, "food.upCount", { count: naik })}</Badge>
        <Badge tone="active">{t(lang, "food.downCount", { count: turun })}</Badge>
        <Badge tone="draft">{t(lang, "food.flatCount", { count: prices.items.length - naik - turun })}</Badge>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-canvas" tabIndex={0} role="region" aria-label={t(lang, "food.tableAria")}>
        <table className="w-full text-left text-sm">
          <caption className="sr-only">{t(lang, "food.caption")}</caption>
          <thead>
            <tr className="border-b border-line bg-surface text-xs uppercase text-muted">
              <th scope="col" className="px-4 py-3">{t(lang, "food.commodity")}</th>
              <th scope="col" className="px-4 py-3">{t(lang, "food.todayPrice")}</th>
              <th scope="col" className="px-4 py-3">{t(lang, "food.change")}</th>
            </tr>
          </thead>
          <tbody>
            {prices.items.map((it) => (
              <tr key={it.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{it.commodity}</td>
                <td className="px-4 py-3 text-base font-bold text-ink">{formatRupiah(it.price)} <span className="text-sm font-normal text-muted">{t(lang, "food.per", { unit: it.unit })}</span></td>
                <td className="px-4 py-3 text-muted">
                  {it.status === "naik" ? <span className="font-semibold text-danger">{t(lang, "food.up")}</span> : it.status === "turun" ? <span className="font-semibold text-success">{t(lang, "food.down")}</span> : <span>{t(lang, "food.flat")}</span>}
                  {" · "}{it.change_note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted">
        {t(lang, "food.note")}
      </p>
    </div>
  );
}
