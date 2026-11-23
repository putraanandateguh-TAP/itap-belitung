// Gaya per kanal (label berwarna + latar placeholder) — modul bersama
// server/klien (tanpa "use client") supaya bisa dipakai halaman server.
import { Drama, Landmark, Newspaper, Palmtree, ScrollText, UtensilsCrossed, type LucideIcon } from "lucide-react";
import type { Article, Channel } from "@/lib/types";

/** Warna label kanal: teks -700 (kontras ≥ 4.5 di putih) + latar placeholder lembut. */
export const CHANNEL_STYLE: Record<Channel, { icon: LucideIcon; text: string; art: string }> = {
  berita: { icon: Newspaper, text: "text-blue-700", art: "from-blue-100 via-sky-50 to-blue-200 text-blue-700" },
  kuliner: { icon: UtensilsCrossed, text: "text-orange-700", art: "from-orange-100 via-amber-50 to-orange-200 text-orange-700" },
  wisata: { icon: Palmtree, text: "text-teal-700", art: "from-teal-100 via-cyan-50 to-teal-200 text-teal-700" },
  sejarah: { icon: Landmark, text: "text-amber-700", art: "from-amber-100 via-yellow-50 to-amber-200 text-amber-700" },
  budaya: { icon: Drama, text: "text-purple-700", art: "from-purple-100 via-fuchsia-50 to-purple-200 text-purple-700" },
  legenda: { icon: ScrollText, text: "text-rose-700", art: "from-rose-100 via-pink-50 to-rose-200 text-rose-700" },
};

export function hasPhoto(a: Article) {
  return !!a.gallery[0]?.url;
}
