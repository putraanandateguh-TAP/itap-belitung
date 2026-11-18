// #06 Header Web + footer — komponen chrome situs.
// Header: logo teks iTAP, kanal, cari, masuk/menu akun, menu mobile.
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { LogOut, Menu, Search, User, X } from "lucide-react";
import { useEffect, useState } from "react";
import { signOut, useSession } from "@/lib/session-client";
import { CHANNELS } from "@/lib/seed-data";

const CHANNEL_LINKS = (Object.keys(CHANNELS) as (keyof typeof CHANNELS)[]).map((c) => ({
  href: `/kanal/${c}`,
  label: CHANNELS[c],
}));

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const { session } = useSession();

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-canvas shadow-sm">
      <a href="#konten" className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-2 focus:rounded-md focus:bg-accent focus:px-3 focus:py-2 focus:text-on-accent">
        Lewati ke konten
      </a>
      <div className="mx-auto flex h-16 max-w-[1200px] items-center gap-4 px-4">
        <Link href="/" className="flex shrink-0 items-center gap-2 focus-visible:outline-2 focus-visible:outline-accent">
          <span aria-hidden="true" className="flex size-9 items-center justify-center rounded-md bg-surface-dark text-base font-bold text-ink-on-dark">iT</span>
          <span className="leading-tight">
            <span className="block text-base font-bold text-ink">iTAP Belitung</span>
            <span className="block text-xs font-medium text-muted">Kabar · Rasa · Perjalanan</span>
          </span>
        </Link>

        <nav aria-label="Kanal utama" className="ml-2 hidden items-center gap-1 lg:flex">
          {CHANNEL_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              aria-current={isActive(l.href) ? "page" : undefined}
              className={`rounded-md px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${isActive(l.href) ? "text-accent underline decoration-accent decoration-2 underline-offset-4" : "text-ink hover:bg-surface"}`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <Link href="/cari" aria-label="Cari konten" className="flex size-10 items-center justify-center rounded-md text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent">
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
                aria-label="Keluar"
                className="flex size-10 items-center justify-center rounded-md text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
              >
                <LogOut className="size-5" aria-hidden="true" />
              </button>
            </span>
          ) : (
            <Link href="/masuk" className="hidden h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-dark focus-visible:outline-2 focus-visible:outline-accent sm:inline-flex">
              Masuk
            </Link>
          )}
          <button
            type="button"
            className="flex size-10 items-center justify-center rounded-md text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent lg:hidden"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? "Tutup menu" : "Buka menu"}
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="size-5" aria-hidden="true" /> : <Menu className="size-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav aria-label="Menu mobile" className="border-t border-line bg-canvas px-4 py-3 lg:hidden">
          <ul className="flex flex-col gap-1">
            <li><Link href="/" onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">Beranda</Link></li>
            {CHANNEL_LINKS.map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
                  {l.label}
                </Link>
              </li>
            ))}
            <li className="border-t border-line pt-2">
              <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wider text-muted">Info harian iTAP</p>
            </li>
            {[
              { href: "/harga-pangan", label: "Harga Pangan" },
              { href: "/kurs", label: "Kurs, IHSG & Emas" },
              { href: "/lowongan", label: "Lowongan Kerja" },
              { href: "/produk", label: "Produk Digital" },
              { href: "/jasa", label: "Jasa iTAP" },
              { href: "/kedai", label: "Kedai Bakso Aci" },
              { href: "/kontributor", label: "Kontributor" },
              { href: "/redaksi", label: "Redaksi" },
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} onClick={() => setMenuOpen(false)} className="block rounded-md px-3 py-2 text-sm font-semibold text-ink hover:bg-surface">
                  {l.label}
                </Link>
              </li>
            ))}
            {!session && (
              <li className="pt-2">
                <Link href="/masuk" onClick={() => setMenuOpen(false)} className="flex h-10 items-center justify-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent">
                  Masuk
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
  return (
    <footer className="mt-16 bg-surface-dark text-ink-on-dark">
      <div className="mx-auto grid max-w-[1200px] gap-8 px-4 py-12 md:grid-cols-4">
        <div>
          <p className="text-lg font-bold">iTAP Belitung</p>
          <p className="mt-2 text-sm text-muted-on-dark">
            Portal Belitung: kabar, kuliner, wisata, sejarah, budaya, dan legenda — ditulis warga, ditinjau redaksi.
          </p>
          <p className="mt-3 text-sm text-muted-on-dark">Tanjung Pandan, Belitung</p>
        </div>
        <nav aria-label="Kanal">
          <p className="text-sm font-semibold text-accent-light">Kanal</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            {CHANNEL_LINKS.map((l) => (
              <li key={l.href}><Link href={l.href} className="text-ink-on-dark hover:underline focus-visible:outline-2 focus-visible:outline-accent">{l.label}</Link></li>
            ))}
          </ul>
        </nav>
        <nav aria-label="Info harian">
          <p className="text-sm font-semibold text-accent-light">Info harian iTAP</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><Link href="/harga-pangan" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">Harga Pangan</Link></li>
            <li><Link href="/kurs" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">Kurs, IHSG &amp; Emas</Link></li>
            <li><Link href="/lowongan" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">Lowongan Kerja</Link></li>
            <li><Link href="/produk" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">Produk Digital</Link></li>
            <li><Link href="/jasa" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">Jasa iTAP</Link></li>
            <li><Link href="/kedai" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">Kedai Bakso Aci</Link></li>
          </ul>
        </nav>
        <nav aria-label="Tentang">
          <p className="text-sm font-semibold text-accent-light">Tentang</p>
          <ul className="mt-3 flex flex-col gap-2 text-sm">
            <li><Link href="/kontributor" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">Jadi Kontributor</Link></li>
            <li><Link href="/redaksi" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">Redaksi</Link></li>
            <li><Link href="/privasi" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">Privasi</Link></li>
            <li><Link href="/ketentuan" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">Ketentuan Penggunaan</Link></li>
            <li><Link href="/masuk" className="hover:underline focus-visible:outline-2 focus-visible:outline-accent">Masuk / Daftar</Link></li>
          </ul>
        </nav>
      </div>
      <div className="border-t border-surface-dark-deep">
        <p className="mx-auto max-w-[1200px] px-4 py-4 text-xs text-muted-on-dark">
          © 2026 iTAP Belitung. Konten iTAP ditulis sendiri; kabar agregasi mencantumkan sumber aslinya. Versi demo (data seed, tanpa database).
        </p>
      </div>
    </footer>
  );
}
