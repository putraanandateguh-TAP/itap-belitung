// S01 Beranda web — pintu masuk editorial (recon): hero headline, kabar
// terbaru, populer, banyak dicari, seksi kanal, CTA kontributor + info iTAP.
import Link from "next/link";
import Image from "next/image";
import { ArrowRight, BookOpen, CloudSun, Coins, MoonStar, ShoppingBasket, TrendingUp } from "lucide-react";
import { getFeatured, getLatest, getPopular, listArticles } from "@/lib/data";
import { channelLabel } from "@/lib/labels";
import { ArticleCard } from "@/components/article-card";
import { ButtonLink } from "@/components/ui";
import { formatDateLoose, formatRupiah } from "@/lib/format";
import { getDailyPrices, getMarketRates, listJobs } from "@/lib/data";
import { getDailySnapshot } from "@/lib/daily";
import { formatUpdatedWIB, isCacheStale, parsePrayerPayload, parseWeatherPayload } from "@/lib/daily-parse";
import type { Channel } from "@/lib/types";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

const CHANNEL_ORDER: Channel[] = ["berita", "kuliner", "wisata", "sejarah", "budaya", "legenda"];

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
    CHANNEL_ORDER.map(async (c) => ({ channel: c, items: (await listArticles({ channel: c, page: 1, perPage: 3 })).items })),
  );
  // Dedupe antar seksi berdasarkan id: satu artikel hanya tampil sekali di
  // beranda. Sebelumnya artikel yang sama muncul di beberapa seksi sekaligus
  // (featured = getLatest(1) = latest[0], plus teaser kanal yang sama) —
  // mis. Polairud 3x, PLN 2x (bug 19 Nov 2026). Urutan prioritas:
  // featured -> terbaru -> populer -> teaser kanal.
  const seen = new Set<string>();
  const takeUnique = <T extends { id: string }>(list: T[]): T[] =>
    list.filter((a) => (seen.has(a.id) ? false : (seen.add(a.id), true)));
  const featuredUnique = featured ? takeUnique([featured]) : [];
  const latestUnique = takeUnique(latest);
  const popularUnique = takeUnique(popular);
  const channelTeasersUnique = channelTeasers.map(({ channel, items }) => ({
    channel,
    items: takeUnique(items),
  }));

  return (
    <div className="flex flex-col gap-12 py-8">
      {/* #11 Hero Headline (gelap/navy) + foto hero pantai Belitung */}
      <section aria-labelledby="hero-title" className="grid items-center gap-8 rounded-xl bg-surface-dark px-6 py-12 text-ink-on-dark md:grid-cols-[1.2fr_1fr] md:px-12">
        <div>
          <p className="text-xs font-medium uppercase tracking-widest text-accent-light">{t(lang, "home.heroKicker")}</p>
          <h1 id="hero-title" className="mt-3 max-w-2xl text-xl font-bold md:text-display">
            {t(lang, "home.heroTitle")}
          </h1>
          <p className="mt-3 max-w-xl text-base text-muted-on-dark">
            {t(lang, "home.heroSub")}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <ButtonLink href="/kanal/berita">{t(lang, "home.readLatest")}</ButtonLink>
            <ButtonLink href="/kontributor" variant="secondary" className="border-line bg-surface-dark text-ink-on-dark hover:bg-surface-dark-deep">
              {t(lang, "home.becomeContributor")}
            </ButtonLink>
          </div>
        </div>
        <Image
          src="/images/pantai-itap.webp"
          alt="Pantai Belitung dengan batu granit dan logo iTAP Belitung"
          width={1024}
          height={1536}
          className="mx-auto aspect-[2/3] w-full max-w-sm rounded-lg object-cover"
          priority
        />
      </section>

      {/* Headline + kabar terbaru */}
      <section aria-labelledby="terbaru-title">
        <div className="flex items-end justify-between gap-4">
          <h2 id="terbaru-title" className="text-xl font-bold text-ink">{t(lang, "home.latestNews")}</h2>
          <Link href="/kanal/berita" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            {t(lang, "home.allNews")} <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {featuredUnique[0] && (
          <div className="mt-4">
            <ArticleCard article={featuredUnique[0]} variant="headline" />
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latestUnique.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      </section>

      {/* Populer / banyak dicari + info harian ringkas */}
      <div className="grid gap-8 lg:grid-cols-3">
        <section aria-labelledby="populer-title" className="lg:col-span-2">
          <h2 id="populer-title" className="text-xl font-bold text-ink">{t(lang, "home.mostSought")}</h2>
          <ol className="mt-4 flex flex-col divide-y divide-line rounded-lg border border-line bg-canvas">
            {popularUnique.map((a, i) => (
              <li key={a.id} className="flex items-start gap-3 p-4">
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-alt text-sm font-bold text-accent">{i + 1}</span>
                <div>
                  <Link href={`/artikel/${a.slug}`} className="font-semibold text-ink hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                    {a.title_id}
                  </Link>
                  <p className="text-xs text-muted">{channelLabel(a.channel, lang)} · {a.views} {t(lang, "common.reads")}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="info-title" className="flex flex-col gap-4">
          <h2 id="info-title" className="text-xl font-bold text-ink">{t(lang, "home.dailyInfo")}</h2>
          {/* Kartu ringkas cuaca + salat (M5, A5): dari cache yang sama dengan
              /api/daily/*; tanpa cache tampilkan pesan jujur, bukan angka karangan. */}
          <article className="rounded-lg border border-line bg-canvas p-4 shadow-card">
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
              <CloudSun className="size-5 text-accent" aria-hidden="true" /> {t(lang, "home.weather")}
            </h3>
            {weather && weatherNow ? (
              <>
                <p className="mt-2 text-sm text-muted">
                  {weatherNow.desc} · {weatherNow.temp !== null ? `${weatherNow.temp}°C` : "—"} · {t(lang, "home.rain")} {weatherNow.rainMm !== null ? `${weatherNow.rainMm} mm` : "—"}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {t(lang, "common.updatedAt")} {formatUpdatedWIB(weatherSnap!.fetched_at)}
                  {isCacheStale(weatherSnap!.fetched_at, weatherSnap!.as_of) ? ` · ${t(lang, "common.stale")}` : ""}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">{t(lang, "home.weatherUnavailable")}</p>
            )}
            <Link href="/info-harian/cuaca" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              {t(lang, "home.viewForecast")} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
          <article className="rounded-lg border border-line bg-canvas p-4 shadow-card">
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
              <MoonStar className="size-5 text-accent" aria-hidden="true" /> {t(lang, "home.prayer")}
            </h3>
            {prayer ? (
              <>
                <p className="mt-2 text-sm text-muted">
                  {prayer.times.filter((t) => ["Subuh", "Zuhur", "Asar", "Magrib", "Isya"].includes(t.label)).map((t) => `${t.label} ${t.time}`).join(" · ")}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {prayer.location} · {prayer.dateLabel} · {t(lang, "common.updatedAt")} {formatUpdatedWIB(prayerSnap!.fetched_at)}
                  {isCacheStale(prayerSnap!.fetched_at, prayerSnap!.as_of) ? ` · ${t(lang, "common.stale")}` : ""}
                </p>
              </>
            ) : (
              <p className="mt-2 text-sm text-muted">{t(lang, "home.prayerUnavailable")}</p>
            )}
            <Link href="/info-harian/salat" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              {t(lang, "home.viewPrayer")} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
          <article className="rounded-lg border border-line bg-canvas p-4 shadow-card">
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
              <ShoppingBasket className="size-5 text-accent" aria-hidden="true" /> {t(lang, "home.foodPrices")}
            </h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {prices.items.slice(0, 3).map((it) => (
                <li key={it.id} className="flex justify-between gap-2">
                  <span className="text-muted">{it.commodity}</span>
                  <span className="font-semibold text-ink">{formatRupiah(it.price)}/{it.unit}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">{prices.market} · sumber {formatDateLoose(prices.source_date, lang)}</p>
            <Link href="/harga-pangan" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              {t(lang, "home.viewAllPrices")} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
          <article className="rounded-lg border border-line bg-canvas p-4 shadow-card">
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
              <TrendingUp className="size-5 text-accent" aria-hidden="true" /> {t(lang, "home.rates")}
            </h3>
            <p className="mt-2 text-sm text-muted">
              USD {formatRupiah(rates.currencies.find((c) => c.code === "USD")?.sell_erate ?? 0)} · IHSG {rates.ihsg.value.toLocaleString("id-ID")} ({rates.ihsg.percent}%) · Emas {formatRupiah(rates.gold.price_1g)}/gram
            </p>
            <Link href="/kurs" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              {t(lang, "home.viewRates")} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
          <article className="rounded-lg border border-line bg-canvas p-4 shadow-card">
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
              <BookOpen className="size-5 text-accent" aria-hidden="true" /> {t(lang, "home.jobs")}
            </h3>
            <p className="mt-2 text-sm text-muted">{jobs.length} {t(lang, "home.jobsSummary", { sources: new Set(jobs.map((j) => j.source)).size })}</p>
            <Link href="/lowongan" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              {t(lang, "home.viewJobs")} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
        </section>
      </div>

      {/* Seksi kanal */}
      {channelTeasersUnique.map(({ channel, items }) => (
        <section key={channel} aria-labelledby={`kanal-${channel}`}>
          <div className="flex items-end justify-between gap-4">
            <h2 id={`kanal-${channel}`} className="text-xl font-bold text-ink">{channelLabel(channel, lang)}</h2>
            <Link href={`/kanal/${channel}`} className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              {t(lang, "home.allChannel", { channel: channelLabel(channel, lang).toLowerCase() })} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>
      ))}

      {/* CTA kontributor + produk */}
      <section aria-labelledby="cta-title" className="rounded-xl bg-surface-alt px-6 py-10 text-center">
        <h2 id="cta-title" className="text-xl font-bold text-ink">{t(lang, "home.ctaTitle")}</h2>
        <p className="mx-auto mt-2 max-w-xl text-base text-muted">
          {t(lang, "home.ctaSub")}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/kontributor/tulis">{t(lang, "home.startWriting")}</ButtonLink>
          <ButtonLink href="/produk" variant="secondary">
            <Coins className="size-4" aria-hidden="true" /> {t(lang, "home.digitalProducts")}
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
