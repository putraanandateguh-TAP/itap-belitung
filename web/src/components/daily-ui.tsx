// Komponen bersama hub info harian (M5, A5 entrepreneur):
// stempel umur data + badge "data mungkin basi" + state kosong yang jujur.
// Dipakai semua halaman /info-harian/* dan kartu ringkas di beranda S01.
"use client";

import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { formatUpdatedWIB, isCacheStale } from "@/lib/daily-parse";
import { useLanguage } from "@/components/language-provider";

/** "Diperbarui pukul HH:MM WIB" + badge bila cache >6 jam / bukan hari ini. */
export function DailyStamp({ fetchedAt, asOfDate }: { fetchedAt: string; asOfDate: string }) {
  const stale = isCacheStale(fetchedAt, asOfDate);
  const { t } = useLanguage();
  return (
    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
      <span>{t("daily.updatedAt", { time: formatUpdatedWIB(fetchedAt) })}</span>
      {stale && <Badge tone="example">{t("daily.stale")}</Badge>}
    </p>
  );
}

/** State kosong yang jujur: cache belum terisi, bukan data palsu. */
export function DailyEmpty({ sourceName, reason }: { sourceName: string; reason: string }) {
  const { t } = useLanguage();
  return (
    <EmptyState
      title={t("daily.notAvailable", { source: sourceName })}
      desc={t("daily.emptyDesc", { source: sourceName, reason })}
      action={
        <Link href="/info-harian" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          {t("daily.back")}
        </Link>
      }
    />
  );
}

/** Bila payload cache ada tapi bentuknya tidak dikenali parser. */
export function DailyUnparsed({ sourceName }: { sourceName: string }) {
  const { t } = useLanguage();
  return (
    <EmptyState
      title={t("daily.unreadable", { source: sourceName })}
      desc={t("daily.unreadableDesc", { source: sourceName })}
      action={
        <Link href="/info-harian" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          {t("daily.back")}
        </Link>
      }
    />
  );
}
