// S15 (inbox) — Daftar chat / percakapan jual beli (F06).
// Catatan penomoran recon: S15 di recon.md adalah "Daftar chat / inbox",
// S16 ruang chat, S17 tersimpan — task memakai S16 untuk inbox dan S17
// untuk ruang chat; halaman ini tetap memakai route /chat (inbox) dan
// /chat/[id] (ruang) sesuai tugas.
"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session-client";
import { ButtonLink, EmptyState, StatusBadge } from "@/components/ui";
import { formatListingPrice, type ThreadSummary } from "@/lib/listings";
import { formatDateTimeWIB, formatRelativeWIB } from "@/lib/format";
import { useLanguage } from "@/components/language-provider";

export default function ChatInboxPage() {
  const { session, loading: sessionLoading } = useSession();
  const { lang, t } = useLanguage();
  const [threads, setThreads] = useState<ThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/me/threads", { cache: "no-store" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("chat.loadFailedHttp", { status: res.status }));
      setThreads(Array.isArray(data) ? data : []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("chat.loadFailed"));
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
        <EmptyState title={t("chat.loginTitle")} desc={t("chat.loginDesc")} action={<ButtonLink href="/masuk">{t("common.signInSignUp")}</ButtonLink>} titleAs="h1" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-xl font-bold text-ink">{t("chat.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("chat.subtitle")}</p>
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      {threads.length === 0 ? (
        <EmptyState
          title={t("chat.noThreads")}
          desc={t("chat.noThreadsDesc")}
          action={<ButtonLink href="/jual-beli">{t("chat.exploreMarket")}</ButtonLink>}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {threads.map((th) => (
            <li key={th.id} className="rounded-lg border border-line bg-canvas">
              <Link href={`/chat/${th.id}`} className="block p-4 focus-visible:outline-2 focus-visible:outline-accent">
                <span className="flex flex-wrap items-start justify-between gap-2">
                  <span className="font-semibold text-ink">{th.listing_title}</span>
                  <StatusBadge status={th.listing_status} />
                </span>
                <span className="mt-1 block text-sm text-muted">
                  {formatListingPrice(th.listing_price_cents)} · {th.is_seller ? t("chat.youSeller") : t("chat.youBuyer")}
                </span>
                <span className="mt-2 block truncate text-sm text-ink">
                  {th.last_message_text ?? t("chat.sayHello")}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {th.last_message_at ? formatRelativeWIB(th.last_message_at, lang) : formatDateTimeWIB(th.created_at, lang)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
