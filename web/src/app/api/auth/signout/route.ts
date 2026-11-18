import { NextResponse } from "next/server";
import { createSupabaseServer } from "@/lib/supabase/server";

// POST /api/auth/signout — keluar (hapus cookie sesi). scope "all" =
// sign out everywhere (semua perangkat).
export async function POST(req: Request) {
  const url = new URL(req.url);
  const everywhere = url.searchParams.get("everywhere") === "1";
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ ok: true });
  }
  const supabase = await createSupabaseServer();
  await supabase.auth.signOut({ scope: everywhere ? "global" : "local" });
  return NextResponse.json({ ok: true });
}
