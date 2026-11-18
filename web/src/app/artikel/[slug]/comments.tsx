// F10 Komentar artikel — baca yang disetujui; tulis butuh masuk + email terverifikasi.
// Kiriman baru masuk antrean moderasi (pending) dan tampil setelah disetujui.
// A9 (M8): penulis melihat status moderasi komentarnya sendiri di seksi
// "Tanggapan saya" (GET /api/me/comments + respons POST yang baru dikirim).
"use client";

import { useEffect, useState } from "react";
import { useSession } from "@/lib/session-client";
import type { Comment } from "@/lib/types";
import { Banner, Button, StatusBadge, TextArea } from "@/components/ui";
import { formatDateWIB } from "@/lib/format";
import { useLanguage } from "@/components/language-provider";

const COMMENT_STATUS_KEY: Record<Comment["status"], string> = {
  pending: "comments.statusPending",
  approved: "comments.statusApproved",
  rejected: "comments.statusRejected",
};

export function CommentSection({ slug, initialComments }: { slug: string; initialComments: Comment[] }) {
  const [comments, setComments] = useState(initialComments);
  const [mine, setMine] = useState<Comment[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const { session } = useSession();
  const { lang, t } = useLanguage();

  // A9: muat komentar saya untuk artikel ini (semua status).
  useEffect(() => {
    if (!session) { setMine([]); return; }
    let alive = true;
    fetch("/api/me/comments", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : []))
      .then((all: Comment[]) => {
        if (alive) setMine((Array.isArray(all) ? all : []).filter((c) => c.article_slug === slug));
      })
      .catch(() => { /* seksi sendiri hilang diam-diam; daftar publik tetap tampil */ });
    return () => { alive = false; };
  }, [session, slug]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (text.trim().length < 3) {
      setError(t("comments.errShort"));
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim() }),
      });
      if (!res.ok) throw new Error("gagal");
      // A9: komentar yang baru dikirim langsung terlihat di "Tanggapan saya"
      // dengan status pending dari respons server.
      const created = (await res.json().catch(() => null)) as Comment | null;
      if (created && created.id) setMine((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);
      setText("");
      setNotice(t("comments.sent"));
    } catch {
      setError(t("comments.errSend"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="komentar-title" className="mt-12">
      <h2 id="komentar-title" className="text-xl font-bold text-ink">{t("comments.title", { count: comments.length })}</h2>

      {/* A9: status moderasi komentar saya sendiri — hanya terlihat bila ada. */}
      {mine.length > 0 && (
        <div className="mt-4 rounded-lg border border-line bg-surface p-4">
          <h3 className="text-sm font-semibold text-ink">{t("comments.myTitle")}</h3>
          <ul className="mt-3 flex flex-col gap-3">
            {mine.map((c) => (
              <li key={c.id} className="rounded-lg border border-line bg-canvas p-3">
                <p className="flex flex-wrap items-center gap-2 text-sm">
                  <StatusBadge status={c.status} />
                  <span className="text-muted">{formatDateWIB(c.created_at, lang)}</span>
                </p>
                <p className="mt-1 text-base text-ink">{c.text}</p>
                <p className="mt-1 text-sm text-muted">{t(COMMENT_STATUS_KEY[c.status])}</p>
              </li>
            ))}
          </ul>
        </div>
      )}
      {comments.length === 0 ? (
        <p className="mt-3 rounded-lg border border-line bg-canvas p-4 text-sm text-muted">
          {t("comments.none")}
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-line bg-canvas p-4">
              <p className="text-sm font-semibold text-ink">{c.author_name} <span className="font-normal text-muted">· {formatDateWIB(c.created_at, lang)}</span></p>
              <p className="mt-1 text-base text-ink">{c.text}</p>
            </li>
          ))}
        </ul>
      )}

      {notice && <div className="mt-4"><Banner tone="success">{notice}</Banner></div>}
      {session ? (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
          <label htmlFor="komentar" className="text-sm font-semibold text-ink">
            {t("comments.writeAs", { name: session.displayName ?? session.email })}
          </label>
          <TextArea id="komentar" value={text} onChange={(e) => setText(e.target.value)} placeholder={t("comments.placeholder")} error={!!error} aria-describedby={error ? "komentar-error" : undefined} />
          {error && <p id="komentar-error" role="alert" className="text-sm text-danger">{error}</p>}
          <p className="text-sm text-muted">{t("comments.moderated")}</p>
          <div>
            <Button type="submit" loading={submitting}>{t("comments.send")}</Button>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          <Banner tone="info">
            {t("comments.login")} <a href="/masuk" className="font-semibold text-accent-dark hover:underline">{t("auth.signInUp")}</a>
          </Banner>
        </div>
      )}
    </section>
  );
}
