import { NextResponse } from "next/server";
import { listMyComments } from "@/lib/data";
import { requireSession } from "@/lib/api";

// GET /api/me/comments — A9 (M8): komentar SAYA dengan status moderasinya
// (pending/approved/rejected), agar penulis bisa melihat nasib komentarnya.
// 401 tanpa login; mode seed -> [] jujur (komentar seed tanpa pemilik).
export async function GET() {
  const s = await requireSession();
  if ("error" in s) return s.error;
  return NextResponse.json(await listMyComments({ profile: s.profile }));
}
