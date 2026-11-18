// S06 Hasil pencarian + filter — #21 Search Bar (debounce 300ms),
// #22 Panel Filter (kategori, urutan, rentang tanggal + Terapkan).
// Hasil dimuat dari /api/search (fake data layer, tanda tangan §3.2).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { Article, Category, Paginated } from "@/lib/types";
import { CHANNELS } from "@/lib/seed-data";
import { channelLabel } from "@/lib/labels";
import { useLanguage } from "@/components/language-provider";
import { ArticleCard } from "@/components/article-card";
import { ArticleCardSkeleton, Button, EmptyState } from "@/components/ui";

type Sort = "terbaru" | "terpopuler" | "banyak-dicari";

export function SearchClient() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const initialQ = searchParams.get("q") ?? "";

  const [q, setQ] = useState(initialQ);
  const [channel, setChannel] = useState(searchParams.get("channel") ?? "");
  const [category, setCategory] = useState(searchParams.get("category") ?? "");
  const [sort, setSort] = useState<Sort>((searchParams.get("sort") as Sort) || "terbaru");
  const [from, setFrom] = useState(searchParams.get("from") ?? "");
  const [to, setTo] = useState(searchParams.get("to") ?? "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [result, setResult] = useState<Paginated<Article> | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const { lang, t } = useLanguage();
  const [filterOpen, setFilterOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchResults = useCallback(async (params: URLSearchParams) => {
    setLoading(true);
    setError(false);
    try {
      const res = await fetch(`/api/search?${params.toString()}`);
      if (!res.ok) throw new Error("search failed");
      setResult(await res.json());
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  // Kategori mengikuti kanal yang dipilih.
  useEffect(() => {
    const url = channel ? `/api/categories?channel=${channel}` : "/api/categories";
    fetch(url).then((r) => r.json()).then(setCategories).catch(() => setCategories([]));
  }, [channel]);

  // Debounce 300ms saat mengetik; hasil awal dimuat saat halaman dibuka.
  useEffect(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const params = new URLSearchParams();
      if (q) params.set("q", q);
      if (channel) params.set("channel", channel);
      if (category) params.set("category", category);
      if (sort !== "terbaru") params.set("sort", sort);
      if (from) params.set("from", from);
      if (to) params.set("to", to);
      router.replace(`${pathname}?${params.toString()}`, { scroll: false });
      fetchResults(params);
    }, 300);
    return () => { if (timer.current) clearTimeout(timer.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function applyFilters(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (channel) params.set("channel", channel);
    if (category) params.set("category", category);
    if (sort !== "terbaru") params.set("sort", sort);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    setFilterOpen(false);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    fetchResults(params);
  }

  function resetFilters() {
    setChannel(""); setCategory(""); setSort("terbaru"); setFrom(""); setTo("");
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
    fetchResults(params);
  }

  const appliedCount = [channel, category, from, to].filter(Boolean).length + (sort !== "terbaru" ? 1 : 0);

  return (
    <div className="flex flex-col gap-6 py-8">
      <h1 className="text-xl font-bold text-ink">{t("search.title")}</h1>

      <form role="search" aria-label={t("search.formLabel")} onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <label htmlFor="cari-q" className="sr-only">{t("search.searchLabel")}</label>
            <input
              id="cari-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder={t("search.placeholder")}
              autoComplete="off"
              className="h-12 w-full rounded-full border border-line-input bg-canvas pl-11 pr-10 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-2 focus:outline-accent"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label={t("search.clearKeyword")} className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent">
                <X className="size-4" aria-hidden="true" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="secondary"
            onClick={() => setFilterOpen((v) => !v)}
            aria-expanded={filterOpen}
          >
            {t("search.filter")}{appliedCount > 0 ? ` (${appliedCount})` : ""}
          </Button>
        </div>

        {filterOpen && (
          <fieldset className="rounded-lg border border-line bg-canvas p-4 shadow-pop">
            <legend className="sr-only">{t("search.filters")}</legend>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <span className="flex flex-col gap-1">
                <label htmlFor="f-channel" className="text-sm font-semibold text-ink">{t("search.channel")}</label>
                <select id="f-channel" value={channel} onChange={(e) => { setChannel(e.target.value); setCategory(""); }} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
                  <option value="">{t("search.allChannels")}</option>
                  {(Object.keys(CHANNELS) as (keyof typeof CHANNELS)[]).map((c) => <option key={c} value={c}>{channelLabel(c, lang)}</option>)}
                </select>
              </span>
              <span className="flex flex-col gap-1">
                <label htmlFor="f-category" className="text-sm font-semibold text-ink">{t("search.category")}</label>
                <select id="f-category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
                  <option value="">{t("search.allCategories")}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{lang === "en" && c.name_en ? c.name_en : c.name_id}</option>)}
                </select>
              </span>
              <span className="flex flex-col gap-1">
                <label htmlFor="f-sort" className="text-sm font-semibold text-ink">{t("search.sort")}</label>
                <select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
                  <option value="terbaru">{t("search.newest")}</option>
                  <option value="terpopuler">{t("search.mostPopular")}</option>
                  <option value="banyak-dicari">{t("search.mostSought")}</option>
                </select>
              </span>
              <span className="flex flex-col gap-1">
                <label htmlFor="f-from" className="text-sm font-semibold text-ink">{t("search.fromDate")}</label>
                <input id="f-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base" />
              </span>
              <span className="flex flex-col gap-1">
                <label htmlFor="f-to" className="text-sm font-semibold text-ink">{t("search.toDate")}</label>
                <input id="f-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base" />
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={applyFilters}>{t("search.apply")}</Button>
              <Button type="button" variant="ghost" onClick={resetFilters}>{t("search.reset")}</Button>
            </div>
          </fieldset>
        )}
      </form>

      <p aria-live="polite" className="text-sm text-muted">
        {loading
          ? t("search.searching")
          : result
            ? q ? t("search.resultsFor", { total: result.total, q }) : t("search.results", { total: result.total })
            : t("search.typeToSearch")}
      </p>

      {loading && <ArticleCardSkeleton />}
      {error && (
        <EmptyState
          title={t("search.failed")}
          desc={t("search.failedDesc")}
          action={<Button onClick={() => fetchResults(new URLSearchParams(window.location.search))}>{t("common.retry")}</Button>}
        />
      )}
      {!loading && !error && result && result.items.length === 0 && (
        <EmptyState
          title={t("search.noResults")}
          desc={t("search.noResultsDesc")}
          action={<Button variant="secondary" onClick={resetFilters}>{t("search.resetFilters")}</Button>}
        />
      )}
      {!loading && !error && result && result.items.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {result.items.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      )}
    </div>
  );
}
