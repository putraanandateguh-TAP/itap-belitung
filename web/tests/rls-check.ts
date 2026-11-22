// Uji isolasi RLS dengan DUA pengguna sungguhan (skill replica-backend:
// "pengguna kedua tidak boleh melihat data pengguna pertama").
//
// JALANKAN HANYA SETELAH P1 + migrasi + seed (database live):
//   TEST_USER1_EMAIL=... TEST_USER1_PASSWORD=... \
//   TEST_USER2_EMAIL=... TEST_USER2_PASSWORD=... npm run test:rls
// Kedua akun harus sudah terdaftar + terverifikasi (daftar di /masuk dulu).
// Env Supabase dibaca dari .env.local (NEXT_PUBLIC_SUPABASE_URL,
// NEXT_PUBLIC_SUPABASE_ANON_KEY).
// STATUS 2026-11-18: BELUM DIJALANKAN — belum ada database live (P1).
import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const u1 = { email: process.env.TEST_USER1_EMAIL!, password: process.env.TEST_USER1_PASSWORD! };
const u2 = { email: process.env.TEST_USER2_EMAIL!, password: process.env.TEST_USER2_PASSWORD! };

let failures = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures++;
}

async function main() {
  for (const [k, v] of Object.entries({ url, anon, u1e: u1.email, u1p: u1.password, u2e: u2.email, u2p: u2.password })) {
    if (!v) throw new Error(`Env belum diisi: ${k}`);
  }
  const c1 = createClient(url, anon);
  const c2 = createClient(url, anon);
  const { data: s1, error: e1 } = await c1.auth.signInWithPassword(u1);
  if (e1 || !s1.user) throw new Error(`Login user1 gagal: ${e1?.message}`);
  const { data: s2, error: e2 } = await c2.auth.signInWithPassword(u2);
  if (e2 || !s2.user) throw new Error(`Login user2 gagal: ${e2?.message}`);
  const id1 = s1.user.id;
  const id2 = s2.user.id;
  check("dua pengguna berbeda", id1 !== id2);

  // SEC-09 (migrasi 0011): anon TIDAK boleh membaca tabel listings
  // (koordinat persis penjual), tetapi BOLEH membaca view publik
  // listings_public (tanpa koordinat). Cek read-only, tanpa data uji.
  // GAGAL bila migrasi 0011 belum diterapkan di database live.
  const anonClient = createClient(url, anon);
  const { data: anonTableRows, error: anonTableErr } = await anonClient
    .from("listings").select("id").limit(1);
  check("anon ditolak membaca tabel listings (401)", !!anonTableErr && /permission denied/i.test(anonTableErr.message ?? ""), anonTableErr?.message ?? `tidak ada error — dapat ${anonTableRows?.length ?? 0} baris`);
  const { data: anonViewRows, error: anonViewErr } = await anonClient
    .from("listings_public").select("*").limit(5);
  check("anon bisa membaca view listings_public", !anonViewErr, anonViewErr?.message ?? "");
  const leaked = (anonViewRows ?? []).some((r) => "location_lat" in r || "location_lng" in r);
  check("view listings_public tanpa location_lat/location_lng", !leaked, leaked ? "koordinat bocor di view" : "");

  // User1: buat draf artikel + bookmark + itinerary (data privat).
  const { data: draft, error: dErr } = await c1.from("articles").insert({
    author_id: id1, channel: "wisata", slug: `rls-uji-${Date.now()}`,
    title_id: "Draf uji RLS", body_id: "Isi draf.", status: "draft",
  }).select("id").single();
  check("user1 bisa membuat draf sendiri", !dErr && !!draft?.id, dErr?.message ?? "");
  const { error: bErr } = await c1.from("bookmarks").insert({
    user_id: id1, listing_id: "00000000-0000-0000-0000-000000000000", type: "save",
  });
  // listing_id fiktif akan gagal FK — itu tidak apa; uji utamanya SELECT.
  void bErr;
  const { data: itin, error: iErr } = await c1.from("itineraries").insert({
    user_id: id1, title: "Rencana uji RLS", days: [],
  }).select("id").single();
  check("user1 bisa membuat itinerary sendiri", !iErr && !!itin?.id, iErr?.message ?? "");

  // User2: TIDAK boleh melihat draf user1, profil user1, itinerary user1.
  const { data: draftsSeen } = await c2.from("articles")
    .select("id").eq("author_id", id1).eq("status", "draft");
  check("user2 tidak melihat draf user1", (draftsSeen?.length ?? -1) === 0, `dapat ${draftsSeen?.length}`);
  const { data: profSeen } = await c2.from("profiles").select("id").eq("id", id1);
  check("user2 tidak melihat profil user1", (profSeen?.length ?? -1) === 0, `dapat ${profSeen?.length}`);
  const { data: itinSeen } = await c2.from("itineraries").select("id").eq("user_id", id1);
  check("user2 tidak melihat itinerary user1", (itinSeen?.length ?? -1) === 0, `dapat ${itinSeen?.length}`);

  // User2: TIDAK boleh mengubah data user1 (update draf -> 0 baris / error).
  const { data: upd, error: uErr } = await c2.from("articles")
    .update({ title_id: "Diubah user2" }).eq("id", draft!.id).select("id");
  check("user2 tidak bisa mengubah draf user1", (upd?.length ?? 0) === 0, uErr?.message ?? `terubah ${upd?.length}`);

  // Bersihkan data uji (sebagai user1, pemilik).
  await c1.from("articles").delete().eq("id", draft!.id);
  await c1.from("itineraries").delete().eq("id", itin!.id);
  console.log(failures === 0 ? "\nSemua uji RLS lolos." : `\n${failures} uji GAGAL.`);
  process.exit(failures === 0 ? 0 : 1);
}

main().catch((e) => { console.error("RLS check gagal jalan:", e.message); process.exit(1); });
