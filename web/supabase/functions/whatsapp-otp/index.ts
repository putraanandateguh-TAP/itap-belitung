// Edge Function: whatsapp-otp (F04 — verifikasi WhatsApp via Meta).
// STATUS: BELUM AKTIF (P2). Butuh: akun Meta WhatsApp Business + nomor
// terverifikasi + template OTP yang disetujui Meta (META_WHATSAPP_OTP_TEMPLATE).
// Selama P2 belum ada, fungsi ini mengembalikan 503 — JANGAN pura-pura
// mengirim OTP. Setelah P2: deploy + isi env di Dashboard Supabase:
//   META_WHATSAPP_TOKEN, META_WHATSAPP_PHONE_NUMBER_ID,
//   META_WHATSAPP_OTP_TEMPLATE (nama template, mis. "itap_otp_id").
// Alur: route /api/auth/whatsapp-otp/send memanggil fungsi ini dengan JWT
// pengguna; OTP 6 digit dibuat server-side, disimpan hash (SHA-256) di
// profiles? — TIDAK: OTP disimpan di tabel sementara `whatsapp_otps`
// (buat via SQL: user_id, code_hash, expires_at, attempts) — tabel itu
// BELUM ada di schema.sql; tambahkan saat P2 dikerjakan (lihat backend.md).
// Di bawah ini hanya pengiriman Meta-nya; verifikasi kode dilakukan route
// /api/auth/whatsapp-otp/verify setelah tabel itu ada.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
  const token = Deno.env.get("META_WHATSAPP_TOKEN");
  const phoneNumberId = Deno.env.get("META_WHATSAPP_PHONE_NUMBER_ID");
  const template = Deno.env.get("META_WHATSAPP_OTP_TEMPLATE");
  if (!token || !phoneNumberId || !template) {
    return new Response(JSON.stringify({
      error: "Verifikasi WhatsApp belum tersedia — akun Meta WhatsApp Business + template OTP (P2) belum disiapkan.",
    }), { status: 503, headers: { "Content-Type": "application/json" } });
  }
  try {
    const { to, code } = await req.json();
    if (!to || !/^\d{6}$/.test(code ?? "")) {
      return new Response(JSON.stringify({ error: "Input tidak valid." }), { status: 400 });
    }
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
      console.error("Meta WhatsApp gagal:", res.status, detail);
      return new Response(JSON.stringify({ error: "Pengiriman OTP WhatsApp gagal." }), { status: 502 });
    }
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch {
    return new Response(JSON.stringify({ error: "Pengiriman OTP WhatsApp gagal." }), { status: 500 });
  }
});
