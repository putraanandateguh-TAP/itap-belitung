import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/site-url";
import { listArticles } from "@/lib/data";
import { listCulture } from "@/lib/daily";
import { ARTICLES } from "@/lib/seed-data";

// Sitemap dinamis (audit 23 Nov 2026): artikel diambil dari database (bukan
// hanya seed), plus halaman publik yang sebelumnya terlewat (info harian,
// budaya, jual beli). /redaksi & /kontributor tidak dicantumkan karena
// diblokir robots.txt (halaman internal).
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteUrl();
  const now = new Date();
  const channels = ["berita", "kuliner", "wisata", "sejarah", "budaya", "legenda"];
  const statics = [
    "", "/cari", "/info-harian", "/info-harian/cuaca", "/info-harian/salat", "/info-harian/gempa",
    "/info-harian/bbm", "/info-harian/transport", "/info-harian/darurat", "/harga-pangan", "/kurs",
    "/lowongan", "/jual-beli", "/budaya", "/produk", "/jasa", "/kedai", "/penerjemah", "/masuk",
    "/privasi", "/ketentuan",
  ];

  let articles: { slug: string; published_at: string }[];
  try {
    articles = (await listArticles({ perPage: 5000 })).items;
  } catch {
    articles = ARTICLES.filter((a) => a.status === "published");
  }
  let culture: { slug: string }[] = [];
  try {
    culture = await listCulture();
  } catch {
    culture = [];
  }

  return [
    ...statics.map((p) => ({ url: `${base}${p}`, lastModified: now })),
    ...channels.map((c) => ({ url: `${base}/kanal/${c}`, lastModified: now })),
    ...articles.map((a) => ({ url: `${base}/artikel/${a.slug}`, lastModified: new Date(a.published_at) })),
    ...culture.map((c) => ({ url: `${base}/budaya/${c.slug}` })),
  ];
}
