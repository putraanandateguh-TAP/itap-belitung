// S05 Detail artikel — konten yang bisa dialihkan bahasanya (ID/EN).
// Server page merender komponen ini dengan data artikel lengkap
// (title/body ID + EN); pilihan bahasa disimpan di localStorage
// ('itap_lang') dan default-nya Bahasa Indonesia. Bila EN dipilih tapi
// artikel belum diterjemahkan (title_en null), tampilkan konten ID
// beserta banner "Belum diterjemahkan" — jangan render kosong.
"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";
import { ExternalLink, MapPin } from "lucide-react";
import { channelLabel } from "@/lib/labels";
import type { Article } from "@/lib/types";
import { Badge, Banner } from "@/components/ui";
import { ShareButton } from "./share-button";
import { useLanguage } from "@/components/language-provider";

type Lang = "id" | "en";
const LANG_KEY = "itap_lang";

export function ArticleContent({
  article,
  categoryName,
  metaLine,
  gallery,
}: {
  article: Article;
  categoryName: string;
  metaLine: string;
  gallery: ReactNode;
}) {
  const [lang, setLang] = useState<Lang>("id");
  const { lang: uiLang, t } = useLanguage();

  // Baca preferensi yang tersimpan (bila ada) setelah mount agar tidak
  // ada hydration mismatch antara server (default 'id') dan klien.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(LANG_KEY);
      if (saved === "id" || saved === "en") setLang(saved);
    } catch {
      // localStorage tak tersedia — tetap di default 'id'.
    }
  }, []);

  function choose(next: Lang) {
    setLang(next);
    try {
      window.localStorage.setItem(LANG_KEY, next);
    } catch {
      // Abaikan bila penyimpanan gagal.
    }
  }

  const untranslated = article.title_en === null;
  // EN hanya dipakai bila terjemahan judulnya ada; bila tidak, fallback
  // ke konten ID (beserta banner) supaya tidak pernah render kosong.
  const showEn = lang === "en" && !untranslated;
  const displayTitle = showEn ? (article.title_en as string) : article.title_id;
  const displayBody = lang === "en" && article.body_en !== null ? article.body_en : article.body_id;
  const contentLang: Lang = showEn ? "en" : "id";

  const toggleBtn =
    "rounded px-3 py-1 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent";
  const toggleBtnActive = " bg-accent text-on-accent";
  const toggleBtnInactive = " text-ink hover:bg-surface-muted";

  return (
    <>
      <header className="mt-4">
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="info">{channelLabel(article.channel, uiLang)}</Badge>
          <Badge tone="draft">{categoryName}</Badge>
          {article.external && <Badge tone="draft">{t("article.aggregated")}</Badge>}
        </div>

        <div className="mt-3 flex items-center gap-2" role="group" aria-label={t("article.language")}>
          <span className="text-sm text-muted">{t("article.language")}</span>
          <div className="inline-flex rounded-md border border-line bg-surface p-0.5">
            <button
              type="button"
              aria-pressed={lang === "id"}
              onClick={() => choose("id")}
              className={toggleBtn + (lang === "id" ? toggleBtnActive : toggleBtnInactive)}
            >
              Indonesia
            </button>
            <button
              type="button"
              aria-pressed={lang === "en"}
              onClick={() => choose("en")}
              className={toggleBtn + (lang === "en" ? toggleBtnActive : toggleBtnInactive)}
            >
              English
            </button>
          </div>
        </div>

        <h1 lang={contentLang} className="mt-3 text-xl font-bold text-ink md:text-display">
          {displayTitle}
        </h1>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-muted">
          <MapPin className="size-4" aria-hidden="true" />
          {metaLine}
        </p>
        <div className="mt-3 flex gap-2">
          <ShareButton title={displayTitle} />
        </div>
      </header>

      {untranslated && (
        <Banner tone="info">{t("article.noEn")}</Banner>
      )}

      <div className="mt-6">{gallery}</div>

      {article.external ? (
        <div lang={contentLang} className="mt-6 flex flex-col gap-4">
          <Banner tone="info">
            {t("article.aggregatedBanner")}
          </Banner>
          {displayBody.map((p, i) => (
            <p key={i} className="text-base leading-7 text-ink">{p}</p>
          ))}
          <p className="text-sm text-muted">
            {t("article.source")}: {article.source}
          </p>
          <a
            href={article.source_url ?? "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-12 items-center justify-center gap-2 rounded-md bg-accent px-6 text-base font-semibold text-on-accent hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-accent"
          >
            {t("article.readAt", { source: article.source })} <ExternalLink className="size-4" aria-hidden="true" />
          </a>
        </div>
      ) : (
        <div lang={contentLang} className="mt-6 flex flex-col gap-4">
          {displayBody.map((p, i) => (
            <p key={i} className={i === 0 ? "text-lg leading-8 text-ink" : "text-base leading-7 text-ink"}>{p}</p>
          ))}
        </div>
      )}
    </>
  );
}
