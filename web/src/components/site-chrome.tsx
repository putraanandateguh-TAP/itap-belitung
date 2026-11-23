// #06 Header Web + footer + navigasi bawah — komponen chrome situs.
// Tata letak 23 Nov 2026 (pola portal ala Satam, BUKAN aset/teks Satam):
// strip info navy di atas, baris logo + tombol bulat, baris kanal berbentuk
// pil yang bisa digeser, dan navigasi bawah mengambang di HP. Logo, warna
// navy-emas, dan semua teks milik iTAP.
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bot, CalendarDays, Drama, House, Landmark, Languages, LogOut, MapPin, Menu, Newspaper,
  Palmtree, ScrollText, Search, Store, User, UserRound, UtensilsCrossed, X,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOut, useSession } from "@/lib/session-client";
import { MusicPlayer } from "@/components/music-player";
import { CHANNELS } from "@/lib/seed-data";
import { channelLabel } from "@/lib/labels";
import { useLanguage } from "@/components/language-provider";
import type { Channel } from "@/lib/types";

const CHANNEL_KEYS = Object.keys(CHANNELS) as (keyof typeof CHANNELS)[];

const CHANNEL_ICONS: Record<Channel, LucideIcon> = {
  berita: Newspaper,
  kuliner: UtensilsCrossed,
  wisata: Palmtree,
  sejarah: Landmark,
  budaya: Drama,
  legenda: ScrollText,
};

const MORE_LINKS = [
  { href: "/harga-pangan", key: "nav.foodPrices" },
  { href: "/kurs", key: "nav.rates" },
  { href: "/lowongan", key: "nav.jobs" },
  { href: "/produk", key: "nav.digitalProducts" },
  { href: "/jasa", key: "nav.services" },
  { href: "/kedai", key: "nav.kedai" },
  { href: "/kontributor", key: "nav.contributor" },
  { href: "/redaksi", key: "nav.editorial" },
] as const;

/** Tanggal hari ini (WIB) untuk strip info. Dirender di klien setelah mount
 *  supaya tidak ada selisih hidrasi lintas tengah malam. */
function TodayWIB({ lang }: { lang: string }) {
  const [label, setLabel] = useState("");
  useEffect(() => {
    setLabel(
      new Intl.DateTimeFormat(lang === "en" ? "en-GB" : "id-ID", {
        weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "Asia/Jakarta",
      }).format(new Date()),
    );
  }, [lang]);
  return <span className="tabular-nums">{label}</span>;
}

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { session } = useSession();
  const { lang, t } = useLanguage();
  const pillRow = useRef<HTMLUListElement>(null);
  // Geser baris pil supaya kanal aktif terlihat (tanpa menggulir halaman).
  useEffect(() => {
    const row = pillRow.current;
    const active = row?.querySelector<HTMLElement>('[aria-current="page"]');
    if (!row || !active) return;
    const left = active.offsetLeft - row.clientWidth / 2 + active.clientWidth / 2;
    row.scrollTo({ left: Math.max(0, left) });
  }, [pathname]);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
  const PILL_LINKS: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/", label: t("nav.home"), icon: House },
    ...CHANNEL_KEYS.map((c) => ({ href: `/kanal/${c}`, label: channelLabel(c, lang), icon: CHANNEL_ICONS[c] })),
    { href: "/jual-beli", label: t("nav.marketplace"), icon: Store },
    { href: "/info-harian", label: t("nav.dailyInfo"), icon: CalendarDays },
    // "Budaya" hanya sekali (kanal /kanal/budaya) — hub /budaya ada di footer (bug 19 Nov 2026).
    { href: "/ai", label: t("nav.ai"), icon: Bot },
    { href: "/penerjemah", label: t("nav.translator"), icon: Languages },
  ];
  const CHANNEL_LINKS = CHANNEL_KEYS.map((c) => ({ href: `/kanal/${c}`, label: channelLabel(c, lang) }));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas/95 shadow-sm backdrop-blur supports-[backdrop-filter]:bg-canvas/85">
      <a href="#konten" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:z-50 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent">
        {t("common.skipToContent")}
      </a>
      {/* Strip info navy */}
      <div className="bg-surface-dark text-ink-on-dark">
        <div className="mx-auto flex h-7 max-w-[1200px] items-center justify-between gap-3 px-4 text-xs">
          <span className="inline-flex min-w-0 items-center gap-1 truncate">
            <MapPin className="size-3 shrink-0 text-gold" aria-hidden="true" /> {t("header.stripPlace")}
          </span>
          <TodayWIB lang={lang} />
        </div>
      </div>

      {/* Baris logo + aksi */}
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-3 px-4">
        <Link href="/" className="flex shrink-0 items-center rounded-xl focus-visible:outline-2 focus-visible:outline-accent" aria-label="iTAP Belitung — Beranda">
          <Image src="/images/logo-itap-belitung.png" alt="iTAP Belitung" width={1536} height={1024} className="h-11 w-auto" priority />
        </Link>

        <div className="ml-auto flex items-center gap-2">
          <MusicPlayer />
          <Link href="/cari" aria-label={t("nav.searchContent")} className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-canvas px-3 text-sm font-semibold text-ink shadow-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent">
            <Search className="size-5" aria-hidden="true" />
            <span className="hidden md:inline">{t("common.search")}</span>
          </Link>
          {session ? (
            <span className="hidden items-center gap-2 sm:inline-flex">
              <Link href="/pengaturan" className="inline-flex h-10 items-center gap-2 rounded-full border border-line bg-canvas px-3 text-sm font-semibold text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent">
                <User className="size-4" aria-hidden="true" />
                {session.displayName ?? session.email}
              </Link>
              <button
                type="button"
                onClick={async () => { await signOut(); router.push("/"); router.refresh(); }}
                aria-label={t("nav.signOut")}
                className="flex size-10 items-center justify-center rounded-full text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
              >
                <LogOut className="size-5" aria-hidden="true" />
              </button>
            </span>
          ) : (
            <Link href="/masuk" className="hidden h-10 items-center gap-2 rounded-full bg-surface-dark px-4 text-sm font-semibold text-ink-on-dark shadow-sm hover:bg-surface-dark-deep focus-visible:outline-2 focus-visible:outline-accent sm:inline-flex">
              <UserRound className="size-4 text-gold" aria-hidden="true" />
              {t("nav.signIn")}
            </Link>
          )}
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-full border border-line bg-canvas text-ink shadow-sm hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {/* Baris kanal berbentuk pil — bisa digeser di HP */}
      <nav aria-label={t("nav.mainChannels")} className="border-t border-line/70">
        <ul ref={pillRow} className="swipe-row relative mx-auto max-w-[1200px] gap-2 px-4 py-2">
          {PILL_LINKS.map((l) => {
            const active = isActive(l.href);
            const Icon = l.icon;
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`inline-flex h-9 items-center gap-2 whitespace-nowrap rounded-full px-3 text-sm font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-accent ${active ? "bg-surface-dark text-ink-on-dark shadow-sm" : "text-ink hover:bg-navy-soft"}`}
                >
                  <Icon className={`size-4 ${active ? "text-gold" : "text-muted"}`} aria-hidden="true" />
                  {l.label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {menuOpen && (
        <nav aria-label={t("nav.mobileMenu")} className="max-h-[70vh] overflow-y-auto border-t border-line bg-canvas px-4 py-3">
          <ul className="mx-auto grid max-w-[1200px] gap-1 sm:grid-cols-2 lg:grid-cols-3">
            <li><Link href="/" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">{t("nav.home")}</Link></li>
            {CHANNEL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
                  {l.label}
                </Link>
              </li>
            ))}
            {[
              { href: "/jual-beli", key: "nav.marketplace" },
              { href: "/info-harian", key: "nav.dailyInfo" },
              { href: "/ai", key: "nav.ai" },
              { href: "/penerjemah", key: "nav.translator" },
              { href: "/chat", key: "nav.chat" },
              ...MORE_LINKS,
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
                  {t(l.key)}
                </Link>
              </li>
            ))}
            {!session && (
              <li className="pt-2 sm:col-span-2 lg:col-span-3">
                <Link href="/masuk" onClick={() => setMenuOpen(false)} className="flex h-10 items-center justify-center rounded-full bg-surface-dark px-4 text-sm font-semibold text-ink-on-dark">
                  {t("nav.signIn")}
                </Link>
              </li>
            )}
          </ul>
        </nav>
      )}
    </header>
  );
}

/** Navigasi bawah mengambang (HP saja, < md). Tombol tengah bulat emas = AI iTAP. */
export function BottomNav() {
  const pathname = usePathname();
  const { session } = useSession();
  const { t } = useLanguage();
  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(href + "/"));
  const accountHref = session ? "/pengaturan" : "/masuk";
  const items: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/", label: t("nav.home"), icon: House },
    { href: "/jual-beli", label: t("nav.marketplace"), icon: Store },
    { href: "/cari", label: t("common.search"), icon: Search },
    { href: accountHref, label: session ? t("nav.account") : t("nav.signIn"), icon: UserRound },
  ];
  const Item = ({ href, label, icon: Icon }: { href: string; label: string; icon: LucideIcon }) => {
    const active = isActive(href);
    return (
      <li className="flex-1">
        <Link
          href={href}
          aria-current={active ? "page" : undefined}
          className={`relative flex flex-col items-center gap-0.5 rounded-2xl py-1.5 text-[11px] font-semibold focus-visible:outline-2 focus-visible:outline-accent ${active ? "text-surface-dark" : "text-muted"}`}
        >
          {active && <span aria-hidden="true" className="absolute -top-1.5 h-1 w-6 rounded-full bg-gold" />}
          <Icon className="size-5" aria-hidden="true" />
          {label}
        </Link>
      </li>
    );
  };
  return (
    <nav aria-label={t("nav.bottomNav")} className="fixed inset-x-3 bottom-3 z-40 md:hidden">
      <ul className="flex items-end rounded-3xl border border-line bg-canvas/95 px-2 pb-1 pt-2 shadow-pop backdrop-blur">
        <Item {...items[0]} />
        <Item {...items[1]} />
        <li className="flex-1">
          <Link
            href="/ai"
            aria-current={isActive("/ai") ? "page" : undefined}
            aria-label={t("nav.ai")}
            className="mx-auto -mt-7 flex size-14 items-center justify-center rounded-full border-4 border-canvas bg-gold text-surface-dark shadow-pop focus-visible:outline-2 focus-visible:outline-accent"
          >
            <Bot className="size-7" aria-hidden="true" />
          </Link>
        </li>
        <Item {...items[2]} />
        <Item {...items[3]} />
      </ul>
    </nav>
  );
}

export function SiteFooter() {
  const { lang, t } = useLanguage();
  const CHANNEL_LINKS = CHANNEL_KEYS.map((c) => ({
    href: `/kanal/${c}`,
    label: channelLabel(c, lang),
  }));
  return (
    <footer className="mt-16 rounded-t-[28px] bg-surface-dark pb-24 text-ink-on-dark md:pb-0">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="inline-flex items-center gap-2 text-lg font-bold">
            <span className="inline-flex rounded-xl bg-canvas p-1"><Image src="/images/logo-itap-belitung.png" alt="" width={1536} height={1024} className="h-8 w-auto" /></span>
            iTAP Belitung
          </p>
          <p className="mt-2 text-sm text-muted-on-dark">
            {t("footer.tagline")}
          </p>
          <p className="mt-3 text-sm text-muted-on-dark">{t("footer.location")}</p>
        </div>
        <nav aria-label={t("nav.channels")}>
          <p className="text-xs font-bold uppercase tracking-widest text-gold">{t("nav.channels")}</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {CHANNEL_LINKS.map((l) => (
              <li key={l.href}><Link href={l.href} className="text-ink-on-dark hover:underline focus-visible:outline-2 focus-visible:outline-accent">{l.label}</Link></li>
            ))}
            {/* Hub cerita budaya (/budaya) — label dibedakan ("Budaya Belitung")
                supaya tidak dobel dengan "Budaya" (/kanal/budaya) di atas.
                Sebelumnya tautan ini salah masuk di kolom "Info Harian". */}
            <li><Link href="/budaya" className="text-ink-on-dark hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("budaya.title")}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t("nav.dailyInfo")}>
          <p className="text-xs font-bold uppercase tracking-widest text-gold">{t("nav.dailyInfoItap")}</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><Link href="/info-harian" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.dailyInfo")}</Link></li>
            <li><Link href="/ai" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.ai")}</Link></li>
            <li><Link href="/penerjemah" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.translator")}</Link></li>
            <li><Link href="/harga-pangan" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.foodPrices")}</Link></li>
            <li><Link href="/kurs" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.rates")}</Link></li>
            <li><Link href="/lowongan" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.jobs")}</Link></li>
            <li><Link href="/produk" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.digitalProducts")}</Link></li>
            <li><Link href="/jasa" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.services")}</Link></li>
            <li><Link href="/kedai" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.kedai")}</Link></li>
          </ul>
        </nav>
        <nav aria-label={t("nav.about")}>
          <p className="text-xs font-bold uppercase tracking-widest text-gold">{t("nav.about")}</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><Link href="/kontributor" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.becomeContributor")}</Link></li>
            <li><Link href="/redaksi" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.editorial")}</Link></li>
            <li><Link href="/privasi" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.privacy")}</Link></li>
            <li><Link href="/ketentuan" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.terms")}</Link></li>
            <li><Link href="/masuk" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("common.signInSignUp")}</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-surface-dark-deep">
        <p className="mx-auto max-w-[1200px] px-4 py-4 text-xs text-muted-on-dark">
          {t("footer.copyright")}
          {/* P1 (M8): penanda demo di footer ikut saklar yang sama dengan banner atas. */}
          {process.env.NEXT_PUBLIC_DEMO_BANNER !== "false" && ` ${t("footer.demo")}`}
        </p>
      </div>
    </footer>
  );
}
