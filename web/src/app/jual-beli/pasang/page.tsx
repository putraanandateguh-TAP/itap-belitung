// S13 — Form pasang penawaran (F05).
// Gerbang (ditampilkan jujur, bukan disembunyikan): login + email terverifikasi
// + aturan disetujui. Verifikasi WhatsApp BELUM tersedia (P2) — bukan syarat.
// Foto: dipilih maks 5, dikompresi di client + EXIF dibuang (photo-compress.ts),
// diunggah ke bucket `listing-photos` setelah listing dibuat, lalu dicatat
// lewat POST /api/listings/:id/photos. Tanpa Supabase (P1) foto tidak bisa
// diunggah — penawaran tetap bisa dibuat tanpa foto, dengan penjelasan jujur.
"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { MapPin, X } from "lucide-react";
import { useSession } from "@/lib/session-client";
import { Banner, Button, ButtonLink, EmptyState, Field, SelectInput, TextArea, TextInput } from "@/components/ui";
import { LISTING_CATEGORIES } from "@/lib/listings";
import { UPLOAD_LIMITS, storagePath } from "@/lib/upload";
import { compressListingPhoto, formatBytes, type CompressedPhoto } from "@/components/photo-compress";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { useLanguage } from "@/components/language-provider";
import { listingCategoryName } from "@/lib/i18n";

const SUPABASE_CONFIGURED = Boolean(
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()
    && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
);

export default function PasangPage() {
  const router = useRouter();
  const { session, loading } = useSession();
  const { lang, t } = useLanguage();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("lainnya");
  const [price, setPrice] = useState("");
  const [locationName, setLocationName] = useState("");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [photos, setPhotos] = useState<CompressedPhoto[]>([]);
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoNote, setPhotoNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  if (loading) {
    return <div aria-busy="true" className="py-8"><div className="skeleton h-96 w-full" /></div>;
  }
  if (!session) {
    return (
      <div className="py-8">
        <EmptyState
          title={t("pasang.loginTitle")}
          desc={t("pasang.loginDesc")}
          action={<ButtonLink href="/masuk">{t("common.signInSignUp")}</ButtonLink>}
          titleAs="h1"
        />
      </div>
    );
  }

  const emailOk = session.emailVerified;
  const rulesOk = session.marketplaceRulesAccepted;
  const userId = session.id;
  const canSubmit = emailOk && rulesOk;

  async function onPickFiles(files: FileList | null) {
    if (!files) return;
    setPhotoError(null);
    const remaining = UPLOAD_LIMITS.maxPhotosPerListing - photos.length;
    const picked = Array.from(files).slice(0, remaining);
    if (files.length > remaining) setPhotoError(t("pasang.errMaxPhotos", { max: UPLOAD_LIMITS.maxPhotosPerListing }));
    for (const f of picked) {
      try {
        const c = await compressListingPhoto(f);
        setPhotos((prev) => [...prev, c]);
      } catch (e) {
        setPhotoError(e instanceof Error ? e.message : t("pasang.errPhoto"));
      }
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  function fillGps() {
    if (!("geolocation" in navigator)) {
      setError(t("pasang.errGeoUnsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(String(pos.coords.latitude.toFixed(6)));
        setLng(String(pos.coords.longitude.toFixed(6)));
        setError(null);
      },
      () => setError(t("pasang.errGeoDenied")),
      { timeout: 10000 },
    );
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const priceNum = Number(price.replace(/[^\d]/g, ""));
    if (!title.trim() || title.trim().length < 3) { setError(t("pasang.errTitle")); return; }
    if (!Number.isFinite(priceNum) || priceNum < 0) { setError(t("pasang.errPrice")); return; }
    setBusy(true);
    setError(null);
    setPhotoNote(null);
    try {
      const latNum = lat.trim() ? Number(lat) : null;
      const lngNum = lng.trim() ? Number(lng) : null;
      if ((latNum !== null && !Number.isFinite(latNum)) || (lngNum !== null && !Number.isFinite(lngNum))) {
        throw new Error(t("pasang.errCoords"));
      }
      const res = await fetch("/api/listings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          category,
          price_cents: Math.round(priceNum * 100),
          location_name: locationName.trim(),
          location_lat: latNum,
          location_lng: lngNum,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("pasang.errSubmitHttp", { status: res.status }));
      const listingId = data.id as string;

      if (photos.length > 0) {
        if (!SUPABASE_CONFIGURED) {
          setPhotoNote(t("pasang.photoNoStorage"));
        } else {
          try {
            const supabase = createSupabaseBrowser();
            const paths: string[] = [];
            for (const p of photos) {
              const path = storagePath(userId, "jpg");
              const { error: upErr } = await supabase.storage.from("listing-photos").upload(path, p.blob, { contentType: "image/jpeg", upsert: false });
              if (upErr) throw new Error(upErr.message);
              paths.push(path);
            }
            const pr = await fetch(`/api/listings/${listingId}/photos`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ paths }),
            });
            if (!pr.ok) setPhotoNote(t("pasang.photoRecordFailed"));
          } catch (up) {
            setPhotoNote(t("pasang.photoUploadFailed", { reason: up instanceof Error ? up.message : "kesalahan upload" }));
          }
        }
      }
      router.push(`/jual-beli/${listingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("pasang.errSubmit"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-xl font-bold text-ink">{t("pasang.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("pasang.subtitle")}</p>
      </div>

      {!emailOk && (
        <Banner tone="warning">
          {t("pasang.emailNotVerified")}{" "}
          <Link href="/verifikasi" className="font-semibold underline">{t("pasang.verifyEmail")}</Link>
        </Banner>
      )}
      {!rulesOk && (
        <Banner tone="warning">
          {t("pasang.rulesNotAccepted")}{" "}
          <Link href="/jual-beli/aturan" className="font-semibold underline">{t("pasang.readRules")}</Link>
        </Banner>
      )}
      <Banner tone="info">
        {t("pasang.waBanner")}
      </Banner>

      <form onSubmit={submit} className="flex max-w-2xl flex-col gap-4 rounded-lg border border-line bg-canvas p-5">
        <Field label={t("pasang.titleLabel")} id="listing-title" hint={t("pasang.titleHint")}>
          <TextInput id="listing-title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder={t("pasang.titlePlaceholder")} required disabled={!canSubmit} />
        </Field>
        <Field label={t("pasang.descLabel")} id="listing-desc" hint={t("pasang.descHint")}>
          <TextArea id="listing-desc" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={5000} placeholder={t("pasang.descPlaceholder")} disabled={!canSubmit} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label={t("pasang.category")} id="listing-category">
            <SelectInput id="listing-category" value={category} onChange={(e) => setCategory(e.target.value)} disabled={!canSubmit}>
              {LISTING_CATEGORIES.map((c) => <option key={c} value={c}>{listingCategoryName(c, lang)}</option>)}
            </SelectInput>
          </Field>
          <Field label={t("pasang.price")} id="listing-price" hint={t("pasang.priceHint")}>
            <TextInput id="listing-price" inputMode="numeric" value={price} onChange={(e) => setPrice(e.target.value.replace(/[^\d]/g, ""))} placeholder="150000" required disabled={!canSubmit} />
          </Field>
        </div>
        <Field label={t("pasang.locationName")} id="listing-location" hint={t("pasang.locationHint")}>
          <TextInput id="listing-location" value={locationName} onChange={(e) => setLocationName(e.target.value)} maxLength={160} placeholder={t("pasang.locationPlaceholder")} disabled={!canSubmit} />
        </Field>
        <fieldset className="flex flex-col gap-3 rounded-md border border-line p-4">
          <legend className="px-1 text-sm font-semibold text-ink">{t("pasang.locationLegend")}</legend>
          <p className="text-sm text-muted">{t("pasang.locationDesc")}</p>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label={t("pasang.lat")} id="listing-lat">
              <TextInput id="listing-lat" inputMode="decimal" value={lat} onChange={(e) => setLat(e.target.value)} placeholder="-2.733333" disabled={!canSubmit} />
            </Field>
            <Field label={t("pasang.lng")} id="listing-lng">
              <TextInput id="listing-lng" inputMode="decimal" value={lng} onChange={(e) => setLng(e.target.value)} placeholder="107.666667" disabled={!canSubmit} />
            </Field>
          </div>
          <div>
            <Button type="button" variant="secondary" onClick={fillGps} disabled={!canSubmit}>
              <MapPin className="size-4" aria-hidden="true" /> {t("pasang.fillGps")}
            </Button>
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3 rounded-md border border-line p-4">
          <legend className="px-1 text-sm font-semibold text-ink">{t("pasang.photoLegend", { max: UPLOAD_LIMITS.maxPhotosPerListing })}</legend>
          <p className="text-sm text-muted">
            {t("pasang.photoDesc")}
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            multiple
            disabled={!canSubmit || photos.length >= UPLOAD_LIMITS.maxPhotosPerListing}
            onChange={(e) => onPickFiles(e.target.files)}
            aria-label={t("pasang.photoLabel")}
            className="text-sm text-ink"
          />
          {photoError && <p role="alert" className="text-sm text-danger">{photoError}</p>}
          {photos.length > 0 && (
            <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
              {photos.map((p, i) => (
                <li key={p.previewUrl} className="relative rounded-md border border-line bg-surface p-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={p.previewUrl} alt={t("pasang.photoPreview", { n: i + 1, name: p.originalName })} className="aspect-video w-full rounded object-cover" />
                  <p className="mt-1 text-xs text-muted">{formatBytes(p.originalBytes)} → {formatBytes(p.compressedBytes)}</p>
                  <button
                    type="button"
                    aria-label={t("pasang.removePhoto", { n: i + 1 })}
                    onClick={() => setPhotos((prev) => prev.filter((_, j) => j !== i))}
                    className="absolute right-1 top-1 rounded-full bg-canvas p-1 text-ink shadow-sm focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </fieldset>

        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {photoNote && <p role="status" className="text-sm text-warning">{photoNote}</p>}
        <div className="flex flex-wrap gap-2">
          <Button type="submit" loading={busy} disabled={!canSubmit}>{t("pasang.submit")}</Button>
          <ButtonLink href="/jual-beli" variant="secondary">{t("common.cancel")}</ButtonLink>
        </div>
        {!canSubmit && <p className="text-sm text-muted">{t("pasang.submitDisabled")}</p>}
      </form>
    </div>
  );
}
