// S21 CMS / Ruang Redaksi + S22 Moderasi — kelola konten, kategori,
// kontributor, antrean laporan + flag, kamus kata superadmin, komentar
// tertunda, penawaran untuk moderasi, kurasi info warga, dan blokir akun.
// Data dari /api/admin/* (DB nyata; mode seed memakai store in-memory).
// Peran: admin_portal+; kamus kata hanya superadmin (gate 403).
"use client";

import { useCallback, useEffect, useState } from "react";
import { RequireRole } from "@/components/require-role";
import { useSession } from "@/lib/session-client";
import { Banner, Button, EmptyState, Field, SelectInput, StatusBadge, TextArea, TextInput } from "@/components/ui";
import type { Article, BlockEntry, Category, Comment, InfoSubmission, ModerationWord, Report } from "@/lib/types";
import { channelLabel } from "@/lib/labels";
import { formatDateWIB } from "@/lib/format";

type Tab = "konten" | "kategori" | "kontributor" | "laporan" | "kata" | "komentar" | "penawaran" | "info" | "blokir";

type ReportAction = "hidden" | "dismissed" | "reviewed" | "unblock" | "disable_listing";

interface ContributorRow { id: string; name: string; email: string; verified: boolean; auto_approve: boolean; points: number }
interface AdminListingRow { id: string; title: string; price_cents: number; status: string; seller_id: string; category: string; created_at: string }

const targetLabel = (t: Report["target_type"]) =>
  t === "listing" ? "Penawaran" : t === "account" ? "Akun" : "Komentar";

async function postJson(url: string, body: unknown): Promise<{ ok: boolean; message: string }> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, message: (data as { error?: string }).error ?? "Gagal menyimpan." };
  return { ok: true, message: "" };
}

function ReviewModal({
  article, onClose, onDone,
}: {
  article: Article;
  onClose: () => void;
  onDone: () => void;
}) {
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
      setError("Tidak bisa menyimpan keputusan. Coba lagi.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div role="dialog" aria-modal="true" aria-labelledby="review-title" className="fixed inset-0 z-50 flex items-end justify-center bg-surface-dark-deep/50 sm:items-center">
      <div className="w-full max-w-xl rounded-lg bg-canvas p-6 shadow-pop">
        <h2 id="review-title" className="text-lg font-semibold text-ink">Tinjau: {article.title_id}</h2>
        <p className="mt-1 text-sm text-muted">{channelLabel(article.channel)} · {formatDateWIB(article.published_at)} · {article.views} dibaca</p>
        <fieldset className="mt-4">
          <legend className="text-sm font-semibold text-ink">Keputusan redaksi</legend>
          <div className="mt-2 flex flex-col gap-2">
            {([
              ["publish", "Terbitkan"],
              ["return", "Kembalikan ke kontributor (minta perbaikan)"],
              ["unpublish", "Turunkan dari terbit"],
            ] as const).map(([v, label]) => (
              <label key={v} className="flex items-center gap-2 text-sm text-ink">
                <input type="radio" name="decision" value={v} checked={decision === v} onChange={() => setDecision(v)} className="size-4 accent-[#2563EB]" />
                {label}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="mt-4">
          <Field label="Catatan untuk kontributor" id="catatan" hint="Catatan tampil di dasbor kontributor bila dikembalikan.">
            <TextArea id="catatan" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Contoh: tambahkan sumber untuk klaim tahun berdirinya." />
          </Field>
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-danger">{error}</p>}
        <div className="mt-5 flex gap-2">
          <Button onClick={save} loading={saving}>Simpan keputusan</Button>
          <Button variant="secondary" onClick={onClose}>Batalkan</Button>
        </div>
      </div>
    </div>
  );
}

function RedaksiContent() {
  const { session } = useSession();
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
      setError("Sebagian data redaksi gagal dimuat.");
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
      setNotice("Kategori baru ditambahkan.");
      loadAll();
    } else {
      const data = await res.json().catch(() => ({}));
      setError((data as { error?: string }).error ?? "Tidak bisa menambah kategori.");
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
      setError((data as { error?: string }).error ?? "Tidak bisa mengubah kontributor.");
    }
  }

  async function reportAction(id: string, action: ReportAction) {
    await run(
      postJson(`/api/admin/reports/${id}/action`, { action }),
      action === "hidden" ? "Materi disembunyikan dan laporan ditutup."
      : action === "disable_listing" ? "Penawaran dinonaktifkan dan laporan ditandai sudah ditinjau."
      : action === "unblock" ? "Blokir atas akun itu dibuka dan laporan ditandai sudah ditinjau."
      : action === "dismissed" ? "Laporan ditolak."
      : "Laporan ditandai sudah ditinjau.",
    );
  }

  async function addWord(e: React.FormEvent) {
    e.preventDefault();
    if (!newWord.trim()) return;
    await run(
      postJson("/api/admin/moderation-words", { word: newWord.trim(), action: newWordAction }),
      `Kata “${newWord.trim()}” ditambahkan ke kamus (aksi: ${newWordAction === "hold" ? "tahan" : "sensor"}).`,
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
        return res.ok ? { ok: true, message: "" } : { ok: false, message: (data as { error?: string }).error ?? "Gagal mengubah kata." };
      })(),
      "Kata moderasi diubah.",
    );
    setEditWord(null);
  }

  async function deleteWord(id: string) {
    await run(
      (async () => {
        const res = await fetch(`/api/admin/moderation-words/${id}`, { method: "DELETE" });
        const data = await res.json().catch(() => ({}));
        return res.ok ? { ok: true, message: "" } : { ok: false, message: (data as { error?: string }).error ?? "Gagal menghapus kata." };
      })(),
      "Kata dihapus dari kamus.",
    );
    setConfirmDeleteWord(null);
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "konten", label: "Konten" },
    { id: "kategori", label: "Kategori" },
    { id: "kontributor", label: "Kontributor" },
    { id: "laporan", label: "Laporan" },
    { id: "kata", label: "Kata moderasi" },
    { id: "komentar", label: "Komentar tertunda" },
    { id: "penawaran", label: "Penawaran" },
    { id: "info", label: "Info warga" },
    { id: "blokir", label: "Blokir" },
  ];

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-xl font-bold text-ink">Ruang Redaksi</h1>
        <p className="mt-1 text-sm text-muted">Kelola konten, kategori, kontributor, dan moderasi portal iTAP.</p>
      </div>
      {seedMode && (
        <Banner tone="warning">
          Mode seed — database belum live (P1): laporan, kata, dan komentar di halaman ini adalah data contoh.
          Putusan tersimpan sementara di server dan hilang saat restart; penindakan materi nyata butuh database live.
        </Banner>
      )}
      {notice && <Banner tone="success">{notice}</Banner>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}

      <div role="tablist" aria-label="Bagian redaksi" className="flex flex-wrap gap-1 border-b border-line">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            aria-selected={tab === t.id}
            onClick={() => setTab(t.id)}
            className={`h-10 px-4 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-accent ${tab === t.id ? "border-b-2 border-accent text-accent" : "text-muted"}`}
          >
            {t.label}
            {t.id === "laporan" && reports.some((r) => r.status === "open") && <span className="ml-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">{reports.filter((r) => r.status === "open").length}</span>}
            {t.id === "komentar" && pendingComments.length > 0 && <span className="ml-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">{pendingComments.length}</span>}
            {t.id === "info" && infoSubs.some((s) => s.status === "pending") && <span className="ml-1 rounded-full bg-danger-soft px-2 py-0.5 text-xs font-semibold text-danger">{infoSubs.filter((s) => s.status === "pending").length}</span>}
          </button>
        ))}
      </div>

      {loading && <div aria-busy="true"><div className="skeleton h-64 w-full" /></div>}

      {!loading && tab === "konten" && (
        <section aria-label="Tabel konten">
          <div className="mb-3 flex gap-2">
            <label htmlFor="status-filter" className="sr-only">Filter status</label>
            <select id="status-filter" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
              <option value="semua">Semua status</option>
              <option value="published">Terbit</option>
              <option value="review">Menunggu tinjauan</option>
              <option value="draft">Draf</option>
              <option value="returned">Dikembalikan</option>
              <option value="unpublished">Ditayangkan turun</option>
            </select>
          </div>
          {articles.length === 0 ? (
            <EmptyState title="Belum ada kiriman yang menunggu tinjauan." desc="Ubah filter status untuk melihat konten lain." />
          ) : (
            <div className="overflow-x-auto rounded-lg border border-line bg-canvas" tabIndex={0} role="region" aria-label="Tabel konten">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-line bg-surface text-xs uppercase text-muted">
                    <th scope="col" className="px-4 py-3">Judul</th>
                    <th scope="col" className="px-4 py-3">Kanal</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3">Dibaca</th>
                    <th scope="col" className="px-4 py-3">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {articles.slice(0, 20).map((a) => (
                    <tr key={a.id} className="border-b border-line last:border-0">
                      <td className="max-w-xs px-4 py-3 font-semibold text-ink">{a.title_id}</td>
                      <td className="px-4 py-3 text-muted">{channelLabel(a.channel)}</td>
                      <td className="px-4 py-3"><StatusBadge status={a.status} /></td>
                      <td className="px-4 py-3 text-muted">{a.views.toLocaleString("id-ID")}</td>
                      <td className="px-4 py-3">
                        <Button variant="ghost" size="sm" onClick={() => setReviewTarget(a)}>
                          Tinjau {a.title_id.slice(0, 24)}…
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="px-4 py-3 text-xs text-muted">Menampilkan {Math.min(articles.length, 20)} dari {articles.length} artikel.</p>
            </div>
          )}
        </section>
      )}

      {!loading && tab === "kategori" && (
        <section aria-label="Kelola kategori" className="flex flex-col gap-6">
          <form onSubmit={addCategory} className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-canvas p-4">
            <Field label="Nama kategori baru" id="kat-baru">
              <TextInput id="kat-baru" value={newCatName} onChange={(e) => setNewCatName(e.target.value)} placeholder="Contoh: Pantai Tersembunyi" />
            </Field>
            <Field label="Kanal" id="kat-kanal">
              <select id="kat-kanal" value={newCatChannel} onChange={(e) => setNewCatChannel(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
                <option value="berita">Berita</option>
                <option value="kuliner">Kuliner</option>
                <option value="wisata">Wisata</option>
                <option value="sejarah">Sejarah</option>
                <option value="budaya">Budaya</option>
                <option value="legenda">Legenda</option>
              </select>
            </Field>
            <Button type="submit">Tambah kategori</Button>
          </form>
          <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <li key={c.id} className="rounded-lg border border-line bg-canvas px-4 py-3 text-sm">
                <span className="font-semibold text-ink">{c.name_id}</span> <span className="text-muted">· {channelLabel(c.channel)} · /{c.slug}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && tab === "kontributor" && (
        <section aria-label="Kelola kontributor">
          <div className="overflow-x-auto rounded-lg border border-line bg-canvas" tabIndex={0} role="region" aria-label="Tabel kontributor">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs uppercase text-muted">
                  <th scope="col" className="px-4 py-3">Nama</th>
                  <th scope="col" className="px-4 py-3">Email</th>
                  <th scope="col" className="px-4 py-3">Terverifikasi</th>
                  <th scope="col" className="px-4 py-3">Auto-approve</th>
                  <th scope="col" className="px-4 py-3">Poin</th>
                  <th scope="col" className="px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {contributors.map((c) => (
                  <tr key={c.id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 font-semibold text-ink">{c.name}</td>
                    <td className="px-4 py-3 text-muted">{c.email}</td>
                    <td className="px-4 py-3">{c.verified ? <span className="font-semibold text-success">Ya</span> : <span className="text-warning">Belum</span>}</td>
                    <td className="px-4 py-3">{c.auto_approve ? "Aktif" : "Tidak aktif"}</td>
                    <td className="px-4 py-3 text-muted">{c.points}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" variant="secondary" onClick={() => contributorPatch(c.id, { verification_status: c.verified ? "unverified" : "verified" }, c.verified ? "Verifikasi kontributor dicabut." : "Kontributor diverifikasi.")}>
                          {c.verified ? "Cabut verifikasi" : "Verifikasi"}
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => contributorPatch(c.id, { auto_approve: !c.auto_approve }, c.auto_approve ? "Auto-approve dimatikan." : "Auto-approve diaktifkan.")}>
                          {c.auto_approve ? "Matikan auto-approve" : "Aktifkan auto-approve"}
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
        <section aria-label="Antrean laporan" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="laporan-filter" className="sr-only">Filter status laporan</label>
            <select id="laporan-filter" value={reportFilter} onChange={(e) => setReportFilter(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
              <option value="semua">Semua status</option>
              <option value="open">Terbuka</option>
              <option value="reviewed">Sudah ditinjau</option>
              <option value="hidden">Disembunyikan</option>
              <option value="dismissed">Ditolak</option>
            </select>
            <p className="text-sm text-muted">Sembunyikan menindak materinya (penawaran dinonaktifkan, komentar ditolak); buka blokir menghapus blokir atas akun yang dilaporkan.</p>
          </div>
          {reports.length === 0 ? (
            <EmptyState title="Tidak ada laporan." desc="Laporan dari pembaca (konten atau akun) akan muncul di sini." />
          ) : (
            <ul className="flex flex-col gap-3">
              {reports.map((r) => (
                <li key={r.id} className="rounded-lg border border-line bg-canvas p-4">
                  <p className="font-semibold text-ink">{targetLabel(r.target_type)}: {r.target_label}</p>
                  <p className="mt-1 text-sm text-muted">Pelapor: {r.reporter} · {formatDateWIB(r.created_at)}</p>
                  <p className="mt-1 text-sm text-ink">Alasan: {r.reason}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={r.status} />
                    {r.status === "open" && (
                      <>
                        {(r.target_type === "listing" || r.target_type === "comment") && (
                          <Button size="sm" variant="secondary" onClick={() => reportAction(r.id, "hidden")}>Sembunyikan materi</Button>
                        )}
                        {r.target_type === "listing" && (
                          <Button size="sm" variant="secondary" onClick={() => reportAction(r.id, "disable_listing")}>Nonaktifkan penawaran</Button>
                        )}
                        {r.target_type === "account" && (
                          <Button size="sm" variant="secondary" onClick={() => reportAction(r.id, "unblock")}>Buka blokir akun</Button>
                        )}
                        <Button size="sm" variant="secondary" onClick={() => reportAction(r.id, "reviewed")}>Tandai sudah ditinjau</Button>
                        <Button size="sm" variant="ghost" onClick={() => reportAction(r.id, "dismissed")}>Tolak laporan</Button>
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
        <section aria-label="Kamus kata moderasi" className="flex flex-col gap-4">
          <p className="text-sm text-muted">
            Kamus kata dikelola superadmin. Kata beraksi “tahan” menahan materi baru (komentar/kiriman tetap di antrean, penawaran tidak tampil) sampai redaksi meninjau;
            kata beraksi “sensor” disamarkan otomatis sebelum tampil. {isSuperadmin ? "" : "Akunmu bukan superadmin — kamus hanya bisa dibaca di sini."}
          </p>
          {isSuperadmin && (
            <form onSubmit={addWord} className="flex flex-wrap items-end gap-3 rounded-lg border border-line bg-canvas p-4">
              <Field label="Kata atau frasa baru" id="kata-baru">
                <TextInput id="kata-baru" value={newWord} onChange={(e) => setNewWord(e.target.value)} placeholder="Contoh: tautan-penipuan" />
              </Field>
              <Field label="Aksi" id="kata-aksi">
                <SelectInput id="kata-aksi" value={newWordAction} onChange={(e) => setNewWordAction(e.target.value as "sensor" | "hold")}>
                  <option value="hold">Tahan ke antrean</option>
                  <option value="sensor">Sensor (samarkan)</option>
                </SelectInput>
              </Field>
              <Button type="submit">Tambah kata</Button>
            </form>
          )}
          {words.length === 0 ? (
            <EmptyState title="Kamus masih kosong." desc="Tambahkan kata pertama yang perlu ditahan atau disensor." />
          ) : (
            <ul className="flex flex-col gap-2">
              {words.map((w) => (
                <li key={w.id} className="rounded-lg border border-line bg-canvas px-4 py-3 text-sm">
                  {editWord?.id === w.id ? (
                    <span className="flex flex-wrap items-center gap-2">
                      <label htmlFor={`edit-kata-${w.id}`} className="sr-only">Ubah kata</label>
                      <TextInput id={`edit-kata-${w.id}`} value={editWord.word} onChange={(e) => setEditWord({ ...editWord, word: e.target.value })} />
                      <label htmlFor={`edit-aksi-${w.id}`} className="sr-only">Ubah aksi</label>
                      <SelectInput id={`edit-aksi-${w.id}`} value={editWord.action} onChange={(e) => setEditWord({ ...editWord, action: e.target.value as "sensor" | "hold" })}>
                        <option value="hold">Tahan ke antrean</option>
                        <option value="sensor">Sensor (samarkan)</option>
                      </SelectInput>
                      <Button size="sm" onClick={saveEditWord}>Simpan</Button>
                      <Button size="sm" variant="ghost" onClick={() => setEditWord(null)}>Batalkan</Button>
                    </span>
                  ) : (
                    <span className="flex flex-wrap items-center justify-between gap-2">
                      <span>
                        <span className="font-mono font-semibold text-ink">{w.word}</span>{" "}
                        <StatusBadge status={w.action === "hold" ? "review" : "rejected"} />
                      </span>
                      {isSuperadmin && (
                        <span className="flex gap-2">
                          <Button size="sm" variant="secondary" onClick={() => setEditWord({ id: w.id, word: w.word, action: w.action })}>Ubah</Button>
                          {confirmDeleteWord === w.id ? (
                            <>
                              <Button size="sm" variant="danger" onClick={() => deleteWord(w.id)}>Yakin hapus?</Button>
                              <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteWord(null)}>Batalkan</Button>
                            </>
                          ) : (
                            <Button size="sm" variant="ghost" onClick={() => setConfirmDeleteWord(w.id)}>Hapus</Button>
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
        <section aria-label="Komentar tertunda" className="flex flex-col gap-3">
          {pendingComments.length === 0 ? (
            <EmptyState title="Tidak ada komentar tertunda." desc="Komentar baru dari pembaca menunggu persetujuan di sini." />
          ) : (
            <ul className="flex flex-col gap-3">
              {pendingComments.map((c) => (
                <li key={c.id} className="rounded-lg border border-line bg-canvas p-4">
                  <p className="text-sm font-semibold text-ink">{c.author_name} <span className="font-normal text-muted">· {formatDateWIB(c.created_at)}</span></p>
                  <p className="mt-1 text-base text-ink">{c.text}</p>
                  <p className="mt-1 text-xs text-muted">Di artikel: {c.article_slug}</p>
                  <div className="mt-3 flex gap-2">
                    <Button size="sm" onClick={() => run(postJson(`/api/admin/comments/${c.id}/review`, { decision: "approved" }), "Komentar disetujui dan tampil di artikel.")}>Setujui</Button>
                    <Button size="sm" variant="secondary" onClick={() => run(postJson(`/api/admin/comments/${c.id}/review`, { decision: "rejected" }), "Komentar ditolak.")}>Tolak</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="text-sm text-muted">Label sentimen AI hanya membantu redaksi — tidak menyetujui atau menolak kritik secara otomatis (recon F10). AI belum aktif di fase ini.</p>
        </section>
      )}

      {!loading && tab === "penawaran" && (
        <section aria-label="Penawaran untuk moderasi" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="penawaran-filter" className="sr-only">Filter status penawaran</label>
            <select id="penawaran-filter" value={listingFilter} onChange={(e) => setListingFilter(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
              <option value="semua">Semua status</option>
              <option value="aktif">Aktif</option>
              <option value="dinonaktifkan">Dinonaktifkan</option>
              <option value="terjual">Terjual</option>
              <option value="dihapus">Dihapus</option>
            </select>
            <p className="text-sm text-muted">Penawaran yang ditahan kamus kata muncul di sini sebagai “Dinonaktifkan” — aktifkan lagi setelah ditinjau.</p>
          </div>
          {listings.length === 0 ? (
            <EmptyState title="Tidak ada penawaran." desc="Penawaran marketplace yang butuh moderasi muncul di sini." />
          ) : (
            <ul className="flex flex-col gap-3">
              {listings.map((l) => (
                <li key={l.id} className="rounded-lg border border-line bg-canvas p-4">
                  <p className="font-semibold text-ink">{l.title}</p>
                  <p className="mt-1 text-sm text-muted">
                    Rp{(l.price_cents / 100).toLocaleString("id-ID")} · {l.category} · Penjual {l.seller_id.slice(0, 8)} · {formatDateWIB(l.created_at)}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={l.status} />
                    {l.status === "aktif" && (
                      <Button size="sm" variant="secondary" onClick={() => run(postJson(`/api/admin/listings/${l.id}/action`, { action: "disable" }), "Penawaran dinonaktifkan.")}>Nonaktifkan</Button>
                    )}
                    {l.status === "dinonaktifkan" && (
                      <Button size="sm" onClick={() => run(postJson(`/api/admin/listings/${l.id}/action`, { action: "activate" }), "Penawaran diaktifkan lagi.")}>Aktifkan lagi</Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!loading && tab === "info" && (
        <section aria-label="Kurasi info warga" className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <label htmlFor="info-filter" className="sr-only">Filter status kiriman</label>
            <select id="info-filter" value={infoFilter} onChange={(e) => setInfoFilter(e.target.value)} className="h-10 rounded-md border border-line-input bg-canvas px-3 text-base">
              <option value="pending">Menunggu kurasi</option>
              <option value="approved">Disetujui</option>
              <option value="rejected">Ditolak</option>
              <option value="semua">Semua</option>
            </select>
            <p className="text-sm text-muted">Hanya kiriman yang disetujui yang jadi referensi AI iTAP.</p>
          </div>
          {infoSubs.length === 0 ? (
            <EmptyState title="Tidak ada kiriman info warga." desc="Kiriman dari warga yang menunggu kurasi muncul di sini." />
          ) : (
            <ul className="flex flex-col gap-3">
              {infoSubs.map((s) => (
                <li key={s.id} className="rounded-lg border border-line bg-canvas p-4">
                  <p className="text-sm font-semibold text-ink">{s.user_name} <span className="font-normal text-muted">· {formatDateWIB(s.created_at)}</span></p>
                  <p className="mt-1 text-base text-ink">{s.text}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={s.status} />
                    {s.curated_for_ai && <span className="text-xs font-semibold text-success">Referensi AI</span>}
                    {s.status === "pending" && (
                      <>
                        <Button size="sm" onClick={() => run(postJson(`/api/admin/info-submissions/${s.id}/review`, { decision: "approved" }), "Kiriman disetujui dan jadi referensi AI.")}>Setujui</Button>
                        <Button size="sm" variant="secondary" onClick={() => run(postJson(`/api/admin/info-submissions/${s.id}/review`, { decision: "rejected" }), "Kiriman ditolak.")}>Tolak</Button>
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
        <section aria-label="Kelola blokir akun" className="flex flex-col gap-6">
          <div>
            <h2 className="text-base font-semibold text-ink">Akun yang saya blokir</h2>
            {myBlocks.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Kamu belum memblokir akun siapa pun.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {myBlocks.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-4 py-3 text-sm">
                    <span><span className="font-semibold text-ink">{b.blocked_name}</span> <span className="text-muted">· diblokir {formatDateWIB(b.created_at)}</span></span>
                    <Button size="sm" variant="secondary" onClick={() => run(postJson(`/api/users/${b.blocked_id}/unblock`, {}), `Blokir atas ${b.blocked_name} dibuka.`)}>Buka blokir</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <h2 className="text-base font-semibold text-ink">Semua blokir di portal (redaksi)</h2>
            {allBlocks.length === 0 ? (
              <p className="mt-2 text-sm text-muted">Belum ada blokir di portal.</p>
            ) : (
              <ul className="mt-2 flex flex-col gap-2">
                {allBlocks.map((b) => (
                  <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-line bg-canvas px-4 py-3 text-sm">
                    <span><span className="font-semibold text-ink">{b.blocked_name}</span> <span className="text-muted">diblokir oleh {b.blocker_name} · {formatDateWIB(b.created_at)}</span></span>
                    <Button size="sm" variant="secondary" onClick={() => run(postJson(`/api/users/${b.blocked_id}/unblock`, {}), `Blokir atas ${b.blocked_name} dibuka.`)}>Buka blokir</Button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      )}

      {reviewTarget && <ReviewModal article={reviewTarget} onClose={() => setReviewTarget(null)} onDone={() => { setNotice("Keputusan redaksi disimpan."); loadAll(); }} />}
    </div>
  );
}

export default function RedaksiPage() {
  return (
    <RequireRole roles={["admin_portal", "superadmin"]} title="Ruang Redaksi">
      <RedaksiContent />
    </RequireRole>
  );
}
