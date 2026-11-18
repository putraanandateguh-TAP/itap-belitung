// S16/S17 — Ruang chat (F06): kartu barang di atas, bubble pesan di bawah.
// Live: subscribe Realtime Supabase (postgres_changes di tabel messages untuk
// thread ini) bila Supabase dikonfigurasi; bila tidak, polling 20 detik +
// banner jujur "mode seed". Kirim memakai idempotency_key agar retry tidak
// menggandakan pesan. Lapor/blokir via modal S26 di header.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Flag, Send } from "lucide-react";
import { useSession } from "@/lib/session-client";
import { Badge, Banner, Button, ButtonLink, EmptyState, StatusBadge } from "@/components/ui";
import { REPORT_REASONS, ReportBlockModal } from "@/components/report-modal";
import { SafeTradeGuide } from "@/components/seller-trust";
import { formatListingPrice, type ChatMessage, type ThreadSummary } from "@/lib/listings";
import { formatDateTimeWIB, formatDateWIB } from "@/lib/format";
import { useLanguage } from "@/components/language-provider";
import { createSupabaseBrowser } from "@/lib/supabase/client";

const SUPABASE_CONFIGURED = Boolean(
  (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "").trim()
    && (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "").trim(),
);

export default function ChatRoomPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { session, loading: sessionLoading } = useSession();
  const { lang, t } = useLanguage();
  const [threadId, setThreadId] = useState<string | null>(null);
  const [thread, setThread] = useState<ThreadSummary | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [realtime, setRealtime] = useState(false);
  // A4 (M8): modal lapor dibuka dengan alasan awal; null = tertutup.
  // "Laporkan penipuan" 1 ketuk = alasan "Penipuan atau mencurigakan".
  const [reportReason, setReportReason] = useState<(typeof REPORT_REASONS)[number] | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { params.then((p) => setThreadId(p.id)); }, [params]);

  const loadMessages = useCallback(async (id: string, silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [tRes, mRes] = await Promise.all([
        fetch(`/api/threads/${id}`, { cache: "no-store" }),
        fetch(`/api/threads/${id}/messages`, { cache: "no-store" }),
      ]);
      const tData = await tRes.json().catch(() => null);
      const mData = await mRes.json().catch(() => null);
      if (!tRes.ok) throw new Error(tData?.error ?? t("chat.loadThreadFailed", { status: tRes.status }));
      if (!mRes.ok) throw new Error(mData?.error ?? t("chat.loadMessagesFailed", { status: mRes.status }));
      setThread(tData as ThreadSummary);
      setMessages(Array.isArray(mData) ? mData : []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("chat.loadGeneric"));
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (threadId && session) loadMessages(threadId);
    else if (threadId && !sessionLoading) setLoading(false);
  }, [threadId, session, sessionLoading, loadMessages]);

  // Realtime bila tersedia; polling berkala sebagai fallback.
  useEffect(() => {
    if (!threadId || !session) return;
    let channel: ReturnType<ReturnType<typeof createSupabaseBrowser>["channel"]> | null = null;
    let timer: ReturnType<typeof setInterval> | null = null;
    if (SUPABASE_CONFIGURED) {
      try {
        const supabase = createSupabaseBrowser();
        channel = supabase
          .channel(`chat-thread-${threadId}`)
          .on(
            "postgres_changes",
            { event: "INSERT", schema: "public", table: "messages", filter: `thread_id=eq.${threadId}` },
            (payload) => {
              const m = payload.new as ChatMessage;
              setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
            },
          )
          .subscribe((status) => setRealtime(status === "SUBSCRIBED"));
      } catch {
        setRealtime(false);
      }
    }
    timer = setInterval(() => loadMessages(threadId, true), 20000);
    return () => {
      if (timer) clearInterval(timer);
      if (channel) {
        try { createSupabaseBrowser().removeChannel(channel); } catch { /* abaikan */ }
      }
    };
  }, [threadId, session, loadMessages]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" }); }, [messages]);

  async function send() {
    if (!threadId || !text.trim()) return;
    setSending(true);
    try {
      const res = await fetch(`/api/threads/${threadId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), idempotency_key: crypto.randomUUID() }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error ?? t("chat.sendFailed", { status: res.status }));
      setText("");
      setMessages((prev) => [...prev, data as ChatMessage]);
    } catch (e) {
      setNotice(e instanceof Error ? e.message : t("chat.sendGeneric"));
    } finally {
      setSending(false);
    }
  }

  if (sessionLoading || loading) {
    return <div aria-busy="true" className="py-8"><div className="skeleton h-96 w-full" /></div>;
  }
  if (!session) {
    return (
      <div className="py-8">
        <EmptyState title={t("chat.loginTitle")} desc={t("chat.loginDesc")} action={<ButtonLink href="/masuk">{t("common.signInSignUp")}</ButtonLink>} titleAs="h1" />
      </div>
    );
  }
  if (error || !thread) {
    return (
      <div className="py-8">
        <EmptyState
          title={t("chat.roomError")}
          desc={error ?? t("chat.roomNotFound")}
          action={<ButtonLink href="/chat">{t("chat.backToList")}</ButtonLink>}
          titleAs="h1"
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 py-8">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <ButtonLink href="/chat" variant="ghost" size="sm">{t("chat.allChats")}</ButtonLink>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => setReportReason("Penipuan atau mencurigakan")}>
            <Flag className="size-4" aria-hidden="true" /> {t("chat.reportFraud")}
          </Button>
          <Button variant="ghost" size="sm" onClick={() => setReportReason("Barang tidak sesuai deskripsi")}>
            <Flag className="size-4" aria-hidden="true" /> {t("chat.reportBlock")}
          </Button>
        </div>
      </div>

      {/* Kartu barang (konteks percakapan). */}
      <Link href={`/jual-beli/${thread.listing_id}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas p-4 focus-visible:outline-2 focus-visible:outline-accent">
        <span>
          <span className="block text-xs font-medium uppercase tracking-wider text-muted">{t("chat.discussing")}</span>
          <span className="block font-semibold text-ink">{thread.listing_title}</span>
          <span className="block text-sm text-muted">{formatListingPrice(thread.listing_price_cents)} · {thread.is_seller ? t("chat.youSeller") : t("chat.youBuyer")}</span>
        </span>
        <StatusBadge status={thread.listing_status} />
      </Link>

      {/* A4 (M8): kepercayaan lawan bicara + panduan transaksi aman.
          Status WhatsApp dari data profil asli; bila belum terverifikasi,
          tampil jujur — bukan badge. */}
      <div className="flex flex-wrap items-center gap-2 text-sm text-muted">
        <span>{thread.is_seller ? t("chat.buyer") : t("chat.seller")}:</span>
        {thread.other_user_whatsapp_verified ? (
          <Badge tone="active">{t("chat.waVerified")}</Badge>
        ) : (
          <Badge tone="example">{t("chat.waNotVerified")}</Badge>
        )}
        {thread.other_user_since && <span>· {t("chat.joinedSince")} {formatDateWIB(thread.other_user_since, lang)}</span>}
      </div>
      <SafeTradeGuide />

      {!realtime && (
        <Banner tone="info">
          {SUPABASE_CONFIGURED ? t("chat.realtimeOffPoll") : t("chat.realtimeOffSeed")}
        </Banner>
      )}
      {notice && <p role="status" className="text-sm text-danger">{notice}</p>}

      {messages.length === 0 ? (
        <div className="rounded-lg border border-line bg-canvas p-8 text-center">
          <p className="font-semibold text-ink">{t("chat.noMessages")}</p>
          <p className="mt-1 text-sm text-muted">{t("chat.noMessagesDesc")}</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-2" aria-label="Pesan dalam percakapan">
          {messages.map((m) => {
            const mine = m.sender_id === session.id;
            return (
              <li key={m.id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[80%] rounded-lg px-4 py-2 ${mine ? "bg-accent text-on-accent" : "border border-line bg-canvas text-ink"}`}>
                  <p className="whitespace-pre-wrap text-sm">{m.text}</p>
                  <p className={`mt-1 text-right text-xs ${mine ? "text-on-accent opacity-80" : "text-muted"}`}>
                    {formatDateTimeWIB(m.created_at, lang)}
                  </p>
                </div>
              </li>
            );
          })}
          <div ref={bottomRef} />
        </ul>
      )}

      <form
        className="sticky bottom-0 flex gap-2 rounded-lg border border-line bg-canvas p-3"
        onSubmit={(e) => { e.preventDefault(); send(); }}
      >
        <label htmlFor="chat-input" className="sr-only">{t("chat.writeMessage")}</label>
        <input
          id="chat-input"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={4000}
          placeholder={t("chat.messagePlaceholder")}
          autoComplete="off"
          className="h-10 min-w-0 flex-1 rounded-md border border-line-input bg-canvas px-3 text-base text-ink placeholder:text-muted focus:border-accent focus:outline-2 focus:outline-accent"
        />
        <Button type="submit" loading={sending} disabled={!text.trim()}>
          <Send className="size-4" aria-hidden="true" /> {t("chat.send")}
        </Button>
      </form>
      <p className="text-xs text-muted">
        {t("chat.numberHidden")}
      </p>

      {reportReason !== null && (
        <ReportBlockModal
          targetType="listing"
          targetId={thread.listing_id}
          targetLabel={thread.listing_title}
          blockedUserId={thread.other_user_id}
          blockedUserLabel={thread.is_seller ? t("chat.buyer") : t("chat.seller")}
          initialReason={reportReason}
          onClose={() => setReportReason(null)}
          onDone={(msg) => setNotice(msg)}
        />
      )}
    </div>
  );
}
