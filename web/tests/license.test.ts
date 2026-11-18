// Unit test logika validasi lisensi (Workstream B, port LIC-02..LIC-08).
// Jalan lokal tanpa Supabase / tanpa network:
//   npm run test:license
// Menguji fungsi murni di src/lib/license/validate.ts. Integrasi
// Edge Function + RLS + API route TIDAK tercakup di sini — lihat
// web/docs/LICENSE.md § Test plan (butuh Supabase baru + secrets)
// dan web/docs/LICENSE-LIVE-TESTS.md (skenario uji live).
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
  selectLegacyLicenses,
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

describe("planDays / generateLicenseCode", () => {  it("durasi plan benar", () => {
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

describe("selectLegacyLicenses (LIC-02)", () => {
  // Hash pertama Generator = hash owner Kasir: satu legacy_code_hash,
  // dua baris (product berbeda). Inilah kasus yang membuat
  // `.maybeSingle()` tanpa filter product meledak di PR #24.
  const sharedHash = "40ba6daf8018bfb19a0f8a606096b7721bccb638337bb48279c965dddbf83899";
  const legacyRows: LicenseRow[] = [
    row({ id: "00000000-0000-0000-0000-000000000101", product: "generator", origin: "legacy", legacy_code_hash: sharedHash }),
    row({ id: "00000000-0000-0000-0000-000000000102", product: "kasir", origin: "legacy", legacy_code_hash: sharedHash }),
    row({ id: "00000000-0000-0000-0000-000000000103", product: "generator", origin: "legacy", legacy_code_hash: "0ad442205b6fd911cff7a7ff804941637bbf209aa70f6fb0a3dfd36aaef6187f" }),
    row({ id: "00000000-0000-0000-0000-000000000104", product: "generator", origin: "issued", legacy_code_hash: sharedHash }),
  ];

  it("tanpa filter produk: hash bersama mengembalikan kedua baris", () => {
    const found = selectLegacyLicenses(legacyRows, sharedHash);
    assert.equal(found.length, 2);
    assert.deepEqual(found.map((r) => r.product).sort(), ["generator", "kasir"]);
  });
  it("dengan filter product: hanya baris produk itu yang dipakai", () => {
    assert.equal(selectLegacyLicenses(legacyRows, sharedHash, "kasir").length, 1);
    assert.equal(selectLegacyLicenses(legacyRows, sharedHash, "kasir")[0].product, "kasir");
    assert.equal(selectLegacyLicenses(legacyRows, sharedHash, "generator").length, 1);
    assert.equal(selectLegacyLicenses(legacyRows, sharedHash, "generator")[0].product, "generator");
  });
  it("baris issued dengan hash sama tidak ikut (hanya origin legacy)", () => {
    const found = selectLegacyLicenses(legacyRows, sharedHash, "generator");
    assert.equal(found.length, 1);
    assert.equal(found[0].origin, "legacy");
  });
  it("hash tidak dikenal: [] — jalur legacy fail-closed", () => {
    assert.deepEqual(selectLegacyLicenses(legacyRows, "tidak-ada-hash"), []);
    assert.deepEqual(selectLegacyLicenses(legacyRows, sharedHash, "kasir").filter((r) => r.product === "generator"), []);
  });
});
