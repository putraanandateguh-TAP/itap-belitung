// #22 Panel Filter (kanal) — form GET: kategori + urutan + tombol Terapkan.
// Tanpa JS pun berfungsi; state diterapkan tampil sebagai chip aktif.
"use client";

import { useRouter } from "next/navigation";
import type { Category } from "@/lib/types";
import { Button } from "@/components/ui";

export function ChannelFilterForm({
  categories,
  current,
  total,
}: {
  categories: Category[];
  current: { category: string; sort: string };
  total: number;
}) {
  const router = useRouter();
  return (
    <form
      method="get"
      role="search"
      aria-label="Filter artikel kanal"
      className="flex flex-col gap-3 rounded-lg border border-line bg-canvas p-4 md:flex-row md:items-end"
      onSubmit={(e) => {
        // Biarkan submit GET standar bekerja; handler ini hanya mencegah
        // reload ganda saat JS aktif — tidak mengubah perilaku tanpa JS.
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        const params = new URLSearchParams();
        const cat = String(fd.get("category") ?? "");
        const sort = String(fd.get("sort") ?? "");
        if (cat) params.set("category", cat);
        if (sort && sort !== "terbaru") params.set("sort", sort);
        router.push(`${window.location.pathname}${params.toString() ? `?${params}` : ""}`);
      }}
    >
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-category" className="text-sm font-semibold text-ink">Kategori</label>
        <select
          id="filter-category"
          name="category"
          defaultValue={current.category}
          className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base text-ink focus:border-accent focus:outline-2 focus:outline-accent"
        >
          <option value="">Semua kategori</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>{c.name_id}</option>
          ))}
        </select>
      </div>
      <div className="flex flex-col gap-1">
        <label htmlFor="filter-sort" className="text-sm font-semibold text-ink">Urutan</label>
        <select
          id="filter-sort"
          name="sort"
          defaultValue={current.sort}
          className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base text-ink focus:border-accent focus:outline-2 focus:outline-accent"
        >
          <option value="terbaru">Terbaru</option>
          <option value="terpopuler">Terpopuler</option>
        </select>
      </div>
      <Button type="submit" className="md:ml-2">Terapkan</Button>
      {(current.category || current.sort !== "terbaru") && (
        <Button type="button" variant="ghost" onClick={() => router.push(window.location.pathname)}>
          Atur ulang
        </Button>
      )}
      <p className="text-sm text-muted md:ml-auto" aria-live="polite">{total} artikel</p>
    </form>
  );
}
