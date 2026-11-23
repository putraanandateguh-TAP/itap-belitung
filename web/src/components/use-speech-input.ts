// Input suara via Web Speech API (gratis, diproses browser). Mikrofon hanya
// aktif saat start() dipanggil dari klik pengguna.
"use client";
import { useEffect, useRef, useState } from "react";

type SpeechRec = {
  lang: string; interimResults: boolean; continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onend: (() => void) | null; onerror: ((e: { error?: string }) => void) | null;
  start: () => void; stop: () => void;
};

function getRec(): (new () => SpeechRec) | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as { SpeechRecognition?: new () => SpeechRec; webkitSpeechRecognition?: new () => SpeechRec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type SpeechError = "unsupported" | "denied" | "failed";

export function useSpeechInput(onText: (text: string) => void) {
  const recRef = useRef<SpeechRec | null>(null);
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const [error, setError] = useState<SpeechError | null>(null);
  useEffect(() => {
    setSupported(getRec() !== null);
    return () => recRef.current?.stop();
  }, []);
  const toggle = (lang: string) => {
    if (listening) { recRef.current?.stop(); return; }
    const Rec = getRec();
    if (!Rec) { setError("unsupported"); return; }
    const rec = new Rec();
    rec.lang = lang; rec.interimResults = true; rec.continuous = false;
    rec.onresult = (e) => {
      let txt = "";
      for (let i = 0; i < e.results.length; i++) txt += e.results[i][0]?.transcript ?? "";
      onText(txt);
    };
    rec.onerror = (e) => setError(e.error === "not-allowed" || e.error === "service-not-allowed" ? "denied" : "failed");
    rec.onend = () => setListening(false);
    recRef.current = rec;
    setError(null);
    try { rec.start(); setListening(true); } catch { setError("failed"); }
  };
  return { supported, listening, error, toggle };
}
