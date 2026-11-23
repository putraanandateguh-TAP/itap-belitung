// S30 Pesawat & Kapal (F14) — jadwal penerbangan & kapal.
// JUJUR: tidak ada API publik stabil yang memetakan jadwal pesawat/kapal
// Belitung (jadwal berubah dan tersebar di maskapai/operator). Halaman ini
// menampilkan pesan jujur sampai sumber stabil ditemukan — tidak ada jadwal
// karangan. Cache transport (bila suatu hari terisi cron) tetap dibaca.
import type { Metadata } from "next";
import { getDailySnapshot } from "@/lib/daily";
import { DailyStamp } from "@/components/daily-ui";
import { EmptyState } from "@/components/ui";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  alternates: { canonical: "/info-harian/transport" },
  title: "Jadwal Pesawat & Kapal Belitung",
  description: "Jadwal penerbangan dan kapal dari dan ke Belitung.",
};

export default async function TransportPage() {
  const snap = await getDailySnapshot("transport");
  const lang = await getServerLang();
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t(lang, "info.transportTitle")}</h1>
        <p className="mt-1 text-sm text-muted">{t(lang, "info.transportDescLong")}</p>
        {snap && <DailyStamp fetchedAt={snap.fetched_at} asOfDate={snap.as_of} />}
      </header>

      {!snap && (
        <EmptyState
          title={t(lang, "info.transportEmpty")}
          desc={t(lang, "info.transportUnavailableDesc")}
        />
      )}

      {snap && (
        <EmptyState
          title={t(lang, "info.transportUnreadable")}
          desc={t(lang, "info.transportUnreadableDesc")}
        />
      )}
    </div>
  );
}
