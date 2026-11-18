// URL publik situs — satu tempat, dipakai layout/sitemap/robots/kanal/
// artikel/auth. BUG-003: `process.env.NEXT_PUBLIC_SITE_URL ?? default`
// TIDAK menangkap string kosong — `.env.local` template berisi
// `NEXT_PUBLIC_SITE_URL=` (kosong) sehingga `new URL('')` di layout.tsx
// melempar dan SEMUA halaman 500. Pakai `||` + trim agar string kosong
// (atau spasi saja) jatuh ke default.
export function siteUrl(): string {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim();
  return raw || "https://itapbelitung.my.id";
}
