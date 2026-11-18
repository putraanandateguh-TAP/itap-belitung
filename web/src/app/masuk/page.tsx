// S10 Login / Daftar akun — Supabase Auth (email + kata sandi, Google OAuth,
// reset kata sandi). Sesi cookie http-only; tidak ada lagi akun demo.
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { Banner, Button, Field, TextInput } from "@/components/ui";

export default function MasukPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"masuk" | "daftar" | "reset">("masuk");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Masukkan alamat email yang valid.");
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
        if (!res.ok) throw new Error(data.error ?? "Gagal mengirim tautan reset.");
        setNotice(data.message ?? "Bila email terdaftar, tautan reset sudah dikirim.");
        return;
      }
      if (password.length < 8) {
        setError("Kata sandi minimal 8 karakter.");
        return;
      }
      if (mode === "daftar") {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, password, displayName: name.trim() || email.split("@")[0] }),
        });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error ?? "Pendaftaran gagal.");
        router.push("/verifikasi?email=" + encodeURIComponent(email));
        return;
      }
      const supabase = createSupabaseBrowser();
      const { error: err } = await supabase.auth.signInWithPassword({ email, password });
      if (err) throw new Error("Email atau kata sandi salah, atau email belum terverifikasi.");
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Terjadi kesalahan.");
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
      if (!res.ok || !data.url) throw new Error(data.error ?? "Login Google belum tersedia.");
      window.location.href = data.url;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login Google gagal.");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-xl font-bold text-ink">{mode === "masuk" ? "Masuk ke iTAP Belitung" : mode === "daftar" ? "Daftar akun iTAP" : "Lupa kata sandi"}</h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "reset"
          ? "Kami kirim tautan reset (berlaku 60 menit) ke emailmu."
          : "Satu akun untuk membaca, berkomentar, dan menulis sebagai kontributor."}
      </p>

      <form onSubmit={submit} className="mt-6 flex flex-col gap-4" noValidate>
        {mode === "daftar" && (
          <Field label="Nama tampilan" id="nama">
            <TextInput id="nama" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama yang tampil di komentar" autoComplete="name" />
          </Field>
        )}
        <Field label="Email" id="email" error={error && !email.includes("@") ? error : undefined}>
          <TextInput id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="nama@contoh.id" autoComplete="email" required />
        </Field>
        {mode !== "reset" && (
          <Field label="Kata sandi" id="password" hint="Minimal 8 karakter." error={password.length > 0 && password.length < 8 ? error : undefined}>
            <TextInput id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "daftar" ? "new-password" : "current-password"} required />
          </Field>
        )}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        {notice && <Banner tone="success">{notice}</Banner>}
        <Button type="submit" size="lg" className="w-full" loading={busy}>
          {mode === "masuk" ? "Masuk" : mode === "daftar" ? "Buat akun" : "Kirim tautan reset"}
        </Button>
      </form>

      {mode !== "reset" && (
        <Button variant="secondary" size="lg" className="mt-3 w-full" onClick={loginGoogle} loading={busy}>
          Masuk dengan Google
        </Button>
      )}

      <div className="mt-6 flex justify-between text-sm">
        {mode === "masuk" && (
          <>
            <button type="button" onClick={() => setMode("daftar")} className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">Belum punya akun? Daftar</button>
            <button type="button" onClick={() => setMode("reset")} className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">Lupa kata sandi?</button>
          </>
        )}
        {mode !== "masuk" && (
          <button type="button" onClick={() => setMode("masuk")} className="font-semibold text-accent hover:underline focus-visible:outline-2 focus-visible:outline-accent">Kembali masuk</button>
        )}
      </div>
      <p className="mt-6 text-center text-xs text-muted">
        Dengan masuk, kamu menyetujui ketentuan dan kebijakan privasi iTAP Belitung.
      </p>
    </div>
  );
}
