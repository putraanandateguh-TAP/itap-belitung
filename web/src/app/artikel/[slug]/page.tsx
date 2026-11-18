// S05 Detail artikel — galeri, isi berformat, lokasi, sumber, rekomendasi
// terkait/lintas kanal, komentar (F10). SEO: canonical + metadata per artikel.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, MapPin, Share2 } from "lucide-react";
import { getArticle, getRelated, listComments } from "@/lib/data";
import { categoryName, channelLabel } from "@/lib/data";
import { ArticleCard, ArticleGallery } from "@/components/article-card";
import { Badge, Banner } from "@/components/ui";
import { formatDateWIB, formatViews } from "@/lib/format";
import { CommentSection } from "./comments";
import { ShareButton } from "./share-button";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return { title: "Artikel tidak ditemukan" };
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://itapbelitung.my.id";
  return {
    title: article.title_id,
    description: article.body_id[0]?.slice(0, 160) ?? article.title_id,
    alternates: { canonical: `${siteUrl}/artikel/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title_id,
      description: article.body_id[0]?.slice(0, 160) ?? article.title_id,
      publishedTime: article.published_at,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article || article.status !== "published") notFound();
  const [related, comments] = await Promise.all([getRelated(slug), listComments(slug)]);

  return (
    <article className="mx-auto max-w-3xl py-8">
      <nav aria-label="Breadcrumb" className="text-sm text-muted">
        <Link href="/" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">Beranda</Link>
        {" / "}
        <Link href={`/kanal/${article.channel}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          {channelLabel(article.channel)}
        </Link>
        {" / "}
        <span aria-current="page">{categoryName(article.category_id)}</span>
      </nav>

      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{channelLabel(article.channel)}</Badge>
          <Badge tone="draft">{categoryName(article.category_id)}</Badge>
          {article.external && <Badge tone="draft">Agregasi media lain</Badge>}
        </div>
        <h1 className="mt-3 text-xl font-bold text-ink md:text-display">{article.title_id}</h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <MapPin className="size-4" aria-hidden="true" />
          {formatDateWIB(article.published_at)} · {article.location_name} · {formatViews(article.views)}
        </p>
        <div className="mt-3 flex gap-2">
          <ShareButton title={article.title_id} />
        </div>
      </header>

      {article.title_en === null && (
        <Banner tone="info">
          Artikel ini belum tersedia dalam bahasa Inggris. Kontributor dapat membantu menerjemahkannya lewat editor kontributor.
        </Banner>
      )}

      <div className="mt-6">
        <ArticleGallery article={article} />
      </div>

      {article.external ? (
        <div className="mt-6 flex flex-col gap-4">
          <Banner tone="info">
            Kabar ini adalah agregasi dari media lain. iTAP tidak menulis ulang isinya — baca berita lengkapnya di sumber asli.
          </Banner>
          {article.body_id.map((p, i) => <p key={i} className="text-base leading-7 text-ink">{p}</p>)}
          <p className="text-sm text-muted">Sumber: {article.source}</p>
          <a
            href={article.source_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-6 text-base font-semibold text-on-accent hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-accent"
          >
            Baca di {article.source} <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </div>
      ) : (
        <div className="mt-6 flex flex-col gap-4">
          {article.body_id.map((p, i) => (
            <p key={i} className={i === 0 ? "text-lg leading-8 text-ink" : "text-base leading-7 text-ink"}>{p}</p>
          ))}
        </div>
      )}

      <footer className="mt-8 flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
        <p className="flex items-start gap-2 text-sm text-muted">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            Lokasi: {article.location_name}.
            {article.location_lat && article.location_lng ? (
              <>{" "}
                <a
                  href={`https://maps.google.com/?q=${article.location_lat},${article.location_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  Buka di Google Maps
                </a>
              </>
            ) : (
              " Koordinat peta belum tersedia untuk artikel ini."
            )}
          </span>
        </p>
        <p className="text-sm text-muted">
          Sumber: {article.source}
          {article.source_url && (
            <> · <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">Tautan sumber</a></>
          )}
        </p>
      </footer>

      <CommentSection slug={article.slug} initialComments={comments} />

      {related.length > 0 && (
        <section aria-labelledby="terkait-title" className="mt-12">
          <h2 id="terkait-title" className="text-xl font-bold text-ink">Artikel terkait</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {related.map((a) => <ArticleCard key={a.id} article={a} variant="compact" />)}
          </div>
        </section>
      )}
    </article>
  );
}
