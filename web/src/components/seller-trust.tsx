"use client";

// A4 (M8) — Kepercayaan marketplace tanpa escrow (entrepreneur.md).
// Semua teks ditulis baru untuk iTAP. TIDAK ada klaim "terverifikasi"
// umum: satu-satunya status verifikasi yang bisa dibaca lapisan aplikasi
// untuk penjual lain adalah WhatsApp (profiles.whatsappVerifiedAt);
// status email penjual lain hanya ada di auth.users dan tidak terbaca di
// sini. Badge yang tampil karena itu HANYA "WhatsApp terverifikasi" bila
// memang ada — bila tidak ada, tampil catatan jujur "belum terverifikasi".
// Umur akun + jumlah penawaran aktif berasal dari data nyata (profiles
// + hitung listings aktif). Panduan transaksi aman + checklist COD tampil
// di ruang chat; tombol "Laporkan penipuan" memakai modal S26 yang sudah
// ada (report-modal.tsx) dengan alasan awal "Penipuan atau mencurigakan".
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui";
import { formatDateWIB } from "@/lib/format";
import { useLanguage } from "@/components/language-provider";

export function SellerTrustBox({
  whatsappVerified,
  since,
  activeListings,
}: {
  whatsappVerified: boolean;
  since: string | null;
  activeListings: number;
}) {
  const { lang, t } = useLanguage();
  return (
    <section aria-labelledby="penjual-title" className="rounded-lg border border-line bg-canvas p-5">
      <h2 id="penjual-title" className="text-lg font-semibold text-ink">{t("trust.seller")}</h2>
      <div className="mt-3 flex flex-col gap-2 text-sm text-ink">
        {whatsappVerified ? (
          <p className="flex flex-wrap items-center gap-2">
            <Badge tone="active"><ShieldCheck className="size-3.5" aria-hidden="true" /> {t("trust.waVerified")}</Badge>
            <span className="text-muted">{t("trust.waVerifiedNote")}</span>
          </p>
        ) : (
          <p>
            <Badge tone="example">{t("trust.waNotVerified")}</Badge>
            <span className="mt-1 block text-muted">
              {t("trust.waNotVerifiedNote")}
            </span>
          </p>
        )}
        <p className="text-muted">
          {since ? t("trust.joinedSince", { date: formatDateWIB(since, lang), count: activeListings }) : t("trust.joinedUnknown")}
        </p>
        <p className="text-muted">
          {t("trust.noEscrowNote")}
        </p>
      </div>
    </section>
  );
}

/** Panduan transaksi aman + checklist sebelum COD — tampil di ruang chat. */
export function SafeTradeGuide() {
  const { t } = useLanguage();
  return (
    <details className="rounded-lg border border-line bg-surface p-4">
      <summary className="cursor-pointer text-sm font-semibold text-ink focus-visible:outline-2 focus-visible:outline-accent">
        {t("trust.safeGuide")}
      </summary>
      <ul className="mt-3 flex list-disc flex-col gap-1.5 pl-5 text-sm text-ink">
        <li>{t("trust.guideA")}</li>
        <li>{t("trust.guideB")}</li>
        <li>{t("trust.guideC")}</li>
        <li>{t("trust.guideD")}</li>
        <li>{t("trust.guideE")}</li>
        <li>{t("trust.guideF")}</li>
        <li>{t("trust.guideG")}</li>
      </ul>
    </details>
  );
}
