// S15/S17 — Tersimpan / Disukai (F06): kumpulan listing yang disimpan/disukai.
// Tab Semua / Disimpan / Disukai (client-side, dari bookmark_type API).
"use client";

import { useCallback, useEffect, useState } from "react";
import { useSession } from "@/lib/session-client";
import { ButtonLink, EmptyState } from "@/components/ui";
import { ListingCard } from "@/components/listing-card";
import type { MarketplaceListing } from "@/lib/listings";
import { useLanguage } from "@/components/language-provider";

type Tab = "semua" | "save" | "like";

export default function TersimpanPage() {
  const { t } = useLanguage();
  const { session, loading: sessionLoading } = useSession();
  const [items, setItems] = useState<MarketplaceListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("semua");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me/saved", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("common.loadFailedHttp", { status: res.status }));
      setItems(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("akun.savedLoadFailed"));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { if (session) load(); else if (!sessionLoading) setLoading(false); }, [session, sessionLoading, load]);

  if (sessionLoading || loading) {
    return <div aria-busy="true" className="py-8"><div className="skeleton h-64 w-full" /></div>;
  }
  if (!session) {
    return (
      <div className="py-8">
        <EmptyState title={t("akun.savedLogin")} desc={t("akun.savedLoginDesc")} action={<ButtonLink href="/masuk">{t("auth.signInUp")}</ButtonLink>} titleAs="h1" />
      </div>
    );
  }

  const shown = tab === "semua" ? items : items.filter((l) => l.bookmark_type === tab);

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-xl font-bold text-ink">{t("akun.savedTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t("akun.savedDesc")}</p>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div role="tablist" aria-label={t("akun.filterSaved")} className="flex gap-2">
        {([["semua", t("akun.tabAll")], ["save", t("akun.tabSaved")], ["like", t("akun.tabLiked")]] as [Tab, string][]).map(([v, label]) => (
          <button
            key={v}
            type="button"
            role="tab"
            aria-selected={tab === v}
            onClick={() => setTab(v)}
            className={`h-10 rounded-md px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${tab === v ? "bg-accent text-on-accent" : "border border-line bg-canvas text-ink hover:bg-surface"}`}
          >
            {label} ({v === "semua" ? items.length : items.filter((l) => l.bookmark_type === v).length})
          </button>
        ))}
      </div>

      {shown.length === 0 ? (
        <EmptyState
          title={items.length === 0 ? t("akun.savedEmpty") : t("akun.noInTab")}
          desc={items.length === 0
            ? t("akun.savedEmptyDesc")
            : t("akun.tryOtherTab")}
          action={<ButtonLink href="/jual-beli">{t("akun.exploreMarket")}</ButtonLink>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((l) => <ListingCard key={`${l.id}-${l.bookmark_type ?? ""}`} listing={l} />)}
        </div>
      )}
    </div>
  );
}
