// Data terstruktur schema.org (JSON-LD) untuk SEO. Server component.
// `<` di-escape agar isi teks (judul artikel dsb.) tidak bisa menutup tag
// <script> lebih awal.
export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
