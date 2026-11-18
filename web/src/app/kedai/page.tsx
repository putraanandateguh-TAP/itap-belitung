// Halaman konten iTAP: Kedai Bakso Aci — #30 Kartu Menu Kedai.
// Info kedai + tautan GrabFood/GoFood ASLI dari index.html situs lama.
// Menu + harga ASLI dari papan menu Kedai I&T (diterima 2026-11-18).
import type { Metadata } from "next";
import Image from "next/image";
import { Clock, MapPin } from "lucide-react";
import { getKedai } from "@/lib/data";
import { formatRupiah } from "@/lib/format";
import { Badge } from "@/components/ui";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Kedai Bakso Aci iTAP",
  description: "Kedai Bakso Aci iTAP di Puri Kirana 3, Tanjung Pandan — buka setiap hari 11.00–22.00 WIB. Pesan via GrabFood atau GoFood.",
};

// Foto asli per item menu resmi (petakan di komponen, bukan di seed-data).
// 6 item resmi: 5 dari papan menu + Baso Aci Daging Cincang (keputusan Teguh 2026-11-18).
const MENU_PHOTOS: Record<string, { src: string; width: number; height: number }> = {
  "menu-seblak-original": { src: "/images/kedai/menu-seblak-original.webp", width: 928, height: 1152 },
  "menu-boci-daging-mercon": { src: "/images/kedai/menu-boci-daging-mercon.webp", width: 928, height: 1152 },
  "menu-boci-daging-cincang": { src: "/images/kedai/menu-boci-daging-cincang.webp", width: 1122, height: 1402 },
  "menu-boci-keju-lumer": { src: "/images/kedai/menu-boci-keju-lumer.webp", width: 1122, height: 1402 },
  "menu-boci-tulang-rangu": { src: "/images/kedai/menu-boci-tulang-rangu.webp", width: 1122, height: 1402 },
  "menu-lumpia-basah": { src: "/images/kedai/menu-lumpia-basah.webp", width: 928, height: 1152 },
};

export default async function KedaiPage() {
  const kedai = await getKedai();
  const lang = await getServerLang();

  return (
    <div className="flex flex-col gap-6 py-8">
      <header className="grid gap-6 md:grid-cols-2">
        <div className="overflow-hidden rounded-lg border border-line bg-surface">
          <Image
            src="/images/kedai.webp"
            alt="Kedai Bakso Aci iTAP"
            width={800}
            height={450}
            className="aspect-video w-full object-cover"
            priority
          />
        </div>
        <div>
          <Image
            src="/images/kedai/logo-kedai-it.webp"
            alt="Logo Kedai I&T"
            width={1024}
            height={1536}
            className="h-28 w-auto"
          />
          <p className="mt-3 text-xs font-medium uppercase tracking-widest text-accent">{t(lang, "kedai.fromKitchen")}</p>
          <h1 className="mt-2 text-xl font-bold text-ink">{kedai.name}</h1>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {kedai.address}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <Clock className="size-4" aria-hidden="true" /> {kedai.hours}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={kedai.maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-md bg-surface-dark px-4 text-sm font-semibold text-ink-on-dark hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent">
              {t(lang, "kedai.route")}
            </a>
            <a href={kedai.grabfood_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-md bg-success px-4 text-sm font-semibold text-on-accent hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent">
              {t(lang, "kedai.orderGrab")}
            </a>
            <a href={kedai.gofood_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-md bg-danger px-4 text-sm font-semibold text-on-accent hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent">
              {t(lang, "kedai.orderGo")}
            </a>
          </div>
        </div>
      </header>

      <section aria-labelledby="menu-title">
        <h2 id="menu-title" className="text-lg font-semibold text-ink">{t(lang, "kedai.menu")}</h2>
        <figure className="mt-3 overflow-hidden rounded-lg border border-line bg-surface">
          <Image
            src="/images/kedai/menu-board.webp"
            alt="Papan menu Kedai I&T: Seblak Original, Baso Aci Daging Mercon, Baso Aci Keju Lumer, Baso Aci Tulang Rangu Rp18.000 dan Lumpia Basah Rp15.000"
            width={892}
            height={1338}
            className="mx-auto w-full max-w-xl object-cover"
          />
          <figcaption className="border-t border-line bg-canvas px-4 py-2 text-center text-xs text-muted">
            {t(lang, "kedai.menuBoardCaption")}
          </figcaption>
        </figure>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kedai.menu.map((m) => {
            const photo = MENU_PHOTOS[m.id];
            return (
            <li key={m.id} className="flex flex-col gap-2 overflow-hidden rounded-lg border border-line bg-canvas shadow-card">
              {photo && (
                <Image
                  src={photo.src}
                  alt={t(lang, "kedai.photoAlt", { name: m.name })}
                  width={photo.width}
                  height={photo.height}
                  className="aspect-[4/5] w-full object-cover"
                />
              )}
              <div className="flex flex-col gap-2 p-4 pt-2">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-ink">{m.name}</h3>
                {m.isExample && <Badge tone="example">{t(lang, "kedai.example")}</Badge>}
                {!m.available && <Badge tone="sold">{t(lang, "kedai.soldOut")}</Badge>}
              </div>
              <p className="flex-1 text-sm text-muted">{m.desc}</p>
              <p className="text-sm text-muted">{t(lang, "kedai.category")}: {m.category}</p>
              {m.price ? (
                <p className="text-lg font-bold text-ink">{formatRupiah(m.price)}</p>
              ) : (
                <p className="text-sm font-semibold text-muted">{t(lang, "kedai.priceComing")}</p>
              )}
              </div>
            </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
