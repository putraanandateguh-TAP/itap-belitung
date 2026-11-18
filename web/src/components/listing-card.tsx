// #Kartu listing — ringkasan penawaran publik (S07/S08, S14, S15, S17).
"use client";
// Foto dari bucket listing-photos; tanpa foto tampil placeholder jujur
// (bukan gambar karangan). Harga dari price_cents (sen) -> Rupiah.
import Link from "next/link";
import { ImageOff } from "lucide-react";
import { Badge, StatusBadge } from "./ui";
import { useLanguage } from "@/components/language-provider";
import { listingCategoryName } from "@/lib/i18n";
import {
  formatListingPrice,
  listingPhotoUrl,
  type MarketplaceListing,
} from "@/lib/listings";
import { formatDateWIB } from "@/lib/format";

export function ListingCard({ listing }: { listing: MarketplaceListing }) {
  const { lang, t } = useLanguage();
  const photo = listing.photos?.[0];
  const photoUrl = photo ? listingPhotoUrl(photo.storage_path) : null;
  return (
    <article className="overflow-hidden rounded-lg border border-line bg-canvas shadow-card">
      <Link href={`/jual-beli/${listing.id}`} className="block focus-visible:outline-2 focus-visible:outline-accent" aria-label={`${listing.title} — ${formatListingPrice(listing.price_cents)}`}>
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={photoUrl} alt={t("market.photoAlt", { title: listing.title })} className="aspect-video w-full object-cover" loading="lazy" />
        ) : (
          <span className="flex aspect-video w-full flex-col items-center justify-center gap-1 bg-surface text-muted" aria-label={t("market.noPhoto")}>
            <ImageOff className="size-8" aria-hidden="true" />
            <span className="text-xs font-medium">{t("market.noPhoto")}</span>
          </span>
        )}
      </Link>
      <div className="flex flex-col gap-2 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-base font-semibold leading-snug text-ink">
            <Link href={`/jual-beli/${listing.id}`} className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              {listing.title}
            </Link>
          </h3>
          <StatusBadge status={listing.status} />
        </div>
        <p className="text-lg font-bold text-ink">{formatListingPrice(listing.price_cents)}</p>
        <p className="text-sm text-muted">
          {listing.category ? `${listingCategoryName(listing.category, lang)} · ` : ""}
          {listing.location_name ?? t("market.locationNotListed")} · {formatDateWIB(listing.created_at, lang)}
        </p>
        <p className="flex items-center gap-2 text-xs text-muted">
          <span>{listing.views.toLocaleString(lang === "en" ? "en-US" : "id-ID")} {t("common.views")}</span>
          <span aria-hidden="true">·</span>
          <span>{listing.saves_count.toLocaleString(lang === "en" ? "en-US" : "id-ID")} {t("market.saved")}</span>
          <span aria-hidden="true">·</span>
          <span>{listing.likes_count.toLocaleString(lang === "en" ? "en-US" : "id-ID")} {t("market.liked")}</span>
        </p>
        {listing.bookmark_type && (
          <p><Badge tone="info">{listing.bookmark_type === "save" ? t("market.savedBadge") : t("market.likedBadge")}</Badge></p>
        )}
      </div>
    </article>
  );
}
