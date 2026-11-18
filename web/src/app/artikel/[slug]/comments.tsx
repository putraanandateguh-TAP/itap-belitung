// F10 Komentar artikel — baca yang disetujui; tulis butuh masuk (demo).
// Kiriman baru masuk antrean moderasi (pending) dan tampil setelah disetujui.
"use client";

import { useState } from "react";
import { getSession, setSession } from "@/lib/auth";
import type { Comment } from "@/lib/types";
import { Banner, Button, TextArea } from "@/components/ui";
import { formatDateWIB } from "@/lib/format";

export function CommentSection({ slug, initialComments }: { slug: string; initialComments: Comment[] }) {
  const [comments, setComments] = useState(initialComments);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const session = typeof window !== "undefined" ? getSession() : null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setNotice("");
    if (text.trim().length < 3) {
      setError("Tanggapan terlalu pendek — tulis minimal 3 karakter.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch(`/api/articles/${encodeURIComponent(slug)}/comments`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: text.trim(), author_name: session?.name ?? "Pembaca" }),
      });
      if (!res.ok) throw new Error("gagal");
      setText("");
      setNotice("Tanggapanmu terkirim dan menunggu moderasi redaksi. Terima kasih!");
    } catch {
      setError("Tidak bisa mengirim tanggapan sekarang. Coba lagi nanti.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <section aria-labelledby="komentar-title" className="mt-12">
      <h2 id="komentar-title" className="text-xl font-bold text-ink">Tanggapan pembaca ({comments.length})</h2>
      {comments.length === 0 ? (
        <p className="mt-3 rounded-lg border border-line bg-canvas p-4 text-sm text-muted">
          Belum ada tanggapan yang disetujui untuk artikel ini. Jadilah yang pertama menanggapi.
        </p>
      ) : (
        <ul className="mt-4 flex flex-col gap-3">
          {comments.map((c) => (
            <li key={c.id} className="rounded-lg border border-line bg-canvas p-4">
              <p className="text-sm font-semibold text-ink">{c.author_name} <span className="font-normal text-muted">· {formatDateWIB(c.created_at)}</span></p>
              <p className="mt-1 text-base text-ink">{c.text}</p>
            </li>
          ))}
        </ul>
      )}

      {notice && <div className="mt-4"><Banner tone="success">{notice}</Banner></div>}
      {session ? (
        <form onSubmit={submit} className="mt-4 flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
          <label htmlFor="komentar" className="text-sm font-semibold text-ink">
            Tulis tanggapan sebagai {session.name}
          </label>
          <TextArea id="komentar" value={text} onChange={(e) => setText(e.target.value)} placeholder="Tanggapanmu tentang artikel ini…" error={!!error} aria-describedby={error ? "komentar-error" : undefined} />
          {error && <p id="komentar-error" role="alert" className="text-sm text-danger">{error}</p>}
          <p className="text-sm text-muted">Tanggapan dimoderasi redaksi sebelum tampil. Nama tampilanmu akan terlihat publik.</p>
          <div>
            <Button type="submit" loading={submitting}>Kirim tanggapan</Button>
          </div>
        </form>
      ) : (
        <div className="mt-4">
          <Banner tone="info">
            Masuk dulu untuk menulis tanggapan. <a href="/masuk" className="font-semibold text-accent hover:underline">Masuk / daftar akun demo</a>
          </Banner>
        </div>
      )}
    </section>
  );
}
