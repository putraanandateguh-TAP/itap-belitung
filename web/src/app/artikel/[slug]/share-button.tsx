// #33 Bagikan artikel — Web Share API bila tersedia, salin tautan bila tidak.
"use client";

import { useState } from "react";
import { Link2, Share2 } from "lucide-react";
import { Button } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

export function ShareButton({ title }: { title: string }) {
  const [copied, setCopied] = useState(false);
  const { t } = useLanguage();
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Pengguna membatalkan share sheet — bukan error.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 3000);
    } catch {
      setCopied(false);
    }
  }
  return (
    <Button variant="secondary" size="sm" onClick={share}>
      {copied ? <Link2 className="size-4" aria-hidden="true" /> : <Share2 className="size-4" aria-hidden="true" />}
      {copied ? t("share.copied") : t("share.shareArticle")}
    </Button>
  );
}
