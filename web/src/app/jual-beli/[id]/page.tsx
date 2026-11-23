// S08 (publik) + S09 (privat) — Detail penawaran.
// Server component: getListing sudah mem-masking kontak + koordinat untuk
// publik; detail penuh hanya bila login + email terverifikasi / pemilik / admin.
// Aksi (simpan/suka, chat, lapor) di actions.tsx (client island).
import type { Metadata } from "next";
import { SECTION_ILLUSTRATIONS } from "@/lib/illustrations";
import { notFound } from "next/navigation";
import { getListing } from "@/lib/marketplace";
import { getCurrentProfile } from "@/lib/auth";
import { LISTING_CATEGORY_LABELS, formatListingPrice, listingPhotoUrl } from "@/lib/listings";
import { formatDateWIB } from "@/lib/format";
import { Banner, ButtonLink, EmptyState, StatusBadge } from "@/components/ui";
import { SellerTrustBox } from "@/components/seller-trust";
import { ListingActions } from "./actions";
import { getServerLang } from "@/lib/i18n-server";
import { t, LISTING_CATEGORY_NAMES_EN } from "@/lib/i18n";

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  const listing = await getListing(id, null);
  if (!listing) return { title: "Penawaran tidak ditemukan" };
  return {
    title: listing.title,
    description: `${listing.title} — ${formatListingPrice(listing.price_cents)} di Jual Beli Belitung (iTAP).`,
  };
}

export default async function ListingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lang = await getServerLang();
  const profile = await getCurrentProfile();
  const listing = await getListing(id, profile);
  if (!listing) notFound();

  const isFull = Boolean(listing.description !== undefined);
  const isOwner = profile?.id === listing.seller_id;
  const photoCount = listing.photos?.length ?? 0;

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent">{t(lang, "nav.marketplace")} · {listing.category ? (lang === "en" ? LISTING_CATEGORY_NAMES_EN[listing.category] ?? listing.category : LISTING_CATEGORY_LABELS[listing.category as keyof typeof LISTING_CATEGORY_LABELS] ?? listing.category) : t(lang, "market.offer")}</p>
          <h1 className="mt-1 max-w-3xl text-xl font-bold text-ink md:text-display">{listing.title}</h1>
          <p className="mt-1 text-sm text-muted">
            {listing.location_name ?? t(lang, "market.locationNotListed")} · {t(lang, "market.posted")} {formatDateWIB(listing.created_at, lang)} · {listing.views.toLocaleString(lang === "en" ? "en-US" : "id-ID")} {t(lang, "common.views")}
          </p>
        </div>
        <StatusBadge status={listing.status} />
      </div>

      {photoCount > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          {listing.photos!.map((p) => {
            const url = listingPhotoUrl(p.storage_path);
            return url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.storage_path} src={url} alt={`Foto ${listing.title}`} className="aspect-video w-full rounded-lg border border-line object-cover" loading="lazy" />
            ) : (
              <p key={p.storage_path} className="rounded-lg border border-line bg-canvas p-4 text-sm text-muted">
                {t(lang, "market.photoStorageNote")}
              </p>
            );
          })}
        </div>
      ) : (
        <figure className="overflow-hidden rounded-lg border border-line bg-surface">
          {/* Penjual belum unggah foto -> ilustrasi jual beli iTAP + keterangan jujur */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={SECTION_ILLUSTRATIONS.jualBeli.src} alt={SECTION_ILLUSTRATIONS.jualBeli.alt} className="aspect-video w-full object-cover" data-illustration="true" />
          <figcaption className="px-4 py-2 text-center text-sm text-muted">{t(lang, "market.noPhotoDetail")}</figcaption>
        </figure>
      )}

      <p className="text-xl font-bold text-ink">{formatListingPrice(listing.price_cents)}</p>

      {isFull ? (
        <section aria-labelledby="deskripsi-title" className="rounded-lg border border-line bg-canvas p-5">
          <h2 id="deskripsi-title" className="text-lg font-semibold text-ink">{t(lang, "market.description")}</h2>
          <p className="mt-2 whitespace-pre-wrap text-base text-ink">{listing.description || t(lang, "market.noDescription")}</p>
        </section>
      ) : (
        <Banner tone="info">
          {t(lang, "market.descriptionHidden")}{" "}
          <a href="/masuk" className="font-semibold underline">{t(lang, "market.signInSignUp")}</a> {t(lang, "market.verifyEmailAt")}{" "}
          <a href="/verifikasi" className="font-semibold underline">{t(lang, "market.verificationPage")}</a>.
        </Banner>
      )}

      {isFull && listing.seller_contact ? (
        <section aria-labelledby="kontak-title" className="rounded-lg border border-line bg-canvas p-5">
          <h2 id="kontak-title" className="text-lg font-semibold text-ink">{t(lang, "market.sellerContact")}</h2>
          <p className="mt-2 text-base text-ink">{t(lang, "market.sellerNumber")}: <span className="font-semibold">{listing.seller_contact}</span></p>
          <p className="mt-1 text-sm text-muted">{t(lang, "market.numberNote")}</p>
          {listing.location_lat != null && listing.location_lng != null && (
            <p className="mt-3">
              <a
                href={`https://maps.google.com/?q=${listing.location_lat},${listing.location_lng}`}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-accent underline focus-visible:outline-2 focus-visible:outline-accent"
              >
                {t(lang, "market.viewSellerMap")}
              </a>
            </p>
          )}
        </section>
      ) : isFull ? (
        <Banner tone="warning">{t(lang, "market.noContact")}</Banner>
      ) : (
        <Banner tone="warning">
          {t(lang, "market.contactHidden")}
        </Banner>
      )}

      {/* A4 (M8): kepercayaan penjual — dari data profil asli; di mode seed
          halaman ini 404 (tidak ada listing), jadi kotak ini hanya tampil
          dengan data DB nyata. */}
      {listing.seller_whatsapp_verified !== undefined && (
        <SellerTrustBox
          whatsappVerified={listing.seller_whatsapp_verified}
          since={listing.seller_since ?? null}
          activeListings={listing.seller_active_listings ?? 0}
        />
      )}

      <ListingActions listingId={listing.id} sellerId={listing.seller_id} isOwner={isOwner} loggedIn={Boolean(profile)} />

      <p className="text-sm text-muted">
        {t(lang, "market.agreementNote")}
      </p>
      {!isFull && (
        <div>
          <ButtonLink href="/masuk" variant="secondary">{t(lang, "market.signInFull")}</ButtonLink>
        </div>
      )}
      {listing.status === "terjual" && (
        <EmptyState title={t(lang, "market.sold")} desc={t(lang, "market.soldDesc")} />
      )}
    </div>
  );
}
