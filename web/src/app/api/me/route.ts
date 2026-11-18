import { NextResponse } from "next/server";
import { errorToResponse, requireSession } from "@/lib/api";
import { createSupabaseServer } from "@/lib/supabase/server";
import { z } from "zod";

// DELETE /api/me — hapus akun + semua data terkait (F16).
// Body: { confirm: "HAPUS" }. Menghapus via Edge Function service-role
// (supabase/functions/delete-account) memakai JWT pengguna — BUKAN sekadar
// RLS. Setelah Edge Function jalan, cabut sesi lokal juga.
const bodySchema = z.object({ confirm: z.literal("HAPUS") });

// GET /api/me — gate kejujuran untuk halaman /hapus-akun (S25): apakah
// penghapusan penuh BISA jalan di lingkungan ini. `configured` false =
// Supabase/Edge Function belum ada (P1) — halaman menampilkan gate jujur
// dan menonaktifkan tombol hapus, bukan membiarkan pengguna mengetik HAPUS
// lalu gagal. 401 tanpa login.
export async function GET() {
  const s = await requireSession();
  if ("error" in s) return s.error;
  const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL);
  return NextResponse.json({ ok: true, configured, email: s.profile.email });
}

export async function DELETE(req: Request) {
  const s = await requireSession();
  if ("error" in s) return s.error;
  const body: unknown = await req.json().catch(() => null);
  if (!bodySchema.safeParse(body).success) {
    return NextResponse.json({ error: 'Ketik HAPUS untuk mengonfirmasi.' }, { status: 400 });
  }
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi (P1) — penghapusan penuh butuh Edge Function." }, { status: 503 });
  }
  try {
    const supabase = await createSupabaseServer();
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      return NextResponse.json({ error: "Sesi tidak valid." }, { status: 401 });
    }
    const res = await fetch(`${url}/functions/v1/delete-account`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        "Content-Type": "application/json",
      },
    });
    if (!res.ok) {
      return NextResponse.json({ error: "Penghapusan akun gagal. Coba lagi nanti." }, { status: 502 });
    }
    await supabase.auth.signOut({ scope: "global" });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return errorToResponse(e);
  }
}
