// Komponen beranda ala portal (23 Nov 2026): kartu sorotan berfoto, baris
// kartu yang bisa digeser, daftar bergambar kecil, dan placeholder kanal.
// Pola tata letak terinspirasi portal kota modern; aset, ikon, dan teks
// milik iTAP. Placeholder tetap jujur: tidak menebak/mengarang foto.
"use client";

import Image from "next/image";
import Link from "next/link";
import { MapPin } from "lucide-react";
import { CHANNEL_STYLE } from "@/lib/channel-style";
import { articleIllustration } from "@/lib/illustrations";
import type { Article } from "@/lib/types";
import { formatDateWIB, formatViews } from "@/lib/format";
import { channelLabel } from "@/lib/labels";
import { useLanguage } from "@/components/language-provider";

function Photo({ article, sizes, priority }: { article: Article; sizes: string; size?: "sm" | "md"; dark?: boolean; priority?: boolean }) {
  const g = article.gallery[0];
  if (g?.url) {
    return <Image src={g.url} alt={g.alt} fill sizes={sizes} priority={priority} className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" />;
  }
  // Belum ada foto asli -> ilustrasi kanal (bukan foto peristiwa; alt jujur).
  const ill = articleIllustration(article);
  return <Image src={ill.src} alt={ill.alt} fill sizes={sizes} priority={priority} className="object-cover transition-transform duration-300 group-hover:scale-[1.03]" data-illustration="true" />;
}


/** Kartu sorotan besar: foto penuh + teks di atas gradasi gelap. */
export function HeroStory({ article }: { article: Article }) {
  const { lang } = useLanguage();
  const excerpt = article.body_id[0] ?? "";
  return (
    <article className="relative overflow-hidden rounded-[28px] bg-surface-dark shadow-pop">
      <Link href={`/artikel/${article.slug}`} className="group block focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-accent">
        <div className="relative aspect-[6/5] sm:aspect-[16/10] lg:aspect-auto lg:h-[460px]">
          <Photo article={article} sizes="(max-width: 1024px) 100vw, 760px" dark priority />
          <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-surface-dark-deep via-surface-dark/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 p-5 md:p-8">
            <span className="inline-flex rounded-full border border-white/30 bg-white/15 px-3 py-1 text-xs font-bold uppercase tracking-widest text-ink-on-dark backdrop-blur">
              {channelLabel(article.channel, lang)} · {article.location_name}
            </span>
            <h2 className="mt-3 max-w-2xl text-2xl font-bold leading-tight text-ink-on-dark md:text-[34px] md:leading-[40px]">
              {article.title_id}
            </h2>
            {excerpt && <p className="mt-2 line-clamp-2 max-w-2xl text-sm text-white/85 md:text-base">{excerpt}</p>}
            <p className="mt-3 text-xs text-white/80">{formatDateWIB(article.published_at, lang)} · {formatViews(article.views, lang)}</p>
          </div>
        </div>
      </Link>
    </article>
  );
}

/** Kartu untuk baris geser: foto di atas, label kanal berwarna, judul, meta. */
export function RowCard({ article, rank }: { article: Article; rank?: number }) {
  const { lang, t } = useLanguage();
  const st = CHANNEL_STYLE[article.channel];
  return (
    <article className="h-full w-[248px] overflow-hidden rounded-3xl border border-line bg-canvas shadow-card sm:w-[272px]">
      <Link href={`/artikel/${article.slug}`} className="group flex h-full flex-col focus-visible:outline-2 focus-visible:outline-accent">
        <div className="relative aspect-[4/3] overflow-hidden bg-surface-alt">
          <Photo article={article} sizes="272px" />
          {rank !== undefined && (
            <span aria-hidden="true" className="absolute left-3 top-3 flex size-7 items-center justify-center rounded-full bg-surface-dark text-xs font-bold text-ink-on-dark">{rank}</span>
          )}
          {article.external && (
            <span className="absolute right-3 top-3 rounded-full bg-canvas/90 px-2 py-0.5 text-[11px] font-semibold text-ink">{t("article.aggregatedMedia")}</span>
          )}
        </div>
        <div className="flex flex-1 flex-col p-4">
          <p className={`text-[11px] font-bold uppercase tracking-widest ${st.text}`}>{channelLabel(article.channel, lang)}</p>
          <h3 className="mt-1 line-clamp-3 text-base font-bold leading-snug text-ink group-hover:text-accent group-hover:underline">{article.title_id}</h3>
          <p className="mt-auto flex items-center gap-1 pt-3 text-xs text-muted">
            <MapPin className="size-3 shrink-0" aria-hidden="true" />
            <span className="truncate">{formatDateWIB(article.published_at, lang)} · {article.location_name}</span>
          </p>
        </div>
      </Link>
    </article>
  );
}

/** Baris daftar dengan gambar kecil di kiri (kolom "Kabar terbaru"). */
export function ListItem({ article }: { article: Article }) {
  const { lang } = useLanguage();
  const st = CHANNEL_STYLE[article.channel];
  return (
    <li>
      <Link href={`/artikel/${article.slug}`} className="group flex items-start gap-3 rounded-2xl p-2 hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent">
        <span className="relative block size-[72px] shrink-0 overflow-hidden rounded-xl bg-surface-alt">
          <Photo article={article} sizes="72px" size="sm" />
        </span>
        <span className="min-w-0">
          <span className={`block text-[11px] font-bold uppercase tracking-widest ${st.text}`}>{channelLabel(article.channel, lang)}</span>
          <span className="mt-0.5 line-clamp-2 text-sm font-semibold leading-snug text-ink group-hover:text-accent group-hover:underline">{article.title_id}</span>
          <span className="mt-1 block text-xs text-muted">{formatDateWIB(article.published_at, lang)}</span>
        </span>
      </Link>
    </li>
  );
}
