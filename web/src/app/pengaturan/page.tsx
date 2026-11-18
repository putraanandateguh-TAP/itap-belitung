// S18 Pengaturan akun — profil, bahasa, titik lokasi, notifikasi, hapus akun.
// Tersimpan ke backend via PATCH /api/me/profile (Supabase).
// Bahasa: pemilih langsung mengubah seluruh UI (cookie + localStorage +
// context) dan ikut tersimpan ke profil saat "Simpan pengaturan".
"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/session-client";
import { RequireRole } from "@/components/require-role";
import { Banner, Button, Field, LanguagePicker, Switch, TextInput } from "@/components/ui";
import { useLanguage } from "@/components/language-provider";
import type { Lang } from "@/lib/i18n";

function SettingsForm() {
  const { session, refresh } = useSession();
  const { lang: uiLang, setLang: applyLang, t } = useLanguage();
  const [name, setName] = useState("");
  const [lang, setLang] = useState<Lang>(uiLang);
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
      setNotice(t("settings.unblocked", { name }));
    } else {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? t("settings.unblockFailed"));
    }
  }

  useEffect(() => {
    if (!session) return;
    setName(session.displayName ?? "");
  }, [session]);

  useEffect(() => {
    fetch("/api/me/profile", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((p) => {
        if (!p) return;
        if (p.languagePref) { setLang(p.languagePref); applyLang(p.languagePref); }
        if (p.locationName) setLocations([p.locationName]);
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function changeLang(v: Lang) {
    setLang(v);
    applyLang(v);
  }

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
      if (!res.ok) throw new Error(data.error ?? t("settings.saveFailed"));
      setNotice(t("settings.saved"));
      refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("settings.saveFailed"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="flex flex-col gap-6 py-8">
      <h1 className="text-xl font-bold text-ink">{t("settings.title")}</h1>
      {notice && <Banner tone="success">{notice}</Banner>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <section aria-labelledby="profil-title" className="rounded-lg border border-line bg-canvas p-4">
        <h2 id="profil-title" className="text-lg font-semibold text-ink">{t("settings.profile")}</h2>
        <div className="mt-3 flex flex-col gap-4">
          <Field label={t("settings.displayName")} id="set-nama">
            <TextInput id="set-nama" value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label={t("settings.email")} id="set-email" hint={t("settings.emailHint")}>
            <TextInput id="set-email" type="email" value={session?.email ?? ""} disabled />
          </Field>
          <p className="text-sm text-muted">
            {t("settings.role")}: <strong className="text-ink">{session?.role}</strong> · {t("settings.verificationStatus")}:{" "}
            {session?.verified
              ? <span className="font-semibold text-success">{t("settings.verified")}</span>
              : <span className="font-semibold text-warning">{t("settings.notVerified")} — <a href="/verifikasi" className="text-accent hover:underline">{t("settings.verifyNow")}</a></span>}
          </p>
        </div>
      </section>

      <section aria-labelledby="bahasa-title" className="rounded-lg border border-line bg-canvas p-4">
        <h2 id="bahasa-title" className="text-lg font-semibold text-ink">{t("settings.language")}</h2>
        <div className="mt-3">
          <LanguagePicker value={lang} onChange={changeLang} />
          <p className="mt-2 text-sm text-muted">{t("settings.languageNote")}</p>
        </div>
      </section>

      <section aria-labelledby="lokasi-title" className="rounded-lg border border-line bg-canvas p-4">
        <h2 id="lokasi-title" className="text-lg font-semibold text-ink">{t("settings.location")}</h2>
        <p className="mt-1 text-sm text-muted">{t("settings.locationDesc")}</p>
        <ul className="mt-3 flex flex-col gap-2">
          {locations.map((loc) => (
            <li key={loc} className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2">
              <span className="text-sm text-ink">{loc}</span>
              <Button type="button" variant="ghost" size="sm" onClick={() => setLocations((ls) => ls.filter((x) => x !== loc))}>
                {t("settings.delete")}
              </Button>
            </li>
          ))}
          {locations.length === 0 && <li className="text-sm text-muted">{t("settings.noLocation")}</li>}
        </ul>
        <div className="mt-3 flex gap-2">
          <label htmlFor="lokasi-baru" className="sr-only">{t("settings.newLocation")}</label>
          <TextInput id="lokasi-baru" value={newLoc} onChange={(e) => setNewLoc(e.target.value)} placeholder={t("settings.locationPlaceholder")} />
          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const v = newLoc.trim();
              if (v && !locations.includes(v)) setLocations((ls) => [...ls, v]);
              setNewLoc("");
            }}
          >
            {t("settings.add")}
          </Button>
        </div>
      </section>

      <section aria-labelledby="blokir-title" className="rounded-lg border border-line bg-canvas p-4">
        <h2 id="blokir-title" className="text-lg font-semibold text-ink">{t("settings.blocked")}</h2>
        <p className="mt-1 text-sm text-muted">{t("settings.blockedDesc")}</p>
        {myBlocks.length === 0 ? (
          <p className="mt-3 text-sm text-muted">{t("settings.noBlocked")}</p>
        ) : (
          <ul className="mt-3 flex flex-col gap-2">
            {myBlocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between rounded-md border border-line bg-surface px-3 py-2">
                <span className="text-sm text-ink">{b.blocked_name}</span>
                <Button type="button" variant="ghost" size="sm" onClick={() => unblock(b.blocked_id, b.blocked_name)}>
                  {t("settings.unblock")}
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section aria-labelledby="notif-title" className="rounded-lg border border-line bg-canvas p-4">
        <h2 id="notif-title" className="text-lg font-semibold text-ink">{t("settings.notifications")}</h2>
        <div className="mt-3 flex flex-col gap-3">
          <Switch id="sw-notif" checked={notify} onChange={setNotify} label={t("settings.inAppNotif")} />
          <Switch id="sw-suara" checked={sound} onChange={setSound} label={t("settings.chatSound")} />
          <p className="text-sm text-muted">{t("settings.pushNote")}</p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button type="submit" loading={busy}>{t("settings.save")}</Button>
        <Button type="button" variant="danger" onClick={() => { window.location.href = "/hapus-akun"; }}>
          {t("settings.deleteAccount")}
        </Button>
      </div>
    </form>
  );
}

export default function PengaturanPage() {
  const { t } = useLanguage();
  return (
    <RequireRole roles={["reader", "contributor", "admin_portal", "superadmin"]} title={t("settings.title")}>
      <SettingsForm />
    </RequireRole>
  );
}
