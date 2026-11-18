// S18 Pengaturan akun — profil, bahasa, titik lokasi, notifikasi, hapus akun.
// Tersimpan ke backend via PATCH /api/me/profile (Supabase).
"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/session-client";
import { RequireRole } from "@/components/require-role";
import { Banner, Button, Field, LanguagePicker, Switch, TextInput } from "@/components/ui";

function SettingsForm() {
  const { session, refresh } = useSession();
  const [name, setName] = useState("");
  const [lang, setLang] = useState<"id" | "en">("id");
  const [locations, setLocations] = useState<string[]>([]);
  const [newLoc, setNewLoc] = useState("");
  const [notify, setNotify] = useState(true);
  const [sound, setSound] = useState(false);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [myBlocks, setMyBlocks] = useState<{ id: string; blocked_id: string; blocked_name: string; created_at: string }[]>([]);

  useEffect(() => {
    fetch("/api/me/blocks", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((d) => { if (Array.isArray(d)) setMyBlocks(d); })
      .catch(() => undefined);
  }, []);

  async function unblock(blockedId: string, name: string) {
    const res = await fetch(`/api/users/${blockedId}/unblock`, { method: "POST" });
    if (res.ok) {
      setMyBlocks((xs) => xs.filter((x) => x.blocked_id !== blockedId));
      setNotice(`Blokir atas ${name} dibuka.`);
    } else {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Tidak bisa membuka blokir.");
    }
  }

  useEffect(() => {
    if (!session) return;
    setName(session.displayName ?? "");
    setLang(session.emailVerified ? "id" : "id");
  }, [session]);

  useEffect(() => {
    fetch("/api/me/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!p) return;
        if (p.languagePref) setLang(p.languagePref);
        if (p.locationName) setLocations([p.locationName]);
      })
      .catch(() => undefined);
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const res = await fetch("/api/me/profile", {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: name.trim() || undefined,
          languagePref: lang,
          locationName: locations[0] ?? null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Tidak bisa menyimpan pengaturan.");
      setNotice("Pengaturan tersimpan.");
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tidak bisa menyimpan pengaturan.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6 py-8">
      <h1 className="text-xl font-bold text-ink">Pengaturan akun</h1>
      {notice && <Banner tone="success">{notice}</Banner>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <section aria-labelledby="profil-title" className="rounded-lg border border-line bg-canvas p-4">
        <h2 id="profil-title" className="text-lg font-semibold text-ink">Profil</h2>
        <div className="mt-3 flex flex-col gap-4">
          <Field label="Nama tampilan" id="set-nama">
            <TextInput id="set-nama" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" id="set-email" hint="Email tidak bisa diubah di sini.">
            <TextInput id="set-email" type="email" value={session?.email ?? ""} disabled />
          </Field>
          <p className="text-sm text-muted">
            Peran: <strong className="text-ink">{session?.role}</strong> · Status verifikasi:{" "}
            {session?.verified
              ? <span className="font-semibold text-success">Terverifikasi</span>
              : <span className="font-semibold text-warning">Belum terverifikasi — <a href="/verifikasi" className="text-accent hover:underline">verifikasi sekarang</a></span>}
          </p>
        </div>
      </section>

      <section aria-labelledby="bahasa-title" className="rounded-lg border border-line bg-canvas p-4">
        <h2 id="bahasa-title" className="text-lg font-semibold text-ink">Bahasa antarmuka</h2>
        <div className="mt-3">
          <LanguagePicker value={lang} onChange={setLang} />
          <p className="mt-2 text-sm text-muted">Bahasa konten artikel diatur per artikel di editor (tab ID/EN).</p>
        </div>
      </section>

      <section aria-labelledby="lokasi-title" className="rounded-lg border border-line bg-canvas p-4">
        <h2 id="lokasi-title" className="text-lg font-semibold text-ink">Titik lokasi</h2>
        <p className="mt-1 text-sm text-muted">Lokasi dipakai untuk konten sekitar dan (Fase 2) penawaran marketplace. Koordinat tidak disimpan — hanya nama wilayah.</p>
        <ul className="mt-3 flex flex-col gap-2">
          {locations.map((loc) => (
            <li key={loc} className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2">
              <span className="text-sm text-ink">{loc}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setLocations((ls) => ls.filter((x) => x !== loc))}>
                Hapus
              </Button>
            </li>
          ))}
          {locations.length === 0 && <li className="text-sm text-muted">Belum ada titik lokasi.</li>}
        </ul>
        <div className="mt-3 flex gap-2">
          <label htmlFor="lokasi-baru" className="sr-only">Nama wilayah baru</label>
          <TextInput id="lokasi-baru" value={newLoc} onChange={(e) => setNewLoc(e.target.value)} placeholder="Contoh: Manggar, Belitung Timur" />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const v = newLoc.trim();
              if (v && !locations.includes(v)) setLocations((ls) => [...ls, v]);
              setNewLoc("");
            }}
          >
            Tambah
          </Button>
        </div>
      </section>

      <section aria-labelledby="blokir-title" className="rounded-lg border border-line bg-canvas p-4">
        <h2 id="blokir-title" className="text-lg font-semibold text-ink">Akun yang diblokir</h2>
        <p className="mt-1 text-sm text-muted">Akun yang diblokir tidak bisa menghubungimu lewat chat marketplace. Daftar lengkap + kelola redaksi ada di Ruang Redaksi (tab Blokir).</p>
        {myBlocks.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Kamu belum memblokir akun siapa pun.</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {myBlocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2">
                <span className="text-sm text-ink">{b.blocked_name}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => unblock(b.blocked_id, b.blocked_name)}>
                  Buka blokir
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="notif-title" className="rounded-lg border border-line bg-canvas p-4">
        <h2 id="notif-title" className="text-lg font-semibold text-ink">Notifikasi</h2>
        <div className="mt-3 flex flex-col gap-3">
          <Switch id="sw-notif" checked={notify} onChange={setNotify} label="Notifikasi dalam aplikasi" />
          <Switch id="sw-suara" checked={sound} onChange={setSound} label="Suara notifikasi chat (butuh izin perangkat)" />
          <p className="text-sm text-muted">Notifikasi push (FCM) butuh proyek Firebase sendiri (P4) — aktif di Fase 3 (Android).</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy}>Simpan pengaturan</Button>
        <Button type="button" variant="danger" onClick={() => { window.location.href = "/hapus-akun"; }}>
          Hapus akun…
        </Button>
      </div>
    </form>
  );
}

export default function PengaturanPage() {
  return (
    <RequireRole roles={["reader", "contributor", "admin_portal", "superadmin"]} title="Pengaturan akun">
      <SettingsForm />
    </RequireRole>
  );
}
