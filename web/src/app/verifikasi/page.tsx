// S11 Verifikasi email & WhatsApp — #03 Input OTP 6 kotak (email + WhatsApp).
// DEMO: kode demo 123456 tampil di halaman; kode lain ditolak (state error),
// kirim ulang memakai hitung mundur 60 detik.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { getSession, setSession } from "@/lib/auth";
import { Banner, Button } from "@/components/ui";

const DEMO_CODE = "123456";

export default function VerifikasiPage() {
  const router = useRouter();
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  useEffect(() => {
    inputs.current[0]?.focus();
  }, []);

  function setDigit(i: number, v: string) {
    const d = v.replace(/\D/g, "").slice(-1);
    setDigits((prev) => {
      const next = [...prev];
      next[i] = d;
      return next;
    });
    if (d && i < 5) inputs.current[i + 1]?.focus();
  }

  function onKeyDown(i: number, e: React.KeyboardEvent) {
    if (e.key === "Backspace" && !digits[i] && i > 0) inputs.current[i - 1]?.focus();
  }

  function onPaste(e: React.ClipboardEvent) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 6);
    if (!text) return;
    e.preventDefault();
    setDigits(text.split("").concat(Array(6 - text.length).fill("")));
    inputs.current[Math.min(text.length, 5)]?.focus();
  }

  function verify(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) {
      setError("Masukkan 6 digit kode verifikasi.");
      return;
    }
    if (code !== DEMO_CODE) {
      setError("Kode tidak cocok, coba lagi.");
      return;
    }
    const s = getSession();
    if (s) setSession({ ...s, verified: true });
    setError("");
    setNotice(channel === "email" ? "Email terverifikasi. Lanjut verifikasi WhatsApp bila ingin berjualan nanti (Fase 2)." : "WhatsApp terverifikasi. Akunmu siap untuk marketplace (Fase 2).");
    setTimeout(() => router.push("/pengaturan"), 1200);
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-xl font-bold text-ink">Verifikasi akun</h1>
      <p className="mt-1 text-sm text-muted">
        Kami mengirim kode 6 digit ke email dan (untuk penjual) WhatsApp kamu. Kode berlaku singkat — minta kirim ulang bila kedaluwarsa.
      </p>

      <div className="mt-4">
        <Banner tone="warning">
          Mode demo: tidak ada email/SMS yang benar-benar dikirim. Kode demo: <strong className="font-mono">{DEMO_CODE}</strong> (ditampilkan di sini hanya untuk demo).
        </Banner>
      </div>

      <div role="group" aria-label="Pilih saluran verifikasi" className="mt-6 inline-flex rounded-md border border-line bg-canvas p-0.5">
        {(["email", "whatsapp"] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={channel === c}
            onClick={() => { setChannel(c); setError(""); setNotice(""); }}
            className={`h-10 rounded-md px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${channel === c ? "bg-surface-alt text-accent" : "text-muted"}`}
          >
            {c === "email" ? "Email" : "WhatsApp"}
          </button>
        ))}
      </div>

      <form onSubmit={verify} className="mt-6 flex flex-col gap-4">
        <fieldset>
          <legend className="text-sm font-semibold text-ink">Kode verifikasi 6 digit ({channel === "email" ? "email" : "WhatsApp"})</legend>
          <div className="mt-2 flex gap-2" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={`Digit ke-${i + 1} dari 6`}
                value={d}
                onChange={(e) => setDigit(i, e.target.value)}
                onKeyDown={(e) => onKeyDown(i, e)}
                className={`size-12 rounded-md border bg-canvas text-center text-lg font-semibold text-ink focus:border-accent focus:outline-2 focus:outline-accent ${error ? "border-danger" : "border-line-input"}`}
              />
            ))}
          </div>
        </fieldset>
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {notice && <Banner tone="success">{notice}</Banner>}
        <Button type="submit" size="lg" className="w-full">Verifikasi</Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        {cooldown > 0 ? (
          <>Kirim ulang dalam {cooldown} detik.</>
        ) : (
          <button
            type="button"
            onClick={() => { setCooldown(60); setError(""); setNotice("Demo: kode baru tidak benar-benar dikirim — kode demo tetap 123456."); }}
            className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
          >
            Kirim ulang kode
          </button>
        )}
      </p>
      <p className="mt-2 text-center text-xs text-muted">
        Verifikasi WhatsApp memakai OTP Meta — butuh akun WhatsApp Business + template disetujui (P2). Gerbang ini aktif penuh di Fase 2 (marketplace).
      </p>
    </div>
  );
}
