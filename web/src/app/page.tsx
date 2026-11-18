// S01 Beranda web — pintu masuk editorial (recon): hero headline, kabar
// terbaru, populer, banyak dicari, seksi kanal, CTA kontributor + info iTAP.
import Link from "next/link";
import { ArrowRight, BookOpen, Coins, ShoppingBasket, TrendingUp } from "lucide-react";
import { getFeatured, getLatest, getPopular, listArticles } from "@/lib/data";
import { CHANNELS } from "@/lib/seed-data";
import { ArticleCard } from "@/components/article-card";
import { ButtonLink } from "@/components/ui";
import { formatRupiah } from "@/lib/format";
import { getDailyPrices, getMarketRates, listJobs } from "@/lib/data";
import type { Channel } from "@/lib/types";

const CHANNEL_ORDER: Channel[] = ["berita", "kuliner", "wisata", "sejarah", "budaya", "legenda"];

export default async function HomePage() {
  const [featured, latest, popular, prices, rates, jobs] = await Promise.all([
    getFeatured(),
    getLatest(6),
    getPopular(5),
    getDailyPrices(),
    getMarketRates(),
    listJobs(),
  ]);
  const channelTeasers = await Promise.all(
    CHANNEL_ORDER.map(async (c) => ({ channel: c, items: (await listArticles({ channel: c, page: 1, perPage: 3 })).items })),
  );

  return (
    <div className="flex flex-col gap-12 py-8">
      {/* #11 Hero Headline (gelap/navy) */}
      <section aria-labelledby="hero-title" className="rounded-xl bg-surface-dark px-6 py-12 text-ink-on-dark md:px-12">
        <p className="text-xs font-medium uppercase tracking-widest text-accent-light">Kabar · Rasa · Perjalanan</p>
        <h1 id="hero-title" className="mt-3 max-w-2xl text-xl font-bold md:text-display">
          Cerita pulau, dekat denganmu.
        </h1>
        <p className="mt-3 max-w-xl text-base text-muted-on-dark">
          Berita, kuliner, wisata, sejarah, budaya, dan legenda Belitung — ditulis warga Belitung, ditinjau redaksi iTAP.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href="/kanal/berita">Baca kabar terbaru</ButtonLink>
          <ButtonLink href="/kontributor" variant="secondary" className="border-line bg-surface-dark text-ink-on-dark hover:bg-surface-dark-deep">
            Jadi kontributor
          </ButtonLink>
        </div>
      </section>

      {/* Headline + kabar terbaru */}
      <section aria-labelledby="terbaru-title">
        <div className="flex items-end justify-between gap-4">
          <h2 id="terbaru-title" className="text-xl font-bold text-ink">Kabar terbaru</h2>
          <Link href="/kanal/berita" className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            Semua berita <ArrowRight className="size-4" aria-hidden="true" />
          </Link>
        </div>
        {featured && (
          <div className="mt-4">
            <ArticleCard article={featured} variant="headline" />
          </div>
        )}
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((a) => <ArticleCard key={a.id} article={a} />)}
        </div>
      </section>

      {/* Populer / banyak dicari + info harian ringkas */}
      <div className="grid gap-8 lg:grid-cols-3">
        <section aria-labelledby="populer-title" className="lg:col-span-2">
          <h2 id="populer-title" className="text-xl font-bold text-ink">Banyak dicari</h2>
          <ol className="mt-4 flex flex-col divide-y divide-line rounded-lg border border-line bg-canvas">
            {popular.map((a, i) => (
              <li key={a.id} className="flex items-start gap-3 p-4">
                <span aria-hidden="true" className="flex size-8 shrink-0 items-center justify-center rounded-md bg-surface-alt text-sm font-bold text-accent">{i + 1}</span>
                <div>
                  <Link href={`/artikel/${a.slug}`} className="font-semibold text-ink hover:text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                    {a.title_id}
                  </Link>
                  <p className="text-xs text-muted">{CHANNELS[a.channel]} · {a.views} dibaca</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        <section aria-labelledby="info-title" className="flex flex-col gap-4">
          <h2 id="info-title" className="text-xl font-bold text-ink">Info harian iTAP</h2>
          <article className="rounded-lg border border-line bg-canvas p-4 shadow-card">
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
              <ShoppingBasket className="size-5 text-accent" aria-hidden="true" /> Harga pangan hari ini
            </h3>
            <ul className="mt-2 flex flex-col gap-1 text-sm">
              {prices.items.slice(0, 3).map((it) => (
                <li key={it.id} className="flex justify-between gap-2">
                  <span className="text-muted">{it.commodity}</span>
                  <span className="font-semibold text-ink">{formatRupiah(it.price)}/{it.unit}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-muted">{prices.market} · sumber {prices.source_date}</p>
            <Link href="/harga-pangan" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              Lihat semua harga <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
          <article className="rounded-lg border border-line bg-canvas p-4 shadow-card">
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
              <TrendingUp className="size-5 text-accent" aria-hidden="true" /> Kurs &amp; pasar
            </h3>
            <p className="mt-2 text-sm text-muted">
              USD {formatRupiah(rates.currencies.find((c) => c.code === "USD")?.sell_erate ?? 0)} · IHSG {rates.ihsg.value.toLocaleString("id-ID")} ({rates.ihsg.percent}%) · Emas {formatRupiah(rates.gold.price_1g)}/gram
            </p>
            <Link href="/kurs" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              Lihat kurs &amp; emas <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
          <article className="rounded-lg border border-line bg-canvas p-4 shadow-card">
            <h3 className="flex items-center gap-2 text-base font-semibold text-ink">
              <BookOpen className="size-5 text-accent" aria-hidden="true" /> Lowongan kerja
            </h3>
            <p className="mt-2 text-sm text-muted">{jobs.length} lowongan tercatat dari {new Set(jobs.map((j) => j.source)).size} sumber — terbaru di Belitung &amp; Bangka Belitung.</p>
            <Link href="/lowongan" className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              Lihat lowongan <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
        </section>
      </div>

      {/* Seksi kanal */}
      {channelTeasers.map(({ channel, items }) => (
        <section key={channel} aria-labelledby={`kanal-${channel}`}>
          <div className="flex items-end justify-between gap-4">
            <h2 id={`kanal-${channel}`} className="text-xl font-bold text-ink">{CHANNELS[channel]}</h2>
            <Link href={`/kanal/${channel}`} className="inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              Semua {CHANNELS[channel].toLowerCase()} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
        </section>
      ))}

      {/* CTA kontributor + produk */}
      <section aria-labelledby="cta-title" className="rounded-xl bg-surface-alt px-6 py-10 text-center">
        <h2 id="cta-title" className="text-xl font-bold text-ink">Punya cerita tentang Belitung?</h2>
        <p className="mx-auto mt-2 max-w-xl text-base text-muted">
          Tulis sebagai kontributor — kirimanmu ditinjau redaksi, dan setiap artikel yang disetujui mendapat 1 poin kontribusi.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/kontributor/tulis">Mulai menulis</ButtonLink>
          <ButtonLink href="/produk" variant="secondary">
            <Coins className="size-4" aria-hidden="true" /> Produk digital iTAP
          </ButtonLink>
        </div>
      </section>
    </div>
  );
}
