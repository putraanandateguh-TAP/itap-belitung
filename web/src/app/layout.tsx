import type { Metadata } from "next";
import { siteUrl } from "@/lib/site-url";
import { SiteFooter, SiteHeader } from "@/components/site-chrome";
import "./globals.css";


export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: "iTAP Belitung — Kabar, Kuliner, Wisata, Sejarah & Budaya", template: "%s · iTAP Belitung" },
  description:
    "Portal Belitung milik iTAP: berita, kuliner, wisata, sejarah, budaya, dan legenda Belitung — ditulis warga, ditinjau redaksi. Plus harga pangan, kurs, lowongan, dan jasa iTAP.",
  openGraph: {
    type: "website",
    locale: "id_ID",
    siteName: "iTAP Belitung",
    title: "iTAP Belitung — Kabar, Kuliner, Wisata, Sejarah & Budaya",
    description: "Portal Belitung: kabar, kuliner, wisata, sejarah, budaya, dan legenda — ditulis warga, ditinjau redaksi.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id">
      <body>
        <div role="region" aria-label="Pemberitahuan">
          <p className="bg-surface-dark-deep px-4 py-1 text-center text-xs text-muted-on-dark">
            Versi demo (M0–M2): data masih seed/palsu, belum terhubung ke database. Lihat README.
          </p>
        </div>
        <SiteHeader />
        <main id="konten" className="mx-auto min-h-[60vh] w-full max-w-[1200px] px-4">
          {children}
        </main>
        <SiteFooter />
      </body>
    </html>
  );
}
