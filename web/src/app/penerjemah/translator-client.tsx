// Penerjemah (S37, F13) — klien interaktif.
// Kamus lokal server untuk istilah kategori iTAP; teks lain diterjemahkan
// AI (Gemini, di server). Input suara via Web Speech API browser.
// Riwayat + favorit tersimpan di perangkat ini (localStorage, maks 20).
"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeftRight,
  Copy,
  Expand,
  Mic,
  MicOff,
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
import { useLanguage } from "@/components/language-provider";
import { useSpeechInput } from "@/components/use-speech-input";

const SPEECH_LANG: Record<string, string> = {
  belitung: "id-ID", id: "id-ID", en: "en-US", ms: "ms-MY", zh: "zh-CN", ja: "ja-JP", ko: "ko-KR", nl: "nl-NL", de: "de-DE",
};

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
  const { t, lang } = useLanguage();
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
  const speech = useSpeechInput((txt) => setText(txt.slice(0, 2000)));

  useEffect(() => {
    setHistory(loadTranslationHistory());
  }, []);

  const translate = async () => {
    if (!text.trim()) {
      setMessage(t("translator.emptyText"));
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
        setResultSource(
          d.source === "kamus-lokal" ? t("translator.localDict") : d.source === "ai" ? t("translator.aiSource") : t("translator.sameLang"),
        );
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
        setMessage(t("translator.unavailable"));
      } else if (res.status === 401) {
        setMessage(t("translator.loginFirst"));
      } else {
        setMessage((data as { error?: string }).error ?? t("translator.translateFailed"));
      }
    } catch {
      setMessage(t("translator.connectFailed"));
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
          {t("translator.resultLabel")} · {languageLabel(from)} → {languageLabel(to)}
        </h2>
        <div className="flex flex-wrap items-center gap-2">
          {resultSource && <Badge tone="active">{resultSource}</Badge>}
          <Button variant="secondary" size="sm" onClick={() => void copyResult()}>
            <Copy className="size-4" aria-hidden="true" /> {copied ? t("translator.copied") : t("translator.copyResult")}
          </Button>
          <Button variant="secondary" size="sm" onClick={() => setFullscreen(true)}>
            <Expand className="size-4" aria-hidden="true" /> {t("translator.fullscreen")}
          </Button>
        </div>
      </div>
      <p className="mt-3 whitespace-pre-wrap text-base text-ink">{result}</p>
    </div>
  ) : null;

  return (
    <div className="flex flex-col gap-6 py-8">
      <header>
        <h1 className="text-xl font-bold text-ink">{t("translator.title")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("translator.subtitle")}
        </p>
      </header>

      <Banner tone="info">
        {t("translator.banner")}
      </Banner>

      <section aria-labelledby="terjemah-title" className="flex flex-col gap-4">
        <h2 id="terjemah-title" className="sr-only">{t("translator.translateText")}</h2>
        <LanguageChips id="dari" label={t("translator.from")} value={from} onChange={setFrom} />
        <div>
          <Button variant="secondary" size="sm" onClick={swap}>
            <ArrowLeftRight className="size-4" aria-hidden="true" /> {t("translator.swap")}
          </Button>
        </div>
        <LanguageChips id="ke" label={t("translator.to")} value={to} onChange={setTo} />

        <Field label={t("translator.textLabel")} id="teks" hint={t("translator.textHint")}>
          <TextArea
            id="teks"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={t("translator.textPh")}
            rows={4}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={() => void translate()} loading={busy} disabled={!text.trim()}>
            {t("translator.translate")}
          </Button>
          <button
            type="button"
            onClick={() => speech.toggle(SPEECH_LANG[from] ?? "id-ID")}
            disabled={!speech.supported || busy}
            aria-pressed={speech.listening}
            className={`inline-flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-60 ${speech.listening ? "border-danger bg-surface text-danger" : "border-line bg-canvas text-ink hover:bg-surface"}`}
          >
            {speech.listening ? <MicOff className="size-4" aria-hidden="true" /> : <Mic className="size-4" aria-hidden="true" />}
            {speech.listening ? t("ai.voiceStop") : speech.supported ? t("translator.voice") : t("ai.voiceUnsupportedShort")}
          </button>
        </div>
        <p className="text-xs text-muted" role={speech.error ? "status" : undefined}>
          {speech.error === "denied" ? t("ai.voiceDenied") : speech.error === "unsupported" ? t("ai.voiceUnsupported") : speech.error ? t("ai.voiceError") : speech.listening ? t("translator.voiceListening") : t("translator.voiceNote")}
        </p>

        {message && <Banner tone="warning">{message}</Banner>}
        {resultCard}
      </section>

      {fullscreen && result && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("translator.fullscreenResult")}
          className="fixed inset-0 z-50 flex flex-col gap-4 overflow-y-auto bg-canvas p-6"
        >
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">
              {t("translator.resultLabel")} · {languageLabel(from)} → {languageLabel(to)}
            </h2>
            <Button variant="secondary" size="sm" onClick={() => setFullscreen(false)}>
              <X className="size-4" aria-hidden="true" /> {t("translator.close")}
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
            {t("translator.history", { max: TRANSLATION_HISTORY_MAX })}
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
              <Trash2 className="size-4" aria-hidden="true" /> {t("translator.clearHistory")}
            </Button>
          )}
        </div>
        <p className="text-sm text-muted">
          {t("translator.historyNote")}
        </p>
        {history.length === 0 ? (
          <EmptyState
            title={t("translator.noHistory")}
            desc={t("translator.noHistoryDesc")}
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
                    {new Date(h.createdAt).toLocaleDateString(lang === "en" ? "en-GB" : "id-ID", { day: "numeric", month: "short", year: "numeric" })}
                  </span>
                  <button
                    type="button"
                    onClick={() => markFavorite(h)}
                    aria-pressed={h.favorite}
                    aria-label={h.favorite ? t("translator.unfavorite") : t("translator.favoriteBtn")}
                    className={`inline-flex h-8 items-center gap-1 rounded-md border px-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${
                      h.favorite ? "border-accent bg-surface text-accent" : "border-line bg-canvas text-ink hover:bg-surface"
                    }`}
                  >
                    <Star className={`size-4 ${h.favorite ? "fill-current" : ""}`} aria-hidden="true" />
                    {h.favorite ? t("translator.favorite") : t("translator.favoriteBtn")}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setText(h.sourceText);
                      setFrom(h.from);
                      setTo(h.to);
                      setResult(h.result);
                      setResultSource(t("translator.historySource"));
                      window.scrollTo({ top: 0, behavior: "smooth" });
                    }}
                    className="inline-flex h-8 items-center rounded-md px-2 text-sm font-semibold text-accent hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent"
                  >
                    {t("translator.reuse")}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="antrean-title" className="flex flex-col gap-3">
        <h2 id="antrean-title" className="text-lg font-semibold text-ink">
          {t("translator.queue")}
        </h2>
        <p className="text-sm text-muted">
          {t("translator.queueDesc")}
        </p>
        {queue.length === 0 ? (
          <EmptyState
            title={t("translator.queueAllDone")}
            desc={t("translator.queueAllDoneDesc")}
          />
        ) : (
          <>
            <p className="text-sm text-ink">
              <strong>{t("translator.queueCount", { count: queue.length })}</strong>
              {queue.length > shownQueue.length ? t("translator.queueShowing", { shown: shownQueue.length }) : "."}
            </p>
            <ul className="flex flex-col gap-2">
              {shownQueue.map((a) => (
                <li key={a.slug} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-4 py-3">
                  <div>
                    <Link href={`/artikel/${a.slug}`} className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
                      {a.title_id}
                    </Link>
                    <p className="text-xs text-muted">{channelLabel(a.channel, lang)}</p>
                  </div>
                  <Badge tone="review">{t("translator.notTranslated")}</Badge>
                </li>
              ))}
            </ul>
            <p className="text-sm text-muted">
              {t("translator.queueListPre")}<Link href="/redaksi" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("nav.editorial")}</Link>{t("translator.queueListMid")}<Link href="/kontributor" className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("kontributor.dashboard")}</Link>.
            </p>
          </>
        )}
      </section>
    </div>
  );
}
