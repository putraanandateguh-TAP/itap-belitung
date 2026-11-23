// S40 Nomor Darurat (F14) — nomor darurat + rumah sakit Belitung.
// Data statis iTAP (bukan dari sumber eksternal) — GET /api/daily/emergency.
import type { Metadata } from "next";
import { EMERGENCY_NUMBERS } from "@/lib/daily";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  alternates: { canonical: "/info-harian/darurat" },
  title: "Nomor Darurat Belitung",
  description: "Nomor darurat Belitung: polisi, damkar, ambulans, SAR, PLN, dan rumah sakit.",
};

export default async function DaruratPage() {
  const lang = await getServerLang();
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t(lang, "info.emergencyTitle")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(lang, "info.emergencyTap")}
        </p>
      </header>

      <ul className="flex flex-col gap-3">
        {EMERGENCY_NUMBERS.map((e) => (
          <li key={e.number} className="flex items-center justify-between gap-4 rounded-lg border border-line bg-canvas p-4 shadow-card">
            <span className="text-base font-semibold text-ink">{e.name}</span>
            <a
              href={`tel:${e.number}`}
              className="rounded-md bg-accent px-4 py-2 text-base font-bold text-on-accent hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-accent"
            >
              {e.number}
            </a>
          </li>
        ))}
      </ul>

      <p className="text-xs text-muted">
        {t(lang, "info.emergencyNote")}
      </p>
    </div>
  );
}
