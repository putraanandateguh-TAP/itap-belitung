// Banner ilustrasi bagian (23 Nov 2026): gambar ilustrasi iTAP di kepala
// halaman yang belum punya foto (lowongan, info harian). Bukan foto asli.
import Image from "next/image";
import type { Illustration } from "@/lib/illustrations";

export function SectionIllustration({ ill, priority = true }: { ill: Illustration; priority?: boolean }) {
  return (
    <div className="relative aspect-[16/7] overflow-hidden rounded-3xl bg-surface-alt shadow-card sm:aspect-[16/5]">
      <Image src={ill.src} alt={ill.alt} fill priority={priority} sizes="(max-width: 1024px) 100vw, 1024px" className="object-cover" data-illustration="true" />
    </div>
  );
}
