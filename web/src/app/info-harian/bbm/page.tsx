// S33 Harga BBM (F14) — harga BBM Pertamina.
// JUJUR: Pertamina mempublikasikan harga hanya sebagai halaman web
// (pertamina.com/id/harga-bbm), tanpa API JSON publik yang stabil —
// scraping halaman itu rapuh dan bisa berubah sewaktu-waktu. Sampai ada
// sumber stabil, halaman ini menampilkan pesan jujur, bukan harga karangan.
import type { Metadata } from "next";
import { getDailySnapshot } from "@/lib/daily";
import { DailyStamp } from "@/components/daily-ui";
import { EmptyState } from "@/components/ui";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  alternates: { canonical: "/info-harian/bbm" },
  title: "Harga BBM Belitung",
  description: "Harga BBM Pertamina yang berlaku di Belitung.",
};

export default async function BbmPage() {
  const snap = await getDailySnapshot("fuel");
  const lang = await getServerLang();
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t(lang, "info.fuelTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t(lang, "info.fuelDesc")}</p>
        {snap && <DailyStamp fetchedAt={snap.fetched_at} asOfDate={snap.as_of} />}
      </header>

      {!snap && (
        <EmptyState
          title={t(lang, "info.fuelEmpty")}
          desc={t(lang, "info.fuelUnavailableDesc")}
        />
      )}

      {snap && (
        <EmptyState
          title={t(lang, "info.fuelUnreadable")}
          desc={t(lang, "info.fuelUnreadableDesc")}
        />
      )}
    </div>
  );
}
