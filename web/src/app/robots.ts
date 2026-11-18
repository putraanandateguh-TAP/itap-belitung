import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://itapbelitung.my.id";
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/redaksi", "/kontributor", "/pengaturan", "/api/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
