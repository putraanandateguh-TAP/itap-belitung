import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Foto artikel/produk/budaya AI di Supabase Storage (bucket
    // article-images, publik). next/image butuh pola ini untuk URL jauh.
    remotePatterns: [
      { protocol: "https", hostname: "iwravgwsxmojxtbznori.supabase.co", pathname: "/storage/v1/object/public/**" },
    ],
  },
  // Situs statis lama tetap hidup di root repo sampai cutover (arsitektur P7).
  // Aplikasi Next.js ini tinggal di web/; deploy Vercel memakai Root Directory = web.
  reactStrictMode: true,
  // Alihkan rute lama/pendek ke rute kanal yang benar (bug 19 Nov 2026:
  // /berita, /wisata, /kuliner, /daftar mengembalikan 404). /daftar tidak
  // punya halaman sendiri — pendaftaran ada di /masuk (mode "daftar").
  async redirects() {
    return [
      { source: "/berita", destination: "/kanal/berita", permanent: true },
      { source: "/wisata", destination: "/kanal/wisata", permanent: true },
      { source: "/kuliner", destination: "/kanal/kuliner", permanent: true },
      { source: "/daftar", destination: "/masuk", permanent: true },
    ];
  },
};

export default nextConfig;
