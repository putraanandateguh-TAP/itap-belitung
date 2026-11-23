import type { NextConfig } from "next";

// Security headers (port dari PR #28, 23 Nov 2026).
// CSP baseline: skrip/style inline masih diizinkan karena Next.js
// menyisipkan skrip inline saat hydration (pengetatan ke nonce = tindak
// lanjut). Yang diblokir: framing (clickjacking), object/embed, base-uri
// injection, fetch ke host di luar 'self' + Supabase. Semua fetch ke API
// luar (BMKG, myQuran, Yahoo, RSS) berjalan di server, bukan di browser.
// 'unsafe-eval' hanya di development (webpack HMR).
const isDev = process.env.NODE_ENV !== "production";
const csp = [
  "default-src 'self'",
  isDev ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'" : "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "media-src 'self' blob:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "worker-src 'self' blob:",
  "manifest-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // geolocation=(self): /jual-beli/pasang memakai lokasi untuk titik listing.
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(self), payment=(), usb=()" },
        ],
      },
    ];
  },
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
      // Rute situs statis lama yang 404 sejak cutover (audit 23 Nov 2026).
      // Sementara (307), bukan permanen: rute ini mungkin dipakai lagi.
      { source: "/akun", destination: "/pengaturan", permanent: false },
      { source: "/kasir", destination: "/kedai", permanent: false },
      { source: "/kasir/:path*", destination: "/kedai", permanent: false },
      { source: "/u", destination: "/undangan", permanent: false },
      { source: "/u/:path*", destination: "/undangan", permanent: false },
      { source: "/undangan/:path+", destination: "/undangan", permanent: false },
      // Browser & crawler meminta /favicon.ico; ikon asli ada di /icon.png.
      { source: "/favicon.ico", destination: "/icon.png", permanent: true },
    ];
  },
};

export default nextConfig;
