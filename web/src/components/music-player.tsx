// Pemutar musik latar identitas situs — dipulihkan dari situs lama.
// Perilaku meniru pemutar asli (site/app.js, blok "Music"):
// Audio('/audio/belitung-bg-64k.mp3'), loop, preload 'none', volume mulai 0
// lalu fade-in ke 0.35 dalam 1500 ms, preferensi di localStorage 'itap_music'.
// Pemutaran HANYA dimulai dari interaksi pengguna (patuh kebijakan autoplay):
// bila preferensi tersimpan 'on', musik mulai pada klik/tekan tombol pertama
// pengguna di mana pun di halaman, bukan otomatis saat load.
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Volume2, VolumeX } from "lucide-react";

const AUDIO_SRC = "/audio/belitung-bg-64k.mp3";
const STORAGE_KEY = "itap_music";
const FADE_TARGET = 0.35;
const FADE_MS = 1500;

function readStoredPref(): boolean {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === null) return false;
    // Situs lama menyimpan JSON.stringify('on') -> '"on"'; terima keduanya.
    const value = raw.startsWith('"') ? JSON.parse(raw) : raw;
    return value === "on";
  } catch {
    return false;
  }
}

function storePref(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // localStorage tidak tersedia — pemutar tetap jalan untuk sesi ini.
  }
}

export function MusicPlayer() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fadeRef = useRef<number | null>(null);
  const failedRef = useRef(false);
  const [on, setOn] = useState(false);
  const [failed, setFailed] = useState(false);

  const setFailedState = useCallback((v: boolean) => {
    failedRef.current = v;
    setFailed(v);
  }, []);

  const cancelFade = useCallback(() => {
    if (fadeRef.current !== null) {
      cancelAnimationFrame(fadeRef.current);
      fadeRef.current = null;
    }
  }, []);

  // Fade volume bertahap (seperti aslinya: requestAnimationFrame, 1500 ms).
  const fadeTo = useCallback(
    (to: number, done?: () => void) => {
      const audio = audioRef.current;
      if (!audio) return;
      cancelFade();
      const from = audio.volume;
      const start = performance.now();
      const step = () => {
        const k = Math.min(1, (performance.now() - start) / FADE_MS);
        audio.volume = from + (to - from) * k;
        if (k < 1) {
          fadeRef.current = requestAnimationFrame(step);
        } else {
          fadeRef.current = null;
          done?.();
        }
      };
      step();
    },
    [cancelFade],
  );

  const start = useCallback(() => {
    const audio = audioRef.current;
    if (!audio || failedRef.current) return;
    audio
      .play()
      .then(() => {
        setOn(true);
        fadeTo(FADE_TARGET);
      })
      .catch((err) => {
        console.warn("iTAP: musik latar gagal diputar", err);
        setOn(false);
        setFailedState(true);
      });
  }, [fadeTo, setFailedState]);

  const stop = useCallback(() => {
    const audio = audioRef.current;
    if (!audio) return;
    setOn(false);
    fadeTo(0, () => audio.pause());
  }, [fadeTo]);

  const toggle = useCallback(() => {
    if (on) {
      storePref(false);
      stop();
    } else {
      setFailedState(false);
      storePref(true);
      start();
    }
  }, [on, start, stop, setFailedState]);

  useEffect(() => {
    const audio = new Audio(AUDIO_SRC);
    audio.loop = true;
    audio.preload = "none";
    audio.volume = 0;
    audioRef.current = audio;

    const onAudioError = () => {
      console.warn("iTAP: file musik latar gagal dimuat");
      setOn(false);
      setFailedState(true);
    };
    audio.addEventListener("error", onAudioError);

    // Preferensi tersimpan 'on': mulai pada interaksi pertama pengguna
    // (klik/tekan tombol di mana pun), BUKAN autoplay saat load.
    // Klik pada tombol musik sendiri dikecualikan — tombol itu yang mengatur.
    let resumed = false;
    const resumeOnFirstInteraction = (e: Event) => {
      if (resumed) return;
      if (e.target instanceof Element && e.target.closest("[data-music-toggle]")) return;
      resumed = true;
      window.removeEventListener("pointerdown", resumeOnFirstInteraction);
      window.removeEventListener("keydown", resumeOnFirstInteraction);
      start();
    };
    if (readStoredPref()) {
      window.addEventListener("pointerdown", resumeOnFirstInteraction);
      window.addEventListener("keydown", resumeOnFirstInteraction);
    }

    return () => {
      window.removeEventListener("pointerdown", resumeOnFirstInteraction);
      window.removeEventListener("keydown", resumeOnFirstInteraction);
      audio.removeEventListener("error", onAudioError);
      cancelFade();
      audio.pause();
      audioRef.current = null;
    };
    // start stabil via useCallback; sengaja hanya saat mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <button
      type="button"
      data-music-toggle
      onClick={toggle}
      aria-pressed={on}
      aria-label={on ? "Matikan musik latar" : "Putar musik latar"}
      className={`inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md px-3 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${
        on ? "bg-accent text-on-accent hover:bg-accent-dark" : "text-ink hover:bg-surface"
      }`}
    >
      {on ? (
        <Volume2 className="size-5" aria-hidden="true" />
      ) : (
        <VolumeX className="size-5" aria-hidden="true" />
      )}
      <span className="hidden sm:inline">{on ? "Musik hidup" : "Musik"}</span>
    </button>
  );
}
