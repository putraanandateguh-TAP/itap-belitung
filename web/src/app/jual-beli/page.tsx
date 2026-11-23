// S07 — Marketplace: daftar penawaran publik (F03).
// Server component: baca GET /api/listings lewat listListings langsung
// (tanda tangan sama). Filter kategori + cari + urut + pagination via
// form GET (tanpa JS pun jalan). Empty state jujur: seed tidak punya
// listing — jangan karang penawaran.
import type { Metadata } from "next";
import Image from "next/image";
import { SECTION_ILLUSTRATIONS } from "@/lib/illustrations";
import { listListings, type ListingSort } from "@/lib/marketplace";
import { LISTING_CATEGORIES, LISTING_CATEGORY_LABELS } from "@/lib/listings";
import { ListingCard } from "@/components/listing-card";
import { Banner, ButtonLink, EmptyState, Pagination } from "@/components/ui";
import { ListingFilterForm } from "./filter-form";
import { getServerLang } from "@/lib/i18n-server";
import { t, LISTING_CATEGORY_NAMES_EN } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Jual Beli Belitung",
  description: "Penawaran jual beli warga Belitung di iTAP: kendaraan, elektronik, rumah tangga, dan lainnya. Transaksi langsung antar pihak.",
};

const SORT_KEYS: Record<ListingSort, string> = {
  terbaru: "market.sortNewest",
  termurah: "market.sortCheapest",
  termahal: "market.sortExpensive",
  terpopuler: "market.sortPopular",
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
  const lang = await getServerLang();
  const result = await listListings({ q: sp.q || undefined, category: category || undefined, sort, page });
  const SORT_LABELS: Record<ListingSort, string> = {
    terbaru: t(lang, SORT_KEYS.terbaru),
    termurah: t(lang, SORT_KEYS.termurah),
    termahal: t(lang, SORT_KEYS.termahal),
    terpopuler: t(lang, SORT_KEYS.terpopuler),
  };

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
      <section aria-labelledby="jual-beli-title" className="relative overflow-hidden rounded-xl bg-surface-dark px-6 pb-10 pt-36 text-ink-on-dark sm:pt-44">
        {/* Latar ilustrasi jual beli iTAP + gradasi gelap agar teks tetap terbaca */}
        <Image src={SECTION_ILLUSTRATIONS.jualBeli.src} alt="" fill priority sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" data-illustration="true" />
        <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-surface-dark via-surface-dark/90 via-50% to-transparent" />
        <div className="relative">
        <p className="text-xs font-medium uppercase tracking-widest text-accent-light">{t(lang, "market.kicker")}</p>
        <h1 id="jual-beli-title" className="mt-2 text-xl font-bold md:text-display">{t(lang, "market.title")}</h1>
        <p className="mt-2 max-w-xl text-base text-muted-on-dark">
          {t(lang, "market.subtitle")}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <ButtonLink href="/jual-beli/pasang">{t(lang, "market.postOffer")}</ButtonLink>
          <ButtonLink href="/jual-beli/aturan" variant="secondary" className="bg-transparent text-ink-on-dark">{t(lang, "market.rules")}</ButtonLink>
        </div>
        </div>
      </section>

      <Banner tone="info">
        {t(lang, "market.banner")}
      </Banner>

      <ListingFilterForm
        current={{ q: sp.q ?? "", category, sort }}
        categories={LISTING_CATEGORIES.map((c) => ({ value: c, label: lang === "en" ? LISTING_CATEGORY_NAMES_EN[c] : LISTING_CATEGORY_LABELS[c] }))}
        sortLabels={SORT_LABELS}
      />

      {result.items.length === 0 ? (
        <EmptyState
          title={t(lang, "market.empty")}
          desc={
            result.total === 0
              ? t(lang, "market.emptyAll")
              : t(lang, "market.emptyFiltered")
          }
          action={<ButtonLink href="/jual-beli/pasang">{t(lang, "market.postFirst")}</ButtonLink>}
        />
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted">
            {t(lang, "market.showing", { shown: result.items.length, total: result.total, page: result.page, totalPages: result.total_pages })}
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
