// Unit test logika validasi lisensi (Workstream B).
// Jalan lokal tanpa Supabase / tanpa network:
//   npm run test:license
// Menguji fungsi murni di src/lib/license/validate.ts. Integrasi
// Edge Function + RLS + API route TIDAK tercakup di sini — lihat
// web/docs/LICENSE.md § Test plan (butuh Supabase baru + secrets).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCode,
  isPlausibleCode,
  sha256Hex,
  lookupHash,
  codeHash,
  timingSafeEqual,
  checkLicenseRow,
  checkDeviceLimit,
  isRateLimited,
  planDays,
  generateLicenseCode,
  type LicenseRow,
} from "../src/lib/license/validate.ts";

const PEPPER = "test-pepper-jangan-dipakai-produksi";

function row(over: Partial<LicenseRow> = {}): LicenseRow {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    lookup_hash: "x",
    salt: "abcd",
    code_hash: "y",
    product: "generator",
    plan: "lifetime",
    status: "active",
    origin: "issued",
    legacy_code_hash: null,
    expires_at: null,
    max_devices: 3,
    ...over,
  };
}

describe("normalizeCode / isPlausibleCode", () => {
  it("membuang spasi dan strip, huruf besar", () => {
    assert.equal(normalizeCode("itap-ab12 cd34"), "ITAPAB12CD34");
  });
  it("menolak kode terlalu pendek / karakter aneh", () => {
    assert.equal(isPlausibleCode("AB1"), false);
    assert.equal(isPlausibleCode("ITAP-XXXX-!!!!"), false);
    assert.equal(isPlausibleCode("ITAP-ABCD-1234-EFGH"), true);
  });
});

describe("hashing", () => {
  it("sha256Hex cocok dengan vektor SHA-256 yang dikenal", async () => {
    // SHA-256("") dan SHA-256("abc") — vektor standar.
    assert.equal(
      await sha256Hex(""),
      "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
    );
    assert.equal(
      await sha256Hex("abc"),
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad",
    );
  });
  it("lookup + verify konsisten, kode salah gagal verifikasi", async () => {
    const code = normalizeCode("ITAP-ABCD-1234-EFGH");
    const salt = "0123456789abcdef0123456789abcdef";
    const lh = await lookupHash(code, PEPPER);
    const ch = await codeHash(code, salt, PEPPER);
    assert.equal(timingSafeEqual(lh, await lookupHash(code, PEPPER)), true);
    assert.equal(timingSafeEqual(ch, await codeHash(code, salt, PEPPER)), true);
    assert.equal(timingSafeEqual(ch, await codeHash(normalizeCode("ITAP-XXXX-XXXX-XXXX"), salt, PEPPER)), false);
    assert.equal(timingSafeEqual(await codeHash(code, salt, "pepper-lain"), ch), false);
  });
  it("timingSafeEqual menolak panjang berbeda", () => {
    assert.equal(timingSafeEqual("abc", "abcd"), false);
    assert.equal(timingSafeEqual("abc", "abc"), true);
    assert.equal(timingSafeEqual("abc", "abd"), false);
  });
});

describe("checkLicenseRow", () => {
  it("aktif + lifetime lolos", () => {
    assert.deepEqual(checkLicenseRow(row()), { ok: true, reason: "ok" });
  });
  it("revoked ditolak", () => {
    assert.equal(checkLicenseRow(row({ status: "revoked" })).ok, false);
    assert.equal(checkLicenseRow(row({ status: "revoked" })).reason, "revoked");
  });
  it("expired (status dan tanggal) ditolak", () => {
    assert.equal(checkLicenseRow(row({ status: "expired" })).reason, "expired");
    assert.equal(
      checkLicenseRow(row({ expires_at: "2020-01-01T00:00:00Z" })).reason,
      "expired",
    );
    assert.equal(
      checkLicenseRow(row({ expires_at: "2999-01-01T00:00:00Z" })).ok,
      true,
    );
  });
});

describe("checkDeviceLimit", () => {
  it("perangkat terdaftar selalu lolos", () => {
    assert.equal(checkDeviceLimit(3, 3, true).ok, true);
  });
  it("di bawah batas lolos, di batas ditolak", () => {
    assert.equal(checkDeviceLimit(2, 3, false).ok, true);
    assert.equal(checkDeviceLimit(3, 3, false).ok, false);
    assert.equal(checkDeviceLimit(3, 3, false).reason, "device_limit");
  });
});

describe("isRateLimited", () => {
  it("5 gagal dalam window = terkunci", () => {
    assert.equal(isRateLimited(4), false);
    assert.equal(isRateLimited(5), true);
    assert.equal(isRateLimited(10, 10), true);
    assert.equal(isRateLimited(9, 10), false);
  });
});

describe("planDays / generateLicenseCode", () => {
  it("durasi plan benar", () => {
    assert.equal(planDays("lifetime"), null);
    assert.equal(planDays("monthly"), 30);
    assert.equal(planDays("quarterly"), 90);
    assert.equal(planDays("yearly"), 365);
  });
  it("kode baru berformat ITAP-XXXX-XXXX-XXXX, alfabet tak-ambigu", () => {
    const bytes = new Uint8Array(12);
    crypto.getRandomValues(bytes);
    const code = generateLicenseCode(bytes);
    assert.match(code, /^ITAP-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    // Bagian acak saja (prefix "ITAP-" memang mengandung I).
    assert.equal(/[01IL0O]/.test(code.slice(5)), false);
  });
});
