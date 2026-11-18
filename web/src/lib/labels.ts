// Helper label murni (client-safe) — TIDAK boleh mengimpor server code
// (Supabase/Drizzle/next/headers). data.ts me-re-export channelLabel dari sini.
import { CHANNELS } from "./seed-data";
import type { Channel, CultureCategory } from "./types";
import { CHANNEL_NAMES_EN, CULTURE_CATEGORY_NAMES_EN, type Lang } from "./i18n";

export function channelLabel(channel: Channel, lang: Lang = "id"): string {
  return lang === "en" ? CHANNEL_NAMES_EN[channel] : CHANNELS[channel];
}

/** Kategori cerita budaya (S34–S35, F15) — enum culture_stories. */
export const CULTURE_CATEGORIES: { slug: CultureCategory; label: string }[] = [
  { slug: "upacara", label: "Upacara" },
  { slug: "tari_musik", label: "Tari & Musik" },
  { slug: "lagu", label: "Lagu" },
  { slug: "kuliner_tradisi", label: "Kuliner Tradisi" },
  { slug: "cerita_rakyat", label: "Cerita Rakyat" },
  { slug: "bahasa", label: "Bahasa" },
  { slug: "sejarah_timah", label: "Sejarah Timah" },
];

export function cultureLabel(category: string, lang: Lang = "id"): string {
  const entry = CULTURE_CATEGORIES.find((c) => c.slug === category);
  if (!entry) return category;
  return lang === "en" ? CULTURE_CATEGORY_NAMES_EN[entry.slug] : entry.label;
}
