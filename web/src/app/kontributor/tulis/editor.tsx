// S20 Editor kontributor — #09 Tab ID/EN, #15 Editor teks berformat,
// galeri, lokasi, preview, simpan draft. Terkunci saat review (recon F09).
// Auto-approve tidak aktif di demo; kiriman selalu masuk antrean redaksi.
"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bold, Heading2, ImagePlus, Italic, Link2, List } from "lucide-react";
import type { Category, Channel, Contribution } from "@/lib/types";
import { CHANNELS } from "@/lib/seed-data";
import { RequireRole } from "@/components/require-role";
import { Banner, Button, Field, SelectInput, TextArea, TextInput } from "@/components/ui";

interface EditorProps {
  contributionId?: string;
}

function insertAround(textarea: HTMLTextAreaElement | null, before: string, after: string, value: string, setValue: (v: string) => void) {
  if (!textarea) return;
  const start = textarea.selectionStart ?? value.length;
  const end = textarea.selectionEnd ?? value.length;
  const next = value.slice(0, start) + before + value.slice(start, end) + after + value.slice(end);
  setValue(next);
  requestAnimationFrame(() => {
    textarea.focus();
    textarea.setSelectionRange(start + before.length, end + before.length);
  });
}

function EditorForm({ contributionId }: EditorProps) {
  const router = useRouter();
  const [tab, setTab] = useState<"id" | "en">("id");
  const [titleId, setTitleId] = useState("");
  const [titleEn, setTitleEn] = useState("");
  const [bodyId, setBodyId] = useState("");
  const [bodyEn, setBodyEn] = useState("");
  const [channel, setChannel] = useState<Channel>("wisata");
  const [categoryId, setCategoryId] = useState("");
  const [categories, setCategories] = useState<Category[]>([]);
  const [location, setLocation] = useState("");
  const [source, setSource] = useState("");
  const [photos, setPhotos] = useState<string[]>([]);
  const [status, setStatus] = useState<Contribution["status"]>("draft");
  const [savedAt, setSavedAt] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!contributionId);
  const bodyRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then(setCategories).catch(() => setCategories([]));
  }, []);

  useEffect(() => {
    if (!contributionId) return;
    fetch(`/api/contributions/${contributionId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((c: Contribution | null) => {
        if (!c) { setError("Kiriman tidak ditemukan."); return; }
        setTitleId(c.title_id); setTitleEn(c.title_en);
        setBodyId(c.body_id); setBodyEn(c.body_en);
        setChannel(c.channel); setCategoryId(c.category_id);
        setLocation(c.location_name); setSource(c.source);
        setStatus(c.status);
      })
      .catch(() => setError("Gagal memuat kiriman."))
      .finally(() => setLoaded(true));
  }, [contributionId]);

  const channelCategories = categories.filter((c) => c.channel === channel);
  const locked = status === "review";
  const enMissing = titleEn.trim() === "" && bodyEn.trim() === "";
  const bodyValue = tab === "id" ? bodyId : bodyEn;
  const setBodyValue = tab === "id" ? setBodyId : setBodyEn;

  async function save(draft: boolean) {
    setError(""); setNotice("");
    if (!titleId.trim()) { setError("Judul bahasa Indonesia wajib diisi."); return; }
    if (!bodyId.trim()) { setError("Isi bahasa Indonesia wajib diisi."); return; }
    setSaving(true);
    try {
      const payload = {
        title_id: titleId, title_en: titleEn, body_id: bodyId, body_en: bodyEn,
        channel, category_id: categoryId || channelCategories[0]?.id || "",
        location_name: location, source,
      };
      const res = await fetch(contributionId ? `/api/contributions/${contributionId}` : "/api/contributions", {
        method: contributionId ? "PATCH" : "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? "gagal menyimpan");
      }
      const saved = await res.json();
      setSavedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }));
      if (draft) {
        setNotice("Draft tersimpan.");
        if (!contributionId) router.replace(`/kontributor/tulis/${saved.id}`);
      } else {
        setNotice("Draft tersimpan — lanjutkan ke pengiriman bila sudah siap.");
      }
    } catch (e) {
      setError(e instanceof Error ? `Tidak bisa menyimpan: ${e.message}` : "Tidak bisa menyimpan draf.");
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    if (!contributionId) {
      setError("Simpan draf dulu sebelum mengirim ke redaksi.");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/contributions/${contributionId}/submit`, { method: "POST" });
      if (!res.ok) throw new Error("gagal mengirim");
      setStatus("review");
      setNotice("Kirimanmu sudah dikirim ke redaksi. Artikel terkunci sampai ada keputusan redaksi.");
    } catch {
      setError("Tidak bisa mengirim ke redaksi sekarang. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return <div aria-busy="true" className="py-8"><div className="skeleton h-96 w-full" /></div>;
  }

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-xl font-bold text-ink">{contributionId ? "Ubah kiriman" : "Tulis cerita baru"}</h1>
        <p className="mt-1 text-sm text-muted">
          Tulis dalam bahasa Indonesia; terjemahan Inggris boleh menyusul. Kiriman ditinjau redaksi sebelum terbit.
          {savedAt && <span aria-live="polite"> Draft tersimpan · {savedAt}</span>}
        </p>
      </div>

      {locked && (
        <Banner tone="warning">
          Kiriman ini sedang ditinjau redaksi dan terkunci — perubahan berikutnya ditinjau ulang. Tunggu keputusan redaksi (terbit / catatan / minta perbaikan).
        </Banner>
      )}
      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      {/* #09 Tab ID/EN */}
      <div role="tablist" aria-label="Bahasa artikel" className="flex gap-1 border-b border-line">
        {(["id", "en"] as const).map((t) => (
          <button
            key={t}
            type="button"
            role="tab"
            aria-selected={tab === t}
            onClick={() => setTab(t)}
            className={`h-10 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${tab === t ? "border-b-2 border-accent text-accent" : "text-muted"}`}
          >
            {t === "id" ? "Bahasa Indonesia" : "English"}
            {t === "en" && enMissing && <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">Belum diterjemahkan</span>}
          </button>
        ))}
      </div>
      {tab === "en" && enMissing && (
        <Banner tone="info">
          Versi Inggris belum diisi — artikel tetap bisa dikirim dalam bahasa Indonesia. Pembaca akan melihat penjelasan ini di halaman artikel.
        </Banner>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Field label={tab === "id" ? "Judul (Indonesia)" : "Judul (English)"} id="judul">
            <TextInput
              id="judul"
              value={tab === "id" ? titleId : titleEn}
              onChange={(e) => (tab === "id" ? setTitleId(e.target.value) : setTitleEn(e.target.value))}
              placeholder={tab === "id" ? "Contoh: Pantai Tanjung Tinggi di Sore Hari" : "Contoh: Tanjung Tinggi Beach in the Afternoon"}
              disabled={locked}
            />
          </Field>

          {/* #15 Toolbar format */}
          <div>
            <span id="toolbar-label" className="text-sm font-semibold text-ink">Isi artikel ({tab === "id" ? "Indonesia" : "English"})</span>
            <div role="toolbar" aria-labelledby="toolbar-label" className="mt-1 flex flex-wrap gap-1 rounded-t-md border border-b-0 border-line-input bg-surface p-1">
              {[
                { label: "Tebal", icon: <Bold className="size-4" aria-hidden="true" />, fn: () => insertAround(bodyRef.current, "**", "**", bodyValue, setBodyValue) },
                { label: "Miring", icon: <Italic className="size-4" aria-hidden="true" />, fn: () => insertAround(bodyRef.current, "_", "_", bodyValue, setBodyValue) },
                { label: "Subjudul", icon: <Heading2 className="size-4" aria-hidden="true" />, fn: () => insertAround(bodyRef.current, "## ", "", bodyValue, setBodyValue) },
                { label: "Daftar", icon: <List className="size-4" aria-hidden="true" />, fn: () => insertAround(bodyRef.current, "- ", "", bodyValue, setBodyValue) },
                { label: "Tautan", icon: <Link2 className="size-4" aria-hidden="true" />, fn: () => insertAround(bodyRef.current, "[", "](https://)", bodyValue, setBodyValue) },
              ].map((b) => (
                <button key={b.label} type="button" aria-label={b.label} aria-pressed={false} onClick={b.fn} disabled={locked} className="flex size-9 items-center justify-center rounded-md text-ink hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50">
                  {b.icon}
                </button>
              ))}
              <span className="ml-auto self-center pr-2 text-xs text-muted">Format: tebal, miring, subjudul, daftar, tautan.</span>
            </div>
            <TextArea
              ref={bodyRef as never}
              id="isi"
              aria-label={tab === "id" ? "Isi artikel bahasa Indonesia" : "Isi artikel bahasa Inggris"}
              value={bodyValue}
              onChange={(e) => setBodyValue(e.target.value)}
              placeholder="Tulis ceritamu di sini… Satu ide per paragraf."
              disabled={locked}
              className="rounded-t-none"
            />
            <p aria-live="polite" className="mt-1 text-sm text-muted">{savedAt ? `Draft tersimpan · ${savedAt}` : "Belum tersimpan"}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setPreview((v) => !v)} variant="secondary" aria-pressed={preview}>
              {preview ? "Tutup pratinjau" : "Pratinjau"}
            </Button>
            <Button onClick={() => save(true)} loading={saving} disabled={locked}>Simpan draft</Button>
            <Button onClick={submit} variant="secondary" loading={saving} disabled={locked || !contributionId}>
              Kirim ke redaksi
            </Button>
          </div>

          {preview && (
            <section aria-label="Pratinjau artikel" className="rounded-lg border border-line bg-canvas p-6">
              <h2 className="text-xl font-bold text-ink">{titleId || "Tanpa judul"}</h2>
              <p className="mt-1 text-sm text-muted">{location || "Belitung"} · {CHANNELS[channel]}</p>
              <div className="mt-4 flex flex-col gap-3">
                {bodyId.split(/\n+/).filter(Boolean).map((p, i) => <p key={i} className="text-base leading-7 text-ink">{p}</p>)}
                {bodyId.trim() === "" && <p className="text-sm text-muted">Isi masih kosong.</p>}
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4" aria-label="Pengaturan artikel">
          <div className="rounded-lg border border-line bg-canvas p-4">
            <Field label="Kanal" id="kanal">
              <SelectInput id="kanal" value={channel} onChange={(e) => { setChannel(e.target.value as Channel); setCategoryId(""); }} disabled={locked}>
                {(Object.keys(CHANNELS) as Channel[]).map((c) => <option key={c} value={c}>{CHANNELS[c]}</option>)}
              </SelectInput>
            </Field>
            <div className="mt-3">
              <Field label="Kategori" id="kategori">
                <SelectInput id="kategori" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={locked}>
                  <option value="">Pilih kategori</option>
                  {channelCategories.map((c) => <option key={c.id} value={c.id}>{c.name_id}</option>)}
                </SelectInput>
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Lokasi" id="lokasi" hint="Nama tempat, contoh: Sijuk, Belitung.">
                <TextInput id="lokasi" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Sijuk, Belitung" disabled={locked} />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Sumber" id="sumber" hint="Sumber bacaan atau narasumber, bila ada.">
                <TextInput id="sumber" value={source} onChange={(e) => setSource(e.target.value)} placeholder="Wawancara / arsip iTAP" disabled={locked} />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-canvas p-4">
            <h2 className="text-base font-semibold text-ink">Galeri foto</h2>
            <p className="mt-1 text-sm text-muted">Foto dikompresi sebelum diunggah dan metadata lokasi dibuang (privasi). Maks 5 foto di demo.</p>
            <label htmlFor="foto" className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-line bg-canvas px-4 text-sm font-semibold text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent">
              <ImagePlus className="size-4" aria-hidden="true" /> Pilih foto
            </label>
            <input
              id="foto"
              type="file"
              accept="image/*"
              multiple
              disabled={locked}
              className="sr-only"
              onChange={(e) => {
                const names = Array.from(e.target.files ?? []).map((f) => f.name);
                setPhotos((prev) => [...prev, ...names].slice(0, 5));
              }}
            />
            {photos.length > 0 && (
              <ul className="mt-3 flex flex-col gap-1 text-sm text-muted">
                {photos.map((p) => <li key={p}>• {p} <span className="text-xs">(demo: nama file saja, belum diunggah)</span></li>)}
              </ul>
            )}
            {photos.length === 0 && <p className="mt-3 text-sm text-muted">Belum ada foto.</p>}
          </div>

          <div className="rounded-lg border border-line bg-canvas p-4">
            <h2 className="text-base font-semibold text-ink">Bantuan terjemahan</h2>
            <p className="mt-1 text-sm text-muted">Belum ada terjemahan Inggris? Redaksi bisa membantu — kirim dulu versi Indonesianya, lalu minta bantuan di dasbor kontributor.</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setNotice("Permintaan bantuan terjemahan dicatat (demo). Redaksi akan menghubungimu setelah artikel dikirim.")}>
              Minta bantuan terjemahan
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function EditorPage({ contributionId }: EditorProps) {
  return (
    <RequireRole roles={["contributor", "admin_portal", "superadmin"]} title="Editor kontributor">
      <EditorForm contributionId={contributionId} />
    </RequireRole>
  );
}
