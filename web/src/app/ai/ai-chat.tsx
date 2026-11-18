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

const UNAVAILABLE_TEXT =
  "AI iTAP belum tersedia — butuh kunci Gemini (Fase 3, P3). " +
  "Sampai kunci itu ada, halaman ini tidak bisa menjawab pertanyaan apa pun.";

function newId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function AiChat() {
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
          { id: newId(), role: "system", text: UNAVAILABLE_TEXT, unavailable: true },
        ]);
      } else {
        const err = (data as { error?: string }).error ?? "Gagal bertanya ke AI iTAP.";
        setMessages((m) => [...m, { id: newId(), role: "system", text: err }]);
      }
    } catch {
      setMessages((m) => [
        ...m,
        { id: newId(), role: "system", text: "Gagal terhubung ke server. Periksa koneksi lalu coba lagi." },
      ]);
    } finally {
      setBusy(false);
    }
  };

  const sendFeedback = async (msg: AiMessage, vote: "up" | "down", reason?: string) => {
    if (!msg.conversationId) {
      setFeedbackNote("Umpan balik belum bisa disimpan — jawaban ini belum punya id percakapan dari server.");
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
        setFeedbackNote("Umpan balik belum bisa disimpan — AI iTAP belum tersedia (butuh kunci Gemini, P3).");
      } else {
        setFeedbackNote("Umpan balik gagal dikirim. Coba lagi nanti.");
      }
    } catch {
      setFeedbackNote("Umpan balik gagal dikirim. Periksa koneksi lalu coba lagi.");
    }
  };

  const saveItinerary = async (msg: AiMessage) => {
    if (!msg.itineraryDays) return;
    try {
      const res = await fetch("/api/ai/itineraries", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: "Rencana perjalanan dari AI iTAP", days: msg.itineraryDays }),
      });
      if (res.ok) {
        const data: unknown = await res.json();
        setItineraries((list) => [data as AiItinerary, ...list]);
        setSaveNote("Rencana perjalanan tersimpan.");
      } else if (res.status === 501) {
        setSaveNote("Rencana belum bisa disimpan — AI iTAP belum tersedia (butuh kunci Gemini, P3).");
      } else {
        setSaveNote("Rencana gagal disimpan. Coba lagi nanti.");
      }
    } catch {
      setSaveNote("Rencana gagal disimpan. Periksa koneksi lalu coba lagi.");
    }
  };

  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">AI iTAP</h1>
        <p className="mt-1 text-sm text-muted">
          Tanya apa saja tentang Belitung — pantai, kuliner, sejarah, jadwal, dan rencana perjalanan.
          Jawaban hanya dari konten iTAP yang dikurasi dan info harian, disertai sumber.
        </p>
      </header>

      <Banner tone="warning">
        <strong>Jawaban AI bisa keliru, periksa kembali informasi penting.</strong>
        {" "}Jadwal, harga, dan cuaca bisa berubah — cek sumber aslinya sebelum berangkat.
        Bila AI tidak tahu, ia akan menjawab tidak tahu daripada mengarang.
      </Banner>

      <section aria-labelledby="chat-title" className="flex flex-col gap-4">
        <h2 id="chat-title" className="text-lg font-semibold text-ink">Percakapan</h2>

        {messages.length === 0 ? (
          <EmptyState
            title="Tanya apa saja tentang Belitung"
            desc="Contoh: pantai yang cocok untuk keluarga, atau rencana perjalanan 2 hari dari Tanjung Pandan."
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
                    <p className="text-xs font-semibold text-muted">Sumber:</p>
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
                      <BookmarkPlus className="size-4" aria-hidden="true" /> Simpan rencana perjalanan ini
                    </Button>
                  </div>
                )}

                {m.role === "assistant" && (
                  <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-line pt-2">
                    <span className="text-xs text-muted">Apakah jawaban ini membantu?</span>
                    <button
                      type="button"
                      onClick={() => void sendFeedback(m, "up")}
                      disabled={voted[m.id] === "up"}
                      aria-label="Jawaban membantu"
                      aria-pressed={voted[m.id] === "up"}
                      className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${voted[m.id] === "up" ? "border-accent bg-surface text-accent" : "border-line bg-canvas text-ink hover:bg-surface"}`}
                    >
                      <ThumbsUp className="size-4" aria-hidden="true" /> Ya
                    </button>
                    <button
                      type="button"
                      onClick={() => void sendFeedback(m, "down")}
                      disabled={voted[m.id] === "down"}
                      aria-label="Jawaban tidak membantu"
                      aria-pressed={voted[m.id] === "down"}
                      className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50 ${voted[m.id] === "down" ? "border-accent bg-surface text-accent" : "border-line bg-canvas text-ink hover:bg-surface"}`}
                    >
                      <ThumbsDown className="size-4" aria-hidden="true" /> Tidak
                    </button>
                    <button
                      type="button"
                      onClick={() => setReportFor(reportFor === m.id ? null : m.id)}
                      aria-expanded={reportFor === m.id}
                      className="inline-flex h-8 items-center gap-1 rounded-md px-2 text-sm font-semibold text-danger hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
                    >
                      <Flag className="size-4" aria-hidden="true" /> Laporkan jawaban salah
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
                      Apa yang salah dari jawaban ini?
                    </label>
                    <TextArea
                      id={`alasan-${m.id}`}
                      value={reportReason}
                      onChange={(e) => setReportReason(e.target.value)}
                      placeholder="Contoh: harga sudah berubah, nama tempat salah…"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" type="submit">Kirim laporan</Button>
                      <Button size="sm" variant="secondary" onClick={() => { setReportFor(null); setReportReason(""); }}>
                        Batal
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
            Pertanyaanmu
          </label>
          <TextArea
            id="ai-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Tulis pertanyaan tentang Belitung…"
            rows={3}
            disabled={busy}
          />
          <div className="flex flex-wrap items-center gap-2">
            <Button type="submit" loading={busy} disabled={!input.trim()}>
              <Send className="size-4" aria-hidden="true" /> {busy ? "Menunggu jawaban…" : "Tanya AI iTAP"}
            </Button>
            <button
              type="button"
              disabled
              title="Input suara belum tersedia di versi web ini — tulis pertanyaanmu."
              aria-label="Input suara (belum tersedia)"
              className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-canvas px-3 text-sm font-semibold text-muted opacity-60"
            >
              <Mic className="size-4" aria-hidden="true" /> Suara (belum tersedia)
            </button>
          </div>
          <p className="text-xs text-muted">
            Input suara belum tersedia di versi web ini. Pertanyaan tersimpan sementara ±10 menit.
          </p>
        </form>
      </section>

      <section aria-labelledby="rencana-title" className="flex flex-col gap-3">
        <h2 id="rencana-title" className="text-lg font-semibold text-ink">Rencana perjalanan tersimpan</h2>
        {itinLoading ? (
          <div aria-busy="true"><div className="skeleton h-24 w-full" /></div>
        ) : itinUnavailable ? (
          <EmptyState
            title="Belum ada rencana tersimpan."
            desc="Rencana perjalanan per hari dibuat dari jawaban AI iTAP — dan AI iTAP belum tersedia sampai kunci Gemini (Fase 3, P3) ada."
          />
        ) : itineraries.length === 0 ? (
          <EmptyState
            title="Belum ada rencana tersimpan."
            desc="Rencana dibuat dari jawaban AI: tanya rencana perjalanan, lalu simpan per hari dari jawaban itu."
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {itineraries.map((it) => (
              <li key={it.id} className="rounded-lg border border-line bg-canvas p-4 shadow-card">
                <Link href={`/ai/rencana/${it.id}`} className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                  {it.title}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  {it.days.length} hari · dibuat {new Date(it.created_at).toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
