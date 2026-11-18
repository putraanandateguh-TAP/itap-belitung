// AI iTAP (S41, F12) — chat berbasis konten iTAP terkurasi + info harian.
// API menjawab 501 sampai P3 (kunci Gemini): halaman menampilkan pesan
// jujur "belum tersedia" dan TIDAK mengarang jawaban. Semua kontrol yang
// butuh jawaban nyata (sumber, feedback, laporkan jawaban salah, simpan
// rencana) sudah ditulis dan hanya muncul saat jawaban nyata tiba.
"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { BookmarkPlus, Flag, Mic, Send, ThumbsDown, ThumbsUp } from "lucide-react";
import { Banner, Button, EmptyState, TextArea } from "@/components/ui";
import type { AiItinerary, AiMessage } from "@/lib/ai";
import { useLanguage } from "@/components/language-provider";

// UNAVAILABLE_TEXT now comes from the i18n dictionary (ai.unavailable).

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AiChat() {
  const { t, lang } = useLanguage();
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [itineraries, setItineraries] = useState<AiItinerary[]>([]);
  const [itinLoading, setItinLoading] = useState(true);
  const [itinUnavailable, setItinUnavailable] = useState(false);
  const [voted, setVoted] = useState<Record<string, "up" | "down">>({});
  const [feedbackNote, setFeedbackNote] = useState<string | null>(null);
  const [reportFor, setReportFor] = useState<string | null>(null);
  const [reportReason, setReportReason] = useState("");
  const [saveNote, setSaveNote] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/ai/itineraries")
      .then(async (r) => {
        if (!r.ok) {
          if (r.status === 501) setItinUnavailable(true);
          return;
        }
        const data: unknown = await r.json();
        if (Array.isArray(data)) setItineraries(data as AiItinerary[]);
      })
      .catch(() => setItinUnavailable(true))
      .finally(() => setItinLoading(false));
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [messages]);

  const ask = async () => {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    setFeedbackNote(null);
    setMessages((m) => [...m, { id: newId(), role: "user", text }]);
    setBusy(true);
    try {
      const res = await fetch("/api/ai/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (res.ok) {
        const d = data as {
          answer?: string;
          sources?: { title: string; href: string }[];
          itinerary?: { days: { day: number; title: string; items: string[] }[] };
          conversation_id?: string;
        };
        setMessages((m) => [
          ...m,
          {
            id: newId(),
            role: "assistant",
            text: d.answer ?? "",
            sources: d.sources,
            itineraryDays: d.itinerary?.days,
            conversationId: d.conversation_id,
          },
        ]);
      } else if (res.status === 501) {
        setMessages((m) => [
          ...m,
          { id: newId(), role: "system", text: t("ai.unavailable"), unavailable: true },
        ]);
      } else {
        const err = (data as { error?: string }).error ?? t("ai.askFailed");
        setMessages((m) => [...m, { id: newId(), role: "system", text: err }]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { id: newId(), role: "system", text: t("ai.connectFailed") },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const sendFeedback = async (msg: AiMessage, vote: "up" | "down", reason?: string) => {
    if (!msg.conversationId) {
      setFeedbackNote(t("ai.feedbackNoConv"));
      return;
    }
    try {
      const res = await fetch("/api/ai/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversation_id: msg.conversationId, vote, reason }),
      });
      if (res.ok) {
        setVoted((v) => ({ ...v, [msg.id]: vote }));
        setFeedbackNote(null);
        setReportFor(null);
        setReportReason("");
      } else if (res.status === 501) {
        setFeedbackNote(t("ai.feedbackUnavailable"));
      } else {
        setFeedbackNote(t("ai.feedbackFailed"));
      }
    } catch {
      setFeedbackNote(t("ai.feedbackFailedConn"));
    }
  };

  const saveItinerary = async (msg: AiMessage) => {
    if (!msg.itineraryDays) return;
    try {
      const res = await fetch("/api/ai/itineraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: t("ai.itinTitle"), days: msg.itineraryDays }),
      });
      if (res.ok) {
        const data: unknown = await res.json();
        setItineraries((list) => [data as AiItinerary, ...list]);
        setSaveNote(t("ai.itinSaved"));
      } else if (res.status === 501) {
        setSaveNote(t("ai.itinSaveUnavailable"));
      } else {
        setSaveNote(t("ai.itinSaveFailed"));
      }
    } catch {
      setSaveNote(t("ai.itinSaveFailedConn"));
    }
  };

  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t("ai.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("ai.subtitle")}
        </p>
      </header>

      <Banner tone="warning">
        <strong>{t("ai.warning")}</strong>
        {" "}{t("ai.warning2")}
      </Banner>

      <section aria-labelledby="chat-title" className="flex flex-col gap-4">
        <h2 id="chat-title" className="text-lg font-semibold text-ink">{t("ai.conversation")}</h2>

        {messages.length === 0 ? (
          <EmptyState
            title={t("ai.emptyTitle")}
            desc={t("ai.emptyDesc")}
          />
        ) : (
          <ol className="flex flex-col gap-3" aria-live="polite">
            {messages.map((m) => (
              <li
                key={m.id}
                className={`max-w-[85%] rounded-lg border px-4 py-3 ${
                  m.role === "user"
                    ? "self-end border-line bg-surface text-ink"
                    : m.role === "system"
                      ? "self-start border-line bg-surface-alt text-muted"
                      : "self-start border-line bg-canvas text-ink"
                }`}
              >
                <p className="whitespace-pre-wrap text-sm">{m.text}</p>

                {m.role === "assistant" && m.sources && m.sources.length > 0 && (
                  <div className="mt-3 border-t border-line pt-2">
                    <p className="text-xs font-semibold text-muted">{t("ai.sources")}:</p>
                    <ul className="mt-1 flex flex-col gap-1">
                      {m.sources.map((s) => (
                        <li key={s.href}>
                          <Link href={s.href} className="text-sm font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                            {s.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {m.role === "assistant" && m.itineraryDays && (
                  <div className="mt-3">
                    <Button variant="secondary" size="sm" onClick={() => void saveItinerary(m)}>
                      <BookmarkPlus className="size-4" aria-hidden="true" /> {t("ai.saveItinerary")}
                    </Button>
                  </div>
                )}

                {m.role === "assistant" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-2">
                    <span className="text-xs text-muted">{t("ai.helpfulQ")}</span>
                    <button
                      type="button"
                      onClick={() => void sendFeedback(m, "up")}
                      disabled={voted[m.id] === "up"}
                      aria-label={t("ai.helpfulYes")}
                      aria-pressed={voted[m.id] === "up"}
                      className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${voted[m.id] === "up" ? "border-accent bg-surface text-accent" : "border-line bg-canvas text-ink hover:bg-surface"}`}
                    >
                      <ThumbsUp className="size-4" aria-hidden="true" /> {t("common.yes")}
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendFeedback(m, "down")}
                      disabled={voted[m.id] === "down"}
                      aria-label={t("ai.helpfulNo")}
                      aria-pressed={voted[m.id] === "down"}
                      className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${voted[m.id] === "down" ? "border-accent bg-surface text-accent" : "border-line bg-canvas text-ink hover:bg-surface"}`}
                    >
                      <ThumbsDown className="size-4" aria-hidden="true" /> {t("common.no")}
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportFor(reportFor === m.id ? null : m.id)}
                      aria-expanded={reportFor === m.id}
                      className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-semibold text-danger hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <Flag className="size-4" aria-hidden="true" /> {t("ai.reportWrong")}
                    </button>
                  </div>
                )}

                {m.role === "assistant" && reportFor === m.id && (
                  <form
                    className="mt-3 flex flex-col gap-2 border-t border-line pt-3"
                    onSubmit={(e) => {
                      e.preventDefault();
                      void sendFeedback(m, "down", reportReason.trim() || undefined);
                    }}
                  >
                    <label htmlFor={`alasan-${m.id}`} className="text-sm font-semibold text-ink">
                      {t("ai.whatWrong")}
                    </label>
                    <TextArea
                      id={`alasan-${m.id}`}
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder={t("ai.reportPlaceholder")}
                    />
                    <div className="flex gap-2">
                      <Button size="sm" type="submit">{t("ai.sendReport")}</Button>
                      <Button size="sm" variant="secondary" onClick={() => { setReportFor(null); setReportReason(""); }}>
                        {t("common.cancel")}
                      </Button>
                    </div>
                  </form>
                )}
              </li>
            ))}
          </ol>
        )}
        <div ref={endRef} />

        {feedbackNote && (
          <Banner tone="info">{feedbackNote}</Banner>
        )}
        {saveNote && (
          <Banner tone="info">{saveNote}</Banner>
        )}

        <form
          className="flex flex-col gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            void ask();
          }}
        >
          <label htmlFor="ai-input" className="text-sm font-semibold text-ink">
            {t("ai.questionLabel")}
          </label>
          <TextArea
            id="ai-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={t("ai.questionPh")}
            rows={3}
            disabled={busy}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" loading={busy} disabled={!input.trim()}>
              <Send className="size-4" aria-hidden="true" /> {busy ? t("ai.waiting") : t("ai.ask")}
            </Button>
            <button
              type="button"
              disabled
              title={t("ai.voiceNote")}
              aria-label={t("ai.voiceUnavailable")}
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-canvas px-3 text-sm font-semibold text-muted opacity-60"
            >
              <Mic className="size-4" aria-hidden="true" /> {t("ai.voiceUnavailable")}
            </button>
          </div>
          <p className="text-xs text-muted">
            {t("ai.voiceNote")}
          </p>
        </form>
      </section>

      <section aria-labelledby="rencana-title" className="flex flex-col gap-3">
        <h2 id="rencana-title" className="text-lg font-semibold text-ink">{t("ai.savedItineraries")}</h2>
        {itinLoading ? (
          <div aria-busy="true"><div className="skeleton h-24 w-full" /></div>
        ) : itinUnavailable ? (
          <EmptyState
            title={t("ai.noItineraries")}
            desc={t("ai.noItinerariesDesc")}
          />
        ) : itineraries.length === 0 ? (
          <EmptyState
            title={t("ai.noItineraries")}
            desc={t("ai.noItinerariesDesc2")}
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {itineraries.map((it) => (
              <li key={it.id} className="rounded-lg border border-line bg-canvas p-4 shadow-card">
                <Link href={`/ai/rencana/${it.id}`} className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                  {it.title}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  {t("ai.days", { count: it.days.length })} · {t("ai.created")} {new Date(it.created_at).toLocaleDateString(lang === "en" ? "en-GB" : "id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
