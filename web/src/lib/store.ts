// Store in-memory untuk MUTASI demo (kontribusi, komentar, putusan redaksi).
// FAKE DATA LAYER: perubahan hanya hidup selama proses dev server berjalan
// dan hilang saat restart. Saat Supabase (P1) ada, modul ini diganti
// implementasi database — tanda tangan fungsi di data.ts TIDAK berubah.
import type { Comment, Contribution, Report } from "./types";
import { ARTICLES } from "./seed-data";

export const store = {
  contributions: [
    {
      id: "c-1", title_id: "Mie Belitung di Warung Legendaris Tanjung Pandan",
      title_en: "", body_id: "Mie kuning dengan kuah kental manis gurih dari kaldu udang, disajikan dengan udang, kentang, timun, dan emping. Warung legendarisnya sudah berdiri puluhan tahun dan selalu ramai saat sarapan.",
      body_en: "", channel: "kuliner" as const, category_id: "kuliner-lokal",
      location_name: "Tanjung Pandan, Belitung", source: "Kunjungan langsung penulis",
      status: "published" as const, views: 1240, note_from_editor: null,
      updated_at: "2026-11-12T09:00:00+07:00",
    },
    {
      id: "c-2", title_id: "Maras Taun di Desa Air Selumar",
      title_en: "Maras Taun in Air Selumar Village",
      body_id: "Maras Taun adalah upacara syukur panen masyarakat Belitung. Warga berkumpul, makan bersama, dan menggelar kesenian tradisional.",
      body_en: "Maras Taun is a harvest thanksgiving ceremony in Belitung. Villagers gather, eat together, and perform traditional arts.",
      channel: "budaya" as const, category_id: "upacara",
      location_name: "Air Selumar, Sijuk", source: "Wawancara tokoh adat (catatan penulis)",
      status: "review" as const, views: 0, note_from_editor: null,
      updated_at: "2026-11-17T14:20:00+07:00",
    },
    {
      id: "c-3", title_id: "Draf: Jejak Timah di Kelapa Kampit",
      title_en: "", body_id: "",
      body_en: "", channel: "sejarah" as const, category_id: "sejarah-timah",
      location_name: "Kelapa Kampit, Belitung Timur", source: "",
      status: "draft" as const, views: 0, note_from_editor: null,
      updated_at: "2026-11-18T07:40:00+07:00",
    },
  ] as Contribution[],
  comments: [
    {
      id: "k-1", article_id: "kb-1", article_slug: "pantai-tanjung-tinggi",
      author_name: "Rina (Pembaca)", text: "Batu granitnya memang besar sekali, cocok untuk foto sore hari. Terima kasih infonya!",
      status: "approved" as const, created_at: "2026-11-15T10:12:00+07:00",
    },
    {
      id: "k-2", article_id: "kb-1", article_slug: "pantai-tanjung-tinggi",
      author_name: "Andi (Pembaca)", text: "Apakah bisa naik perahu ke pulau dari sini, atau harus dari Kelayang?",
      status: "approved" as const, created_at: "2026-11-16T08:03:00+07:00",
    },
    {
      id: "k-3", article_id: "kb-2", article_slug: "pantai-tanjung-kelayang",
      author_name: "Sari (Pembaca)", text: "Menunggu tulisan lanjutannya tentang island hopping.",
      status: "pending" as const, created_at: "2026-11-18T06:30:00+07:00",
    },
  ] as Comment[],
  reports: [
    {
      id: "r-1", target_type: "comment" as const,
      target_label: "Komentar di artikel “Pantai Tanjung Kelayang”",
      reporter: "Pembaca (anonim)", reason: "Tautan mencurigakan di dalam komentar.",
      status: "open" as const, created_at: "2026-11-17T11:00:00+07:00",
    },
  ] as Report[],
  /** Putusan redaksi atas artikel seed (id -> status + catatan). */
  articleOverrides: new Map<string, { status: string; note: string | null }>(),
  categoriesExtra: [] as { id: string; channel: string; name_id: string; name_en: string; slug: string }[],
  contributorFlags: new Map<string, { verified: boolean; auto_approve: boolean }>(),
};

export function articleWithOverride(a: (typeof ARTICLES)[number]) {
  const o = store.articleOverrides.get(a.id);
  if (!o) return a;
  return { ...a, status: o.status as (typeof ARTICLES)[number]["status"] };
}
