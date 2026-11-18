// S06 — wrapper server: Suspense boundary untuk useSearchParams (Next 15).
import type { Metadata } from "next";
import { Suspense } from "react";
import { SearchClient } from "./search-client";
import { ArticleCardSkeleton } from "@/components/ui";

export const metadata: Metadata = {
  title: "Cari di iTAP Belitung",
  description: "Cari kabar, kuliner, tempat, dan cerita Belitung — dengan filter kanal, kategori, urutan, dan tanggal.",
};

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="py-8"><ArticleCardSkeleton /></div>}>
      <SearchClient />
    </Suspense>
  );
}
