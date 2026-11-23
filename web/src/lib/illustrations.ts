// Ilustrasi cadangan per kanal/bagian (23 Nov 2026) — dipakai HANYA bila
// konten belum punya foto asli (foto asli selalu diutamakan). Gaya ilustrasi
// datar navy-emas iTAP, tanpa teks/wajah, bukan aset Satam. Sumber: 3 dibuat
// di Canva (berita-*), sisanya generator gambar Grok Bot karena kuota Canva
// habis; semua dioptimasi WebP 1200x675 < 200 KB di public/images/ilustrasi/.
import type { Article, Channel } from "@/lib/types";

export type Illustration = { src: string; alt: string };

const BASE = "/images/ilustrasi";

export const CHANNEL_ILLUSTRATIONS: Record<Channel, Illustration[]> = {
  berita: [
    { src: `${BASE}/berita-kota.webp`, alt: "Ilustrasi alun-alun Tanjung Pandan dengan tugu dan deretan ruko tua" },
    { src: `${BASE}/berita-pelabuhan.webp`, alt: "Ilustrasi pelabuhan nelayan Belitung saat fajar dengan perahu kayu" },
    { src: `${BASE}/berita-pemerintahan.webp`, alt: "Ilustrasi gedung pemerintahan daerah Belitung dengan bendera merah putih" },
  ],
  kuliner: [{ src: `${BASE}/kuliner.webp`, alt: "Ilustrasi kuliner Belitung: mie Belitung, gangan, bakso aci, dan kopi" }],
  wisata: [{ src: `${BASE}/wisata.webp`, alt: "Ilustrasi pantai granit Belitung dengan mercusuar di pulau kecil" }],
  sejarah: [{ src: `${BASE}/sejarah.webp`, alt: "Ilustrasi sejarah timah Belitung: kapal keruk, cerobong, dan lori tambang" }],
  budaya: [{ src: `${BASE}/budaya.webp`, alt: "Ilustrasi budaya Melayu Belitung: rumah panggung, gendang, gambus, dan dulang nganggung" }],
  legenda: [{ src: `${BASE}/legenda.webp`, alt: "Ilustrasi legenda Belitung: pulau batu granit di bawah bulan purnama" }],
};

export const SECTION_ILLUSTRATIONS = {
  jualBeli: { src: `${BASE}/jual-beli.webp`, alt: "Ilustrasi jual beli lokal Belitung: ponsel, motor bekas, sepeda, kursi, dan buah" },
  jasa: { src: `${BASE}/jasa.webp`, alt: "Ilustrasi jasa digital: laptop situs web, chat, dan kamera video" },
  lowongan: { src: `${BASE}/lowongan.webp`, alt: "Ilustrasi lowongan kerja Belitung: tas kerja, CV, kaca pembesar, dan jabat tangan" },
  infoHarian: { src: `${BASE}/info-harian.webp`, alt: "Ilustrasi info harian Belitung: cuaca, jadwal salat, harga pangan, kurs, dan gempa" },
  produk: { src: `${BASE}/produk-digital.webp`, alt: "Ilustrasi produk digital kreator: ponsel di gimbal, tablet ebook, ring light" },
} satisfies Record<string, Illustration>;

/** Hash string sederhana (stabil server/klien) untuk memilih variasi. */
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Ilustrasi cadangan untuk artikel tanpa foto (variasi stabil per slug). */
export function articleIllustration(article: Pick<Article, "channel" | "slug">): Illustration {
  const list = CHANNEL_ILLUSTRATIONS[article.channel] ?? CHANNEL_ILLUSTRATIONS.berita;
  return list[hash(article.slug || "") % list.length];
}

/** Kategori budaya (culture_entries.category) -> ilustrasi kanal terdekat. */
export function cultureIllustration(category: string | null | undefined): Illustration {
  const c = (category ?? "").toLowerCase();
  if (c.includes("kuliner")) return CHANNEL_ILLUSTRATIONS.kuliner[0];
  if (c.includes("cerita") || c.includes("legenda")) return CHANNEL_ILLUSTRATIONS.legenda[0];
  if (c.includes("sejarah") || c.includes("timah")) return CHANNEL_ILLUSTRATIONS.sejarah[0];
  return CHANNEL_ILLUSTRATIONS.budaya[0];
}
