// S21 CMS / Ruang Redaksi — #23 Tabel Data, #38 Modal review, kelola
// konten/kategori/kontributor, moderasi laporan + kata, komentar tertunda.
// Data dari /api/admin/* (fake, §3.5). Peran: admin_portal+.
"use client";

import { useCallback, useEffect, useState } from "react";
import { RequireRole } from "@/components/require-role";
import { Banner, Button, EmptyState, Field, StatusBadge, TextArea, TextInput } from "@/components/ui";
import type { Article, Category, Comment, ModerationWord, Report } from "@/lib/types";
import { channelLabel } from "@/lib/data";
import { formatDateWIB } from "@/lib/format";

type Tab = "konten" | "kategori" | "kontributor" | "laporan" | "kata" | "komentar";

interface ContributorRow { id: string; name: string; email: string; verified: boolean; auto_approve: boolean; points: number }

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
  const [tab, setTab] = useState<Tab>("konten");
  const [articles, setArticles] = useState<Article[]>([]);
  const [statusFilter, setStatusFilter] = useState("semua");
  const [categories, setCategories] = useState<Category[]>([]);
  const [contributors, setContributors] = useState<ContributorRow[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [words, setWords] = useState<ModerationWord[]>([]);
  const [pendingComments, setPendingComments] = useState<Comment[]>([]);
  const [reviewTarget, setReviewTarget] = useState<Article | null>(null);
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);
  const [newCatName, setNewCatName] = useState("");
  const [newCatChannel, setNewCatChannel] = useState("wisata");

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [a, c, co, r, w] = await Promise.all([
        fetch(`/api/admin/articles?status=${statusFilter}`).then((x) => x.json()),
        fetch("/api/admin/categories").then((x) => x.json()),
        fetch("/api/admin/contributors").then((x) => x.json()),
        fetch("/api/admin/reports").then((x) => x.json()),
        fetch("/api/admin/moderation-words").then((x) => x.json()),
      ]);
      setArticles(a); setCategories(c); setContributors(co); setReports(r); setWords(w);
    } catch {
      setNotice("Sebagian data redaksi gagal dimuat.");
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => { loadAll(); }, [loadAll]);

  useEffect(() => {
    // Komentar tertunda diambil dari store demo via API komentar per artikel:
    // disederhanakan — daftar seed pending ditampilkan dari endpoint admin.
    fetch("/api/admin/articles?status=semua").then(() => {
      setPendingComments([
        { id: "k-3", article_id: "kb-2", article_slug: "pantai-tanjung-kelayang", author_name: "Sari (Pembaca)", text: "Menunggu tulisan lanjutannya tentang island hopping.", status: "pending", created_at: "2026-11-18T06:30:00+07:00" },
      ]);
    }).catch(() => undefined);
  }, []);

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
      setNotice("Kategori baru ditambahkan (demo).");
      loadAll();
    }
  }

  async function reportAction(id: string, action: "hidden" | "dismissed" | "reviewed") {
    await fetch(`/api/admin/reports/${id}/action`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setNotice("Tindakan atas laporan disimpan (demo).");
    loadAll();
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "konten", label: "Konten" },
    { id: "kategori", label: "Kategori" },
    { id: "kontributor", label: "Kontributor" },
    { id: "laporan", label: "Laporan" },
    { id: "kata", label: "Kata moderasi" },
    { id: "komentar", label: "Komentar tertunda" },
  ];

  return (
    <div className="flex flex-col gap-6 py-8">
      <div>
        <h1 className="text-xl font-bold text-ink">Ruang Redaksi</h1>
        <p className="mt-1 text-sm text-muted">Kelola konten, kategori, kontributor, dan moderasi portal iTAP.</p>
      </div>
      {notice && <Banner tone="success">{notice}</Banner>}

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
            <div className="overflow-x-auto rounded-lg border border-line bg-canvas">
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
          <div className="overflow-x-auto rounded-lg border border-line bg-canvas">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-line bg-surface text-xs uppercase text-muted">
                  <th scope="col" className="px-4 py-3">Nama</th>
                  <th scope="col" className="px-4 py-3">Email</th>
                  <th scope="col" className="px-4 py-3">Terverifikasi</th>
                  <th scope="col" className="px-4 py-3">Auto-approve</th>
                  <th scope="col" className="px-4 py-3">Poin</th>
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-sm text-muted">Ubah verifikasi/auto-approve kontributor adalah aksi admin — di demo ini hanya tampil (PATCH /api/admin/contributors/:id menyusul saat backend nyata).</p>
        </section>
      )}

      {!loading && tab === "laporan" && (
        <section aria-label="Antrean laporan">
          {reports.length === 0 ? (
            <EmptyState title="Tidak ada laporan terbuka." desc="Laporan dari pembaca (konten atau akun) akan muncul di sini." />
          ) : (
            <ul className="flex flex-col gap-3">
              {reports.map((r) => (
                <li key={r.id} className="rounded-lg border border-line bg-canvas p-4">
                  <p className="font-semibold text-ink">{r.target_label}</p>
                  <p className="mt-1 text-sm text-muted">Pelapor: {r.reporter} · {formatDateWIB(r.created_at)}</p>
                  <p className="mt-1 text-sm text-ink">Alasan: {r.reason}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={r.status} />
                    <Button size="sm" variant="secondary" onClick={() => reportAction(r.id, "hidden")}>Sembunyikan materi</Button>
                    <Button size="sm" variant="secondary" onClick={() => reportAction(r.id, "reviewed")}>Tandai sudah ditinjau</Button>
                    <Button size="sm" variant="ghost" onClick={() => reportAction(r.id, "dismissed")}>Tolak laporan</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      {!loading && tab === "kata" && (
        <section aria-label="Kamus kata moderasi">
          <p className="text-sm text-muted">Kamus kata dikelola superadmin: kata yang ditahan atau disensor otomatis sebelum tampil. Di demo ini hanya daftar contoh.</p>
          <ul className="mt-3 flex flex-col gap-2">
            {words.map((w) => (
              <li key={w.id} className="flex items-center justify-between rounded-lg border border-line bg-canvas px-4 py-3 text-sm">
                <span className="font-mono text-ink">{w.word}</span>
                <StatusBadge status={w.action === "hold" ? "review" : "rejected"} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!loading && tab === "komentar" && (
        <section aria-label="Komentar tertunda">
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
                    <Button size="sm" onClick={() => { setPendingComments((xs) => xs.filter((x) => x.id !== c.id)); setNotice("Komentar disetujui (demo)."); }}>Setujui</Button>
                    <Button size="sm" variant="secondary" onClick={() => { setPendingComments((xs) => xs.filter((x) => x.id !== c.id)); setNotice("Komentar ditolak (demo)."); }}>Tolak</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-sm text-muted">Label sentimen AI hanya membantu redaksi — tidak menyetujui atau menolak kritik secara otomatis (recon F10). AI belum aktif di fase ini.</p>
        </section>
      )}

      {reviewTarget && <ReviewModal article={reviewTarget} onClose={() => setReviewTarget(null)} onDone={() => { setNotice("Keputusan redaksi disimpan (demo)."); loadAll(); }} />}
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
