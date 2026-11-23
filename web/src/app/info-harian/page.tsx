// Hub Info Harian (S27 versi web, F14) — pintu masuk cuaca, salat,
// transport, BBM, gempa, darurat + konten harian iTAP yang sudah ada
// (harga pangan S32, kurs, lowongan). CCTV (S31) dan Statistik (S39)
// SENGAJA tidak ditampilkan: isinya tidak teramati di recon (A10).
import type { Metadata } from "next";
import { SectionIllustration } from "@/components/section-illustration";
import { SECTION_ILLUSTRATIONS } from "@/lib/illustrations";
import Link from "next/link";
import { ArrowRight, CloudSun, Fuel, Megaphone, MoonStar, PhoneCall, Plane, ShoppingBasket, Siren, TrendingUp, BookOpen } from "lucide-react";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Info Harian Belitung",
  description: "Cuaca BMKG, jadwal salat, jadwal pesawat & kapal, harga BBM, info gempa, dan nomor darurat Belitung — dari sumber publik resmi.",
};

function items(lang: "id" | "en") {
  return [
    { href: "/info-harian/cuaca", icon: CloudSun, title: t(lang, "info.weather"), desc: t(lang, "info.weatherHubDesc"), screen: "S28" },
    { href: "/info-harian/salat", icon: MoonStar, title: t(lang, "info.prayer"), desc: t(lang, "info.prayerHubDesc"), screen: "S29" },
    { href: "/info-harian/transport", icon: Plane, title: t(lang, "info.transport"), desc: t(lang, "info.transportHubDesc"), screen: "S30" },
    { href: "/info-harian/bbm", icon: Fuel, title: t(lang, "info.fuel"), desc: t(lang, "info.fuelHubDesc"), screen: "S33" },
    { href: "/info-harian/gempa", icon: Siren, title: t(lang, "info.earthquake"), desc: t(lang, "info.quakeHubDesc"), screen: "S38" },
    { href: "/info-harian/darurat", icon: PhoneCall, title: t(lang, "info.emergency"), desc: t(lang, "info.emergencyHubDesc"), screen: "S40" },
    { href: "/harga-pangan", icon: ShoppingBasket, title: t(lang, "info.foodHubTitle"), desc: t(lang, "info.foodHubDesc"), screen: "S32" },
    { href: "/info-harian/kirim", icon: Megaphone, title: t(lang, "info.submitHubTitle"), desc: t(lang, "info.submitHubDesc"), screen: "S22" },
    { href: "/kurs", icon: TrendingUp, title: t(lang, "info.rates"), desc: t(lang, "info.ratesHubDesc"), screen: "iTAP" },
    { href: "/lowongan", icon: BookOpen, title: t(lang, "info.jobs"), desc: t(lang, "info.jobsHubDesc"), screen: "iTAP" },
  ];
}

export default async function InfoHarianPage() {
  const lang = await getServerLang();
  const ITEMS = items(lang);
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t(lang, "info.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t(lang, "info.hubDesc")}
        </p>
      </header>

      <SectionIllustration ill={SECTION_ILLUSTRATIONS.infoHarian} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it) => (
          <article key={it.href} className="rounded-lg border border-line bg-canvas p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <it.icon className="size-5 text-accent" aria-hidden="true" /> {it.title}
            </h2>
            <p className="mt-2 text-sm text-muted">{it.desc}</p>
            <Link href={it.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              {t(lang, "info.open", { title: it.title.toLowerCase() })} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>

      <p className="text-xs text-muted">
        {t(lang, "info.hubSources")}
      </p>
    </div>
  );
}
