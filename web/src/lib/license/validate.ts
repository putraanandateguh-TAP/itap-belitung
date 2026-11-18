// Logika validasi lisensi MURNI (tanpa I/O) — dipakai Edge Function
// (via duplikasi logika yang sama di Deno, lihat
// supabase/functions/validate-license/index.ts) dan unit test.
// Ditulis dengan sintaks TypeScript "erasable" saja (tanpa enum /
// parameter properties) agar bisa dijalankan langsung oleh
// `node --test` (type stripping Node 22.6+).
//
// Aturan kriptografi (jangan diubah tanpa migrasi + re-issue kode):
//   normalized = kode.toUpperCase(), hapus spasi & '-'.
//   lookup_hash = SHA-256 hex(pepper + normalized)
//   code_hash   = SHA-256 hex(salt + pepper + normalized)
// Pepper (LICENSE_PEPPER) hanya ada sebagai secret Edge Function.
// Kode mentah TIDAK PERNAH disimpan atau di-log.

export type LicenseProduct = "generator" | "kasir";
export type LicensePlan = "lifetime" | "monthly" | "quarterly" | "yearly";
export type LicenseStatus = "active" | "revoked" | "expired";

export interface LicenseRow {
  id: string;
  lookup_hash: string;
  salt: string;
  code_hash: string;
  product: LicenseProduct;
  plan: LicensePlan;
  status: LicenseStatus;
  origin: "issued" | "legacy";
  legacy_code_hash: string | null;
  expires_at: string | null;
  max_devices: number;
}

export interface ValidationOutcome {
  ok: boolean;
  /** Alasan generik (aman ditampilkan ke user / dicatat di audit log). */
  reason: string;
}

/** Normalisasi kode: huruf besar, buang spasi dan '-'. */
export function normalizeCode(code: string): string {
  return (code || "").toUpperCase().replace(/[\s-]/g, "");
}

/** Format kode yang diterbitkan admin: ITAP-XXXX-XXXX-XXXX. */
export function isPlausibleCode(code: string): boolean {
  const n = normalizeCode(code);
  return /^[A-Z0-9]{8,32}$/.test(n);
}

export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Hash pencarian (tanpa salt per-baris, memakai pepper server-side). */
export function lookupHash(normalizedCode: string, pepper: string): Promise<string> {
  return sha256Hex(pepper + normalizedCode);
}

/** Hash verifikasi (salt per-lisensi + pepper). */
export function codeHash(
  normalizedCode: string,
  salt: string,
  pepper: string,
): Promise<string> {
  return sha256Hex(salt + pepper + normalizedCode);
}

/**
 * Perbandingan string waktu-konstan (mencegah timing oracle atas hash).
 * Mengembalikan false bila panjang berbeda.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

/** Hash SHA-256 mentah dari kode ternormalisasi — HANYA untuk jalur legacy. */
export function legacyHash(normalizedCode: string): Promise<string> {
  return sha256Hex(normalizedCode);
}

/**
 * LIC-02 — pilih baris legacy yang cocok untuk satu kode.
 *
 * Satu legacy_code_hash bisa dimiliki DUA baris (hash pertama Generator
 * = hash owner Kasir), jadi lookup legacy TIDAK BOLEH memakai
 * `.maybeSingle()` tanpa filter product — itu yang membuat kode kasir
 * owner selalu dijawab invalid di implementasi PR #24.
 *
 * Aturan (cerminan logika Edge Function validate-license):
 *   - saring baris dengan legacy_code_hash yang cocok;
 *   - bila `product` diminta, hanya baris produk itu yang dipakai;
 *   - bila tanpa filter produk dan ada 2 baris, kode itu membuka kedua
 *     produk — kembalikan keduanya (Edge Function mengaktifkan keduanya);
 *   - bila tidak ada baris, kembalikan [] — jalur legacy fail-closed
 *     (pemanggil menjawab "invalid").
 */
export function selectLegacyLicenses(
  rows: LicenseRow[],
  legacyCodeHash: string,
  product?: LicenseProduct | null,
): LicenseRow[] {
  const matched = rows.filter(
    (r) => r.origin === "legacy" && r.legacy_code_hash === legacyCodeHash,
  );
  if (product) return matched.filter((r) => r.product === product);
  return matched;
}

/**
 * Keputusan murni atas satu baris lisensi yang SUDAH ditemukan
 * (lookup + verifikasi hash sudah lolos di luar fungsi ini).
 * Urutan: status -> expiry -> (device limit dicek terpisah, butuh hitung
 * aktivasi aktif — lihat checkDeviceLimit).
 */
export function checkLicenseRow(
  row: LicenseRow,
  now: Date = new Date(),
): ValidationOutcome {
  if (row.status === "revoked") return { ok: false, reason: "revoked" };
  if (row.status === "expired") return { ok: false, reason: "expired" };
  if (row.expires_at && new Date(row.expires_at) <= now) {
    return { ok: false, reason: "expired" };
  }
  if (row.max_devices < 1) return { ok: false, reason: "invalid_config" };
  return { ok: true, reason: "ok" };
}

/**
 * Batas perangkat: aktivasi baru diizinkan bila perangkat ini sudah
 * terdaftar, atau jumlah aktivasi aktif < max_devices.
 */
export function checkDeviceLimit(
  activeActivationCount: number,
  maxDevices: number,
  deviceAlreadyRegistered: boolean,
): ValidationOutcome {
  if (deviceAlreadyRegistered) return { ok: true, reason: "ok" };
  if (activeActivationCount >= maxDevices) {
    return { ok: false, reason: "device_limit" };
  }
  return { ok: true, reason: "ok" };
}

/** Rate limit percobaan: gagal bila failures >= maxFailures dalam window. */
export function isRateLimited(
  failuresInWindow: number,
  maxFailures: number = 5,
): boolean {
  return failuresInWindow >= maxFailures;
}

/** Hash perangkat/IP untuk penyimpanan (bukan nilai mentah). */
export function deviceHash(deviceId: string): Promise<string> {
  return sha256Hex("device:" + deviceId);
}

export function ipHash(ip: string): Promise<string> {
  return sha256Hex("ip:" + ip);
}

/** Masa berlaku plan dalam hari (dipakai admin-licenses saat create). */
export function planDays(plan: LicensePlan): number | null {
  if (plan === "lifetime") return null;
  if (plan === "monthly") return 30;
  if (plan === "quarterly") return 90;
  return 365; // yearly
}

/** Buat kode baru: ITAP-XXXX-XXXX-XXXX dari alfabet yang tidak ambigu. */
export function generateLicenseCode(randomBytes: Uint8Array): string {
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZ23456789"; // tanpa 0/O/1/I/L
  const pick = (b: number): string => alphabet[b % alphabet.length];
  const groups: string[] = [];
  for (let g = 0; g < 3; g++) {
    let s = "";
    for (let i = 0; i < 4; i++) s += pick(randomBytes[g * 4 + i]);
    groups.push(s);
  }
  return "ITAP-" + groups.join("-");
}
