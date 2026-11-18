// S02/S03/S04 + kanal iTAP (sejarah/budaya/legenda): daftar kanal + filter +
// pagination. Satu route dinamis [channel] — layout sama untuk semua kanal.
import type { Metadata } from "next";
import Link from "next/link";
import { siteUrl } from "@/lib/site-url";
import { notFound } from "next/navigation";
import { listArticles, listCategories } from "@/lib/data";
import { CHANNELS } from "@/lib/seed-data";
import type { Channel } from "@/lib/types";
import { ArticleCard } from "@/components/article-card";
import { EmptyState, Pagination } from "@/components/ui";
import { ChannelFilterForm } from "./filter-form";

const CHANNEL_DESCRIPTIONS: Record<Channel, string> = {
  berita: "Kabar terbaru Belitung dan Bangka Belitung dari media lokal — dengan sumber asli yang tercantum.",
  kuliner: "Mie Belitung, gangan, kopi Manggar, dan oleh-oleh khas — rasa pulau dari dapur warga.",
  wisata: "Pantai granit, pulau, danau kaolin, dan situs geopark — tempat yang layak dikunjungi di Belitung.",
  sejarah: "Jejak timah, kerajaan, museum, dan rumah adat — masa lalu Belitung yang membentuk hari ini.",
  budaya: "Upacara, tari, musik, bahasa, dan tradisi — budaya Belitung yang masih hidup.",
  legenda: "Cerita rakyat Belitung — dari Batu Baginda sampai Laskar Pelangi.",
};

export async function generateStaticParams() {
  return (Object.keys(CHANNELS) as Channel[]).map((channel) => ({ channel }));
}

export async function generateMetadata({ params }: { params: Promise<{ channel: string }> }): Promise<Metadata> {
  const { channel } = await params;
  const label = CHANNELS[channel as Channel];
  if (!label) return { title: "Kanal tidak ditemukan" };
  return {
    title: `${label} Belitung`,
    description: CHANNEL_DESCRIPTIONS[channel as Channel],
    alternates: { canonical: `${siteUrl()}/kanal/${channel}` },
  };
}

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Promise<{ channel: string }>;
  searchParams: Promise<{ category?: string; sort?: string; page?: string }>;
}) {
  const { channel } = await params;
  const sp = await searchParams;
  if (!(channel in CHANNELS)) notFound();
  const ch = channel as Channel;
  const page = Number(sp.page ?? "1") || 1;
  const sort = sp.sort === "terpopuler" ? "terpopuler" : "terbaru";
  const [result, categories] = await Promise.all([
    listArticles({ channel: ch, category: sp.category, page }),
    listCategories(ch),
  ]);
  // Urutan: kanal memakai sort yang sama dengan pencarian (terbaru/terpopuler).
  const items = sort === "terpopuler" ? [...result.items].sort((a, b) => b.views - a.views) : result.items;

  return (
    <div className="flex flex-col gap-6 py-8">
      <section aria-labelledby="kanal-title" className="rounded-xl bg-surface-dark px-6 py-10 text-ink-on-dark">
        <p className="text-xs font-medium uppercase tracking-widest text-accent-light">Kanal · iTAP Belitung</p>
        <h1 id="kanal-title" className="mt-2 text-xl font-bold md:text-display">{CHANNELS[ch]}</h1>
        <p className="mt-2 max-w-xl text-base text-muted-on-dark">{CHANNEL_DESCRIPTIONS[ch]}</p>
      </section>

      <ChannelFilterForm categories={categories} current={{ category: sp.category ?? "", sort }} total={result.total} />

      {items.length === 0 ? (
        <EmptyState
          title="Belum ada kabar di sini."
          desc={`Belum ada artikel ${CHANNELS[ch].toLowerCase()} ${sp.category ? "di kategori ini" : "yang diterbitkan"}. Coba kanal lain, atau tulis sendiri sebagai kontributor.`}
          action={<Link href="/kontributor/tulis" className="inline-flex h-10 items-center rounded-md bg-accent px-4 text-sm font-semibold text-on-accent hover:bg-accent-dark">Tulis artikel</Link>}
        />
      ) : (
        <>
          <p aria-live="polite" className="text-sm text-muted">
            Menampilkan {items.length} dari {result.total} artikel · halaman {result.page} dari {result.total_pages}
          </p>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => <ArticleCard key={a.id} article={a} />)}
          </div>
          <Pagination page={result.page} totalPages={result.total_pages} baseHref={`/kanal/${ch}${sp.category || sp.sort ? `?${new URLSearchParams({ ...(sp.category ? { category: sp.category } : {}), ...(sp.sort ? { sort: sp.sort } : {}) }).toString()}` : ""}`} />
        </>
      )}
    </div>
  );
}
