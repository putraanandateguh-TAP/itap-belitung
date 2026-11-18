// Komponen bersama hub info harian (M5, A5 entrepreneur):
// stempel umur data + badge "data mungkin basi" + state kosong yang jujur.
// Dipakai semua halaman /info-harian/* dan kartu ringkas di beranda S01.
import Link from "next/link";
import { Badge, EmptyState } from "@/components/ui";
import { formatUpdatedWIB, isCacheStale } from "@/lib/daily-parse";

/** "Diperbarui pukul HH:MM WIB" + badge bila cache >6 jam / bukan hari ini. */
export function DailyStamp({ fetchedAt, asOfDate }: { fetchedAt: string; asOfDate: string }) {
  const stale = isCacheStale(fetchedAt, asOfDate);
  return (
    <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-muted">
      <span>Diperbarui pukul {formatUpdatedWIB(fetchedAt)}</span>
      {stale && <Badge tone="example">Data mungkin basi</Badge>}
    </p>
  );
}

/** State kosong yang jujur: cache belum terisi, bukan data palsu. */
export function DailyEmpty({ sourceName, reason }: { sourceName: string; reason: string }) {
  return (
    <EmptyState
      title={`${sourceName} belum tersedia`}
      desc={`Data ${sourceName} belum bisa ditampilkan: ${reason} Kami tidak menampilkan angka perkiraan — halaman ini akan terisi begitu data resmi berhasil diambil.`}
      action={
        <Link href="/info-harian" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          Kembali ke Info Harian
        </Link>
      }
    />
  );
}

/** Bila payload cache ada tapi bentuknya tidak dikenali parser. */
export function DailyUnparsed({ sourceName }: { sourceName: string }) {
  return (
    <EmptyState
      title={`${sourceName} belum bisa dibaca`}
      desc={`Data ${sourceName} sudah tersimpan, tapi bentuknya berubah sehingga tidak bisa ditampilkan. Redaksi sudah mencatatnya lewat cron daily-info-fetch.`}
      action={
        <Link href="/info-harian" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          Kembali ke Info Harian
        </Link>
      }
    />
  );
}
