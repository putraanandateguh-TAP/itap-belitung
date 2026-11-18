// #22 Panel Filter (marketplace) — form GET: cari + kategori + urutan.
// Mengikuti pola kanal/filter-form.tsx: tanpa JS pun berfungsi.
"use client";

import { useRouter } from "next/navigation";
import { Button, TextInput } from "@/components/ui";
import type { ListingSort } from "@/lib/marketplace";
import { useLanguage } from "@/components/language-provider";

export function ListingFilterForm({
  current,
  categories,
  sortLabels,
}: {
  current: { q: string; category: string; sort: ListingSort };
  categories: { value: string; label: string }[];
  sortLabels: Record<ListingSort, string>;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  return (
    <form
      method="get"
      role="search"
      aria-label={t("market.filterOffers")}
      className="flex flex-col gap-3 rounded-lg border border-line bg-canvas p-4 md:flex-row md:items-end"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const params = new URLSearchParams();
        const q = String(fd.get("q") ?? "").trim();
        const cat = String(fd.get("category") ?? "");
        const sort = String(fd.get("sort") ?? "");
        if (q) params.set("q", q);
        if (cat) params.set("category", cat);
        if (sort && sort !== "terbaru") params.set("sort", sort);
        router.push(`/jual-beli${params.toString() ? `?${params}` : ""}`);
      }}
    >
      <div className="flex flex-1 flex-col gap-1">
        <label htmlFor="filter-q" className="text-sm font-semibold text-ink">{t("market.searchOffers")}</label>
        <TextInput id="filter-q" name="q" type="search" defaultValue={current.q} placeholder={t("market.searchPlaceholder")} />
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-category" className="text-sm font-semibold text-ink">{t("market.category")}</label>
        <select
          id="filter-category"
          name="category"
          defaultValue={current.category}
          className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base text-ink focus:border-accent focus:outline-2 focus:outline-accent"
        >
          <option value="">{t("market.allCategories")}</option>
          {categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-sort" className="text-sm font-semibold text-ink">{t("market.sort")}</label>
        <select
          id="filter-sort"
          name="sort"
          defaultValue={current.sort}
          className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base text-ink focus:border-accent focus:outline-2 focus:outline-accent"
        >
          {(Object.keys(sortLabels) as ListingSort[]).map((s) => (
            <option key={s} value={s}>{sortLabels[s]}</option>
          ))}
        </select>
      </div>
      <Button type="submit">{t("market.apply")}</Button>
    </form>
  );
}
