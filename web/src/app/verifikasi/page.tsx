// S11 Verifikasi email & WhatsApp — OTP 6 kotak (email via Supabase Auth +
// SMTP Resend P5; WhatsApp via Meta P2 — belum tersedia, lihat banner).
// TIDAK ada lagi kode demo yang tampil di halaman.
//
// Alur tautan verifikasi signup: pengguna mengklik tautan konfirmasi di
// email — Supabase mengarahkan ke /verifikasi dengan token sesi di fragment
// URL (#access_token, aliran implicit) atau ?code= (PKCE). Token fragment
// ditukar eksplisit via setSession — browser client @supabase/ssr memaksa
// flowType "pkce" sehingga deteksi otomatis implicit ditolak. Halaman lalu
// menampilkan status berhasil dan mengarahkan ke /pengaturan (pola yang
// sama seperti penanganan tautan reset di /masuk, dengan setSession ini).
// Alur kode OTP 6 digit tidak berubah.
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Banner, Button } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

function VerifikasiForm() {
  const { t, lang } = useLanguage();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState(searchParams.get("email") ?? "");
  const [digits, setDigits] = useState<string[]>(["", "", "", "", "", ""]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [cooldown, setCooldown] = useState(0);
  const [channel, setChannel] = useState<"email" | "whatsapp">("email");
  const [busy, setBusy] = useState(false);
  const [linkVerified, setLinkVerified] = useState(false);
  const [checkingLink, setCheckingLink] = useState(false);
  const handledLinkRef = useRef(false);
  const inputs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Tangani kedatangan dari tautan verifikasi email Supabase: ?code=,
  // #access_token, atau ?error= (tautan kedaluwarsa / sudah dipakai).
  useEffect(() => {
    if (handledLinkRef.current) return;
    handledLinkRef.current = true;
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const linkError = searchParams.get("error") ?? hashParams.get("error");
    if (linkError) {
      setError("Tautan verifikasi tidak valid atau sudah kedaluwarsa. Minta kode baru lewat tombol kirim ulang di bawah.");
      return;
    }
    const code = searchParams.get("code");
    const hasFragmentToken = hashParams.has("access_token");
    if (!code && !hasFragmentToken) return;
    setCheckingLink(true);
    (async () => {
      try {
        const supabase = createSupabaseBrowser();
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) {
            setError("Tautan verifikasi tidak valid atau sudah kedaluwarsa. Minta kode baru lewat tombol kirim ulang di bawah.");
            setCheckingLink(false);
            return;
          }
        }
        // Sesi dari fragment (#access_token) TIDAK terdeteksi otomatis oleh
        // browser client: @supabase/ssr memaksa flowType "pkce", sehingga
        // deteksi implicit ditolak ("Not a valid PKCE flow url."). Tukar token
        // fragment secara eksplisit via setSession — pola yang sama dipakai
        // skrip uji E2E (cookieFromFragmentTokens).
        let { data } = await supabase.auth.getSession();
        let user = data.session?.user;
        if (!user && hasFragmentToken) {
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            const { data: setData, error: setErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!setErr) user = setData.session?.user ?? undefined;
          }
        }
        if (!user?.email_confirmed_at) {
          setError("Tautan verifikasi tidak valid atau sudah kedaluwarsa. Minta kode baru lewat tombol kirim ulang di bawah.");
          setCheckingLink(false);
          return;
        }
        // Bersihkan token dari URL agar tidak ikut tersalin / tersimpan di riwayat.
        if (window.location.hash || code) {
          const next = user.email ? `/verifikasi?email=${encodeURIComponent(user.email)}` : "/verifikasi";
          window.history.replaceState(null, "", next);
        }
        if (user.email) setEmail(user.email);
        setCheckingLink(false);
        setLinkVerified(true);
        setNotice("Email terverifikasi. Mengalihkan ke pengaturan…");
        setTimeout(() => router.push("/pengaturan"), 1500);
      } catch {
        setError("Tautan verifikasi tidak valid atau sudah kedaluwarsa. Minta kode baru lewat tombol kirim ulang di bawah.");
        setCheckingLink(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  async function resend() {
    if (channel === "whatsapp") {
      setNotice(t("verifikasi.waUnavailable"));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError(t("verifikasi.invalidEmail"));
      return;
    }
    setCooldown(60);
    setError("");
    const res = await fetch("/api/auth/email-otp/send", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setNotice(res.ok ? (data.message ?? t("verifikasi.codeSent")) : (data.error ?? t("verifikasi.sendFailed")));
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const code = digits.join("");
    if (code.length < 6) {
      setError(t("verifikasi.codeShort"));
      return;
    }
    if (channel === "whatsapp") {
      setError(t("verifikasi.waUnavailableVerify"));
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError(t("verifikasi.emailInvalid2"));
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/auth/email-otp/verify", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email, token: code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? t("verifikasi.codeWrong"));
      setNotice(t("verifikasi.emailVerified"));
      setTimeout(() => router.push("/pengaturan"), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("verifikasi.failed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-xl font-bold text-ink">{t("verifikasi.title")}</h1>
      <p className="mt-1 text-sm text-muted">
        {t("verifikasi.subtitle")}
      </p>

      <div className="mt-4">
        <Banner tone="info">
          {t("verifikasi.banner")}
        </Banner>
      </div>

      {checkingLink && <p className="mt-6 text-sm text-muted">Memverifikasi tautan…</p>}
      {linkVerified && (
        <div className="mt-6">
          <Banner tone="success">Email terverifikasi. Mengalihkan ke pengaturan…</Banner>
          <p className="mt-4 text-sm text-muted">
            Bila tidak dialihkan otomatis,{" "}
            <button type="button" onClick={() => router.push("/pengaturan")} className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">
              lanjut ke pengaturan
            </button>
            .
          </p>
        </div>
      )}

      {!linkVerified && (
      <>
      <div className="mt-6 flex flex-col gap-2">
        <label htmlFor="verif-email" className="text-sm font-semibold text-ink">{t("verifikasi.emailLabel")}</label>
        <input
          id="verif-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="nama@contoh.id"
          className="h-11 rounded-md border border-line-input bg-canvas px-3 text-base text-ink"
        />
      </div>

      <div role="group" aria-label={t("verifikasi.channelLabel")} className="mt-6 inline-flex rounded-md border border-line bg-canvas p-0.5">
        {(["email", "whatsapp"] as const).map((c) => (
          <button
            key={c}
            type="button"
            aria-pressed={channel === c}
            onClick={() => { setChannel(c); setError(""); setNotice(""); }}
            className={`h-10 rounded-md px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${channel === c ? "bg-surface-alt text-accent-dark" : "text-muted"}`}
          >
            {c === "email" ? "Email" : "WhatsApp"}
          </button>
        ))}
      </div>

      <form onSubmit={verify} className="mt-6 flex flex-col gap-4">
        <fieldset>
          <legend className="text-sm font-semibold text-ink">{t("verifikasi.codeLabel")} ({channel === "email" ? "email" : "WhatsApp"})</legend>
          <div className="mt-2 flex gap-2" onPaste={onPaste}>
            {digits.map((d, i) => (
              <input
                key={i}
                ref={(el) => { inputs.current[i] = el; }}
                inputMode="numeric"
                autoComplete={i === 0 ? "one-time-code" : "off"}
                aria-label={t("verifikasi.digit", { n: i + 1 })}
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
        <Button type="submit" size="lg" className="w-full" loading={busy}>{t("verifikasi.verify")}</Button>
      </form>

      <p className="mt-4 text-center text-sm text-muted">
        {cooldown > 0 ? (
          <>{t("verifikasi.resendIn", { seconds: cooldown })}</>
        ) : (
          <button
            type="button"
            onClick={resend}
            className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent"
          >
            {t("verifikasi.sendCode")}
          </button>
        )}
      </p>
      </>
      )}
    </div>
  );
}

export default function VerifikasiPage() {
  return (
    <Suspense>
      <VerifikasiForm />
    </Suspense>
  );
}
