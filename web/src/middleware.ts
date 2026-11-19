// Middleware — refresh token Supabase Auth di setiap request agar cookie
// http-only tetap valid. Bila Supabase belum dikonfigurasi (P1), lewati
// begitu saja (situs tetap jalan dengan fallback seed).
import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const response = NextResponse.next({ request });
  // Cookie "sudah dibaca" untuk penghitung view artikel (satu sesi):
  // bila pengguna membuka /artikel/<slug> tanpa cookie itu, pasang cookie
  // sesi di respons — halaman menghitung view hanya bila cookie belum ada
  // (tanpa ini satu kali buka menaikkan 3x — bug 19 Nov 2026).
  const articleMatch = request.nextUrl.pathname.match(/^\/artikel\/([^/]+)\/?$/);
  if (articleMatch) {
    const name = `itap_read_${articleMatch[1]}`;
    if (!request.cookies.has(name)) {
      response.cookies.set(name, "1", { path: "/", sameSite: "lax" });
    }
  }
  if (!url || !anon) return response;
  const supabase = createServerClient(url, anon, {
    cookies: {
      getAll() { return request.cookies.getAll(); },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
