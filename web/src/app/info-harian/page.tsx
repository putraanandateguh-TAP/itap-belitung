// Hub Info Harian (S27 versi web, F14) — pintu masuk cuaca, salat,
// transport, BBM, gempa, darurat + konten harian iTAP yang sudah ada
// (harga pangan S32, kurs, lowongan). CCTV (S31) dan Statistik (S39)
// SENGAJA tidak ditampilkan: isinya tidak teramati di recon (A10).
import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CloudSun, Fuel, MoonStar, PhoneCall, Plane, ShoppingBasket, Siren, TrendingUp, BookOpen } from "lucide-react";

export const metadata: Metadata = {
  title: "Info Harian Belitung",
  description: "Cuaca BMKG, jadwal salat, jadwal pesawat & kapal, harga BBM, info gempa, dan nomor darurat Belitung — dari sumber publik resmi.",
};

const ITEMS = [
  { href: "/info-harian/cuaca", icon: CloudSun, title: "Cuaca", desc: "Prakiraan BMKG per jam — Tanjung Pandan, Belitung.", screen: "S28" },
  { href: "/info-harian/salat", icon: MoonStar, title: "Jadwal Salat", desc: "Jadwal salat Kab. Belitung + matahari terbit.", screen: "S29" },
  { href: "/info-harian/transport", icon: Plane, title: "Pesawat & Kapal", desc: "Jadwal penerbangan & kapal dari dan ke Belitung.", screen: "S30" },
  { href: "/info-harian/bbm", icon: Fuel, title: "Harga BBM", desc: "Harga BBM Pertamina yang berlaku.", screen: "S33" },
  { href: "/info-harian/gempa", icon: Siren, title: "Gempa", desc: "Gempa terbaru dari BMKG + kualitas udara.", screen: "S38" },
  { href: "/info-harian/darurat", icon: PhoneCall, title: "Nomor Darurat", desc: "Polisi, damkar, ambulans, SAR, PLN, rumah sakit.", screen: "S40" },
  { href: "/harga-pangan", icon: ShoppingBasket, title: "Harga & Stok Pangan", desc: "Harga pangan harian Pasar Tanjung Pandan.", screen: "S32" },
  { href: "/kurs", icon: TrendingUp, title: "Kurs, IHSG & Emas", desc: "Kurs BCA, IHSG, dan harga emas Antam.", screen: "iTAP" },
  { href: "/lowongan", icon: BookOpen, title: "Lowongan Kerja", desc: "Lowongan di Belitung & Bangka Belitung.", screen: "iTAP" },
];

export default function InfoHarianPage() {
  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">Info Harian Belitung</h1>
        <p className="mt-1 text-sm text-muted">
          Cuaca, salat, transportasi, harga, dan nomor darurat — diambil dari sumber publik resmi
          (BMKG, Kemenag) dan disimpan sebagai cache. Setiap halaman menampilkan kapan datanya
          diperbarui; bila datanya sudah lama, ada penanda &ldquo;data mungkin basi&rdquo;.
        </p>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ITEMS.map((it) => (
          <article key={it.href} className="rounded-lg border border-line bg-canvas p-4 shadow-card">
            <h2 className="flex items-center gap-2 text-base font-semibold text-ink">
              <it.icon className="size-5 text-accent" aria-hidden="true" /> {it.title}
            </h2>
            <p className="mt-2 text-sm text-muted">{it.desc}</p>
            <Link href={it.href} className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              Buka {it.title.toLowerCase()} <ArrowRight className="size-4" aria-hidden="true" />
            </Link>
          </article>
        ))}
      </div>

      <p className="text-xs text-muted">
        Sumber data: BMKG (cuaca, gempa), Kemenag via MyQuran (jadwal salat). Harga pangan dari
        ADAT Belitung/Diskominfo; kurs dari BCA. Halaman yang datanya belum tersedia menampilkan
        pesan jujur, bukan angka perkiraan.
      </p>
    </div>
  );
}
