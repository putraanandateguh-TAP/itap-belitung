// Penerjemah (S37, F13) — 9 bahasa, kamus lokal di server, riwayat
// maks 20 di perangkat, favorit, layar penuh.
// Antrean terjemahan (A7): artikel yang belum punya terjemahan EN —
// data dari listArticles, tanpa mengarang isi.
import type { Metadata } from "next";
import { listArticles } from "@/lib/data";
import { TranslatorClient } from "./translator-client";

export const metadata: Metadata = {
  alternates: { canonical: "/penerjemah" },
  title: "Penerjemah",
  description:
    "Terjemah 9 bahasa: Belitung, Indonesia, English, Melayu, Mandarin, Jepang, Korea, Belanda, Jerman. Kamus lokal dari konten iTAP; terjemahan umum butuh kunci Gemini (Fase 3).",
};

export default async function PenerjemahPage() {
  const { items } = await listArticles({ perPage: 100 });
  const queue = items
    .filter((a) => a.title_en === null)
    .map((a) => ({ slug: a.slug, title_id: a.title_id, channel: a.channel }));

  return <TranslatorClient queue={queue} />;
}
