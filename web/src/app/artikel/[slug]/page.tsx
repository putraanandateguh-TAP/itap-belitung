// S05 Detail artikel — galeri, isi berformat, lokasi, sumber, rekomendasi
// terkait/lintas kanal, komentar (F10). SEO: canonical + metadata per artikel.
import type { Metadata } from "next";
import { siteUrl } from "@/lib/site-url";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import { MapPin } from "lucide-react";
import { getArticle, getRelated, listComments } from "@/lib/data";
import { categoryName } from "@/lib/data";
import { channelLabel } from "@/lib/labels";
import { ArticleCard, ArticleGallery } from "@/components/article-card";
import { formatDateWIB, formatViews } from "@/lib/format";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { CommentSection } from "./comments";
import { ArticleContent } from "./article-content";
import { JsonLd } from "@/components/json-ld";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article || article.status !== "published") return { title: "Artikel tidak ditemukan" };
  const ogImage = article.gallery.find((g) => g.url)?.url ?? "/og.png";
  return {
    title: article.title_id,
    description: article.body_id[0]?.slice(0, 160) ?? article.title_id,
    alternates: { canonical: `${siteUrl()}/artikel/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title_id,
      description: article.body_id[0]?.slice(0, 160) ?? article.title_id,
      publishedTime: article.published_at,
      images: [{ url: ogImage }],
    },
    twitter: { card: "summary_large_image", title: article.title_id, images: [ogImage] },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  // Hitung view sekali per sesi: cookie itap_read_<slug> dipasang middleware
  // saat artikel pertama kali dibuka (cookie sesi). Tanpa ini, satu kali buka
  // halaman menaikkan 3x (generateMetadata + halaman + getRelated memanggil
  // getArticle) — mis. 906 -> 909 dari satu kunjungan (bug 19 Nov 2026).
  const alreadyRead = (await cookies()).has(`itap_read_${slug}`);
  const article = await getArticle(slug, { countView: !alreadyRead });
  if (!article || article.status !== "published") notFound();
  const lang = await getServerLang();
  const [related, comments, categoryNameValue] = await Promise.all([getRelated(slug), listComments(slug), categoryName(article.category_id, lang)]);

  const base = siteUrl();
  const heroUrl = article.gallery.find((g) => g.url)?.url;
  return (
    <article className="mx-auto max-w-3xl py-8">
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": article.external ? "NewsArticle" : "Article",
          headline: article.title_id.slice(0, 110),
          description: article.body_id[0]?.slice(0, 160) ?? article.title_id,
          datePublished: article.published_at,
          inLanguage: "id-ID",
          mainEntityOfPage: `${base}/artikel/${article.slug}`,
          ...(heroUrl ? { image: [heroUrl] } : {}),
          publisher: { "@type": "Organization", name: "iTAP Belitung", logo: { "@type": "ImageObject", url: `${base}/icon.png` } },
          ...(article.external && article.source_url ? { isBasedOn: article.source_url } : {}),
        }}
      />
      <nav aria-label={t(lang, "article.breadcrumb")} className="text-sm text-muted">
        <Link href="/" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t(lang, "nav.home")}</Link>
        {" / "}
        <Link href={`/kanal/${article.channel}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          {channelLabel(article.channel, lang)}
        </Link>
        {" / "}
        <span aria-current="page">{categoryNameValue}</span>
      </nav>

      <ArticleContent
        article={article}
        categoryName={categoryNameValue}
        metaLine={`${formatDateWIB(article.published_at, lang)} · ${article.location_name} · ${formatViews(article.views, lang)}`}
        gallery={<ArticleGallery article={article} />}
      />

      <footer className="mt-8 flex flex-col gap-4 rounded-lg border border-line bg-surface p-4">
        <p className="flex items-start gap-2 text-sm text-muted">
          <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
          <span>
            {t(lang, "article.location")}: {article.location_name}.
            {article.location_lat && article.location_lng ? (
              <>{" "}
                <a
                  href={`https://maps.google.com/?q=${article.location_lat},${article.location_lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
                >
                  {t(lang, "article.openInMaps")}
                </a>
              </>
            ) : (
              ` ${t(lang, "article.coordsUnavailable")}`
            )}
          </span>
        </p>
        <p className="text-sm text-muted">
          {t(lang, "article.source")}: {article.source}
          {article.source_url && (
            <> · <a href={article.source_url} target="_blank" rel="noopener noreferrer" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t(lang, "article.sourceLink")}</a></>
          )}
        </p>
      </footer>

      <CommentSection slug={article.slug} initialComments={comments} />

      {related.length > 0 && (
        <section aria-labelledby="terkait-title" className="mt-12">
          <h2 id="terkait-title" className="text-xl font-bold text-ink">{t(lang, "article.related")}</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {related.map((a) => <ArticleCard key={a.id} article={a} variant="compact" />)}
          </div>
        </section>
      )}
    </article>
  );
}
