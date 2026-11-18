import type { Metadata } from "next";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Ketentuan Penggunaan",
  description: "Ketentuan penggunaan portal iTAP Belitung: akun, jual beli, kontribusi, dan poin.",
};

function sections(lang: "id" | "en") {
  return [
    { h: t(lang, "legal.termsS1H"), body: [t(lang, "legal.termsS1B1"), t(lang, "legal.termsS1B2"), t(lang, "legal.termsS1B3")] },
    { h: t(lang, "legal.termsS2H"), body: [t(lang, "legal.termsS2B1"), t(lang, "legal.termsS2B2"), t(lang, "legal.termsS2B3"), t(lang, "legal.termsS2B4"), t(lang, "legal.termsS2B5")] },
    { h: t(lang, "legal.termsS3H"), body: [t(lang, "legal.termsS3B1"), t(lang, "legal.termsS3B2"), t(lang, "legal.termsS3B3")] },
    { h: t(lang, "legal.termsS4H"), body: [t(lang, "legal.termsS4B1"), t(lang, "legal.termsS4B2"), t(lang, "legal.termsS4B3")] },
    { h: t(lang, "legal.termsS5H"), body: [t(lang, "legal.termsS5B1"), t(lang, "legal.termsS5B2")] },
  ];
}

export default async function KetentuanPage() {
  const lang = await getServerLang();
  const SECTIONS = sections(lang);
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-xl font-bold text-ink">{t(lang, "legal.termsTitle")}</h1>
      <p className="mt-1 text-sm text-muted">{t(lang, "legal.updated")}</p>
      {SECTIONS.map((s) => (
        <section key={s.h} aria-labelledby={s.h} className="mt-6">
          <h2 id={s.h} className="text-lg font-semibold text-ink">{s.h}</h2>
          <ul className="mt-2 flex list-disc flex-col gap-2 pl-5 text-base leading-7 text-ink">
            {s.body.map((b) => <li key={b}>{b}</li>)}
          </ul>
        </section>
      ))}
    </div>
  );
}
