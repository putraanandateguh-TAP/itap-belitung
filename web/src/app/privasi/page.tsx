import type { Metadata } from "next";
import { getServerLang } from "@/lib/i18n-server";
import { t } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Privasi & Data Akun",
  description: "Kebijakan privasi iTAP Belitung: data apa yang kami simpan, untuk apa, dan hakmu atas datamu.",
};

function sections(lang: "id" | "en") {
  return [
    { h: t(lang, "legal.privacyS1H"), body: [t(lang, "legal.privacyS1B1"), t(lang, "legal.privacyS1B2"), t(lang, "legal.privacyS1B3"), t(lang, "legal.privacyS1B4"), t(lang, "legal.privacyS1B5")] },
    { h: t(lang, "legal.privacyS2H"), body: [t(lang, "legal.privacyS2B1"), t(lang, "legal.privacyS2B2"), t(lang, "legal.privacyS2B3")] },
    { h: t(lang, "legal.privacyS3H"), body: [t(lang, "legal.privacyS3B1"), t(lang, "legal.privacyS3B2")] },
    { h: t(lang, "legal.privacyS4H"), body: [t(lang, "legal.privacyS4B1"), t(lang, "legal.privacyS4B2")] },
    { h: t(lang, "legal.privacyS5H"), body: [t(lang, "legal.privacyS5B1"), t(lang, "legal.privacyS5B2")] },
    { h: t(lang, "legal.privacyS6H"), body: [t(lang, "legal.privacyS6B1"), t(lang, "legal.privacyS6B2"), t(lang, "legal.privacyS6B3"), t(lang, "legal.privacyS6B4"), t(lang, "legal.privacyS6B5"), t(lang, "legal.privacyS6B6"), t(lang, "legal.privacyS6B7")] },
  ];
}

export default async function PrivasiPage() {
  const lang = await getServerLang();
  const SECTIONS = sections(lang);
  return (
    <div className="mx-auto max-w-3xl py-8">
      <h1 className="text-xl font-bold text-ink">{t(lang, "legal.privacyTitle")}</h1>
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
