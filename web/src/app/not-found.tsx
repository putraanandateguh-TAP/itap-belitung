import Link from "next/link";
import { ButtonLink } from "@/components/ui";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-xl font-bold text-ink">Halaman tidak ditemukan (404)</h1>
      <p className="max-w-md text-sm text-muted">
        Alamat yang kamu buka tidak ada di portal ini. Mungkin tautannya sudah berubah, atau artikelnya belum diterbitkan.
      </p>
      <ButtonLink href="/">Kembali ke beranda</ButtonLink>
      <Link href="/cari" className="text-sm font-semibold text-accent hover:underline">
        Cari konten lain
      </Link>
    </div>
  );
}
