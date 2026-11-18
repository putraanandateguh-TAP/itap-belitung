// S40 Nomor Darurat (F14) — nomor darurat + rumah sakit Belitung.
// Data statis iTAP (bukan dari sumber eksternal) — GET /api/daily/emergency.
import type { Metadata } from "next";
import { EMERGENCY_NUMBERS } from "@/lib/daily";

export const metadata: Metadata = {
  title: "Nomor Darurat Belitung",
  description: "Nomor darurat Belitung: polisi, damkar, ambulans, SAR, PLN, dan rumah sakit.",
};

export default function DaruratPage() {
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">Nomor Darurat</h1>
        <p className="mt-1 text-sm text-muted">
          Nomor darurat Belitung. Ketuk nomor untuk menelepon langsung dari HP.
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
        Dalam keadaan darurat, hubungi nomor di atas. RSUD dr. H. Marsidi Judono adalah
        rumah sakit rujukan utama di Tanjung Pandan.
      </p>
    </div>
  );
}
