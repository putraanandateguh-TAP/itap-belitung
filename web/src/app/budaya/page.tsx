// S34 Budaya — daftar cerita (F15). Filter kategori via ?category=.
// Konten: HANYA 5 cerita asli KB situs lama (M5); kategori lain masih kosong
// dengan pesan jujur sampai Teguh/redaksi mengisinya.
import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { cultureIllustration } from "@/lib/illustrations";
import { listCulture } from "@/lib/daily";
import { Badge, EmptyState } from "@/components/ui";
import { CULTURE_CATEGORIES, cultureLabel } from "@/lib/labels";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  alternates: { canonical: "/budaya" },
  title: "Budaya Belitung",
  description: "Cerita budaya Belitung: upacara, tari & musik, lagu, kuliner tradisi, cerita rakyat, bahasa, dan sejarah timah.",
};

export default async function BudayaPage({ searchParams }: { searchParams: Promise<{ category?: string }> }) {
  const { category } = await searchParams;
  const lang = await getServerLang();
  const active = CULTURE_CATEGORIES.some((c) => c.slug === category) ? category : undefined;
  const stories = await listCulture(active);
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t(lang, "budaya.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(lang, "budaya.subtitle")}
        </p>
      </header>

      <nav aria-label={t(lang, "budaya.filter")} className="flex flex-wrap gap-2">
        <Link
          href="/budaya"
          aria-current={!active ? "page" : undefined}
          className={`rounded-full px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${!active ? "bg-accent text-on-accent" : "border border-line bg-canvas text-ink hover:bg-surface"}`}
        >
          {t(lang, "common.all")}
        </Link>
        {CULTURE_CATEGORIES.map((c) => (
          <Link
            key={c.slug}
            href={`/budaya?category=${c.slug}`}
            aria-current={active === c.slug ? "page" : undefined}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${active === c.slug ? "bg-accent text-on-accent" : "border border-line bg-canvas text-ink hover:bg-surface"}`}
          >
            {cultureLabel(c.slug, lang)}
          </Link>
        ))}
      </nav>

      {stories.length === 0 ? (
        <EmptyState
          title={t(lang, "budaya.noStories")}
          desc={t(lang, "budaya.noStoriesDesc")}
          action={
            <Link href="/kontributor/tulis" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              {t(lang, "budaya.writeAsContributor")}
            </Link>
          }
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((s) => (
            <article key={s.slug} className="flex flex-col gap-2 overflow-hidden rounded-lg border border-line bg-canvas shadow-card">
              <Link href={`/budaya/${s.slug}`} className="relative block aspect-video overflow-hidden bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent" tabIndex={-1} aria-hidden="true">
                {/* Belum ada foto per cerita -> ilustrasi kategori iTAP */}
                <Image src={cultureIllustration(s.category).src} alt="" fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" data-illustration="true" />
              </Link>
              <div className="flex flex-1 flex-col gap-2 px-4 pb-4">
              <Badge tone="info">{cultureLabel(s.category, lang)}</Badge>
              <h2 className="text-base font-bold text-ink">
                <Link href={`/budaya/${s.slug}`} className="hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                  {s.title}
                </Link>
              </h2>
              <p className="line-clamp-3 text-sm text-muted">{s.body.split("\n\n")[0]}</p>
              <Link href={`/budaya/${s.slug}`} className="mt-auto text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                {t(lang, "budaya.readStory")}
              </Link>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="text-xs text-muted">
        {t(lang, "budaya.footerNote")}
      </p>
    </div>
  );
}
