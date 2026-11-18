// S18 Pengaturan akun — profil, bahasa, titik lokasi (tambah/ubah/hapus),
// notifikasi, hapus akun. DEMO: perubahan tersimpan lokal (sesi demo).
"use client";

import { useState } from "react";
import { getSession, setSession } from "@/lib/auth";
import { RequireRole, useSession } from "@/components/require-role";
import { Banner, Button, Field, LanguagePicker, Switch, TextInput } from "@/components/ui";

function SettingsForm() {
  const session = useSession();
  const [name, setName] = useState(session?.name ?? "");
  const [lang, setLang] = useState<"id" | "en">("id");
  const [locations, setLocations] = useState<string[]>(["Tanjung Pandan, Belitung"]);
  const [newLoc, setNewLoc] = useState("");
  const [notify, setNotify] = useState(true);
  const [sound, setSound] = useState(false);
  const [notice, setNotice] = useState("");

  function save(e: React.FormEvent) {
    e.preventDefault();
    if (session) setSession({ ...session, name: name || session.name });
    setNotice("Pengaturan tersimpan (demo — hanya di perangkat ini).");
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6 py-8">
      <h1 className="text-xl font-bold text-ink">Pengaturan akun</h1>
      {notice && <Banner tone="success">{notice}</Banner>}

      <section aria-labelledby="profil-title" className="rounded-lg border border-line bg-canvas p-4">
        <h2 id="profil-title" className="text-lg font-semibold text-ink">Profil</h2>
        <div className="mt-3 flex flex-col gap-4">
          <Field label="Nama tampilan" id="set-nama">
            <TextInput id="set-nama" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="Email" id="set-email" hint="Email tidak bisa diubah di versi demo.">
            <TextInput id="set-email" type="email" value={session?.email ?? ""} disabled />
          </Field>
          <p className="text-sm text-muted">
            Peran: <strong className="text-ink">{session?.role}</strong> · Status verifikasi:{" "}
            {session?.verified ? <span className="font-semibold text-success">Terverifikasi (demo)</span> : <span className="font-semibold text-warning">Belum terverifikasi — <a href="/verifikasi" className="text-accent hover:underline">verifikasi sekarang</a></span>}
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

      <section aria-labelledby="notif-title" className="rounded-lg border border-line bg-canvas p-4">
        <h2 id="notif-title" className="text-lg font-semibold text-ink">Notifikasi</h2>
        <div className="mt-3 flex flex-col gap-3">
          <Switch id="sw-notif" checked={notify} onChange={setNotify} label="Notifikasi dalam aplikasi" />
          <Switch id="sw-suara" checked={sound} onChange={setSound} label="Suara notifikasi chat (butuh izin perangkat)" />
          <p className="text-sm text-muted">Notifikasi push (FCM) butuh proyek Firebase sendiri (P4) — aktif di Fase 3 (Android).</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit">Simpan pengaturan</Button>
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
