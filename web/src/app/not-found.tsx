"use client";

import Link from "next/link";
import { ButtonLink } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

export default function NotFound() {
  const { t } = useLanguage();
  return (
    <div className="flex flex-col items-center gap-3 py-24 text-center">
      <h1 className="text-xl font-bold text-ink">{t("notFound.title")}</h1>
      <p className="max-w-md text-sm text-muted">
        {t("notFound.desc")}
      </p>
      <ButtonLink href="/">{t("notFound.backHome")}</ButtonLink>
      <Link href="/cari" className="text-sm font-semibold text-accent hover:underline">
        {t("notFound.searchOther")}
      </Link>
    </div>
  );
}
