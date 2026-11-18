import type { NextConfig } from "next";

// Security headers (workstream D — audit keamanan 2026-11-18).
// CSP baseline: skrip/style inline masih diizinkan ('unsafe-inline') karena
// Next.js menyisipkan skrip inline saat hydration; pengetatan ke nonce
// adalah tindak lanjut, bukan bagian perubahan ini. Yang sudah diblokir:
// framing (clickjacking), object/embed, base-uri injection, dan
// connect/fetch ke host di luar 'self' + Supabase. Gambar: lokal +
// Supabase Storage saja (tidak ada host gambar eksternal di kode).
//
// 'unsafe-eval' HANYA di development: webpack dev memakai eval untuk
// source map/HMR — tanpa ini hydration mati di `npm run dev` (terbukti:
// 14 tes E2E interaktif gagal di dev, 16/16 lolos di base tanpa CSP).
// Di production (`next start`, Vercel) eval TIDAK diizinkan — dan E2E CI
// berjalan melawan production build, jadi CSP ketatlah yang diuji.
const isDev = process.env.NODE_ENV !== "production";
const scriptSrc = isDev
  ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
  : "script-src 'self' 'unsafe-inline'";
const csp = [
  "default-src 'self'",
  scriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co",
  "font-src 'self' data:",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const nextConfig: NextConfig = {
  // Situs statis lama tetap hidup di root repo sampai cutover (arsitektur P7).
  // Aplikasi Next.js ini tinggal di web/; deploy Vercel memakai Root Directory = web.
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "Content-Security-Policy", value: csp },
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
