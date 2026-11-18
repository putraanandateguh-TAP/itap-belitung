// Halaman konten iTAP: Kedai Bakso Aci — #30 Kartu Menu Kedai.
// Info kedai + tautan GrabFood/GoFood ASLI dari index.html situs lama.
// HARGA MENU tidak ada di repo lama -> item menu bertanda "Contoh" (isExample)
// dan tidak menampilkan harga palsu.
import type { Metadata } from "next";
import Image from "next/image";
import { Clock, MapPin } from "lucide-react";
import { getKedai } from "@/lib/data";
import { formatRupiah } from "@/lib/format";
import { Badge, Banner } from "@/components/ui";

export const metadata: Metadata = {
  title: "Kedai Bakso Aci iTAP",
  description: "Kedai Bakso Aci iTAP di Puri Kirana 3, Tanjung Pandan — buka setiap hari 11.00–22.00 WIB. Pesan via GrabFood atau GoFood.",
};

export default async function KedaiPage() {
  const kedai = await getKedai();

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
          <p className="text-xs font-medium uppercase tracking-widest text-accent">Dari dapur iTAP</p>
          <h1 className="mt-2 text-xl font-bold text-ink">{kedai.name}</h1>
          <p className="mt-2 flex items-start gap-2 text-sm text-muted">
            <MapPin className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {kedai.address}
          </p>
          <p className="mt-1 flex items-center gap-2 text-sm text-muted">
            <Clock className="size-4" aria-hidden="true" /> {kedai.hours}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a href={kedai.maps_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-md bg-surface-dark px-4 text-sm font-semibold text-ink-on-dark hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent">
              Rute ke kedai
            </a>
            <a href={kedai.grabfood_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-md bg-success px-4 text-sm font-semibold text-on-accent hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent">
              Pesan di GrabFood
            </a>
            <a href={kedai.gofood_url} target="_blank" rel="noopener noreferrer" className="inline-flex h-10 items-center rounded-md bg-danger px-4 text-sm font-semibold text-on-accent hover:opacity-90 focus-visible:outline-2 focus-visible:outline-accent">
              Pesan di GoFood
            </a>
          </div>
        </div>
      </header>

      <Banner tone="warning">
        Daftar menu di bawah ini masih contoh — harga dan deskripsi menu asli belum ada di repo situs lama. Isi dengan data Kedai sebelum halaman ini dipromosikan.
      </Banner>

      <section aria-labelledby="menu-title">
        <h2 id="menu-title" className="text-lg font-semibold text-ink">Menu Kedai</h2>
        <ul className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {kedai.menu.map((m) => (
            <li key={m.id} className="flex flex-col gap-2 rounded-lg border border-line bg-canvas p-4 shadow-card">
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-ink">{m.name}</h3>
                {m.isExample && <Badge tone="example">Contoh</Badge>}
                {!m.available && <Badge tone="sold">Habis</Badge>}
              </div>
              <p className="flex-1 text-sm text-muted">{m.desc}</p>
              <p className="text-sm text-muted">Kategori: {m.category}</p>
              {m.price ? (
                <p className="text-lg font-bold text-ink">{formatRupiah(m.price)}</p>
              ) : (
                <p className="text-sm font-semibold text-muted">Harga menyusul — cek GrabFood/GoFood</p>
              )}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
