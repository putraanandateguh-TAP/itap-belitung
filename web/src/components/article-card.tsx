// #12 Kartu Konten + #14 Galeri Foto — menampilkan foto bila gallery[0]
// membawa url (Storage article-images, diisi batch foto AI 19 Nov 2026);
// bila belum ada foto, tetap placeholder jujur (TIDAK memakai gambar
// Satam dan TIDAK menebak foto).
"use client";

import Link from "next/link";
import Image from "next/image";
import { ImageOff, MapPin } from "lucide-react";
import type { Article } from "@/lib/types";
import { formatDateWIB, formatViews } from "@/lib/format";
import { channelLabel } from "@/lib/labels";
import { useLanguage } from "@/components/language-provider";
import { Badge } from "./ui";
import { CHANNEL_STYLE } from "@/lib/channel-style";
import type { Channel } from "@/lib/types";

function PlaceholderIcon({ channel }: { channel: Channel }) {
  const Icon = CHANNEL_STYLE[channel].icon;
  return (
    <span className="flex size-12 items-center justify-center rounded-full bg-canvas/80 shadow-sm">
      <Icon className="size-6" />
    </span>
  );
}

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
    <article className="overflow-hidden rounded-3xl border border-line bg-canvas shadow-card">
      <Link href={`/artikel/${article.slug}`} className="group block focus-visible:outline-2 focus-visible:outline-accent">
        {article.gallery[0]?.url ? (
          <div className="relative aspect-video overflow-hidden bg-surface-alt">
            <Image
              src={article.gallery[0].url}
              alt={article.gallery[0].alt}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
              className="object-cover transition-transform duration-300 group-hover:scale-[1.03]"
            />
          </div>
        ) : (
          <div className={`flex aspect-video items-center justify-center bg-gradient-to-br ${CHANNEL_STYLE[article.channel].art}`} role="img" aria-label={t("article.placeholderAlt", { title: article.title_id })}>
            <span aria-hidden="true" className="flex flex-col items-center gap-2">
              <PlaceholderIcon channel={article.channel} />
              <span className="px-4 text-center text-xs font-medium">{t("article.photoComing")}</span>
            </span>
          </div>
        )}
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
  const first = article.gallery[0];
  if (!first) {
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
      {first.url ? (
        <Image
          src={first.url}
          alt={first.alt}
          width={1280}
          height={720}
          sizes="(max-width: 768px) 100vw, 768px"
          priority
          className="aspect-video w-full object-cover"
        />
      ) : (
        <div className="flex aspect-video items-center justify-center bg-surface-alt">
          <span className="text-sm text-muted">{first.alt}</span>
        </div>
      )}
      <figcaption className="px-4 py-2 text-xs text-muted">{first.caption}</figcaption>
    </figure>
  );
}
