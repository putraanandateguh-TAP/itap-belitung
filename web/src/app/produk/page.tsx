// Halaman konten iTAP: Produk Digital — #28 Kartu Produk Digital.
// KATALOG + status/aktivasi lisensi server-side (migrasi 0007, PR #29).
// Kode lisensi divalidasi Edge Function Supabase (validate-license);
// frontend hanya menampilkan entitlement dari server — TIDAK ADA
// pemeriksaan hash / flag localStorage di halaman ini (temuan audit K1).
// Pembelian lewat WhatsApp admin. Teks antarmuka bilingual (i18n, PR #30).
import type { Metadata } from "next";
import Image from "next/image";
import { SECTION_ILLUSTRATIONS } from "@/lib/illustrations";
import { listProducts, listServices } from "@/lib/data";
import { WA_NUMBER } from "@/lib/seed-data";
import { formatRupiah } from "@/lib/format";
import { Badge, Banner } from "@/components/ui";
import { LicenseSection } from "@/components/license-section";
import { PRODUCT_IMAGES } from "@/lib/photo-map";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  alternates: { canonical: "/produk" },
  title: "Produk Digital iTAP",
  description: "Produk digital iTAP Belitung: Epic Video Generator, iTAP Kasir, ebook, dan paket prompt — katalog harga, pembelian via WhatsApp.",
};

export default async function ProdukPage() {
  const products = await listProducts();
  const lang = await getServerLang();
  // Poster kelas AI Content Creator: kelas yang cocok di data adalah K1
  // (Kelas K1 — Kreator Video AI Lokal); nama + harga dari data, bukan karangan.
  const kelasK1 = (await listServices()).find((s) => s.id === "kelas-k1");

  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t(lang, "produk.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t(lang, "produk.subtitle")}</p>
      </header>

      <Banner tone="info">
        {t(lang, "produk.catalogNote")}
      </Banner>

      <LicenseSection />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((p) => (
          <article key={p.id} className="flex flex-col gap-2 overflow-hidden rounded-lg border border-line bg-canvas shadow-card">
            {(
              <div className="relative aspect-video overflow-hidden bg-surface-alt">
                {/* Produk tanpa gambar sendiri -> ilustrasi produk digital iTAP */}
                <Image
                  src={PRODUCT_IMAGES[p.tag] ?? SECTION_ILLUSTRATIONS.produk.src}
                  alt={PRODUCT_IMAGES[p.tag] ? p.name : `${SECTION_ILLUSTRATIONS.produk.alt} — ${p.name}`}
                  fill
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  className="object-cover"
                />
              </div>
            )}
            <div className="flex flex-1 flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <Badge tone="info">{p.tag}</Badge>
                {p.badge && <Badge tone="active">{p.badge}</Badge>}
              </div>
              <h2 className="text-base font-semibold text-ink">{p.name}</h2>
              <p className="flex-1 text-sm text-muted">{p.desc}</p>
              <p className="text-lg font-bold text-ink">
                {p.was_price && <s className="mr-2 text-sm font-normal text-muted">{formatRupiah(p.was_price)}</s>}
                {formatRupiah(p.price)}
                <span className="ml-2 text-sm font-normal text-muted">{p.price_note}</span>
              </p>
              <a
                href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Halo iTAP, saya mau beli ${p.name} (${formatRupiah(p.price)})`)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-accent"
              >
                {t(lang, "produk.buyViaWa", { name: p.name })}
              </a>
            </div>
          </article>
        ))}
      </div>

      {/* Kelas Kreator AI — poster asli kelas AI Content Creator (K1). */}
      {kelasK1 && (
        <section aria-labelledby="kelas-ai-title" className="mt-2">
          <h2 id="kelas-ai-title" className="text-lg font-semibold text-ink">{t(lang, "produk.classTitle")}</h2>
          <article className="mt-3 overflow-hidden rounded-lg border border-line bg-canvas shadow-card">
            <Image
              src="/images/ai-content-creator.webp"
              alt="Poster kelas AI Content Creator iTAP"
              width={1672}
              height={941}
              className="aspect-video w-full object-cover"
            />
            <div className="flex flex-col gap-2 p-4">
              <div className="flex items-center gap-2">
                <Badge tone="info">Kelas</Badge>
              </div>
              <h3 className="text-base font-semibold text-ink">{kelasK1.name}</h3>
              <p className="flex-1 text-sm text-muted">{kelasK1.desc}</p>
              <p className="text-lg font-bold text-ink">
                {/* price_note sudah memuat harga ("Rp149.000 (normal Rp199.000)") — tampilkan apa adanya, tanpa duplikasi. */}
                {kelasK1.price_note}
              </p>
              <div className="flex flex-wrap gap-2">
                <a
                  href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Halo iTAP, saya mau daftar ${kelasK1.name} (${formatRupiah(kelasK1.price_from)})`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {t(lang, "produk.registerViaWa", { name: kelasK1.name })}
                </a>
                <a
                  href="/jasa"
                  className="inline-flex h-10 items-center justify-center rounded-md border border-line bg-canvas px-4 text-sm font-semibold text-ink hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {t(lang, "produk.viewAllServices")}
                </a>
              </div>
            </div>
          </article>
        </section>
      )}
      <p className="text-sm text-muted">{t(lang, "produk.helpNote")}<a href="/jasa" className="font-semibold text-accent hover:underline">{t(lang, "produk.servicesLink")}</a>{t(lang, "produk.helpNoteSuffix")}</p>
    </div>
  );
}
