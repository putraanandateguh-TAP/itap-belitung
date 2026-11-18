// S35 Budaya — detail cerita (F15): isi + lirik + sumber bacaan.
// Lirik HANYA tampil bila ada di sumber nyata; bila null, tampilkan pesan
// jujur (jangan karang lirik). Sama untuk sumber bacaan yang kosong.
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCultureStory } from "@/lib/daily";
import { Badge, Banner } from "@/components/ui";
import { cultureLabel } from "@/lib/labels";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const story = await getCultureStory(slug);
  if (!story) return { title: "Cerita tidak ditemukan" };
  return {
    title: `${story.title} — Budaya Belitung`,
    description: story.body.split("\n\n")[0]?.slice(0, 160),
  };
}

export default async function BudayaDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const story = await getCultureStory(slug);
  if (!story) notFound();
  const paragraphs = story.body.split("\n\n").filter(Boolean);
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <Badge tone="info">{cultureLabel(story.category)}</Badge>
        <h1 className="mt-2 text-xl font-bold text-ink">{story.title}</h1>
        <p className="mt-1 text-sm text-muted">
          <Link href="/budaya" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
            ← Semua cerita budaya
          </Link>
        </p>
      </header>

      <article className="flex flex-col gap-4 rounded-lg border border-line bg-canvas p-4 shadow-card md:p-6">
        {paragraphs.map((p, i) => (
          <p key={i} className="text-base leading-relaxed text-ink">{p}</p>
        ))}
      </article>

      <section aria-labelledby="lirik-title" className="rounded-lg border border-line bg-canvas p-4 shadow-card md:p-6">
        <h2 id="lirik-title" className="text-base font-bold text-ink">Lirik</h2>
        {story.lyrics ? (
          <pre className="mt-3 whitespace-pre-wrap font-sans text-base leading-relaxed text-ink">{story.lyrics}</pre>
        ) : (
          <p className="mt-2 text-sm text-muted">
            Lirik belum tersedia untuk cerita ini — tidak ada lirik dari sumber nyata yang
            bisa ditampilkan, dan iTAP tidak mengarang lirik.
          </p>
        )}
      </section>

      <section aria-labelledby="sumber-title">
        <h2 id="sumber-title" className="text-base font-bold text-ink">Sumber bacaan</h2>
        {story.sources.length > 0 ? (
          <ul className="mt-2 flex flex-col gap-1 text-sm text-muted">
            {story.sources.map((s) => (
              <li key={s}>• {s}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-sm text-muted">Belum ada sumber bacaan yang tercatat untuk cerita ini.</p>
        )}
      </section>

      <Banner tone="info">
        Versi lengkap sebagai artikel kanal Budaya:{" "}
        <Link href={`/artikel/${story.slug}`} className="font-semibold text-accent-dark hover:underline focus-visible:outline-2 focus-visible:outline-accent">
          baca di kanal Budaya
        </Link>
        .
      </Banner>
    </div>
  );
}
