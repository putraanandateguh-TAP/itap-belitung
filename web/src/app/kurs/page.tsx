// Halaman konten iTAP: Kurs, IHSG & Emas — #26 Kartu Kurs & Pasar.
// Data ASLI dari data/keuangan.json situs lama (BCA e-Rate/TT/Bank Notes,
// IHSG Yahoo Finance tertunda, emas Antam 1 gram 17 Nov 2026).
import type { Metadata } from "next";
import { getMarketRates } from "@/lib/data";
import { formatNumber, formatRupiah } from "@/lib/format";

export const metadata: Metadata = {
  title: "Kurs, IHSG & Emas",
  description: "Kurs rupiah terhadap dolar dan mata uang lain, IHSG, dan harga emas Antam — data terakhir dari sumber publik.",
};

export default async function KursPage() {
  const rates = await getMarketRates();
  const usd = rates.currencies.find((c) => c.code === "USD");

  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">Kurs, IHSG &amp; Emas</h1>
        <p className="mt-1 text-sm text-muted">Terakhir diperbarui: {rates.fx_fetched_at}. Data dari sumber publik — bukan rekomendasi investasi.</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <article className="rounded-lg border border-line bg-canvas p-4 shadow-card">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Dolar AS (e-Rate BCA)</h2>
          <p className="mt-1 text-lg font-bold text-ink">{usd ? formatRupiah(usd.sell_erate) : "—"}</p>
          <p className="text-sm text-muted">Beli {usd ? formatRupiah(usd.buy_erate) : "—"} · Jual {usd ? formatRupiah(usd.sell_erate) : "—"}</p>
        </article>
        <article className="rounded-lg border border-line bg-canvas p-4 shadow-card">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">IHSG</h2>
          <p className="mt-1 text-lg font-bold text-ink">{formatNumber(rates.ihsg.value)}</p>
          <p className="text-sm">
            <span className={rates.ihsg.change < 0 ? "font-semibold text-danger" : "font-semibold text-success"}>
              {rates.ihsg.change < 0 ? "↓" : "↑"} {formatNumber(rates.ihsg.change)} ({rates.ihsg.percent}%)
            </span>{" "}
            <span className="text-muted">· {rates.ihsg.as_of}</span>
          </p>
          <p className="mt-1 text-xs text-muted">{rates.ihsg.source}</p>
        </article>
        <article className="rounded-lg border border-line bg-canvas p-4 shadow-card">
          <h2 className="text-xs font-medium uppercase tracking-wider text-muted">Emas Antam (1 gram)</h2>
          <p className="mt-1 text-lg font-bold text-ink">{formatRupiah(rates.gold.price_1g)}</p>
          <p className="text-sm">
            <span className={rates.gold.price_1g < rates.gold.previous ? "font-semibold text-danger" : "font-semibold text-success"}>
              {rates.gold.price_1g < rates.gold.previous ? "↓ Turun" : "↑ Naik"} {formatRupiah(Math.abs(rates.gold.price_1g - rates.gold.previous))}
            </span>{" "}
            <span className="text-muted">dari {formatRupiah(rates.gold.previous)} · {rates.gold.date}</span>
          </p>
          <p className="mt-1 text-xs text-muted">{rates.gold.source}</p>
        </article>
      </div>

      <section aria-labelledby="kurs-table">
        <h2 id="kurs-table" className="text-lg font-semibold text-ink">Kurs mata uang (BCA)</h2>
        <p className="mt-1 text-sm text-muted">{rates.fx_source} · Diambil: {rates.fx_fetched_at}</p>
        <div className="mt-3 overflow-x-auto rounded-lg border border-line bg-canvas" tabIndex={0} role="region" aria-label="Tabel kurs mata uang">
          <table className="w-full text-left text-sm">
            <caption className="sr-only">Kurs beli dan jual per mata uang</caption>
            <thead>
              <tr className="border-b border-line bg-surface text-xs uppercase text-muted">
                <th scope="col" className="px-4 py-3">Mata uang</th>
                <th scope="col" className="px-4 py-3">e-Rate beli</th>
                <th scope="col" className="px-4 py-3">e-Rate jual</th>
                <th scope="col" className="px-4 py-3">TT beli</th>
                <th scope="col" className="px-4 py-3">TT jual</th>
              </tr>
            </thead>
            <tbody>
              {rates.currencies.map((c) => (
                <tr key={c.code} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">{c.code}</td>
                  <td className="px-4 py-3">{formatRupiah(c.buy_erate)}</td>
                  <td className="px-4 py-3">{formatRupiah(c.sell_erate)}</td>
                  <td className="px-4 py-3">{formatRupiah(c.buy_tt)}</td>
                  <td className="px-4 py-3">{formatRupiah(c.sell_tt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-sm text-muted">
          Nilai 0 pada beberapa kolom Bank Notes berarti sumber tidak menyediakan angka itu pada tanggal pengambilan. Angka kurs adalah data tertunda dari sumber publik.
        </p>
      </section>
    </div>
  );
}
