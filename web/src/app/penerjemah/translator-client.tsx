// Penerjemah (S37, F13) — klien interaktif.
// Kamus lokal server HANYA berisi padanan istilah kategori ID–EN dari
// konten iTAP; teks lain dijawab 501 jujur sampai Gemini (P3) ada.
// Riwayat + favorit tersimpan di perangkat ini (localStorage, maks 20).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Camera,
  Copy,
  Expand,
  Mic,
  Star,
  Trash2,
  X,
} from "lucide-react";
import { Badge, Banner, Button, EmptyState, Field, TextArea } from "@/components/ui";
import {
  TRANSLATOR_LANGUAGES,
  TRANSLATION_HISTORY_MAX,
  addTranslationHistory,
  clearTranslationHistory,
  languageLabel,
  loadTranslationHistory,
  toggleTranslationFavorite,
  type TranslationEntry,
} from "@/lib/ai";
import { channelLabel } from "@/lib/labels";

import type { Channel } from "@/lib/types";

export interface TranslationQueueItem {
  slug: string;
  title_id: string;
  channel: Channel;
}

function LanguageChips({
  label,
  value,
  onChange,
  id,
}: {
  label: string;
  value: string;
  onChange: (code: string) => void;
  id: string;
}) {
  return (
    <fieldset>
      <legend id={id} className="text-sm font-semibold text-ink">{label}</legend>
      <div className="mt-2 flex flex-wrap gap-2" role="group" aria-labelledby={id}>
        {TRANSLATOR_LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => onChange(l.code)}
            aria-pressed={value === l.code}
            className={`h-9 rounded-full border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${
              value === l.code
                ? "border-accent bg-accent text-on-accent"
                : "border-line bg-canvas text-ink hover:bg-surface"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>
    </fieldset>
  );
}

export function TranslatorClient({ queue }: { queue: TranslationQueueItem[] }) {
  const [from, setFrom] = useState("id");
  const [to, setTo] = useState("en");
  const [text, setText] = useState("");
  const [result, setResult] = useState<string | null>(null);
  const [resultSource, setResultSource] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [history, setHistory] = useState<TranslationEntry[]>([]);
  const [fullscreen, setFullscreen] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setHistory(loadTranslationHistory());
  }, []);

  const translate = async () => {
    if (!text.trim()) {
      setMessage("Tulis dulu teks yang mau diterjemahkan.");
      return;
    }
    setBusy(true);
    setMessage(null);
    setResult(null);
    setResultSource(null);
    try {
      const res = await fetch("/api/translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: text.trim(), from, to }),
      });
      const data: unknown = await res.json().catch(() => ({}));
      if (res.ok) {
        const d = data as { translation: string; source?: string };
        setResult(d.translation);
        setResultSource(d.source === "kamus-lokal" ? "Kamus lokal iTAP" : "Bahasa sama");
        setHistory(
          addTranslationHistory({
            sourceText: text.trim(),
            result: d.translation,
            from,
            to,
            favorite: false,
          }),
        );
      } else if (res.status === 501) {
        setMessage(
          "Penerjemah belum tersedia untuk teks ini — butuh kunci Gemini (Fase 3, P3). " +
            "Kamus lokal di server hanya berisi padanan istilah kategori Indonesia–English dari konten iTAP.",
        );
      } else if (res.status === 401) {
        setMessage("Masuk dulu untuk memakai penerjemah.");
      } else {
        setMessage((data as { error?: string }).error ?? "Gagal menerjemahkan.");
      }
    } catch {
      setMessage("Gagal terhubung ke server. Periksa koneksi lalu coba lagi.");
    } finally {
      setBusy(false);
    }
  };

  const swap = () => {
    setFrom(to);
    setTo(from);
    setResult(null);
    setResultSource(null);
  };

  const copyResult = async () => {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const markFavorite = (entry: TranslationEntry) => {
    setHistory(toggleTranslationFavorite(entry.id));
  };

  const shownQueue = queue.slice(0, 10);

  const resultCard = result ? (
    <div className="rounded-lg border border-line bg-canvas p-4 shadow-card">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-ink">
          Hasil · {languageLabel(from)} → {languageLabel(to)}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {resultSource && <Badge tone="active">{resultSource}</Badge>}
          <Button variant="secondary" size="sm" onClick={() => void copyResult()}>
            <Copy className="size-4" aria-hidden="true" /> {copied ? "Disalin" : "Salin hasil"}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setFullscreen(true)}>
            <Expand className="size-4" aria-hidden="true" /> Layar penuh
          </Button>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-base text-ink">{result}</p>
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">Penerjemah</h1>
        <p className="mt-1 text-sm text-muted">
          Terjemah 9 bahasa: Belitung, Indonesia, English, Melayu, Mandarin, Jepang, Korea, Belanda, Jerman.
        </p>
      </header>

      <Banner tone="info">
        Kamus lokal di server hanya berisi padanan istilah kategori Indonesia–English dari konten iTAP
        (mis. “Kuliner Lokal” → “Local Food”). Teks lain butuh kunci Gemini (Fase 3, P3) — sampai saat
        itu penerjemah menjawab jujur “belum tersedia”, bukan mengarang terjemahan.
      </Banner>

      <section aria-labelledby="terjemah-title" className="flex flex-col gap-4">
        <h2 id="terjemah-title" className="sr-only">Terjemahkan teks</h2>
        <LanguageChips id="dari" label="Dari" value={from} onChange={setFrom} />
        <div>
          <Button variant="secondary" size="sm" onClick={swap}>
            <ArrowLeftRight className="size-4" aria-hidden="true" /> Tukar bahasa
          </Button>
        </div>
        <LanguageChips id="ke" label="Ke" value={to} onChange={setTo} />

        <Field label="Teks" id="teks" hint="Ketik atau tempel teks yang mau diterjemahkan.">
          <TextArea
            id="teks"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Tulis teks di sini…"
            rows={4}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void translate()} loading={busy} disabled={!text.trim()}>
            Terjemahkan
          </Button>
          <button
            type="button"
            disabled
            title="Input suara dan foto belum tersedia di versi ini."
            aria-label="Input suara atau foto (belum tersedia)"
            className="inline-flex h-10 items-center gap-2 rounded-md border border-line bg-canvas px-3 text-sm font-semibold text-muted opacity-60"
          >
            <Mic className="size-4" aria-hidden="true" />
            <Camera className="size-4" aria-hidden="true" />
            Suara / Foto (belum tersedia)
          </button>
        </div>
        <p className="text-xs text-muted">
          Input suara dan foto belum tersedia di versi ini. Mikrofon hanya dipakai saat dipilih — dan belum ada pilihannya.
        </p>

        {message && <Banner tone="warning">{message}</Banner>}
        {resultCard}
      </section>

      {fullscreen && result && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Hasil terjemahan layar penuh"
          className="fixed inset-0 z-50 flex flex-col gap-4 overflow-y-auto bg-canvas p-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">
              Hasil · {languageLabel(from)} → {languageLabel(to)}
            </h2>
            <Button variant="secondary" size="sm" onClick={() => setFullscreen(false)}>
              <X className="size-4" aria-hidden="true" /> Tutup
            </Button>
          </div>
          {resultSource && <Badge tone="active">{resultSource}</Badge>}
          <p className="whitespace-pre-wrap text-xl leading-relaxed text-ink">{result}</p>
          <p className="text-sm text-muted">{text}</p>
        </div>
      )}

      <section aria-labelledby="riwayat-title" className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 id="riwayat-title" className="text-lg font-semibold text-ink">
            Riwayat (perangkat ini, maks {TRANSLATION_HISTORY_MAX})
          </h2>
          {history.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                clearTranslationHistory();
                setHistory([]);
              }}
            >
              <Trash2 className="size-4" aria-hidden="true" /> Hapus riwayat
            </Button>
          )}
        </div>
        <p className="text-sm text-muted">
          Riwayat hanya tersimpan di perangkat ini, bukan di server — dan terhapus saat akun dihapus.
        </p>
        {history.length === 0 ? (
          <EmptyState
            title="Belum ada riwayat."
            desc="Hasil terjemahan yang berhasil akan tersimpan di perangkat ini (maks 20, yang lama terhapus otomatis)."
          />
        ) : (
          <ul className="flex flex-col gap-2">
            {history.map((h) => (
              <li key={h.id} className="rounded-lg border border-line bg-canvas p-4">
                <p className="text-sm text-ink">
                  <span className="font-semibold">{h.sourceText}</span> → {h.result}
                </p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="text-xs text-muted">
                    {languageLabel(h.from)} → {languageLabel(h.to)} ·{" "}
                    {new Date(h.createdAt).toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => markFavorite(h)}
                    aria-pressed={h.favorite}
                    aria-label={h.favorite ? "Lepas dari favorit" : "Tandai favorit"}
                    className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${
                      h.favorite ? "border-accent bg-surface text-accent" : "border-line bg-canvas text-ink hover:bg-surface"
                    }`}
                  >
                    <Star className={`size-4 ${h.favorite ? "fill-current" : ""}`} aria-hidden="true" />
                    {h.favorite ? "Favorit" : "Favoritkan"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setText(h.sourceText);
                      setFrom(h.from);
                      setTo(h.to);
                      setResult(h.result);
                      setResultSource("Riwayat perangkat");
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="inline-flex h-8 items-center rounded-md px-2 text-sm font-semibold text-accent hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    Pakai lagi
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="antrean-title" className="flex flex-col gap-3">
        <h2 id="antrean-title" className="text-lg font-semibold text-ink">
          Antrean terjemahan artikel
        </h2>
        <p className="text-sm text-muted">
          Artikel iTAP yang belum punya terjemahan English. Kontributor bisa membantu menerjemahkan —
          draf terjemahan dibantu AI (setelah kunci Gemini ada) tetap harus diperiksa manusia sebelum terbit.
        </p>
        {queue.length === 0 ? (
          <EmptyState
            title="Semua artikel sudah punya terjemahan English."
            desc="Tidak ada artikel yang menunggu terjemahan saat ini."
          />
        ) : (
          <>
            <p className="text-sm text-ink">
              <strong>{queue.length} artikel</strong> menunggu terjemahan English
              {queue.length > shownQueue.length ? ` — menampilkan ${shownQueue.length} pertama.` : "."}
            </p>
            <ul className="flex flex-col gap-2">
              {shownQueue.map((a) => (
                <li key={a.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-4 py-3">
                  <div>
                    <Link href={`/artikel/${a.slug}`} className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                      {a.title_id}
                    </Link>
                    <p className="text-xs text-muted">{channelLabel(a.channel)}</p>
                  </div>
                  <Badge tone="review">Belum diterjemahkan</Badge>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted">
              Lihat daftar lengkap di <Link href="/redaksi" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">Redaksi</Link> —
              atau bantu terjemahkan lewat <Link href="/kontributor" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">Kontributor</Link>.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
