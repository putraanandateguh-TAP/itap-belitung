// S12 — Persetujuan aturan marketplace (F04).
// Teks aturan ditulis baru untuk iTAP (bukan copy Satam). Persetujuan dicatat
// lewat POST /api/auth/marketplace-rules/accept. Gerbang M3: email
// terverifikasi; verifikasi WhatsApp (P2) belum tersedia dan bukan syarat.
"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession } from "@/lib/session-client";
import { Banner, Button, ButtonLink, EmptyState } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

// Urutan tampil sama seperti sebelumnya; isi diambil dari kamus i18n.
const RULES: { titleKey: string; bodyKey: string }[] = [
  { titleKey: "rules.r3Title", bodyKey: "rules.r3Body" },
  { titleKey: "rules.r2Title", bodyKey: "rules.r2Body" },
  { titleKey: "rules.r5Title", bodyKey: "rules.r5Body" },
  { titleKey: "rules.r6Title", bodyKey: "rules.r6Body" },
  { titleKey: "rules.r4Title", bodyKey: "rules.r4Body" },
  { titleKey: "rules.r1Title", bodyKey: "rules.r1Body" },
  { titleKey: "rules.r7Title", bodyKey: "rules.r7Body" },
  { titleKey: "rules.r8Title", bodyKey: "rules.r8Body" },
];

export default function AturanPage() {
  const { session, loading } = useSession();
  const { t } = useLanguage();
  const [agreed, setAgreed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function accept() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/marketplace-rules/accept", { method: "POST" });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("rules.saveFailedHttp", { status: res.status }));
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("rules.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return <div aria-busy="true" className="py-8"><div className="skeleton h-64 w-full" /></div>;
  }
  if (!session) {
    return (
      <div className="py-8">
        <EmptyState
          title={t("rules.loginTitle")}
          desc={t("rules.loginDesc")}
          action={<ButtonLink href="/masuk">{t("common.signInSignUp")}</ButtonLink>}
          titleAs="h1"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-xl font-bold text-ink">{t("rules.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("rules.subtitle", { email: session.email })}
        </p>
      </div>

      <Banner tone="info">
        {t("rules.waNote")}
      </Banner>

      <ol className="flex flex-col gap-3">
        {RULES.map((r, i) => (
          <li key={r.titleKey} className="rounded-lg border border-line bg-canvas p-4">
            <p className="font-semibold text-ink">{i + 1}. {t(r.titleKey)}</p>
            <p className="mt-1 text-sm text-muted">{t(r.bodyKey)}</p>
          </li>
        ))}
      </ol>

      {session.marketplaceRulesAccepted ? (
        <Banner tone="success">
          {t("rules.alreadyAccepted")}{" "}
          <Link href="/jual-beli/pasang" className="font-semibold underline">{t("rules.postOffer")}</Link>
        </Banner>
      ) : done ? (
        <Banner tone="success">
          {t("rules.saved")}{" "}
          <Link href="/jual-beli/pasang" className="font-semibold underline">{t("rules.continuePost")}</Link>
        </Banner>
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-line bg-canvas p-4">
          <label className="flex items-start gap-2 text-sm text-ink">
            <input
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              className="mt-0.5 size-4 accent-accent"
            />
            {t("rules.agreeLabel")}
          </label>
          {error && <p role="alert" className="text-sm text-danger">{error}</p>}
          <div className="flex flex-wrap gap-2">
            <Button disabled={!agreed} loading={busy} onClick={accept}>{t("rules.agree")}</Button>
            <ButtonLink href="/jual-beli" variant="secondary">{t("rules.backToMarket")}</ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}
