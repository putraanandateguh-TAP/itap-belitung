// S06 Hasil pencarian + filter — #21 Search Bar (debounce 300ms),
// #22 Panel Filter (kategori, urutan, rentang tanggal + Terapkan).
// Hasil dimuat dari /api/search (fake data layer, tanda tangan §3.2).
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import type { Article, Category, Paginated } from "@/lib/types";
import { CHANNELS } from "@/lib/seed-data";
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
      <h1 className="text-xl font-bold text-ink">Cari di iTAP Belitung</h1>

      <form role="search" aria-label="Cari konten" onSubmit={(e) => e.preventDefault()} className="flex flex-col gap-3">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-5 -translate-y-1/2 text-muted" aria-hidden="true" />
            <label htmlFor="cari-q" className="sr-only">Cari</label>
            <input
              id="cari-q"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Cari kabar, kuliner, tempat, atau cerita…"
              autoComplete="off"
              className="h-12 w-full rounded-full border border-line-input bg-canvas pl-11 pr-10 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-2 focus:outline-accent"
            />
            {q && (
              <button type="button" onClick={() => setQ("")} aria-label="Hapus kata kunci" className="absolute right-2 top-1/2 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent">
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
            Filter{appliedCount > 0 ? ` (${appliedCount})` : ""}
          </Button>
        </div>

        {filterOpen && (
          <fieldset className="rounded-lg border border-line bg-canvas p-4 shadow-pop">
            <legend className="sr-only">Filter pencarian</legend>
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
              <span className="flex flex-col gap-1">
                <label htmlFor="f-channel" className="text-sm font-semibold text-ink">Kanal</label>
                <select id="f-channel" value={channel} onChange={(e) => { setChannel(e.target.value); setCategory(""); }} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
                  <option value="">Semua kanal</option>
                  {(Object.keys(CHANNELS) as (keyof typeof CHANNELS)[]).map((c) => <option key={c} value={c}>{CHANNELS[c]}</option>)}
                </select>
              </span>
              <span className="flex flex-col gap-1">
                <label htmlFor="f-category" className="text-sm font-semibold text-ink">Kategori</label>
                <select id="f-category" value={category} onChange={(e) => setCategory(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
                  <option value="">Semua kategori</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name_id}</option>)}
                </select>
              </span>
              <span className="flex flex-col gap-1">
                <label htmlFor="f-sort" className="text-sm font-semibold text-ink">Urutan</label>
                <select id="f-sort" value={sort} onChange={(e) => setSort(e.target.value as Sort)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
                  <option value="terbaru">Terbaru</option>
                  <option value="terpopuler">Terpopuler</option>
                  <option value="banyak-dicari">Banyak dicari</option>
                </select>
              </span>
              <span className="flex flex-col gap-1">
                <label htmlFor="f-from" className="text-sm font-semibold text-ink">Dari tanggal</label>
                <input id="f-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base" />
              </span>
              <span className="flex flex-col gap-1">
                <label htmlFor="f-to" className="text-sm font-semibold text-ink">Sampai tanggal</label>
                <input id="f-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base" />
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <Button type="button" onClick={applyFilters}>Terapkan</Button>
              <Button type="button" variant="ghost" onClick={resetFilters}>Atur ulang</Button>
            </div>
          </fieldset>
        )}
      </form>

      <p aria-live="polite" className="text-sm text-muted">
        {loading
          ? "Mencari…"
          : result
            ? `${result.total} hasil${q ? ` untuk “${q}”` : ""}`
            : "Ketik kata kunci untuk mulai mencari."}
      </p>

      {loading && <ArticleCardSkeleton />}
      {error && (
        <EmptyState
          title="Pencarian gagal dimuat."
          desc="Terjadi gangguan saat memuat hasil. Coba lagi."
          action={<Button onClick={() => fetchResults(new URLSearchParams(window.location.search))}>Coba lagi</Button>}
        />
      )}
      {!loading && !error && result && result.items.length === 0 && (
        <EmptyState
          title="Tidak ada hasil."
          desc="Coba kata kunci lain, atau ubah filter dan rentang tanggal."
          action={<Button variant="secondary" onClick={resetFilters}>Atur ulang filter</Button>}
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
