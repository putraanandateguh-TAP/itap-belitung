// Halaman konten iTAP: Jasa — #29 Kartu Jasa.
// Harga ASLI dari index.html situs lama (Nov 2026).
import type { Metadata } from "next";
import { Check } from "lucide-react";
import { listServices } from "@/lib/data";
import { WA_NUMBER } from "@/lib/seed-data";
import { formatRupiah } from "@/lib/format";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Jasa iTAP Belitung",
  description: "Jasa iTAP: website UMKM, chatbot WhatsApp, video AI sinematik, kelas kreator video AI, dan slot iklan.",
};

export default async function JasaPage() {
  const services = await listServices();
  const lang = await getServerLang();

  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t(lang, "jasa.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t(lang, "jasa.subtitle")}</p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {services.map((s) => (
          <article key={s.id} className="flex flex-col gap-3 rounded-lg border border-line bg-canvas p-4 shadow-card">
            <h2 className="text-base font-semibold text-ink">{s.name}</h2>
            <p className="flex-1 text-sm text-muted">{s.desc}</p>
            <ul className="flex flex-col gap-1">
              {s.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm text-ink">
                  <Check className="mt-0.5 size-4 shrink-0 text-success-bright" aria-hidden="true" />
                  {f}
                </li>
              ))}
            </ul>
            <p className="text-lg font-bold text-ink">
              {t(lang, "jasa.from")} {formatRupiah(s.price_from)}
              <span className="ml-2 block text-sm font-normal text-muted">{s.price_note}</span>
            </p>
            <a
              href={`https://wa.me/${WA_NUMBER}?text=${encodeURIComponent(`Halo iTAP, saya mau tanya tentang ${s.name}`)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-accent"
            >
              {t(lang, "jasa.askViaWa")}
            </a>
          </article>
        ))}
      </div>
    </div>
  );
}
