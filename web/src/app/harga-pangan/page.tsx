// Halaman konten iTAP: Harga Pangan Harian — #24 Tabel Harga Pangan.
// Data ASLI dari data/harga-pangan.json situs lama (13 komoditas, Pasar
// Tanjung Pandan, sumber ADAT/Diskominfo). Harga kemarin tidak ada di sumber
// -> kolom perubahan memakai catatan sumber ("Harga tetap / baru").
import type { Metadata } from "next";
import { getDailyPrices } from "@/lib/data";
import { formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui";

export const metadata: Metadata = {
  title: "Harga Pangan Harian Belitung",
  description: "Harga pangan harian di Pasar Tanjung Pandan, Belitung — dari ADAT Belitung dan Diskominfo Kab. Belitung.",
};

export default async function HargaPanganPage() {
  const prices = await getDailyPrices();
  const naik = prices.items.filter((i) => i.status === "naik").length;
  const turun = prices.items.filter((i) => i.status === "turun").length;

  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">Harga Pangan Harian</h1>
        <p className="mt-1 text-sm text-muted">
          {prices.market} · Tanggal sumber: {prices.source_date} · Diambil: {prices.fetched_at}
        </p>
        <p className="mt-1 text-sm text-muted">
          Sumber: {prices.source}.{" "}
          <a href={prices.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            Lihat sumber data
          </a>
        </p>
      </header>

      <div className="flex flex-wrap gap-2" aria-label="Ringkasan perubahan">
        <Badge tone="info">{prices.items.length} komoditas</Badge>
        <Badge tone="rejected">{naik} naik</Badge>
        <Badge tone="active">{turun} turun</Badge>
        <Badge tone="draft">{prices.items.length - naik - turun} tetap</Badge>
      </div>

      <div className="overflow-x-auto rounded-lg border border-line bg-canvas" tabIndex={0} role="region" aria-label="Tabel harga pangan">
        <table className="w-full text-left text-sm">
          <caption className="sr-only">Harga pangan harian per komoditas</caption>
          <thead>
            <tr className="border-b border-line bg-surface text-xs uppercase text-muted">
              <th scope="col" className="px-4 py-3">Komoditas</th>
              <th scope="col" className="px-4 py-3">Harga hari ini</th>
              <th scope="col" className="px-4 py-3">Perubahan</th>
            </tr>
          </thead>
          <tbody>
            {prices.items.map((it) => (
              <tr key={it.id} className="border-b border-line last:border-0">
                <td className="px-4 py-3 font-semibold text-ink">{it.commodity}</td>
                <td className="px-4 py-3 text-base font-bold text-ink">{formatRupiah(it.price)} <span className="text-sm font-normal text-muted">per {it.unit}</span></td>
                <td className="px-4 py-3 text-muted">
                  {it.status === "naik" ? <span className="font-semibold text-danger">↑ Naik</span> : it.status === "turun" ? <span className="font-semibold text-success">↓ Turun</span> : <span>Tetap</span>}
                  {" · "}{it.change_note}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm text-muted">
        Harga kemarin tidak tersedia di sumber data saat ini, jadi kolom perubahan memakai catatan sumber. Bila sumber menyediakan harga kemarin, tabel ini menampilkan selisih rupiahnya.
      </p>
    </div>
  );
}
