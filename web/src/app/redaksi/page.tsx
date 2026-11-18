// S21 CMS / Ruang Redaksi + S22 Moderasi — kelola konten, kategori,
// kontributor, antrean laporan + flag, kamus kata superadmin, komentar
// tertunda, penawaran untuk moderasi, kurasi info warga, dan blokir akun.
// Data dari /api/admin/* (DB nyata; mode seed memakai store in-memory).
// Peran: admin_portal+; kamus kata hanya superadmin (gate 403).
"use client";

import { useCallback, useEffect, useState } from "react";
import { RequireRole } from "@/components/require-role";
import { RevisionHistory } from "@/components/revision-history";
import { useSession } from "@/lib/session-client";
import { Banner, Button, EmptyState, Field, SelectInput, StatusBadge, TextArea, TextInput } from "@/components/ui";
import type { Article, BlockEntry, Category, Comment, InfoSubmission, ModerationWord, Report } from "@/lib/types";
import { channelLabel } from "@/lib/labels";
import { formatDateWIB } from "@/lib/format";
import { useLanguage } from "@/components/language-provider";
import { listingCategoryName } from "@/lib/i18n";

type Tab = "konten" | "kategori" | "kontributor" | "laporan" | "kata" | "komentar" | "penawaran" | "info" | "blokir";

type ReportAction = "hidden" | "dismissed" | "reviewed" | "unblock" | "disable_listing";

interface ContributorRow { id: string; name: string; email: string; verified: boolean; auto_approve: boolean; points: number }
interface AdminListingRow { id: string; title: string; price_cents: number; status: string; seller_id: string; category: string; created_at: string }

async function postJson(url: string, body: unknown, fallback: string): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: (data as { error?: string }).error ?? fallback };
  return { ok: true, message: "" };
}

function ReviewModal({
  article, onClose, onDone,
}: {
  article: Article;
  onClose: () => void;
  onDone: () => void;
}) {
  const { lang, t } = useLanguage();
  const [decision, setDecision] = useState<"publish" | "unpublish" | "return">("publish");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/admin/articles/${article.id}/review`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ decision, note }),
      });
      if (!res.ok) throw new Error("gagal");
      onDone();
      onClose();
    } catch {
      setError(t("redaksi.saveFailed"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="review-title" className="fixed inset-0 z-50 flex items-end justify-center bg-surface-dark-deep/50 sm:items-center">
      <div className="w-full max-w-xl rounded-lg bg-canvas p-6 shadow-pop">
        <h2 id="review-title" className="text-lg font-semibold text-ink">{t("redaksi.reviewTitle", { title: article.title_id })}</h2>
        <p className="mt-1 text-sm text-muted">{channelLabel(article.channel, lang)} · {formatDateWIB(article.published_at, lang)} · {article.views} {t("common.reads")}</p>
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-ink">{t("redaksi.decision")}</legend>
          <div className="mt-2 flex flex-col gap-2">
            {([
              ["publish", "redaksi.publish"],
              ["return", "redaksi.return"],
              ["unpublish", "redaksi.unpublish"],
            ] as const).map(([v, key]) => (
              <label key={v} className="flex items-center gap-2 text-sm text-ink">
                <input type="radio" name="decision" value={v} checked={decision === v} onChange={() => setDecision(v)} className="size-4 accent-[#2563EB]" />
                {t(key)}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4">
          <Field label={t("redaksi.decisionNote")} id="catatan" hint={t("redaksi.decisionNoteHint")}>
            <TextArea id="catatan" value={note} onChange={(e) => setNote(e.target.value)} placeholder={t("redaksi.decisionNotePlaceholder")} />
          </Field>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex gap-2">
          <Button onClick={save} loading={saving}>{t("redaksi.saveDecision")}</Button>
          <Button variant="secondary" onClick={onClose}>{t("common.cancel")}</Button>
        </div>
      </div>
    </div>
  );
}

function RedaksiContent() {
  const { session } = useSession();
  const { lang, t } = useLanguage();
  const targetName = (tt: Report["target_type"]) =>
    tt === "listing" ? t("redaksi.targetOffer") : tt === "account" ? t("redaksi.targetAccount") : t("redaksi.targetComment");
  const isSuperadmin = session?.role === "superadmin";
  const [tab, setTab] = useState<Tab>("konten");
  const [articles, setArticles] = useState<Article[]>([]);
  const [statusFilter, setStatusFilter] = useState("semua");
  const [categories, setCategories] = useState<Category[]>([]);
  const [contributors, setContributors] = useState<ContributorRow[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [reportFilter, setReportFilter] = useState("semua");
  const [words, setWords] = useState<ModerationWord[]>([]);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [listings, setListings] = useState<AdminListingRow[]>([]);
  const [listingFilter, setListingFilter] = useState("semua");
  const [infoSubs, setInfoSubs] = useState<InfoSubmission[]>([]);
  const [infoFilter, setInfoFilter] = useState("pending");
  const [myBlocks, setMyBlocks] = useState<BlockEntry[]>([]);
  const [allBlocks, setAllBlocks] = useState<BlockEntry[]>([]);
  const [reviewTarget, setReviewTarget] = useState<Article | null>(null);
  const [historyTarget, setHistoryTarget] = useState<Article | null>(null);
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [seedMode, setSeedMode] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [newCatChannel, setNewCatChannel] = useState("wisata");
  const [newWord, setNewWord] = useState("");
  const [newWordAction, setNewWordAction] = useState<"sensor" | "hold">("hold");
  const [editWord, setEditWord] = useState<{ id: string; word: string; action: "sensor" | "hold" } | null>(null);
  const [confirmDeleteWord, setConfirmDeleteWord] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const me = await fetch("/api/me").then((r) => (r.ok ? r.json() : null)).catch(() => null);
      if (me && me.configured === false) setSeedMode(true);
      const get = async (url: string) => {
        const r = await fetch(url);
        if (!r.ok) return null;
        return r.json() as Promise<unknown>;
      };
      const [a, c, co, r, w, pc, l, inf, mb, ab] = await Promise.all([
        get(`/api/admin/articles?status=${statusFilter}`),
        get("/api/admin/categories"),
        get("/api/admin/contributors"),
        get(`/api/admin/reports`),
        get("/api/admin/moderation-words"),
        get("/api/admin/comments"),
        get(`/api/admin/listings${listingFilter === "semua" ? "" : `?status=${listingFilter}`}`),
        get(`/api/admin/info-submissions${infoFilter === "semua" ? "" : `?status=${infoFilter}`}`),
        get("/api/me/blocks"),
        get("/api/admin/blocks"),
      ]);
      if (Array.isArray(a)) setArticles(a as Article[]);
      if (Array.isArray(c)) setCategories(c as Category[]);
      if (Array.isArray(co)) setContributors(co as ContributorRow[]);
      // GET /api/admin/reports tidak punya filter status — saring di client.
      if (Array.isArray(r)) {
        const all = r as Report[];
        setReports(reportFilter === "semua" ? all : all.filter((x) => x.status === reportFilter));
      }
      if (Array.isArray(w)) setWords(w as ModerationWord[]);
      if (Array.isArray(pc)) setPendingComments(pc as Comment[]);
      if (Array.isArray(l)) setListings(l as AdminListingRow[]);
      if (Array.isArray(inf)) setInfoSubs(inf as InfoSubmission[]);
      if (Array.isArray(mb)) setMyBlocks(mb as BlockEntry[]);
      if (Array.isArray(ab)) setAllBlocks(ab as BlockEntry[]);
    } catch {
      setError(t("redaksi.loadFailed"));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, reportFilter, listingFilter, infoFilter]);

  useEffect(() => { loadAll(); }, [loadAll]);

  async function run(p: Promise<{ ok: boolean; message: string }>, okMsg: string) {
    setError("");
    setNotice("");
    const res = await p;
    if (!res.ok) {
      setError(res.message);
      return;
    }
    setNotice(okMsg);
    loadAll();
  }

  async function addCategory(e: React.FormEvent) {
    e.preventDefault();
    if (!newCatName.trim()) return;
    const res = await fetch("/api/admin/categories", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name_id: newCatName.trim(), name_en: "", channel: newCatChannel }),
    });
    if (res.ok) {
      setNewCatName("");
      setNotice(t("redaksi.addCategoryOk"));
      loadAll();
    } else {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? t("redaksi.addCategoryFailed"));
    }
  }

  async function contributorPatch(id: string, patch: { verification_status?: string; auto_approve?: boolean }, okMsg: string) {
    const res = await fetch(`/api/admin/contributors/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) {
      setNotice(okMsg);
      loadAll();
    } else {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? t("redaksi.contributorFailed"));
    }
  }

  async function reportAction(id: string, action: ReportAction) {
    await run(
      postJson(`/api/admin/reports/${id}/action`, { action }, t("redaksi.genericSaveFailed")),
      action === "hidden" ? t("redaksi.reportHidden")
      : action === "disable_listing" ? t("redaksi.reportDisabled")
      : action === "unblock" ? t("redaksi.reportUnblocked")
      : action === "dismissed" ? t("redaksi.reportDismissed")
      : t("redaksi.reportReviewed"),
    );
  }

  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    if (!newWord.trim()) return;
    await run(
      postJson("/api/admin/moderation-words", { word: newWord.trim(), action: newWordAction }, t("redaksi.genericSaveFailed")),
      t("redaksi.wordAdded", { word: newWord.trim(), action: newWordAction === "hold" ? t("redaksi.wordActionHold") : t("redaksi.wordActionCensor") }),
    );
    setNewWord("");
  }

  async function saveEditWord() {
    if (!editWord || !editWord.word.trim()) return;
    await run(
      (async () => {
        const res = await fetch(`/api/admin/moderation-words/${editWord.id}`, {
          method: "PATCH",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ word: editWord.word.trim(), action: editWord.action }),
        });
        const data = await res.json().catch(() => ({}));
        return res.ok ? { ok: true, message: "" } : { ok: false, message: (data as { error?: string }).error ?? t("redaksi.wordEditFailed") };
      })(),
      t("redaksi.wordChanged"),
    );
    setEditWord(null);
  }

  async function deleteWord(id: string) {
    await run(
      (async () => {
        const res = await fetch(`/api/admin/moderation-words/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        return res.ok ? { ok: true, message: "" } : { ok: false, message: (data as { error?: string }).error ?? t("redaksi.wordDeleteFailed") };
      })(),
      t("redaksi.wordDeleted"),
    );
    setConfirmDeleteWord(null);
  }

  const tabs: { id: Tab; key: string }[] = [
    { id: "konten", key: "redaksi.tabContent" },
    { id: "kategori", key: "redaksi.tabCategories" },
    { id: "kontributor", key: "redaksi.tabContributors" },
    { id: "laporan", key: "redaksi.tabReports" },
    { id: "kata", key: "redaksi.tabWords" },
    { id: "komentar", key: "redaksi.tabComments" },
    { id: "penawaran", key: "redaksi.tabListings" },
    { id: "info", key: "redaksi.tabInfo" },
    { id: "blokir", key: "redaksi.tabBlock" },
  ];

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-xl font-bold text-ink">{t("redaksi.title")}</h1>
        <p className="mt-1 text-sm text-muted">{t("redaksi.subtitle")}</p>
      </div>
      {seedMode && (
        <Banner tone="warning">
          {t("redaksi.seedBanner")}
        </Banner>
      )}
      {notice && <Banner tone="success">{notice}</Banner>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div role="tablist" aria-label={t("redaksi.tabs")} className="flex flex-wrap gap-1 border-b border-line">
        {tabs.map((tb) => (
          <button
            key={tb.id}
            type="button"
            role="tab"
            aria-selected={tab === tb.id}
            onClick={() => setTab(tb.id)}
            className={`h-10 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${tab === tb.id ? "border-b-2 border-accent text-accent" : "text-muted"}`}
          >
            {t(tb.key)}
            {tb.id === "laporan" && reports.some((r) => r.status === "open") && <span className="ml-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">{reports.filter((r) => r.status === "open").length}</span>}
            {tb.id === "komentar" && pendingComments.length > 0 && <span className="ml-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">{pendingComments.length}</span>}
            {tb.id === "info" && infoSubs.some((s) => s.status === "pending") && <span className="ml-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">{infoSubs.filter((s) => s.status === "pending").length}</span>}
          </button>
        ))}
      </div>

      {loading && <div aria-busy="true"><div className="skeleton h-64 w-full" /></div>}

      {!loading && tab === "konten" && (
        <section aria-label={t("redaksi.tableContent")}>
          <div className="mb-3 flex gap-2">
            <label htmlFor="status-filter" className="sr-only">{t("redaksi.filterStatus")}</label>
            <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
              <option value="semua">{t("redaksi.allStatuses")}</option>
              <option value="published">{t("ui.statusPublished")}</option>
              <option value="review">{t("ui.statusReview")}</option>
              <option value="draft">{t("ui.statusDraft")}</option>
              <option value="returned">{t("ui.statusReturned")}</option>
              <option value="unpublished">{t("ui.statusUnpublished")}</option>
            </select>
          </div>
          {articles.length === 0 ? (
            <EmptyState title={t("redaksi.noPending")} desc={t("redaksi.noPendingDesc")} />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line bg-canvas" tabIndex={0} role="region" aria-label="Tabel konten">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface text-xs uppercase text-muted">
                    <th scope="col" className="px-4 py-3">{t("redaksi.colTitle")}</th>
                    <th scope="col" className="px-4 py-3">{t("redaksi.colChannel")}</th>
                    <th scope="col" className="px-4 py-3">{t("redaksi.colStatus")}</th>
                    <th scope="col" className="px-4 py-3">{t("redaksi.colViews")}</th>
                    <th scope="col" className="px-4 py-3">{t("redaksi.colActions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.slice(0, 20).map((a) => (
                    <tr key={a.id} className="border-b border-line last:border-0">
                      <td className="max-w-xs px-4 py-3 font-semibold text-ink">{a.title_id}</td>
                      <td className="px-4 py-3 text-muted">{channelLabel(a.channel, lang)}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-3 text-muted">{a.views.toLocaleString(lang === "en" ? "en-US" : "id-ID")}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          <Button variant="ghost" size="sm" onClick={() => setReviewTarget(a)}>
                            {t("redaksi.review", { title: a.title_id.slice(0, 24) })}
                          </Button>
                          <Button variant="ghost" size="sm" onClick={() => setHistoryTarget(historyTarget?.id === a.id ? null : a)} aria-expanded={historyTarget?.id === a.id}>
                            {historyTarget?.id === a.id ? t("redaksi.closeHistory") : t("redaksi.history")}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-3 text-xs text-muted">{t("redaksi.showing", { shown: Math.min(articles.length, 20), total: articles.length })}</p>
            </div>
          )}
          {historyTarget && (
            <section aria-labelledby="riwayat-redaksi-title" className="mt-4">
              <div className="flex items-center justify-between gap-2">
                <h2 id="riwayat-redaksi-title" className="text-base font-semibold text-ink">
                  {t("redaksi.historyTitle", { title: historyTarget.title_id })}
                </h2>
                <Button size="sm" variant="ghost" onClick={() => setHistoryTarget(null)}>{t("common.close")}</Button>
              </div>
              <div className="mt-3">
                <RevisionHistory contributionId={historyTarget.id} title={historyTarget.title_id} />
              </div>
            </section>
          )}
        </section>
      )}

      {!loading && tab === "kategori" && (
        <section aria-label={t("redaksi.manageCategories")} className="flex flex-col gap-6">
          <form onSubmit={addCategory} className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-canvas p-4">
            <Field label={t("redaksi.newCategory")} id="kat-baru">
              <TextInput id="kat-baru" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder={t("redaksi.catPlaceholder")} />
            </Field>
            <Field label={t("redaksi.channel")} id="kat-kanal">
              <select id="kat-kanal" value={newCatChannel} onChange={(e) => setNewCatChannel(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
                <option value="berita">{channelLabel("berita", lang)}</option>
                <option value="kuliner">{channelLabel("kuliner", lang)}</option>
                <option value="wisata">{channelLabel("wisata", lang)}</option>
                <option value="sejarah">{channelLabel("sejarah", lang)}</option>
                <option value="budaya">{channelLabel("budaya", lang)}</option>
                <option value="legenda">{channelLabel("legenda", lang)}</option>
              </select>
            </Field>
            <Button type="submit">{t("redaksi.addCategory")}</Button>
          </form>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <li key={c.id} className="rounded-lg border border-line bg-canvas px-4 py-3 text-sm">
                <span className="font-semibold text-ink">{lang === "en" && c.name_en ? c.name_en : c.name_id}</span> <span className="text-muted">· {channelLabel(c.channel, lang)} · /{c.slug}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && tab === "kontributor" && (
        <section aria-label={t("redaksi.manageContributors")}>
          <div className="overflow-x-auto rounded-lg border border-line bg-canvas" tabIndex={0} role="region" aria-label="Tabel kontributor">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs uppercase text-muted">
                  <th scope="col" className="px-4 py-3">{t("redaksi.colName")}</th>
                  <th scope="col" className="px-4 py-3">{t("redaksi.colEmail")}</th>
                  <th scope="col" className="px-4 py-3">{t("redaksi.colVerified")}</th>
                  <th scope="col" className="px-4 py-3">{t("redaksi.colAuto")}</th>
                  <th scope="col" className="px-4 py-3">{t("redaksi.colPoints")}</th>
                  <th scope="col" className="px-4 py-3">{t("redaksi.colActions")}</th>
                </tr>
              </thead>
              <tbody>
                {contributors.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">{c.name}</td>
                    <td className="px-4 py-3 text-muted">{c.email}</td>
                    <td className="px-4 py-3">{c.verified ? <span className="font-semibold text-success">{t("redaksi.yes")}</span> : <span className="text-warning">{t("redaksi.no")}</span>}</td>
                    <td className="px-4 py-3">{c.auto_approve ? t("redaksi.active") : t("redaksi.inactive")}</td>
                    <td className="px-4 py-3 text-muted">{c.points}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => contributorPatch(c.id, { verification_status: c.verified ? "unverified" : "verified" }, c.verified ? t("redaksi.unverifiedMsg") : t("redaksi.verifiedMsg"))}>
                          {c.verified ? t("redaksi.revokeVerify") : t("redaksi.verify")}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => contributorPatch(c.id, { auto_approve: !c.auto_approve }, c.auto_approve ? t("redaksi.autoOff") : t("redaksi.autoOn"))}>
                          {c.auto_approve ? t("redaksi.disableAuto") : t("redaksi.enableAuto")}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!loading && tab === "laporan" && (
        <section aria-label={t("redaksi.reportQueue")} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="laporan-filter" className="sr-only">{t("redaksi.filterReports")}</label>
            <select id="laporan-filter" value={reportFilter} onChange={(e) => setReportFilter(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
              <option value="semua">{t("redaksi.allStatuses")}</option>
              <option value="open">{t("ui.statusOpen")}</option>
              <option value="reviewed">{t("ui.statusReviewed")}</option>
              <option value="hidden">{t("ui.statusHidden")}</option>
              <option value="dismissed">{t("ui.statusDismissed")}</option>
            </select>
            <p className="text-sm text-muted">{t("redaksi.reportHint")}</p>
          </div>
          {reports.length === 0 ? (
            <EmptyState title={t("redaksi.noReports")} desc={t("redaksi.noReportsDesc")} />
          ) : (
            <ul className="flex flex-col gap-3">
              {reports.map((r) => (
                <li key={r.id} className="rounded-lg border border-line bg-canvas p-4">
                  <p className="font-semibold text-ink">{targetName(r.target_type)}: {r.target_label}</p>
                  <p className="mt-1 text-sm text-muted">{t("redaksi.reporter")}: {r.reporter} · {formatDateWIB(r.created_at, lang)}</p>
                  <p className="mt-1 text-sm text-ink">{t("redaksi.reason")}: {r.reason}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.status === "open" && (
                      <>
                        {(r.target_type === "listing" || r.target_type === "comment") && (
                          <Button size="sm" variant="secondary" onClick={() => reportAction(r.id, "hidden")}>{t("redaksi.hideMaterial")}</Button>
                        )}
                        {r.target_type === "listing" && (
                          <Button size="sm" variant="secondary" onClick={() => reportAction(r.id, "disable_listing")}>{t("redaksi.disableListing")}</Button>
                        )}
                        {r.target_type === "account" && (
                          <Button size="sm" variant="secondary" onClick={() => reportAction(r.id, "unblock")}>{t("redaksi.unblockAccount")}</Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => reportAction(r.id, "reviewed")}>{t("redaksi.markReviewed")}</Button>
                        <Button size="sm" variant="ghost" onClick={() => reportAction(r.id, "dismissed")}>{t("redaksi.dismissReport")}</Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!loading && tab === "kata" && (
        <section aria-label={t("redaksi.wordsTitle")} className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            {t("redaksi.wordsDesc")} {isSuperadmin ? "" : t("redaksi.wordsReadOnly")}
          </p>
          {isSuperadmin && (
            <form onSubmit={addWord} className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-canvas p-4">
              <Field label={t("redaksi.newWord")} id="kata-baru">
                <TextInput id="kata-baru" value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder={t("redaksi.wordPlaceholder")} />
              </Field>
              <Field label={t("redaksi.wordAction")} id="kata-aksi">
                <SelectInput id="kata-aksi" value={newWordAction} onChange={(e) => setNewWordAction(e.target.value as "sensor" | "hold")}>
                  <option value="hold">{t("redaksi.actionHold")}</option>
                  <option value="sensor">{t("redaksi.censor")}</option>
                </SelectInput>
              </Field>
              <Button type="submit">{t("redaksi.addWord")}</Button>
            </form>
          )}
          {words.length === 0 ? (
            <EmptyState title={t("redaksi.wordsEmpty")} desc={t("redaksi.wordsEmptyDesc")} />
          ) : (
            <ul className="flex flex-col gap-2">
              {words.map((w) => (
                <li key={w.id} className="rounded-lg border border-line bg-canvas px-4 py-3 text-sm">
                  {editWord?.id === w.id ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <label htmlFor={`edit-kata-${w.id}`} className="sr-only">{t("redaksi.editWord")}</label>
                      <TextInput id={`edit-kata-${w.id}`} value={editWord.word} onChange={(e) => setEditWord({ ...editWord, word: e.target.value })} />
                      <label htmlFor={`edit-aksi-${w.id}`} className="sr-only">{t("redaksi.editAction")}</label>
                      <SelectInput id={`edit-aksi-${w.id}`} value={editWord.action} onChange={(e) => setEditWord({ ...editWord, action: e.target.value as "sensor" | "hold" })}>
                        <option value="hold">{t("redaksi.actionHold")}</option>
                        <option value="sensor">{t("redaksi.censor")}</option>
                      </SelectInput>
                      <Button size="sm" onClick={saveEditWord}>{t("redaksi.save")}</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditWord(null)}>{t("common.cancel")}</Button>
                    </span>
                  ) : (
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <span className="font-mono font-semibold text-ink">{w.word}</span>{" "}
                        <StatusBadge status={w.action === "hold" ? "review" : "rejected"} />
                      </span>
                      {isSuperadmin && (
                        <span className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setEditWord({ id: w.id, word: w.word, action: w.action })}>{t("redaksi.edit")}</Button>
                          {confirmDeleteWord === w.id ? (
                            <>
                              <Button size="sm" variant="danger" onClick={() => deleteWord(w.id)}>{t("redaksi.confirmDelete")}</Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteWord(null)}>{t("common.cancel")}</Button>
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteWord(w.id)}>{t("redaksi.delete")}</Button>
                          )}
                        </span>
                      )}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!loading && tab === "komentar" && (
        <section aria-label={t("redaksi.pendingComments")} className="flex flex-col gap-3">
          {pendingComments.length === 0 ? (
            <EmptyState title={t("redaksi.noPendingComments")} desc={t("redaksi.noPendingCommentsDesc")} />
          ) : (
            <ul className="flex flex-col gap-3">
              {pendingComments.map((c) => (
                <li key={c.id} className="rounded-lg border border-line bg-canvas p-4">
                  <p className="text-sm font-semibold text-ink">{c.author_name} <span className="font-normal text-muted">· {formatDateWIB(c.created_at, lang)}</span></p>
                  <p className="mt-1 text-base text-ink">{c.text}</p>
                  <p className="mt-1 text-xs text-muted">{t("redaksi.onArticle")}: {c.article_slug}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => run(postJson(`/api/admin/comments/${c.id}/review`, { decision: "approved" }, t("redaksi.genericSaveFailed")), t("redaksi.commentApproved"))}>{t("redaksi.approve")}</Button>
                    <Button size="sm" variant="secondary" onClick={() => run(postJson(`/api/admin/comments/${c.id}/review`, { decision: "rejected" }, t("redaksi.genericSaveFailed")), t("redaksi.commentRejected"))}>{t("redaksi.reject")}</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted">{t("redaksi.aiNote")}</p>
        </section>
      )}

      {!loading && tab === "penawaran" && (
        <section aria-label={t("redaksi.listingsModeration")} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="penawaran-filter" className="sr-only">{t("redaksi.filterListings")}</label>
            <select id="penawaran-filter" value={listingFilter} onChange={(e) => setListingFilter(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
              <option value="semua">{t("redaksi.allStatuses")}</option>
              <option value="aktif">{t("ui.statusAktif")}</option>
              <option value="dinonaktifkan">{t("ui.statusDinonaktifkan")}</option>
              <option value="terjual">{t("ui.statusTerjual")}</option>
              <option value="dihapus">{t("ui.statusDihapus")}</option>
            </select>
            <p className="text-sm text-muted">{t("redaksi.listingsHint")}</p>
          </div>
          {listings.length === 0 ? (
            <EmptyState title={t("redaksi.noListings")} desc={t("redaksi.noListingsDesc")} />
          ) : (
            <ul className="flex flex-col gap-3">
              {listings.map((l) => (
                <li key={l.id} className="rounded-lg border border-line bg-canvas p-4">
                  <p className="font-semibold text-ink">{l.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    Rp{(l.price_cents / 100).toLocaleString(lang === "en" ? "en-US" : "id-ID")} · {listingCategoryName(l.category, lang)} · {t("trust.seller")} {l.seller_id.slice(0, 8)} · {formatDateWIB(l.created_at, lang)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={l.status} />
                    {l.status === "aktif" && (
                      <Button size="sm" variant="secondary" onClick={() => run(postJson(`/api/admin/listings/${l.id}/action`, { action: "disable" }, t("redaksi.genericSaveFailed")), t("redaksi.listingDisabled"))}>{t("redaksi.disable")}</Button>
                    )}
                    {l.status === "dinonaktifkan" && (
                      <Button size="sm" onClick={() => run(postJson(`/api/admin/listings/${l.id}/action`, { action: "activate" }, t("redaksi.genericSaveFailed")), t("redaksi.listingActivated"))}>{t("redaksi.activate")}</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!loading && tab === "info" && (
        <section aria-label={t("redaksi.infoCuration")} className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="info-filter" className="sr-only">{t("redaksi.filterInfo")}</label>
            <select id="info-filter" value={infoFilter} onChange={(e) => setInfoFilter(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
              <option value="pending">{t("redaksi.infoPending")}</option>
              <option value="approved">{t("ui.statusApproved")}</option>
              <option value="rejected">{t("ui.statusRejected")}</option>
              <option value="semua">{t("common.all")}</option>
            </select>
            <p className="text-sm text-muted">{t("redaksi.infoHint")}</p>
          </div>
          {infoSubs.length === 0 ? (
            <EmptyState title={t("redaksi.noInfo")} desc={t("redaksi.noInfoDesc")} />
          ) : (
            <ul className="flex flex-col gap-3">
              {infoSubs.map((s) => (
                <li key={s.id} className="rounded-lg border border-line bg-canvas p-4">
                  <p className="text-sm font-semibold text-ink">{s.user_name} <span className="font-normal text-muted">· {formatDateWIB(s.created_at, lang)}</span></p>
                  <p className="mt-1 text-base text-ink">{s.text}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={s.status} />
                    {s.curated_for_ai && <span className="text-xs font-semibold text-success">{t("redaksi.aiReference")}</span>}
                    {s.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => run(postJson(`/api/admin/info-submissions/${s.id}/review`, { decision: "approved" }, t("redaksi.genericSaveFailed")), t("redaksi.infoApproved"))}>{t("redaksi.approve")}</Button>
                        <Button size="sm" variant="secondary" onClick={() => run(postJson(`/api/admin/info-submissions/${s.id}/review`, { decision: "rejected" }, t("redaksi.genericSaveFailed")), t("redaksi.infoRejected"))}>{t("redaksi.reject")}</Button>
                      </>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!loading && tab === "blokir" && (
        <section aria-label={t("redaksi.tabBlock")} className="flex flex-col gap-6">
          <div>
            <h2 className="text-base font-semibold text-ink">{t("redaksi.myBlocks")}</h2>
            {myBlocks.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{t("settings.noBlocked")}</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {myBlocks.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-4 py-3 text-sm">
                    <span><span className="font-semibold text-ink">{b.blocked_name}</span> <span className="text-muted">· {t("redaksi.blockedOn")} {formatDateWIB(b.created_at, lang)}</span></span>
                    <Button size="sm" variant="secondary" onClick={() => run(postJson(`/api/users/${b.blocked_id}/unblock`, {}, t("redaksi.genericSaveFailed")), t("redaksi.unblocked", { name: b.blocked_name }))}>{t("settings.unblock")}</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">{t("redaksi.allBlocks")}</h2>
            {allBlocks.length === 0 ? (
              <p className="mt-2 text-sm text-muted">{t("redaksi.noBlocks")}</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {allBlocks.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-4 py-3 text-sm">
                    <span><span className="font-semibold text-ink">{b.blocked_name}</span> <span className="text-muted">{t("redaksi.blockedBy")} {b.blocker_name} · {formatDateWIB(b.created_at, lang)}</span></span>
                    <Button size="sm" variant="secondary" onClick={() => run(postJson(`/api/users/${b.blocked_id}/unblock`, {}, t("redaksi.genericSaveFailed")), t("redaksi.unblocked", { name: b.blocked_name }))}>{t("settings.unblock")}</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {reviewTarget && <ReviewModal article={reviewTarget} onClose={() => setReviewTarget(null)} onDone={() => { setNotice(t("redaksi.decisionSaved")); loadAll(); }} />}
    </div>
  );
}

export default function RedaksiPage() {
  const { t } = useLanguage();
  return (
    <RequireRole roles={["admin_portal", "superadmin"]} title={t("redaksi.title")}>
      <RedaksiContent />
    </RequireRole>
  );
}
