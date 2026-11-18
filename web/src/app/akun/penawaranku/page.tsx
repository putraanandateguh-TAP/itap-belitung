// S14 — Penawaranku (F07): kelola listing sendiri + konfirmasi ketersediaan.
// Aksi: konfirmasi masih dijual, tandai terjual, pulihkan (≤14 hari setelah
// dihapus), hapus (soft delete). Terjual tidak bisa kembali aktif (trigger DB).
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session-client";
import { Banner, Button, ButtonLink, EmptyState, StatusBadge } from "@/components/ui";
import { formatListingPrice, type MarketplaceListing } from "@/lib/listings";
import { formatDateWIB } from "@/lib/format";
import { useLanguage } from "@/components/language-provider";

type Action = "confirm" | "mark-sold" | "restore" | "delete";

export default function PenawarankuPage() {
  const { t, lang } = useLanguage();
  const { session, loading: sessionLoading } = useSession();
  const [items, setItems] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me/listings", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("common.loadFailedHttp", { status: res.status }));
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("akun.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (session) load(); else if (!sessionLoading) setLoading(false); }, [session, sessionLoading, load]);

  async function act(id: string, action: Action, confirmText?: string) {
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(`${action}:${id}`);
    setNotice(null);
    try {
      const url = action === "delete" ? `/api/listings/${id}` : `/api/listings/${id}/${action}`;
      const res = await fetch(url, { method: action === "delete" ? "DELETE" : "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("common.actionFailedHttp", { status: res.status }));
      setNotice(
        action === "confirm" ? t("akun.confirmed")
        : action === "mark-sold" ? t("akun.sold")
        : action === "restore" ? t("akun.restored")
        : t("akun.deleted"),
      );
      await load();
    } catch (e) {
      setNotice(e instanceof Error ? e.message : t("akun.actionFailed"));
    } finally {
      setBusy(null);
    }
  }

  if (sessionLoading || loading) {
    return <div aria-busy="true" className="py-8"><div className="skeleton h-64 w-full" /></div>;
  }
  if (!session) {
    return (
      <div className="py-8">
        <EmptyState title={t("akun.loginTitle")} desc={t("akun.loginDesc")} action={<ButtonLink href="/masuk">{t("auth.signInUp")}</ButtonLink>} titleAs="h1" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">{t("akun.myOffers")}</h1>
          <p className="mt-1 text-sm text-muted">{t("akun.myOffersDesc")}</p>
        </div>
        <ButtonLink href="/jual-beli/pasang">{t("akun.postNew")}</ButtonLink>
      </div>

      <Banner tone="info">
        {t("akun.offersBanner")}
      </Banner>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {notice && <p role="status" className="text-sm text-muted">{notice}</p>}

      {items.length === 0 ? (
        <EmptyState
          title={t("akun.noOffers")}
          desc={t("akun.noOffersDesc")}
          action={<ButtonLink href="/jual-beli/pasang">{t("akun.postNew")}</ButtonLink>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {items.map((l) => (
            <li key={l.id} className="rounded-lg border border-line bg-canvas p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <Link href={`/jual-beli/${l.id}`} className="text-base font-semibold text-ink hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                    {l.title}
                  </Link>
                  <p className="mt-1 text-sm text-muted">
                    {formatListingPrice(l.price_cents)} · {l.location_name ?? t("akun.noLocation")} · {t("akun.posted")} {formatDateWIB(l.created_at, lang)}
                  </p>
                </div>
                <StatusBadge status={l.status} />
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {l.status === "aktif" && (
                  <>
                    <Button size="sm" loading={busy === `confirm:${l.id}`} onClick={() => act(l.id, "confirm")}>{t("akun.confirmStill")}</Button>
                    <Button size="sm" variant="secondary" loading={busy === `mark-sold:${l.id}`} onClick={() => act(l.id, "mark-sold", t("akun.confirmSold"))}>{t("akun.markSold")}</Button>
                  </>
                )}
                {l.status === "dihapus" && (
                  <Button size="sm" loading={busy === `restore:${l.id}`} onClick={() => act(l.id, "restore")}>{t("akun.restore")}</Button>
                )}
                {(l.status === "aktif" || l.status === "dinonaktifkan") && (
                  <Button size="sm" variant="danger" loading={busy === `delete:${l.id}`} onClick={() => act(l.id, "delete", t("akun.confirmDelete"))}>{t("akun.delete")}</Button>
                )}
                <ButtonLink href={`/jual-beli/${l.id}`} variant="ghost" size="sm">{t("akun.view")}</ButtonLink>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
