import type { Metadata } from "next";
import { siteUrl } from "@/lib/site-url";
import { BottomNav, SiteFooter, SiteHeader } from "@/components/site-chrome";
import { LanguageProvider } from "@/components/language-provider";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
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
    images: [{ url: "/og.png", width: 1200, height: 630, alt: "iTAP Belitung" }],
  },
  // P1 (M8): kartu Twitter/X — gambar yang sama (web/public/og.png 1200×630).
  // Ikon tidak ditulis di sini: Next.js otomatis memakai src/app/icon.png
  // (512×512) + src/app/apple-icon.png (180×180) untuk /icon.png dan
  // /apple-icon.png.
  twitter: {
    card: "summary_large_image",
    title: "iTAP Belitung — Kabar, Kuliner, Wisata, Sejarah & Budaya",
    description: "Portal Belitung: kabar, kuliner, wisata, sejarah, budaya, dan legenda — ditulis warga, ditinjau redaksi.",
    images: ["/og.png"],
  },
};

// P1 (M8): banner "Versi demo" hanya tampil saat mode seed/demo.
// Matikan dengan NEXT_PUBLIC_DEMO_BANNER=false begitu P1 live (DB + seed
// jalan). Default tampil — situs ini masih mode seed.
const showDemoBanner = process.env.NEXT_PUBLIC_DEMO_BANNER !== "false";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const lang = await getServerLang();
  return (
    <html lang={lang}>
      <body>
        <LanguageProvider initialLang={lang}>
          {showDemoBanner && (
            <div role="region" aria-label={t(lang, "layout.demoBannerAria")}>
              <p className="bg-surface-dark-deep px-4 py-1 text-center text-xs text-muted-on-dark">
                {t(lang, "layout.demoBanner")}
              </p>
            </div>
          )}
          <SiteHeader />
          <main id="konten" className="mx-auto min-h-[60vh] w-full max-w-[1200px] px-4">
            {children}
          </main>
          <SiteFooter />
          <BottomNav />
        </LanguageProvider>
      </body>
    </html>
  );
}
