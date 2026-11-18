// Aksi detail listing (client island): simpan/suka, mulai chat, laporkan.
// S26 dipakai di sini dan di ruang chat.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Bookmark, Flag, Heart, MessageCircle } from "lucide-react";
import { Button, ButtonLink } from "@/components/ui";
import { REPORT_REASONS, ReportBlockModal } from "@/components/report-modal";
import { useLanguage } from "@/components/language-provider";

export function ListingActions({
  listingId,
  sellerId,
  isOwner,
  loggedIn,
}: {
  listingId: string;
  sellerId?: string;
  isOwner: boolean;
  loggedIn: boolean;
}) {
  const router = useRouter();
  const { t } = useLanguage();
  const [saved, setSaved] = useState(false);
  const [liked, setLiked] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  // A4 (M8): modal lapor dibuka dengan alasan awal; null = tertutup.
  // "Laporkan penipuan" 1 ketuk = alasan "Penipuan atau mencurigakan".
  const [reportReason, setReportReason] = useState<(typeof REPORT_REASONS)[number] | null>(null);

  async function toggleBookmark(type: "save" | "like") {
    const on = type === "save" ? saved : liked;
    setBusy(type);
    setNotice(null);
    try {
      const res = await fetch(`/api/listings/${listingId}/bookmark`, {
        method: on ? "DELETE" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw new Error(data?.error ?? t("actions.failedHttp", { status: res.status }));
      }
      if (type === "save") setSaved(!on); else setLiked(!on);
      setNotice(on ? t("actions.cancelled") : type === "save" ? t("actions.offerSaved") : t("actions.offerLiked"));
    } catch (e) {
      setNotice(e instanceof Error ? e.message : t("actions.saveFailed"));
    } finally {
      setBusy(null);
    }
  }

  async function startChat() {
    setBusy("chat");
    setNotice(null);
    try {
      const res = await fetch("/api/threads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ listing_id: listingId }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("actions.chatFailedHttp", { status: res.status }));
      router.push(`/chat/${data.id}`);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : t("actions.chatFailed"));
    } finally {
      setBusy(null);
    }
  }

  if (!loggedIn) {
    return (
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/masuk">{t("actions.loginToInteract")}</ButtonLink>
      </div>
    );
  }
  if (isOwner) {
    return (
      <div className="flex flex-wrap gap-2">
        <ButtonLink href="/akun/penawaranku">{t("actions.manageMine")}</ButtonLink>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <Button variant="secondary" loading={busy === "save"} onClick={() => toggleBookmark("save")} aria-pressed={saved}>
          <Bookmark className="size-4" aria-hidden="true" /> {saved ? t("actions.saved") : t("actions.save")}
        </Button>
        <Button variant="secondary" loading={busy === "like"} onClick={() => toggleBookmark("like")} aria-pressed={liked}>
          <Heart className="size-4" aria-hidden="true" /> {liked ? t("actions.liked") : t("actions.like")}
        </Button>
        <Button loading={busy === "chat"} onClick={startChat}>
          <MessageCircle className="size-4" aria-hidden="true" /> {t("actions.chatSeller")}
        </Button>
        <Button variant="ghost" onClick={() => setReportReason("Barang tidak sesuai deskripsi")}>
          <Flag className="size-4" aria-hidden="true" /> {t("actions.report")}
        </Button>
        <Button variant="ghost" onClick={() => setReportReason("Penipuan atau mencurigakan")}>
          <Flag className="size-4" aria-hidden="true" /> {t("actions.reportFraud")}
        </Button>
      </div>
      {notice && <p role="status" className="text-sm text-muted">{notice}</p>}
      {reportReason !== null && (
        <ReportBlockModal
          targetType="listing"
          targetId={listingId}
          targetLabel={t("actions.reportThis")}
          blockedUserId={sellerId}
          blockedUserLabel={t("actions.reportSeller")}
          initialReason={reportReason}
          onClose={() => setReportReason(null)}
          onDone={(msg) => setNotice(msg)}
        />
      )}
    </div>
  );
}
