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
import { useLanguage } from "@/components/language-provider";
import { channelLabel } from "@/lib/labels";

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
  const { t, lang } = useLanguage();
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
        if (!c) { setError(t("tulis.notFound")); return; }
        setTitleId(c.title_id); setTitleEn(c.title_en);
        setBodyId(c.body_id); setBodyEn(c.body_en);
        setChannel(c.channel); setCategoryId(c.category_id);
        setLocation(c.location_name); setSource(c.source);
        setStatus(c.status);
      })
      .catch(() => setError(t("tulis.loadFailed")))
      .finally(() => setLoaded(true));
  }, [contributionId]);

  const channelCategories = categories.filter((c) => c.channel === channel);
  const locked = status === "review";
  const enMissing = titleEn.trim() === "" && bodyEn.trim() === "";
  const bodyValue = tab === "id" ? bodyId : bodyEn;
  const setBodyValue = tab === "id" ? setBodyId : setBodyEn;

  async function save(draft: boolean) {
    setError(""); setNotice("");
    if (!titleId.trim()) { setError(t("tulis.titleRequired")); return; }
    if (!bodyId.trim()) { setError(t("tulis.bodyRequired")); return; }
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
        throw new Error(j.error ?? t("common.saveFailed"));
      }
      const saved = await res.json();
      setSavedAt(new Date().toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }));
      if (draft) {
        setNotice(t("tulis.saved"));
        if (!contributionId) router.replace(`/kontributor/tulis/${saved.id}`);
      } else {
        setNotice(t("tulis.draftSavedContinue"));
      }
    } catch (e) {
      setError(e instanceof Error ? t("tulis.saveFailedPrefix", { msg: e.message }) : t("tulis.saveDraftFailed"));
    } finally {
      setSaving(false);
    }
  }

  async function submit() {
    if (!contributionId) {
      setError(t("tulis.submitFirst"));
      return;
    }
    setSaving(true);
    try {
      const res = await fetch(`/api/contributions/${contributionId}/submit`, { method: "POST" });
      if (!res.ok) throw new Error(t("tulis.submitFailed"));
      const saved = (await res.json()) as { status?: string };
      if (saved.status === "published") {
        setStatus("published");
        setNotice(t("tulis.publishedAuto"));
      } else {
        setStatus("review");
        setNotice(t("tulis.sentNote"));
      }
    } catch {
      setError(t("tulis.submitFailed"));
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
        <h1 className="text-xl font-bold text-ink">{contributionId ? t("tulis.editTitle") : t("tulis.newTitle")}</h1>
        <p className="mt-1 text-sm text-muted">
          {t("tulis.intro")}
          {savedAt && <span aria-live="polite"> {t("tulis.savedAt", { time: savedAt })}</span>}
        </p>
      </div>

      {locked && (
        <Banner tone="warning">
          {t("tulis.lockedBanner")}
        </Banner>
      )}
      {error && <Banner tone="error">{error}</Banner>}
      {notice && <Banner tone="success">{notice}</Banner>}

      {/* #09 Tab ID/EN */}
      <div role="tablist" aria-label={t("tulis.langAria")} className="flex gap-1 border-b border-line">
        {(["id", "en"] as const).map((langCode) => (
          <button
            key={langCode}
            type="button"
            role="tab"
            aria-selected={tab === langCode}
            onClick={() => setTab(langCode)}
            className={`h-10 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${tab === langCode ? "border-b-2 border-accent text-accent" : "text-muted"}`}
          >
            {langCode === "id" ? "Bahasa Indonesia" : "English"}
            {langCode === "en" && enMissing && <span className="ml-2 rounded-full bg-warning-soft px-2 py-0.5 text-xs font-semibold text-warning">{t("tulis.enMissingBadge")}</span>}
          </button>
        ))}
      </div>
      {tab === "en" && enMissing && (
        <Banner tone="info">
          {t("tulis.enMissingBanner")}
        </Banner>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-4 lg:col-span-2">
          <Field label={tab === "id" ? t("tulis.titleLabel") : t("tulis.titleEnLabel")} id="judul">
            <TextInput
              id="judul"
              value={tab === "id" ? titleId : titleEn}
              onChange={(e) => (tab === "id" ? setTitleId(e.target.value) : setTitleEn(e.target.value))}
              placeholder={tab === "id" ? t("tulis.titleIdPh") : t("tulis.titleEnPh")}
              disabled={locked}
            />
          </Field>

          {/* #15 Toolbar format */}
          <div>
            <span id="toolbar-label" className="text-sm font-semibold text-ink">{tab === "id" ? t("tulis.bodyLabel") : t("tulis.bodyEnLabel")}</span>
            <div role="toolbar" aria-labelledby="toolbar-label" className="mt-1 flex flex-wrap gap-1 rounded-t-md border border-b-0 border-line-input bg-surface p-1">
              {[
                { label: t("tulis.bold"), icon: <Bold className="size-4" aria-hidden="true" />, fn: () => insertAround(bodyRef.current, "**", "**", bodyValue, setBodyValue) },
                { label: t("tulis.italic"), icon: <Italic className="size-4" aria-hidden="true" />, fn: () => insertAround(bodyRef.current, "_", "_", bodyValue, setBodyValue) },
                { label: t("tulis.heading"), icon: <Heading2 className="size-4" aria-hidden="true" />, fn: () => insertAround(bodyRef.current, "## ", "", bodyValue, setBodyValue) },
                { label: t("tulis.list"), icon: <List className="size-4" aria-hidden="true" />, fn: () => insertAround(bodyRef.current, "- ", "", bodyValue, setBodyValue) },
                { label: t("tulis.link"), icon: <Link2 className="size-4" aria-hidden="true" />, fn: () => insertAround(bodyRef.current, "[", "](https://)", bodyValue, setBodyValue) },
              ].map((b) => (
                <button key={b.label} type="button" aria-label={b.label} aria-pressed={false} onClick={b.fn} disabled={locked} className="flex size-9 items-center justify-center rounded-md text-ink hover:bg-surface-alt focus-visible:outline-2 focus-visible:outline-accent disabled:opacity-50">
                  {b.icon}
                </button>
              ))}
              <span className="ml-auto self-center pr-2 text-xs text-muted">{t("tulis.formatHint")}</span>
            </div>
            <TextArea
              ref={bodyRef as never}
              id="isi"
              aria-label={tab === "id" ? t("tulis.bodyLabel") : t("tulis.bodyEnLabel")}
              value={bodyValue}
              onChange={(e) => setBodyValue(e.target.value)}
              placeholder={t("tulis.bodyPh")}
              disabled={locked}
              className="rounded-t-none"
            />
            <p aria-live="polite" className="mt-1 text-sm text-muted">{savedAt ? t("tulis.savedAt", { time: savedAt }) : t("tulis.notSaved")}</p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={() => setPreview((v) => !v)} variant="secondary" aria-pressed={preview}>
              {preview ? t("tulis.closePreview") : t("tulis.preview")}
            </Button>
            <Button onClick={() => save(true)} loading={saving} disabled={locked}>{t("tulis.saveDraft")}</Button>
            <Button onClick={submit} variant="secondary" loading={saving} disabled={locked || !contributionId}>
              {t("tulis.submit")}
            </Button>
          </div>

          {preview && (
            <section aria-label={t("tulis.previewAria")} className="rounded-lg border border-line bg-canvas p-6">
              <h2 className="text-xl font-bold text-ink">{titleId || t("tulis.noTitle")}</h2>
              <p className="mt-1 text-sm text-muted">{location || "Belitung"} · {channelLabel(channel, lang)}</p>
              <div className="mt-4 flex flex-col gap-3">
                {bodyId.split(/\n+/).filter(Boolean).map((p, i) => <p key={i} className="text-base leading-7 text-ink">{p}</p>)}
                {bodyId.trim() === "" && <p className="text-sm text-muted">{t("tulis.emptyBody")}</p>}
              </div>
            </section>
          )}
        </div>

        <aside className="flex flex-col gap-4" aria-label={t("tulis.settingsAria")}>
          <div className="rounded-lg border border-line bg-canvas p-4">
            <Field label={t("tulis.channel")} id="kanal">
              <SelectInput id="kanal" value={channel} onChange={(e) => { setChannel(e.target.value as Channel); setCategoryId(""); }} disabled={locked}>
                {(Object.keys(CHANNELS) as Channel[]).map((c) => <option key={c} value={c}>{channelLabel(c, lang)}</option>)}
              </SelectInput>
            </Field>
            <div className="mt-3">
              <Field label={t("tulis.category")} id="kategori">
                <SelectInput id="kategori" value={categoryId} onChange={(e) => setCategoryId(e.target.value)} disabled={locked}>
                  <option value="">{t("tulis.chooseCategory")}</option>
                  {channelCategories.map((c) => <option key={c.id} value={c.id}>{lang === "en" && c.name_en ? c.name_en : c.name_id}</option>)}
                </SelectInput>
              </Field>
            </div>
            <div className="mt-3">
              <Field label={t("tulis.location")} id="lokasi" hint={t("tulis.locationHint")}>
                <TextInput id="lokasi" value={location} onChange={(e) => setLocation(e.target.value)} placeholder={t("tulis.locationPh")} disabled={locked} />
              </Field>
            </div>
            <div className="mt-3">
              <Field label={t("tulis.source")} id="sumber" hint={t("tulis.sourceHint")}>
                <TextInput id="sumber" value={source} onChange={(e) => setSource(e.target.value)} placeholder={t("tulis.sourcePh")} disabled={locked} />
              </Field>
            </div>
          </div>

          <div className="rounded-lg border border-line bg-canvas p-4">
            <h2 className="text-base font-semibold text-ink">{t("tulis.gallery")}</h2>
            <p className="mt-1 text-sm text-muted">{t("tulis.galleryNote")}</p>
            <label htmlFor="foto" className="mt-3 inline-flex h-10 cursor-pointer items-center gap-2 rounded-md border border-line bg-canvas px-4 text-sm font-semibold text-ink hover:bg-surface focus-visible:outline-2 focus-visible:outline-accent">
              <ImagePlus className="size-4" aria-hidden="true" /> {t("tulis.choosePhoto")}
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
                {photos.map((p) => <li key={p}>• {p} <span className="text-xs">{t("tulis.demoPhotoNote")}</span></li>)}
              </ul>
            )}
            {photos.length === 0 && <p className="mt-3 text-sm text-muted">{t("tulis.noPhotos")}</p>}
          </div>

          <div className="rounded-lg border border-line bg-canvas p-4">
            <h2 className="text-base font-semibold text-ink">{t("tulis.helpTitle")}</h2>
            <p className="mt-1 text-sm text-muted">{t("tulis.helpText")}</p>
            <Button variant="ghost" size="sm" className="mt-2" onClick={() => setNotice(t("tulis.helpRequestNote"))}>
              {t("tulis.askHelp")}
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}

export default function EditorPage({ contributionId }: EditorProps) {
  const { t } = useLanguage();
  return (
    <RequireRole roles={["contributor", "admin_portal", "superadmin"]} title={t("tulis.title")}>
      <EditorForm contributionId={contributionId} />
    </RequireRole>
  );
}
