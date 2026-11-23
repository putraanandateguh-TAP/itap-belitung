import type { Metadata } from "next";

// /masuk adalah client component — judul & canonical diletakkan di layout.
export const metadata: Metadata = {
  title: "Masuk / Daftar",
  description: "Masuk atau daftar akun iTAP Belitung untuk menulis, berkomentar, dan memasang penawaran jual beli.",
  alternates: { canonical: "/masuk" },
};

export default function MasukLayout({ children }: { children: React.ReactNode }) {
  return children;
}
