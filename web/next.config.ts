import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Situs statis lama tetap hidup di root repo sampai cutover (arsitektur P7).
  // Aplikasi Next.js ini tinggal di web/; deploy Vercel memakai Root Directory = web.
  reactStrictMode: true,
};

export default nextConfig;
