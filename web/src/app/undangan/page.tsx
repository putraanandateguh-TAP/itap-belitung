// /undangan — pengganti halaman Undangan Digital dari situs statis lama
// (audit 23 Nov 2026). Tautan lama /undangan, /u/... dulu 404 setelah
// pindah ke portal Next.js. Situs lama TIDAK dihidupkan lagi; halaman ini
// menjelaskan statusnya dengan jujur dan memberi jalan keluar.
import type { Metadata } from "next";
import { ButtonLink, EmptyState } from "@/components/ui";
import { WA_NUMBER } from "@/lib/seed-data";

export const metadata: Metadata = {
  title: "Undangan Digital",
  description: "Layanan Undangan Digital iTAP sedang diperbarui. Hubungi iTAP lewat WhatsApp untuk pemesanan.",
  robots: { index: false, follow: true },
};

export default function UndanganPage() {
  const wa = `https://wa.me/${WA_NUMBER}?text=${encodeURIComponent("Halo iTAP, saya mau tanya soal undangan digital.")}`;
  return (
    <div className="py-10">
      <EmptyState
        titleAs="h1"
        title="Undangan Digital iTAP sedang diperbarui"
        desc="Halaman dan tautan undangan versi lama sudah tidak aktif. Kalau kamu tamu yang membuka tautan undangan, silakan minta tautan terbaru ke pengirimnya. Mau pesan undangan digital? Hubungi iTAP lewat WhatsApp."
        action={
          <div className="flex flex-wrap justify-center gap-3">
            <ButtonLink href={wa}>Tanya lewat WhatsApp</ButtonLink>
            <ButtonLink href="/" variant="secondary">Ke beranda</ButtonLink>
          </div>
        }
      />
    </div>
  );
}
