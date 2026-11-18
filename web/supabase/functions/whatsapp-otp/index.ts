// Edge Function: whatsapp-otp (F04 — verifikasi WhatsApp via Meta).
// STATUS: BELUM AKTIF (P2). Butuh: akun Meta WhatsApp Business + nomor
// terverifikasi + template OTP yang disetujui Meta (META_WHATSAPP_OTP_TEMPLATE).
// Selama P2 belum ada, fungsi ini mengembalikan 503 — JANGAN pura-pura
// mengirim OTP. Env diisi di Dashboard Supabase (BUKAN di repo):
//   META_WHATSAPP_TOKEN, META_WHATSAPP_PHONE_NUMBER_ID,
//   META_WHATSAPP_OTP_TEMPLATE (nama template, mis. "itap_otp_id").
//
// Keamanan (SEC-06, audit 2026-11-18):
//   1. JWT diverifikasi via anon client getUser() — tanpa JWT valid -> 401.
//      (config.toml juga mengunci [functions.whatsapp-otp] verify_jwt = true,
//      jadi gateway Supabase menolak request tanpa JWT sebelum sampai ke sini.)
//   2. `to` HARUS sama persis dengan profiles.whatsapp_number pemanggil —
//      nomor orang lain tidak bisa dikirimi OTP dari akun ini -> 403.
//   3. OTP 6 digit dibuat SERVER-SIDE (crypto.getRandomValues). Body yang
//      berisi `code` DITOLAK (400) — client tidak pernah menentukan OTP.
//   4. Hanya HASH OTP (SHA-256) + expiry 5 menit + attempts yang disimpan
//      di tabel whatsapp_otps (migrasi 0009). Kode asli tidak pernah disimpan.
//   5. Rate limit: maks 3 kirim/jam per pengguna DAN per nomor tujuan
//      (dihitung dari baris whatsapp_otps 1 jam terakhir) -> 429.
//   6. CORS hanya https://itapbelitung.my.id (samakan delete-account).
//   7. TIDAK PERNAH log nomor lengkap atau kode OTP — log hanya memakai
//      nomor yang disamarkan (+62***123).
// Alur lengkap: route /api/auth/whatsapp-otp/send memanggil fungsi ini
// dengan JWT pengguna; verifikasi kode dilakukan route
// /api/auth/whatsapp-otp/verify terhadap hash di whatsapp_otps.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const ALLOWED_ORIGIN = "https://itapbelitung.my.id";
const OTP_TTL_MS = 5 * 60 * 1000; // 5 menit
const MAX_SENDS_PER_HOUR = 3;
const E164_ID = /^\+62\d{8,13}$/;

const cors = {
  "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, "Content-Type": "application/json" },
  });
}

/**
 * Normalisasi nomor Indonesia ke E.164.
 * Format yang diharapkan di profiles.whatsapp_number: E.164 (+62...).
 * Demi toleransi, format lokal 08xx... dan 62xx... juga diterima lalu
 * dinormalisasi — TAPI hasil normalisasi harus cocok persis dengan nomor
 * profil, jadi satu pengguna tidak bisa mengklaim nomor orang lain.
 * Mengembalikan null bila tidak bisa dinormalisasi ke bentuk yang valid.
 */
function normalizeIdPhone(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const digits = raw.replace(/[\s\-().]/g, "");
  let e164: string;
  if (digits.startsWith("+62")) e164 = digits;
  else if (digits.startsWith("62")) e164 = `+${digits}`;
  else if (digits.startsWith("0")) e164 = `+62${digits.slice(1)}`;
  else return null;
  return E164_ID.test(e164) ? e164 : null;
}

/** Samarkan nomor untuk log: +6281234567890 -> +62***890. */
function maskPhone(e164: string): string {
  return `${e164.slice(0, 3)}***${e164.slice(-3)}`;
}

async function sha256Hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Metode tidak didukung." }, 405);

  // 1. JWT wajib — verifikasi via anon client (Authorization: Bearer <jwt>).
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return json({ error: "Tidak diizinkan." }, 401);
  }
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anon = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader } },
  });
  const { data: { user }, error: userErr } = await anon.auth.getUser();
  if (userErr || !user) return json({ error: "Sesi tidak valid." }, 401);

  // 2. Fail-closed (P2): env Meta/ZapClaw belum diisi -> 503. Dipertahankan
  //    apa adanya — JANGAN kirim OTP apa pun sebelum P2 selesai.
  const token = Deno.env.get("META_WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
  const template = Deno.env.get("META_WHATSAPP_OTP_TEMPLATE");
  if (!token || !phoneNumberId || !template) {
    return json({
      error: "Verifikasi WhatsApp belum tersedia — akun Meta WhatsApp Business + template OTP (P2) belum disiapkan.",
    }, 503);
  }

  const admin = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  try {
    const body: unknown = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "Input tidak valid." }, 400);
    }
    // 3. `code` dari client DITOLAK — OTP selalu dibuat server-side.
    if ("code" in body) {
      return json({ error: "Kode OTP dibuat server-side dan tidak boleh dikirim client." }, 400);
    }
    const rawTo = (body as Record<string, unknown>).to;
    const to = normalizeIdPhone(rawTo);
    if (!to) {
      return json({ error: "Nomor tujuan tidak valid (format E.164 +62...)." }, 400);
    }

    // 4. `to` harus sama persis dengan whatsapp_number profil pemanggil.
    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("whatsapp_number")
      .eq("id", user.id)
      .maybeSingle();
    if (profileErr) throw profileErr;
    const profilePhone = normalizeIdPhone(profile?.whatsapp_number ?? null);
    if (!profilePhone) {
      return json({ error: "Nomor WhatsApp belum diisi di profil." }, 403);
    }
    if (to !== profilePhone) {
      console.warn(JSON.stringify({
        event: "whatsapp_otp_forbidden",
        user_id: user.id,
        to_masked: maskPhone(to),
        at: new Date().toISOString(),
      }));
      return json({ error: "Nomor tujuan tidak cocok dengan nomor WhatsApp di profilmu." }, 403);
    }

    // 5. Rate limit: maks 3 kirim/jam per pengguna DAN per nomor tujuan.
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const [byUser, byPhone] = await Promise.all([
      admin.from("whatsapp_otps").select("id", { count: "exact", head: true })
        .eq("user_id", user.id).gt("created_at", oneHourAgo),
      admin.from("whatsapp_otps").select("id", { count: "exact", head: true })
        .eq("phone_e164", to).gt("created_at", oneHourAgo),
    ]);
    if (byUser.error || byPhone.error) {
      const err = byUser.error ?? byPhone.error;
      // Tabel belum ada (migrasi 0009 belum diterapkan) -> 503 yang jujur.
      if (err?.code === "42P01" || err?.message?.includes("does not exist")) {
        return json({ error: "Verifikasi WhatsApp belum tersedia — tabel whatsapp_otps belum dibuat (migrasi 0009)." }, 503);
      }
      throw err;
    }
    if ((byUser.count ?? 0) >= MAX_SENDS_PER_HOUR || (byPhone.count ?? 0) >= MAX_SENDS_PER_HOUR) {
      return json({ error: "Terlalu banyak permintaan kode. Coba lagi dalam 1 jam." }, 429);
    }

    // 6. OTP dibuat server-side: 6 digit acak kriptografis.
    const rand = new Uint32Array(1);
    crypto.getRandomValues(rand);
    const code = String(rand[0] % 1_000_000).padStart(6, "0");
    const codeHash = await sha256Hex(code);
    const expiresAt = new Date(Date.now() + OTP_TTL_MS).toISOString();

    const { data: otpRow, error: insertErr } = await admin
      .from("whatsapp_otps")
      .insert({
        user_id: user.id,
        phone_e164: to,
        code_hash: codeHash,
        expires_at: expiresAt,
        attempts: 0,
      })
      .select("id")
      .single();
    if (insertErr) {
      if (insertErr.code === "42P01" || insertErr.message?.includes("does not exist")) {
        return json({ error: "Verifikasi WhatsApp belum tersedia — tabel whatsapp_otps belum dibuat (migrasi 0009)." }, 503);
      }
      throw insertErr;
    }

    // 7. Kirim via Meta WhatsApp template. Gagal kirim -> hapus baris OTP
    //    (jangan biarkan kode yang tak pernah terkirim menghabiskan kuota
    //    rate limit pengguna) lalu 502.
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          messaging_product: "whatsapp",
          to,
          type: "template",
          template: {
            name: template,
            language: { code: "id" },
            components: [{ type: "body", parameters: [{ type: "text", text: code }] }],
          },
        }),
      },
    );
    if (!res.ok) {
      const detail = await res.text();
      console.error("Meta WhatsApp gagal:", res.status, detail.slice(0, 200));
      await admin.from("whatsapp_otps").delete().eq("id", otpRow.id);
      return json({ error: "Pengiriman OTP WhatsApp gagal." }, 502);
    }

    // Jangan pernah log nomor lengkap atau kode OTP.
    console.log(JSON.stringify({
      event: "whatsapp_otp_sent",
      user_id: user.id,
      to_masked: maskPhone(to),
      expires_at: expiresAt,
      at: new Date().toISOString(),
    }));
    return json({ ok: true });
  } catch (e) {
    console.error("whatsapp-otp gagal:", e);
    return json({ error: "Pengiriman OTP WhatsApp gagal." }, 500);
  }
});
