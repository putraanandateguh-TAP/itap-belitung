// Edge Function: delete-account (F16 — penghapusan akun PENUH).
// Dipanggil dari DELETE /api/me (method POST) setelah user mengetik HAPUS.
// Service-role: bypass RLS. Langkah:
//   1. Verifikasi JWT pengguna (Authorization: Bearer <token>) — hanya
//      pemilik akun yang bisa menghapus akunnya sendiri. ID pengguna diambil
//      dari JWT yang terverifikasi, BUKAN dari body — tidak ada cara
//      menghapus akun orang lain.
//   2. Hapus file Storage miliknya (article-images + listing-photos).
//   3. Hapus baris profiles (CASCADE menghapus artikel, listing, thread,
//      pesan, komentar, bookmark, laporan, blokir, poin, revisi, info,
//      perangkat, itinerary, percakapan AI, feedback).
//   4. Hapus pengguna di Supabase Auth (mencabut semua sesi).
// Deploy: `supabase functions deploy delete-account` (setelah P1).
// Env (otomatis disediakan Supabase untuk Edge Function, BUKAN di repo):
// SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SITE_ORIGIN = "https://itapbelitung.my.id";
const cors = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  // Hanya POST (dipakai /api/me) — GET/PUT/PATCH ditolak agar tidak ada
  // pemanggilan penghapusan yang tidak disengaja.
  if (req.method !== "POST") {
    return json({ error: "Metode tidak diizinkan." }, 405);
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return json({ error: "Tidak diizinkan." }, 401);
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await anon.auth.getUser();
    if (userErr || !user) return json({ error: "Sesi tidak valid." }, 401);

    const admin = createClient(supabaseUrl, serviceKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 1. File Storage milik pengguna (list folder <user_id> di kedua bucket).
    for (const bucket of ["article-images", "listing-photos"]) {
      const { data: files } = await admin.storage.from(bucket).list(user.id);
      if (files?.length) {
        await admin.storage.from(bucket).remove(files.map((f) => `${user.id}/${f.name}`));
      }
    }
    // 2. Profil (+ semua data terkait via CASCADE di schema.sql).
    const { error: profileErr } = await admin.from("profiles").delete().eq("id", user.id);
    if (profileErr) throw profileErr;
    // 3. Akun Auth (mencabut semua sesi web + Android).
    const { error: authErr } = await admin.auth.admin.deleteUser(user.id);
    if (authErr) throw authErr;

    console.log(JSON.stringify({ event: "account_deleted", user_id: user.id, at: new Date().toISOString() }));
    return json({ ok: true });
  } catch (e) {
    console.error("delete-account gagal:", e);
    return json({ error: "Penghapusan akun gagal. Coba lagi nanti." }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...cors, "Content-Type": "application/json" },
  });
}
