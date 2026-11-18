// #12 Kartu Konten + #14 Galeri Foto (placeholder jujur — foto asli iTAP
// menyusul dari arsip; TIDAK memakai gambar Satam dan TIDAK menebak foto).
"use client";

import Link from "next/link";
import { ImageOff, MapPin } from "lucide-react";
import type { Article } from "@/lib/types";
import { formatDateWIB, formatViews } from "@/lib/format";
import { channelLabel } from "@/lib/labels";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "./ui";

export function ArticleCard({ article, variant = "standard" }: { article: Article; variant?: "headline" | "standard" | "compact" }) {
  const { lang, t } = useLanguage();
  const excerpt = article.body_id[0] ?? "";
  if (variant === "compact") {
    return (
      <article className="rounded-lg border border-line bg-canvas p-4">
        <Link href={`/artikel/${article.slug}`} className="group focus-visible:outline-2 focus-visible:outline-accent">
          <h2 className="text-sm font-semibold text-ink group-hover:text-accent group-hover:underline">{article.title_id}</h2>
        </Link>
        <p className="mt-1 text-xs text-muted">{formatDateWIB(article.published_at, lang)} · {article.location_name}</p>
      </article>
    );
  }
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-canvas shadow-card">
      <Link href={`/artikel/${article.slug}`} className="group block focus-visible:outline-2 focus-visible:outline-accent">
        <div className="flex aspect-video items-center justify-center bg-surface-alt" role="img" aria-label={t("article.placeholderAlt", { title: article.title_id })}>
          <span aria-hidden="true" className="flex flex-col items-center gap-1 text-muted">
            <ImageOff className="size-8" aria-hidden="true" />
            <span className="px-4 text-center text-xs">{t("article.photoComing")}</span>
          </span>
        </div>
      </Link>
      <div className="p-4">
        <div className="flex items-center gap-2">
          <Badge tone="info">{channelLabel(article.channel, lang)}</Badge>
          {article.external && <Badge tone="draft">{t("article.aggregatedMedia")}</Badge>}
        </div>
        <Link href={`/artikel/${article.slug}`} className="group focus-visible:outline-2 focus-visible:outline-accent">
          <h2 className={`mt-2 font-semibold text-ink group-hover:text-accent group-hover:underline ${variant === "headline" ? "text-lg" : "text-base"}`}>
            {article.title_id}
          </h2>
        </Link>
        {excerpt && <p className="mt-1 line-clamp-2 text-sm text-muted">{excerpt}</p>}
        <p className="mt-2 flex items-center gap-1 text-xs text-muted">
          <MapPin className="size-3" aria-hidden="true" />
          {formatDateWIB(article.published_at, lang)} · {article.location_name} · {formatViews(article.views, lang)}
        </p>
      </div>
    </article>
  );
}

export function ArticleGallery({ article }: { article: Article }) {
  const { t } = useLanguage();
  if (article.gallery.length === 0) {
    return (
      <figure className="overflow-hidden rounded-lg border border-line bg-surface">
        <div className="flex aspect-video items-center justify-center bg-surface-alt" role="img" aria-label={t("article.galleryAlt", { title: article.title_id })}>
          <span className="flex flex-col items-center gap-2 text-muted">
            <ImageOff className="size-10" aria-hidden="true" />
            <span className="max-w-xs px-4 text-center text-sm">{t("article.galleryEmpty")}</span>
          </span>
        </div>
        <figcaption className="px-4 py-2 text-xs text-muted">{t("article.galleryCaption")}</figcaption>
      </figure>
    );
  }
  return (
    <figure className="overflow-hidden rounded-lg border border-line bg-surface">
      <div className="flex aspect-video items-center justify-center bg-surface-alt">
        <span className="text-sm text-muted">{article.gallery[0].alt}</span>
      </div>
      <figcaption className="px-4 py-2 text-xs text-muted">{article.gallery[0].caption}</figcaption>
    </figure>
  );
}
