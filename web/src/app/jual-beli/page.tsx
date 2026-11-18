// S07 — Marketplace: daftar penawaran publik (F03).
// Server component: baca GET /api/listings lewat listListings langsung
// (tanda tangan sama). Filter kategori + cari + urut + pagination via
// form GET (tanpa JS pun jalan). Empty state jujur: seed tidak punya
// listing — jangan karang penawaran.
import type { Metadata } from "next";
import { listListings, type ListingSort } from "@/lib/marketplace";
import { LISTING_CATEGORIES, LISTING_CATEGORY_LABELS } from "@/lib/listings";
import { ListingCard } from "@/components/listing-card";
import { Banner, ButtonLink, EmptyState, Pagination } from "@/components/ui";
import { ListingFilterForm } from "./filter-form";

export const metadata: Metadata = {
  title: "Jual Beli Belitung",
  description: "Penawaran jual beli warga Belitung di iTAP: kendaraan, elektronik, rumah tangga, dan lainnya. Transaksi langsung antar pihak.",
};

const SORT_LABELS: Record<ListingSort, string> = {
  terbaru: "Terbaru",
  termurah: "Harga termurah",
  termahal: "Harga termahal",
  terpopuler: "Paling dilihat",
};

export default async function JualBeliPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; sort?: string; page?: string }>;
}) {
  const sp = await searchParams;
  const page = Number(sp.page ?? "1") || 1;
  const sort: ListingSort = ["terbaru", "termurah", "termahal", "terpopuler"].includes(sp.sort ?? "")
    ? (sp.sort as ListingSort)
    : "terbaru";
  const category = LISTING_CATEGORIES.includes(sp.category as (typeof LISTING_CATEGORIES)[number])
    ? sp.category!
    : "";
  const result = await listListings({ q: sp.q || undefined, category: category || undefined, sort, page });

  const baseHref = (() => {
    const p = new URLSearchParams();
    if (sp.q) p.set("q", sp.q);
    if (category) p.set("category", category);
    if (sort !== "terbaru") p.set("sort", sort);
    const qs = p.toString();
    return `/jual-beli${qs ? `?${qs}` : ""}`;
  })();

  return (
    <div className="flex flex-col gap-6 py-8">
      <section aria-labelledby="jual-beli-title" className="rounded-xl bg-surface-dark px-6 py-10 text-ink-on-dark">
        <p className="text-xs font-medium uppercase tracking-widest text-accent-light">Marketplace · iTAP Belitung</p>
        <h1 id="jual-beli-title" className="mt-2 text-xl font-bold md:text-display">Jual Beli Belitung</h1>
        <p className="mt-2 max-w-xl text-base text-muted-on-dark">
          Penawaran warga Belitung — dari kendaraan sampai jasa. Kesepakatan dan pembayaran diatur
          langsung antara penjual dan pembeli; iTAP bukan pihak dalam transaksi.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/jual-beli/pasang">Pasang penawaran</ButtonLink>
          <ButtonLink href="/jual-beli/aturan" variant="secondary" className="bg-transparent text-ink-on-dark">Aturan marketplace</ButtonLink>
        </div>
      </section>

      <Banner tone="info">
        Detail kontak dan lokasi penjual hanya terlihat setelah masuk dan email terverifikasi.
        Verifikasi WhatsApp belum tersedia — saat ini cukup verifikasi email.
      </Banner>

      <ListingFilterForm
        current={{ q: sp.q ?? "", category, sort }}
        categories={LISTING_CATEGORIES.map((c) => ({ value: c, label: LISTING_CATEGORY_LABELS[c] }))}
        sortLabels={SORT_LABELS}
      />

      {result.items.length === 0 ? (
        <EmptyState
          title="Belum ada penawaran di sini."
          desc={
            result.total === 0
              ? "Marketplace baru dibuka dan belum ada penawaran yang dipasang. Jadilah yang pertama memasang penawaran di Belitung."
              : "Tidak ada penawaran yang cocok dengan filter ini. Coba ubah kata kunci atau kategori."
          }
          action={<ButtonLink href="/jual-beli/pasang">Pasang penawaran pertama</ButtonLink>}
        />
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted">
            Menampilkan {result.items.length} dari {result.total} penawaran · halaman {result.page} dari {result.total_pages}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {result.items.map((l) => <ListingCard key={l.id} listing={l} />)}
          </div>
          <Pagination page={result.page} totalPages={result.total_pages} baseHref={baseHref} />
        </>
      )}
    </div>
  );
}
