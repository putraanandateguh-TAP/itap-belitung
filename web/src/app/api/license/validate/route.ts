// POST /api/license/validate — validasi / aktivasi kode lisensi.
// Body: { code: string, action?: "validate" | "activate", product?: "generator" | "kasir", device_label?: string }.
// Wajib login + rate limit (5 percobaan / 15 menit per IP, mengikuti
// lib/rate-limit.ts). device_id dibuat server-side dari sesi (hash user
// id) — client tidak menentukan identitas perangkat sendiri.
//
// KETERBATASAN YANG DIKETAHUI (LIC-07): device_id di sini adalah
// SHA-256('license-device:' + user_id) — stabil PER PENGGUNA, bukan per
// perangkat nyata. Akibatnya batas max_devices (default 3) saat ini
// praktis menghitung AKUN, bukan perangkat: satu pengguna yang masuk
// dari HP + laptop + tablet tetap memakai 1 slot. Ini sengaja dipilih
// sementara (tidak ada identitas perangkat tepercaya di web) — bila
// batas per-perangkat nyata dibutuhkan, kirim device_id persisten dari
// client (disimpan di penyimpanan lokal perangkat + dikirim tiap
// aktivasi) dan perbarui dokumentasi di web/docs/LICENSE.md.
// Diteruskan ke Edge Function validate-license dengan JWT pengguna.
import { NextResponse } from "next/server";
import { z } from "zod";
import { checkRateLimit, requireSession } from "@/lib/api";
import { callLicenseFunction, licenseReasonMessage } from "@/lib/license/server";
import { createHash } from "node:crypto";

const bodySchema = z.object({
  code: z.string().trim().min(8).max(40),
  action: z.enum(["validate", "activate"]).default("activate"),
  product: z.enum(["generator", "kasir"]).optional(),
  device_label: z.string().trim().max(80).optional(),
});

export async function POST(req: Request) {
  const limited = checkRateLimit(req, "license-validate", 5);
  if (limited) return limited;
  const s = await requireSession();
  if ("error" in s) return s.error;
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ ok: false, reason: "invalid" }, { status: 400 });
  }
  // device_id stabil per pengguna (hash user id) — bukan nilai dari client.
  // KETERBATASAN (LIC-07): ini identitas per-pengguna, bukan per-perangkat
  // nyata — lihat komentar header file ini.
  const deviceId = createHash("sha256").update(`license-device:${s.profile.id}`).digest("hex");
  const r = await callLicenseFunction("validate-license", {
    method: "POST",
    body: {
      action: parsed.data.action,
      code: parsed.data.code,
      // LIC-02: teruskan produk bila diminta — Edge Function memakai ini
      // untuk membedakan baris legacy yang legacy_code_hash-nya sama
      // (hash owner Kasir = hash pertama Generator).
      ...(parsed.data.product ? { product: parsed.data.product } : {}),
      device_id: deviceId,
      device_label: parsed.data.device_label,
    },
  });
  if ("error" in r) {
    return NextResponse.json({ ok: false, reason: "error", message: r.error }, { status: r.status });
  }
  const body = r.body;
  if (r.status === 429) {
    return NextResponse.json(
      { ok: false, reason: "rate_limited", message: licenseReasonMessage("rate_limited") },
      { status: 429 },
    );
  }
  if (body.ok !== true) {
    return NextResponse.json(
      { ok: false, reason: body.reason ?? "invalid", message: licenseReasonMessage(body.reason) },
      { status: 200 },
    );
  }
  return NextResponse.json({
    ok: true,
    product: body.product,
    products: Array.isArray(body.products) ? body.products : (body.product ? [body.product] : []),
    plan: body.plan,
    expires_at: body.expires_at ?? null,
    legacy: body.legacy === true,
  });
}
