import { NextResponse } from "next/server";
import { siteUrl } from "@/lib/site-url";
import { createSupabaseServer } from "@/lib/supabase/server";

// POST /api/auth/google — login Google (Supabase Auth OAuth, aplikasi
// Google Cloud milik Teguh — P3). Mengembalikan URL OAuth untuk redirect.
// JANGAN pernah memakai OAuth client milik aplikasi lain.
export async function POST() {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL) {
    return NextResponse.json({ error: "Supabase belum dikonfigurasi (P1)." }, { status: 503 });
  }
  const supabase = await createSupabaseServer();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${siteUrl()}/api/auth/callback` },
  });
  if (error || !data.url) {
    return NextResponse.json({ error: "Login Google belum tersedia — periksa konfigurasi OAuth (P1/P3)." }, { status: 503 });
  }
  return NextResponse.json({ url: data.url });
}
