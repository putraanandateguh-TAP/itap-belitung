// Helper label murni (client-safe) — TIDAK boleh mengimpor server code
// (Supabase/Drizzle/next/headers). data.ts me-re-export channelLabel dari sini.
import { CHANNELS } from "./seed-data";
import type { Channel, CultureCategory } from "./types";

export function channelLabel(channel: Channel): string {
  return CHANNELS[channel];
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

export function cultureLabel(category: string): string {
  return CULTURE_CATEGORIES.find((c) => c.slug === category)?.label ?? category;
}
