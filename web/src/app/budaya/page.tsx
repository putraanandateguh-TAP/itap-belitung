// S34 Budaya — daftar cerita (F15). Filter kategori via ?category=.
// Konten: HANYA 5 cerita asli KB situs lama (M5); kategori lain masih kosong
// dengan pesan jujur sampai Teguh/redaksi mengisinya.
import type { Metadata } from "next";
import Link from "next/link";
import { listCulture } from "@/lib/daily";
import { Badge, EmptyState } from "@/components/ui";
import { CULTURE_CATEGORIES, cultureLabel } from "@/lib/labels";

export const metadata: Metadata = {
  title: "Budaya Belitung",
  description: "Cerita budaya Belitung: upacara, tari & musik, lagu, kuliner tradisi, cerita rakyat, bahasa, dan sejarah timah.",
};

export default async function BudayaPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const active = CULTURE_CATEGORIES.some((c) => c.slug === category) ? category : undefined;
  const stories = await listCulture(active);
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">Budaya Belitung</h1>
        <p className="mt-1 text-sm text-muted">
          Cerita budaya Belitung — upacara, tari &amp; musik, lagu, kuliner tradisi, cerita
          rakyat, bahasa, dan sejarah timah. Setiap cerita mencantumkan sumber bacaannya.
        </p>
      </header>

      <nav aria-label="Filter kategori budaya" className="flex flex-wrap gap-2">
        <Link
          href="/budaya"
          aria-current={!active ? "page" : undefined}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${!active ? "bg-accent text-on-accent" : "border border-line bg-canvas text-ink hover:bg-surface"}`}
        >
          Semua
        </Link>
        {CULTURE_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/budaya?category=${c.slug}`}
            aria-current={active === c.slug ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${active === c.slug ? "bg-accent text-on-accent" : "border border-line bg-canvas text-ink hover:bg-surface"}`}
          >
            {c.label}
          </Link>
        ))}
      </nav>

      {stories.length === 0 ? (
        <EmptyState
          title="Belum ada cerita di kategori ini"
          desc="Kategori ini masih kosong — belum ada cerita dari sumber nyata yang bisa ditampilkan. iTAP tidak mengarang cerita budaya. Kontributor dapat mengirim cerita lewat halaman kontributor; kiriman ditinjau redaksi sebelum diterbitkan."
          action={
            <Link href="/kontributor/tulis" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              Tulis cerita sebagai kontributor
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((s) => (
            <article key={s.slug} className="flex flex-col gap-2 rounded-lg border border-line bg-canvas p-4 shadow-card">
              <Badge tone="info">{cultureLabel(s.category)}</Badge>
              <h2 className="text-base font-bold text-ink">
                <Link href={`/budaya/${s.slug}`} className="hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                  {s.title}
                </Link>
              </h2>
              <p className="line-clamp-3 text-sm text-muted">{s.body.split("\n\n")[0]}</p>
              <Link href={`/budaya/${s.slug}`} className="mt-auto text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                Baca cerita
              </Link>
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-muted">
        Isi awal: 5 ringkasan dari basis pengetahuan iTAP Belitung (Makan Bedulang, Maras Taun,
        Buang Jong, Seni Campak, Bahasa Melayu Belitung). Cerita dan lirik tambahan menunggu
        isi dari redaksi dan kontributor — bukan karangan.
      </p>
    </div>
  );
}
