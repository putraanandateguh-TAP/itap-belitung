// S10 Login / Daftar akun — Supabase Auth (email + kata sandi, Google OAuth,
// reset kata sandi). Sesi cookie http-only; tidak ada lagi akun demo.
//
// Alur reset kata sandi (F17): pengguna mengklik tautan di email reset —
// Supabase mengarahkan ke /masuk?reset=1 dengan token sesi di fragment URL
// (#access_token, aliran implicit) atau ?code= (PKCE/OAuth). Token fragment
// ditukar EKSPLISIT via setSession — browser client @supabase/ssr memaksa
// flowType "pkce" sehingga deteksi otomatis implicit ditolak ("Not a valid
// PKCE flow url."). Pola yang sama dipakai /verifikasi (terbukti di browser
// sungguhan). Halaman lalu menampilkan form kata sandi baru dan memanggil
// /api/auth/password-reset/confirm (updateUser + signOut scope others =
// cabut sesi lama). Tautan kedaluwarsa datang sebagai #error=access_denied.
"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Banner, Button, Field, TextInput } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";

function MasukForm() {
  const router = useRouter();
  const { t } = useLanguage();
  const searchParams = useSearchParams();
  const [mode, setMode] = useState<"masuk" | "daftar" | "reset" | "baru">("masuk");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const handledRecoveryRef = useRef(false);

  // Tangani kedatangan dari tautan reset / OAuth: ?reset=1, ?code=, #access_token.
  useEffect(() => {
    if (handledRecoveryRef.current) return;
    handledRecoveryRef.current = true;
    const hashParams = new URLSearchParams(window.location.hash.slice(1));
    const err = searchParams.get("error");
    if (err === "oauth-gagal" || err === "no-code") {
      setError(t("auth.linkInvalid"));
      return;
    }
    // Tautan kedaluwarsa / sudah dipakai: Supabase mengarahkan balik dengan
    // #error=access_denied&error_code=otp_expired.
    if (hashParams.get("error")) {
      setError(t("auth.linkInvalid"));
      return;
    }
    const code = searchParams.get("code");
    const isReset = searchParams.get("reset") === "1";
    const hasFragmentToken = hashParams.has("access_token");
    if (!code && !isReset && !hasFragmentToken) return;
    (async () => {
      try {
        const supabase = createSupabaseBrowser();
        if (code) {
          const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
          if (exErr) {
            setError(t("auth.linkInvalid"));
            return;
          }
        }
        // Sesi dari fragment (#access_token) TIDAK terdeteksi otomatis oleh
        // browser client: @supabase/ssr memaksa flowType "pkce", sehingga
        // deteksi implicit ditolak ("Not a valid PKCE flow url."). Tukar token
        // fragment secara eksplisit via setSession — pola yang sama dipakai
        // /verifikasi (dan skrip uji E2E cookieFromFragmentTokens).
        let { data } = await supabase.auth.getSession();
        if (!data.session && hasFragmentToken) {
          const accessToken = hashParams.get("access_token");
          const refreshToken = hashParams.get("refresh_token");
          if (accessToken && refreshToken) {
            const { data: setData, error: setErr } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (!setErr) data = setData;
          }
        }
        if (!data.session) {
          if (isReset) setError(t("auth.linkResetInvalid"));
          return;
        }
        // Bersihkan token dari URL agar tidak ikut tersalin / tersimpan di riwayat.
        if (window.location.hash) {
          window.history.replaceState(null, "", window.location.pathname + window.location.search);
        }
        setPassword("");
        setPassword2("");
        setMode("baru");
        setNotice(t("auth.resetVerified"));
      } catch {
        setError(t("auth.linkInvalid"));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (mode === "baru") {
      if (password.length < 8) {
        setError(t("auth.passwordMin"));
        return;
      }
      if (password !== password2) {
        setError(t("auth.passwordMismatch"));
        return;
      }
      setBusy(true);
      try {
        const res = await fetch("/api/auth/password-reset/confirm", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ token: "recovery", password }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? t("auth.genericError"));
        setNotice(data.message ?? "Kata sandi diubah.");
        router.push("/");
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : t("auth.genericError"));
      } finally {
        setBusy(false);
      }
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError(t("auth.invalidEmail"));
      return;
    }
    setBusy(true);
    try {
      if (mode === "reset") {
        const res = await fetch("/api/auth/password-reset/request", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? t("auth.resetFailed"));
        setNotice(data.message ?? t("auth.resetSent"));
        return;
      }
      if (password.length < 8) {
        setError(t("auth.passwordMin"));
        return;
      }
      if (mode === "daftar") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, displayName: name.trim() || email.split("@")[0] }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? t("auth.signupFailed"));
        router.push("/verifikasi?email=" + encodeURIComponent(email));
        return;
      }
      const supabase = createSupabaseBrowser();
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw new Error(t("auth.loginFailed"));
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.genericError"));
    } finally {
      setBusy(false);
    }
  }

  async function loginGoogle() {
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const res = await fetch("/api/auth/google", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) throw new Error(data.error ?? t("auth.googleUnavailable"));
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : t("auth.googleFailed"));
      setBusy(false);
    }
  }

  const title = mode === "masuk" ? t("auth.signInTitle")
    : mode === "daftar" ? t("auth.signUpTitle")
    : mode === "reset" ? t("auth.resetTitle") : t("auth.newPasswordTitle");

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-xl font-bold text-ink">{title}</h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "reset"
          ? t("auth.resetSub")
          : mode === "baru"
            ? t("auth.newPasswordSub")
            : t("auth.signInSub")}
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
        {mode === "daftar" && (
          <Field label={t("auth.displayName")} id="nama">
            <TextInput id="nama" value={name} onChange={(e) => setName(e.target.value)} placeholder={t("auth.displayNamePlaceholder")} autoComplete="name" />
          </Field>
        )}
        {mode !== "baru" && (
          <Field label={t("auth.email")} id="email" error={error && !email.includes("@") ? error : undefined}>
            <TextInput id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@contoh.id" autoComplete="email" required />
          </Field>
        )}
        {mode === "baru" && (
          <>
            <Field label={t("auth.newPassword")} id="password" hint={t("auth.passwordHint")} error={password.length > 0 && password.length < 8 ? error : undefined}>
              <TextInput id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
            </Field>
            <Field label={t("auth.confirmNewPassword")} id="password2" error={password2.length > 0 && password2 !== password ? error : undefined}>
              <TextInput id="password2" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="••••••••" autoComplete="new-password" required />
            </Field>
          </>
        )}
        {(mode === "masuk" || mode === "daftar") && (
          <Field label={t("auth.password")} id="password" hint={t("auth.passwordHint")} error={password.length > 0 && password.length < 8 ? error : undefined}>
            <TextInput id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "daftar" ? "new-password" : "current-password"} required />
          </Field>
        )}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {notice && <Banner tone="success">{notice}</Banner>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          {mode === "masuk" ? t("auth.signIn") : mode === "daftar" ? t("auth.signUp") : mode === "reset" ? t("auth.sendReset") : t("auth.saveNewPassword")}
        </Button>
      </form>

      {(mode === "masuk" || mode === "daftar") && (
        <Button variant="secondary" size="lg" className="mt-3 w-full" onClick={loginGoogle} loading={busy}>
          {t("auth.signInGoogle")}
        </Button>
      )}

      <div className="mt-6 flex justify-between text-sm">
        {mode === "masuk" && (
          <>
            <button type="button" onClick={() => setMode("daftar")} className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("auth.noAccount")}</button>
            <button type="button" onClick={() => setMode("reset")} className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("auth.forgotPassword")}</button>
          </>
        )}
        {mode !== "masuk" && (
          <button type="button" onClick={() => setMode("masuk")} className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">{t("auth.backToSignIn")}</button>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        {t("auth.termsNote")}
      </p>
    </div>
  );
}

export default function MasukPage() {
  return (
    <Suspense>
      <MasukForm />
    </Suspense>
  );
}
