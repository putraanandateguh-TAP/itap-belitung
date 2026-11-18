// S10 Login / Daftar akun — form email + kata sandi, tombol Google, link reset.
// DEMO: tidak ada Supabase Auth; memilih akun demo langsung masuk.
"use client";

import type { Metadata } from "next";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { DEMO_ACCOUNTS, setSession, type DemoSession } from "@/lib/auth";
import { Banner, Button, Field, TextInput } from "@/components/ui";

export default function MasukPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"masuk" | "daftar" | "reset">("masuk");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (mode === "reset") {
      if (!/^\S+@\S+\.\S+$/.test(email)) {
        setError("Masukkan alamat email yang valid.");
        return;
      }
      setNotice(`Demo: tautan reset kata sandi untuk ${email} tidak benar-benar dikirim — reset sungguhan butuh Supabase Auth + Resend (P1/P5). Di versi demo, masuk kembali dengan akun demo di bawah.`);
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError("Masukkan alamat email yang valid.");
      return;
    }
    if (password.length < 8) {
      setError("Kata sandi minimal 8 karakter.");
      return;
    }
    const session: DemoSession = {
      name: mode === "daftar" && name ? name : email.split("@")[0],
      email,
      role: "reader",
      verified: false,
    };
    setSession(session);
    router.push(session.verified ? "/" : "/verifikasi");
  }

  function loginDemo(session: DemoSession) {
    setSession(session);
    router.push(session.role === "admin_portal" ? "/redaksi" : session.role === "contributor" ? "/kontributor" : "/");
  }

  return (
    <div className="mx-auto max-w-md py-10">
      <h1 className="text-xl font-bold text-ink">{mode === "masuk" ? "Masuk ke iTAP Belitung" : mode === "daftar" ? "Daftar akun iTAP" : "Lupa kata sandi"}</h1>
      <p className="mt-1 text-sm text-muted">
        {mode === "reset"
          ? "Kami kirim tautan reset (berlaku 60 menit) ke emailmu."
          : "Satu akun untuk membaca, berkomentar, dan menulis sebagai kontributor."}
      </p>

      <div className="mt-4">
        <Banner tone="warning">
          Mode demo: belum ada Supabase Auth. Masuk dengan email apa pun akan membuat sesi demo lokal — bukan akun nyata.
        </Banner>
      </div>

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
        <Button type="submit" size="lg" className="w-full">
          {mode === "masuk" ? "Masuk" : mode === "daftar" ? "Buat akun" : "Kirim tautan reset"}
        </Button>
      </form>

      {mode !== "reset" && (
        <Button variant="secondary" size="lg" className="mt-3 w-full" onClick={() => setNotice("Demo: login Google belum tersambung — butuh Supabase Auth + proyek Google Cloud (P1/P3). Pilih akun demo di bawah untuk melanjutkan.")}>
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

      <section aria-labelledby="demo-title" className="mt-8 rounded-lg border border-line bg-surface p-4">
        <h2 id="demo-title" className="text-base font-semibold text-ink">Akun demo (tanpa kata sandi)</h2>
        <p className="mt-1 text-sm text-muted">Pilih peran untuk mencoba alur: pembaca, kontributor, atau redaksi.</p>
        <div className="mt-3 flex flex-col gap-2">
          {DEMO_ACCOUNTS.map((a) => (
            <Button key={a.label} variant="secondary" onClick={() => loginDemo(a.session)}>
              Masuk sebagai {a.label} — {a.session.email}
            </Button>
          ))}
        </div>
      </section>
    </div>
  );
}
