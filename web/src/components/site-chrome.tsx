// #06 Header Web + footer — komponen chrome situs.
// Header: logo iTAP, kanal, cari, masuk/menu akun, menu mobile.
"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Search, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { signOut, useSession } from "@/lib/session-client";
import { MusicPlayer } from "@/components/music-player";
import { CHANNELS } from "@/lib/seed-data";
import { channelLabel } from "@/lib/labels";
import { useLanguage } from "@/components/language-provider";

const CHANNEL_KEYS = Object.keys(CHANNELS) as (keyof typeof CHANNELS)[];

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

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { session } = useSession();
  const { lang, t } = useLanguage();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const CHANNEL_LINKS = CHANNEL_KEYS.map((c) => ({
    href: `/kanal/${c}`,
    label: channelLabel(c, lang),
  }));

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas shadow-sm">
      <a href="#konten" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent">
        {t("common.skipToContent")}
      </a>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center focus-visible:outline-2 focus-visible:outline-accent" aria-label="iTAP Belitung — Beranda">
          <Image src="/images/logo-itap-belitung.png" alt="iTAP Belitung" width={1536} height={1024} className="h-10 w-auto" priority />
        </Link>

        <nav aria-label={t("nav.mainChannels")} className="ml-2 hidden items-center gap-1 whitespace-nowrap xl:flex">
          {CHANNEL_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`rounded-md px-2 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${isActive(l.href) ? "text-accent underline decoration-accent decoration-2 underline-offset-4" : "text-ink hover:bg-surface"}`}
            >
              {l.label}
            </Link>
          ))}
          <Link
            href="/jual-beli"
            aria-current={isActive("/jual-beli") ? "page" : undefined}
            className={`rounded-md px-2 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${isActive("/jual-beli") ? "text-accent underline decoration-accent decoration-2 underline-offset-4" : "text-ink hover:bg-surface"}`}
          >
            {t("nav.marketplace")}
          </Link>
          <Link
            href="/info-harian"
            aria-current={isActive("/info-harian") ? "page" : undefined}
            className={`rounded-md px-2 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${isActive("/info-harian") ? "text-accent underline decoration-accent decoration-2 underline-offset-4" : "text-ink hover:bg-surface"}`}
          >
            {t("nav.dailyInfo")}
          </Link>
          <Link
            href="/budaya"
            aria-current={isActive("/budaya") ? "page" : undefined}
            className={`rounded-md px-2 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${isActive("/budaya") ? "text-accent underline decoration-accent decoration-2 underline-offset-4" : "text-ink hover:bg-surface"}`}
          >
            {t("nav.culture")}
          </Link>
          <Link
            href="/ai"
            aria-current={isActive("/ai") ? "page" : undefined}
            className={`rounded-md px-2 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${isActive("/ai") ? "text-accent underline decoration-accent decoration-2 underline-offset-4" : "text-ink hover:bg-surface"}`}
          >
            {t("nav.ai")}
          </Link>
          <Link
            href="/penerjemah"
            aria-current={isActive("/penerjemah") ? "page" : undefined}
            className={`rounded-md px-2 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${isActive("/penerjemah") ? "text-accent underline decoration-accent decoration-2 underline-offset-4" : "text-ink hover:bg-surface"}`}
          >
            {t("nav.translator")}
          </Link>
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <MusicPlayer />
          <Link href="/cari" aria-label={t("nav.searchContent")} className="flex size-10 items-center justify-center rounded-md text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent">
            <Search className="size-5" aria-hidden="true" />
          </Link>
          {session ? (
            <span className="hidden items-center gap-2 sm:inline-flex">
              <Link href="/pengaturan" className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-canvas px-3 text-sm font-semibold text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent">
                <User className="size-4" aria-hidden="true" />
                {session.displayName ?? session.email}
              </Link>
              <button
                type="button"
                onClick={async () => { await signOut(); router.push("/"); router.refresh(); }}
                aria-label={t("nav.signOut")}
                className="flex size-10 items-center justify-center rounded-md text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
              >
                <LogOut className="size-5" aria-hidden="true" />
              </button>
            </span>
          ) : (
            <Link href="/masuk" className="hidden h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-accent sm:inline-flex">
              {t("nav.signIn")}
            </Link>
          )}
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-md text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent xl:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? t("nav.closeMenu") : t("nav.openMenu")}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav aria-label={t("nav.mobileMenu")} className="border-t border-line bg-canvas px-4 py-3 xl:hidden">
          <ul className="flex flex-col gap-1">
            <li><Link href="/" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">{t("nav.home")}</Link></li>
            {CHANNEL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
                  {l.label}
                </Link>
              </li>
            ))}
            <li>
              <Link href="/jual-beli" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
                {t("nav.marketplace")}
              </Link>
            </li>
            <li>
              <Link href="/info-harian" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
                {t("nav.dailyInfo")}
              </Link>
            </li>
            <li>
              <Link href="/budaya" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
                {t("nav.culture")}
              </Link>
            </li>
            <li>
              <Link href="/ai" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
                {t("nav.ai")}
              </Link>
            </li>
            <li>
              <Link href="/penerjemah" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
                {t("nav.translator")}
              </Link>
            </li>
            <li>
              <Link href="/chat" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
                {t("nav.chat")}
              </Link>
            </li>
            <li className="border-t border-line pt-2">
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted">{t("nav.dailyInfoItap")}</p>
            </li>
            {[
              { href: "/info-harian", key: "nav.dailyInfo" },
              { href: "/budaya", key: "nav.culture" },
              { href: "/ai", key: "nav.ai" },
              { href: "/penerjemah", key: "nav.translator" },
              ...MORE_LINKS,
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
                  {t(l.key)}
                </Link>
              </li>
            ))}
            {!session && (
              <li className="pt-2">
                <Link href="/masuk" onClick={() => setMenuOpen(false)} className="flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">
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

export function SiteFooter() {
  const { lang, t } = useLanguage();
  const CHANNEL_LINKS = CHANNEL_KEYS.map((c) => ({
    href: `/kanal/${c}`,
    label: channelLabel(c, lang),
  }));
  return (
    <footer className="mt-16 bg-surface-dark text-ink-on-dark">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="text-lg font-bold">iTAP Belitung</p>
          <p className="mt-2 text-sm text-muted-on-dark">
            {t("footer.tagline")}
          </p>
          <p className="mt-3 text-sm text-muted-on-dark">{t("footer.location")}</p>
        </div>
        <nav aria-label={t("nav.channels")}>
          <p className="text-sm font-semibold text-accent-light">{t("nav.channels")}</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {CHANNEL_LINKS.map((l) => (
              <li key={l.href}><Link href={l.href} className="text-ink-on-dark hover:underline focus-visible:outline-2 focus-visible:outline-accent">{l.label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label={t("nav.dailyInfo")}>
          <p className="text-sm font-semibold text-accent-light">{t("nav.dailyInfoItap")}</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><Link href="/info-harian" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.dailyInfo")}</Link></li>
            <li><Link href="/budaya" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.culture")}</Link></li>
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
          <p className="text-sm font-semibold text-accent-light">{t("nav.about")}</p>
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
