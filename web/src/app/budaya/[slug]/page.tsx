// S35 Budaya — detail cerita (F15): isi + lirik + sumber bacaan.
// Lirik HANYA tampil bila ada di sumber nyata; bila null, tampilkan pesan
// jujur (jangan karang lirik). Sama untuk sumber bacaan yang kosong.
import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCultureStory } from "@/lib/daily";
import { CULTURE_IMAGES } from "@/lib/photo-map";
import { Badge, Banner } from "@/components/ui";
import { cultureLabel } from "@/lib/labels";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const story = await getCultureStory(slug);
  const lang = await getServerLang();
  if (!story) return { title: t(lang, "budaya.notFound") };
  return {
    title: `${story.title} — Budaya Belitung`,
    description: story.body.split("\n\n")[0]?.slice(0, 160),
  };
}

export default async function BudayaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getCultureStory(slug);
  if (!story) notFound();
  const lang = await getServerLang();
  const paragraphs = story.body.split("\n\n").filter(Boolean);
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <Badge tone="info">{cultureLabel(story.category, lang)}</Badge>
        <h1 className="mt-2 text-xl font-bold text-ink">{story.title}</h1>
        <p className="mt-1 text-sm text-muted">
          <Link href="/budaya" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            {t(lang, "budaya.allStories")}
          </Link>
        </p>
      </header>

      <article className="flex flex-col gap-4 overflow-hidden rounded-lg border border-line bg-canvas p-4 shadow-card md:p-6">
        {CULTURE_IMAGES[slug] && (
          <div className="relative -m-4 mb-0 aspect-video overflow-hidden bg-surface-alt md:-m-6 md:mb-0">
            <Image
              src={CULTURE_IMAGES[slug]}
              alt={story.title}
              fill
              sizes="(max-width: 768px) 100vw, 800px"
              className="object-cover"
            />
          </div>
        )}
        {paragraphs.map((p, i) => (
          <p key={i} className="text-base leading-relaxed text-ink">{p}</p>
        ))}
      </article>

      <section aria-labelledby="lirik-title" className="rounded-lg border border-line bg-canvas p-4 shadow-card md:p-6">
        <h2 id="lirik-title" className="text-base font-bold text-ink">{t(lang, "budaya.lyrics")}</h2>
        {story.lyrics ? (
          <pre className="mt-3 whitespace-pre-wrap font-sans text-base leading-relaxed text-ink">{story.lyrics}</pre>
        ) : (
          <p className="mt-2 text-sm text-muted">
            {t(lang, "budaya.noLyrics")}
          </p>
        )}
      </section>

      <section aria-labelledby="sumber-title">
        <h2 id="sumber-title" className="text-base font-bold text-ink">{t(lang, "budaya.sources")}</h2>
        {story.sources.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
            {story.sources.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">{t(lang, "budaya.noSources")}</p>
        )}
      </section>

      <Banner tone="info">
        {t(lang, "budaya.fullVersion")}{" "}
        <Link href={`/artikel/${story.slug}`} className="font-semibold text-accent-dark hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          {t(lang, "budaya.readInChannel")}
        </Link>
        .
      </Banner>
    </div>
  );
}
