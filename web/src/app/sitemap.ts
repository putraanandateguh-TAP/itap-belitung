import type { Metadata } from "next";
import { siteUrl } from "@/lib/site-url";
import { ARTICLES } from "@/lib/seed-data";

export default function sitemap() {
  const base = siteUrl();
  const channels = ["berita", "kuliner", "wisata", "sejarah", "budaya", "legenda"];
  const statics = ["", "/cari", "/harga-pangan", "/kurs", "/lowongan", "/produk", "/jasa", "/kedai", "/masuk", "/kontributor", "/redaksi", "/privasi", "/ketentuan"];
  return [
    ...statics.map((p) => ({ url: `${base}${p}`, lastModified: new Date("2026-11-18") })),
    ...channels.map((c) => ({ url: `${base}/kanal/${c}`, lastModified: new Date("2026-11-18") })),
    ...ARTICLES.filter((a) => a.status === "published").map((a) => ({
      url: `${base}/artikel/${a.slug}`,
      lastModified: new Date(a.published_at),
    })),
  ];
}

export const metadata: Metadata = { title: "Peta situs" };
