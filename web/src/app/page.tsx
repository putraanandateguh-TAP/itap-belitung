// S01 Beranda web — tata letak portal (23 Nov 2026): judul ringkas + chip
// cuaca, ubin info cepat berikon bulat, sorotan berfoto + kolom kabar
// terbaru, daftar terpopuler bernomor, kartu info harian, baris kanal yang
// bisa digeser, dan CTA navy-emas. Pola tata letak saja — tanpa logo,
// gambar, ikon, teks, atau kode Satam. Data tetap dari sumber yang sama.
import Link from "next/link";
import {
  ArrowRight, BookOpen, Briefcase, ChevronRight, Clock3, CloudSun, Coins, DollarSign, LayoutGrid,
  MoonStar, PenLine, ShoppingBasket, Siren, TrendingUp, type LucideIcon,
} from "lucide-react";
import { getFeatured, getLatest, getPopular, listArticles } from "@/lib/data";
import { channelLabel } from "@/lib/labels";
import { formatDateLoose, formatRupiah } from "@/lib/format";
import { getDailyPrices, getMarketRates, listJobs } from "@/lib/data";
import { getDailySnapshot } from "@/lib/daily";
import { formatUpdatedWIB, isCacheStale, parsePrayerPayload, parseWeatherPayload } from "@/lib/daily-parse";
import type { Article, Channel } from "@/lib/types";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";
import { HeroStory, ListItem, RowCard } from "@/components/home-ui";
import { CHANNEL_STYLE, hasPhoto } from "@/lib/channel-style";

const CHANNEL_ORDER: Channel[] = ["berita", "kuliner", "wisata", "sejarah", "budaya", "legenda"];
const CHANNEL_KICKER: Record<Channel, string> = {
  berita: "home.kickerBerita",
  kuliner: "home.kickerKuliner",
  wisata: "home.kickerWisata",
  sejarah: "home.kickerSejarah",
  budaya: "home.kickerBudaya",
  legenda: "home.kickerLegenda",
};

/** Jam sekarang di WIB, "HH:MM". */
function nowHHMM(): string {
  return new Intl.DateTimeFormat("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date());
}

function SectionHead({ id, kicker, title, href, linkLabel }: { id: string; kicker?: string; title: string; href?: string; linkLabel?: string }) {
  return (
    <div className="flex items-end justify-between gap-4">
      <div>
        {kicker && <p className="text-[11px] font-bold uppercase tracking-widest text-muted">{kicker}</p>}
        <h2 id={id} className="mt-1 text-xl font-bold text-ink">{title}</h2>
      </div>
      {href && linkLabel && (
        <Link href={href} className="inline-flex h-9 shrink-0 items-center gap-1 rounded-full border border-line bg-canvas px-3 text-sm font-semibold text-surface-dark shadow-sm hover:bg-navy-soft focus-visible:outline-2 focus-visible:outline-accent">
          {linkLabel} <ArrowRight className="size-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

function QuickTile({ href, icon: Icon, label, value, tone }: { href: string; icon: LucideIcon; label: string; value: string; tone: string }) {
  return (
    <li>
      <Link href={href} className={`flex h-full min-w-[150px] items-center gap-3 rounded-2xl border px-3 py-2.5 shadow-sm hover:shadow-card focus-visible:outline-2 focus-visible:outline-accent ${tone}`}>
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-canvas shadow-sm">
          <Icon className="size-[18px]" aria-hidden="true" />
        </span>
        <span className="min-w-0">
          <span className="block text-[11px] leading-4 text-muted">{label}</span>
          <span className="block truncate text-sm font-bold text-ink">{value}</span>
        </span>
      </Link>
    </li>
  );
}

function InfoCard({ icon: Icon, title, children, href, linkLabel }: { icon: LucideIcon; title: string; children: React.ReactNode; href: string; linkLabel: string }) {
  return (
    <article className="flex flex-col rounded-3xl border border-line bg-canvas p-5 shadow-card">
      <h3 className="flex items-center gap-2 text-base font-bold text-ink">
        <span className="flex size-8 items-center justify-center rounded-full bg-navy-soft text-surface-dark">
          <Icon className="size-4" aria-hidden="true" />
        </span>
        {title}
      </h3>
      <div className="mt-3 flex-1">{children}</div>
      <Link href={href} className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
        {linkLabel} <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </article>
  );
}

export default async function HomePage() {
  const lang = await getServerLang();
  const [featured, latest, popular, prices, rates, jobs, weatherSnap, prayerSnap] = await Promise.all([
    getFeatured(),
    getLatest(6),
    getPopular(5),
    getDailyPrices(),
    getMarketRates(),
    listJobs(),
    getDailySnapshot("weather"),
    getDailySnapshot("prayer"),
  ]);
  const weather = weatherSnap ? parseWeatherPayload(weatherSnap.payload) : null;
  const prayer = prayerSnap ? parsePrayerPayload(prayerSnap.payload) : null;
  const weatherNow = weather?.days[0]?.items[0];
  const channelTeasers = await Promise.all(
    CHANNEL_ORDER.map(async (c) => ({ channel: c, items: (await listArticles({ channel: c, page: 1, perPage: 8 })).items })),
  );

  // Sorotan: artikel berfoto pertama (featured -> populer -> kanal); tanpa
  // foto sama sekali, pakai featured dengan latar kanal (jujur, tanpa foto karangan).
  const heroPool: Article[] = [...(featured ? [featured] : []), ...popular, ...channelTeasers.flatMap((c) => c.items)];
  const hero = heroPool.find(hasPhoto) ?? featured ?? latest[0] ?? null;

  // Dedupe antar seksi berdasarkan id: satu artikel hanya tampil sekali di
  // beranda (bug 19 Nov 2026). Prioritas: sorotan -> terbaru -> populer -> kanal.
  const seen = new Set<string>();
  const takeUnique = <T extends { id: string }>(list: T[]): T[] =>
    list.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
  if (hero) seen.add(hero.id);
  const latestUnique = takeUnique(latest).slice(0, 5);
  const popularUnique = takeUnique(popular);
  const channelTeasersUnique = channelTeasers
    .map(({ channel, items }) => ({ channel, items: takeUnique(items).slice(0, 6) }))
    .filter((c) => c.items.length > 0);

  // Ubin info cepat
  const now = nowHHMM();
  const fard = prayer?.times.filter((p) => ["Subuh", "Zuhur", "Asar", "Magrib", "Isya"].includes(p.label)) ?? [];
  const nextPrayer = fard.find((p) => p.time > now) ?? fard[0];
  const usd = rates.currencies.find((c) => c.code === "USD")?.sell_erate ?? 0;
  const firstPrice = prices.items[0];

  return (
    <div className="flex flex-col gap-10 pb-6 pt-6 md:gap-12">
      {/* Judul ringkas + chip cuaca */}
      <section aria-labelledby="hero-title" className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-gold-ink">{t(lang, "home.heroKicker")}</p>
            <h1 id="hero-title" className="mt-1 text-[26px] font-bold leading-tight text-surface-dark md:text-[32px]">
              {t(lang, "home.heroTitle")} <span className="text-accent">{t(lang, "home.heroTitleAccent")}</span>
            </h1>
            <p className="sr-only">{t(lang, "home.heroSub")}</p>
          </div>
          <Link
            href="/info-harian/cuaca"
            className="inline-flex items-center gap-3 self-start rounded-2xl border border-amber-200 bg-gold-soft px-4 py-2 shadow-sm hover:shadow-card focus-visible:outline-2 focus-visible:outline-accent md:self-auto"
          >
            <CloudSun className="size-7 text-gold-ink" aria-hidden="true" />
            <span className="text-sm text-gold-ink">
              {weather && weatherNow ? (
                <>
                  <b className="text-lg text-ink">{weatherNow.temp !== null ? `${weatherNow.temp}°` : "—"}</b> {weatherNow.desc}
                  <span className="block text-xs">BMKG · Tanjung Pandan</span>
                </>
              ) : (
                <>
                  <b className="text-ink">{t(lang, "home.weatherChip")}</b>
                  <span className="block text-xs">BMKG · Tanjung Pandan</span>
                </>
              )}
            </span>
            <ChevronRight className="size-4 text-gold-ink" aria-hidden="true" />
          </Link>
        </div>

        {/* Ubin info cepat — bisa digeser di HP */}
        <ul className="swipe-row -mx-4 gap-3 px-4 pb-1 md:mx-0 md:flex-wrap md:overflow-visible md:px-0" aria-label={t(lang, "home.quickInfo")}>
          <QuickTile href="/info-harian/salat" icon={Clock3} tone="border-emerald-200 bg-emerald-50 text-emerald-700"
            label={t(lang, "home.tileNextPrayer")} value={nextPrayer ? `${nextPrayer.label} ${nextPrayer.time}` : t(lang, "home.tileSeeSchedule")} />
          {firstPrice && (
            <QuickTile href="/harga-pangan" icon={ShoppingBasket} tone="border-orange-200 bg-orange-50 text-orange-700"
              label={firstPrice.commodity} value={`${formatRupiah(firstPrice.price)}/${firstPrice.unit}`} />
          )}
          <QuickTile href="/kurs" icon={DollarSign} tone="border-blue-200 bg-blue-50 text-blue-700"
            label={t(lang, "home.tileUsd")} value={usd ? formatRupiah(usd) : "—"} />
          <QuickTile href="/lowongan" icon={Briefcase} tone="border-violet-200 bg-violet-50 text-violet-700"
            label={t(lang, "home.jobs")} value={t(lang, "home.tileJobsValue", { n: jobs.length })} />
          <QuickTile href="/info-harian/darurat" icon={Siren} tone="border-rose-200 bg-rose-50 text-rose-700"
            label={t(lang, "home.tileEmergency")} value="110 · 113 · 118" />
          <QuickTile href="/info-harian" icon={LayoutGrid} tone="border-line bg-navy-soft text-surface-dark"
            label={t(lang, "home.tileMore")} value={t(lang, "home.tileAllInfo")} />
        </ul>
      </section>

      {/* Sorotan berfoto + kabar terbaru */}
      <div className="grid gap-6 lg:grid-cols-[1.65fr_1fr]">
        {hero && <HeroStory article={hero} />}
        <section aria-labelledby="terbaru-title" className="rounded-[28px] border border-line bg-canvas p-4 shadow-card md:p-5">
          <div className="flex items-center justify-between gap-3 px-2">
            <h2 id="terbaru-title" className="text-[13px] font-bold uppercase tracking-widest text-surface-dark">{t(lang, "home.latestNews")}</h2>
            <Link href="/kanal/berita" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              {t(lang, "home.allNews")} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <ul className="mt-2 flex flex-col divide-y divide-line">
            {latestUnique.map((a) => <ListItem key={a.id} article={a} />)}
          </ul>
        </section>
      </div>

      {/* Terpopuler bernomor + info harian */}
      <div className="grid gap-6 lg:grid-cols-3">
        <section aria-labelledby="populer-title" className="rounded-[28px] border border-line bg-gradient-to-b from-navy-soft to-canvas p-5 shadow-card">
          <p className="text-[11px] font-bold uppercase tracking-widest text-muted">{t(lang, "home.popularKicker")}</p>
          <h2 id="populer-title" className="mt-1 text-xl font-bold text-ink">{t(lang, "home.mostSought")}</h2>
          <ol className="mt-3 flex flex-col divide-y divide-line">
            {popularUnique.map((a, i) => (
              <li key={a.id} className="flex items-start gap-3 py-3">
                <span aria-hidden="true" className="w-8 shrink-0 text-xl font-bold tabular-nums text-accent">{String(i + 1).padStart(2, "0")}</span>
                <div className="min-w-0">
                  <p className={`text-[11px] font-bold uppercase tracking-widest ${CHANNEL_STYLE[a.channel].text}`}>{channelLabel(a.channel, lang)}</p>
                  <Link href={`/artikel/${a.slug}`} className="font-semibold leading-snug text-ink hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                    {a.title_id}
                  </Link>
                  <p className="text-xs text-muted">{a.views.toLocaleString("id-ID")} {t(lang, "common.reads")}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="info-title" className="lg:col-span-2">
          <SectionHead id="info-title" kicker={t(lang, "home.infoKicker")} title={t(lang, "home.dailyInfo")} href="/info-harian" linkLabel={t(lang, "common.showMore")} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {/* Kartu cuaca + salat (M5, A5): dari cache yang sama dengan
                /api/daily/*; tanpa cache tampilkan pesan jujur, bukan angka karangan. */}
            <InfoCard icon={CloudSun} title={t(lang, "home.weather")} href="/info-harian/cuaca" linkLabel={t(lang, "home.viewForecast")}>
              {weather && weatherNow ? (
                <>
                  <p className="text-sm text-muted">
                    {weatherNow.desc} · {weatherNow.temp !== null ? `${weatherNow.temp}°C` : "—"} · {t(lang, "home.rain")} {weatherNow.rainMm !== null ? `${weatherNow.rainMm} mm` : "—"}
                  </p>
                  <p className="mt-1 text-xs text-muted">
                    {t(lang, "common.updatedAt")} {formatUpdatedWIB(weatherSnap!.fetched_at)}
                    {isCacheStale(weatherSnap!.fetched_at, weatherSnap!.as_of) ? ` · ${t(lang, "common.stale")}` : ""}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">{t(lang, "home.weatherUnavailable")}</p>
              )}
            </InfoCard>
            <InfoCard icon={MoonStar} title={t(lang, "home.prayer")} href="/info-harian/salat" linkLabel={t(lang, "home.viewPrayer")}>
              {prayer ? (
                <>
                  <ul className="grid grid-cols-5 gap-1 text-center">
                    {fard.map((p) => (
                      <li key={p.label} className={`rounded-xl px-1 py-1.5 ${nextPrayer?.label === p.label ? "bg-surface-dark text-ink-on-dark" : "bg-surface"}`}>
                        <span className="block text-[11px]">{p.label}</span>
                        <span className="block text-sm font-bold tabular-nums">{p.time}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-2 text-xs text-muted">
                    {prayer.location} · {prayer.dateLabel} · {t(lang, "common.updatedAt")} {formatUpdatedWIB(prayerSnap!.fetched_at)}
                    {isCacheStale(prayerSnap!.fetched_at, prayerSnap!.as_of) ? ` · ${t(lang, "common.stale")}` : ""}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted">{t(lang, "home.prayerUnavailable")}</p>
              )}
            </InfoCard>
            <InfoCard icon={ShoppingBasket} title={t(lang, "home.foodPrices")} href="/harga-pangan" linkLabel={t(lang, "home.viewAllPrices")}>
              <ul className="flex flex-col gap-1.5 text-sm">
                {prices.items.slice(0, 4).map((it) => (
                  <li key={it.id} className="flex justify-between gap-2">
                    <span className="text-muted">{it.commodity}</span>
                    <span className="font-bold tabular-nums text-ink">{formatRupiah(it.price)}/{it.unit}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">{prices.market} · sumber {formatDateLoose(prices.source_date, lang)}</p>
            </InfoCard>
            <InfoCard icon={TrendingUp} title={t(lang, "home.rates")} href="/kurs" linkLabel={t(lang, "home.viewRates")}>
              <dl className="grid grid-cols-3 gap-2 text-center">
                <div className="rounded-xl bg-surface px-1 py-2"><dt className="text-[11px] text-muted">USD</dt><dd className="text-sm font-bold tabular-nums text-ink">{formatRupiah(usd)}</dd></div>
                <div className="rounded-xl bg-surface px-1 py-2"><dt className="text-[11px] text-muted">IHSG</dt><dd className="text-sm font-bold tabular-nums text-ink">{rates.ihsg.value.toLocaleString("id-ID")}</dd></div>
                <div className="rounded-xl bg-surface px-1 py-2"><dt className="text-[11px] text-muted">{t(lang, "home.goldPerGram")}</dt><dd className="text-sm font-bold tabular-nums text-ink">{formatRupiah(rates.gold.price_1g)}</dd></div>
              </dl>
              <p className="mt-2 text-xs text-muted">IHSG {rates.ihsg.percent}%</p>
            </InfoCard>
            <div className="sm:col-span-2">
              <InfoCard icon={BookOpen} title={t(lang, "home.jobs")} href="/lowongan" linkLabel={t(lang, "home.viewJobs")}>
                <p className="text-sm text-muted">{jobs.length} {t(lang, "home.jobsSummary", { sources: new Set(jobs.map((j) => j.source)).size })}</p>
              </InfoCard>
            </div>
          </div>
        </section>
      </div>

      {/* Baris kanal yang bisa digeser */}
      {channelTeasersUnique.map(({ channel, items }) => (
        <section key={channel} aria-labelledby={`kanal-${channel}`}>
          <SectionHead
            id={`kanal-${channel}`}
            kicker={t(lang, CHANNEL_KICKER[channel])}
            title={channelLabel(channel, lang)}
            href={`/kanal/${channel}`}
            linkLabel={t(lang, "home.allChannel", { channel: channelLabel(channel, lang).toLowerCase() })}
          />
          <ul className="swipe-row -mx-4 mt-4 px-4 pb-2" aria-label={channelLabel(channel, lang)}>
            {items.map((a) => (
              <li key={a.id}><RowCard article={a} /></li>
            ))}
          </ul>
        </section>
      ))}

      {/* CTA kontributor + produk — kartu navy dengan tombol emas */}
      <section aria-labelledby="cta-title" className="relative overflow-hidden rounded-[28px] bg-gradient-to-br from-surface-dark via-surface-dark to-accent-dark px-6 py-10 text-ink-on-dark md:px-12">
        <div aria-hidden="true" className="absolute -right-16 -top-16 size-56 rounded-full bg-gold/20 blur-2xl" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-gold">{t(lang, "home.ctaKicker")}</p>
        <h2 id="cta-title" className="mt-2 text-2xl font-bold">{t(lang, "home.ctaTitle")}</h2>
        <p className="mt-2 max-w-xl text-base text-white/85">{t(lang, "home.ctaSub")}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link href="/kontributor/tulis" className="inline-flex h-11 items-center gap-2 rounded-full bg-gold px-5 text-sm font-bold text-surface-dark hover:brightness-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
            <PenLine className="size-4" aria-hidden="true" /> {t(lang, "home.startWriting")}
          </Link>
          <Link href="/produk" className="inline-flex h-11 items-center gap-2 rounded-full border border-white/40 px-5 text-sm font-bold text-ink-on-dark hover:bg-white/10 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold">
            <Coins className="size-4" aria-hidden="true" /> {t(lang, "home.digitalProducts")}
          </Link>
        </div>
      </section>
    </div>
  );
}
