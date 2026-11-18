// Unit test seed staging (Workstream E) — jalan LOKAL tanpa Supabase:
//   npm run test:seed-staging
//
// Yang diuji (tanpa network, tanpa staging live):
// 1. Hash lisensi di scripts/seed-staging.sql cocok dengan rumus kontrak
//    PR #24: lookup_hash = SHA-256(pepper || kode), code_hash =
//    SHA-256(salt || pepper || kode), dengan pepper DUMMY staging.
//    Ini menjaga seed tetap valid bila hash di SQL salah ketik.
// 2. Guard runner seed-staging.ts: menolak ref production, menolak
//    UUID placeholder/kosong, menerima env staging yang valid, dan
//    substitusi UUID benar-benar mengganti semua placeholder.
// 3. Seed TIDAK mengandung data asli: tidak ada email/domain asli,
//    tidak ada kunci, semua baris berlabel dummy/staging-test.
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  PLACEHOLDER_IDS,
  PRODUCTION_REF,
  substituteSeedIds,
  validateStagingSeedEnv,
} from "../scripts/seed-staging.ts";

const STAGING_PEPPER = "staging-pepper-dummy-0123456789abcdef";
const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const norm = (code: string) => code.toUpperCase().replace(/[\s-]/g, "");

const dir = path.dirname(fileURLToPath(import.meta.url));
const seedSql = readFileSync(path.join(dir, "../scripts/seed-staging.sql"), "utf8");

// Kode dummy + salt yang HARUS ada di seed (kontrak dengan TEST_PLAN.md).
const EXPECTED_LICENSES: Array<{ code: string; salt: string }> = [
  { code: "ITAP-TEST-VALD-0001", salt: "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" },
  { code: "ITAP-TEST-EXPR-0002", salt: "b1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" },
  { code: "ITAP-TEST-RVKD-0003", salt: "c1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" },
  { code: "ITAP-TEST-DVCE-0004", salt: "d1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" },
  { code: "ITAP-TEST-KSR1-0005", salt: "e1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" },
  { code: "ITAP-TEST-PAST-0006", salt: "f1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6" },
  { code: "ITAP-TEST-MNTH-0007", salt: "1a2b3c4d5e6f1a2b3c4d5e6f1a2b3c4d" },
];

describe("seed-staging.sql — hash lisensi cocok dengan pepper dummy staging", () => {
  for (const { code, salt } of EXPECTED_LICENSES) {
    it(`${code}: lookup_hash + code_hash benar`, () => {
      const lookup = sha256(STAGING_PEPPER + norm(code));
      const codeHash = sha256(salt + STAGING_PEPPER + norm(code));
      assert.ok(seedSql.includes(`'${salt}'`), `salt ${code} hilang dari seed`);
      assert.ok(seedSql.includes(`'${lookup}'`), `lookup_hash ${code} salah / tidak cocok pepper dummy`);
      assert.ok(seedSql.includes(`'${codeHash}'`), `code_hash ${code} salah / tidak cocok pepper dummy`);
    });
  }

  it("7 lisensi dummy, status + produk sesuai kontrak", () => {
    assert.equal((seedSql.match(/'generator', '(lifetime|monthly)'/g) ?? []).length, 6);
    assert.ok(seedSql.includes("'kasir', 'lifetime'"));
    assert.ok(seedSql.includes("'expired'"), "lisensi expired hilang");
    assert.ok(seedSql.includes("'revoked'"), "lisensi revoked hilang");
    // Device-limit: tepat satu lisensi max_devices 1.
    assert.equal((seedSql.match(/, 1,\n/g) ?? []).length, 1);
  });

  it("konten dummy lengkap + berlabel staging-test", () => {
    for (const slug of ["staging-test-pantai-dummy", "staging-test-mie-dummy", "staging-test-draf-dummy"]) {
      assert.ok(seedSql.includes(slug), `artikel ${slug} hilang`);
    }
    assert.ok(seedSql.includes("'draft'"), "artikel draft hilang");
    assert.ok(seedSql.includes("'terjual'"), "listing terjual hilang");
    assert.ok(seedSql.includes("staging-test-wisata") && seedSql.includes("staging-test-kuliner"));
  });

  it("tidak mengandung data/kunci asli", () => {
    assert.ok(!seedSql.includes("itapbelitung.my.id"), "seed tidak boleh berisi domain asli");
    assert.ok(!seedSql.includes("putraanandateguh"), "seed tidak boleh berisi identitas asli");
    assert.ok(!seedSql.includes(PRODUCTION_REF), "seed tidak boleh menyebut ref production sebagai target");
    for (const bad of ["AKIA", "sk-", "xoxb-", "ghp_"]) {
      assert.ok(!seedSql.includes(bad), `seed mengandung pola mirip kunci: ${bad}`);
    }
  });
});

describe("seed-staging.ts — guard keamanan runner", () => {
  const goodEnv = {
    STAGING_DATABASE_URL:
      "postgresql://postgres.staging-ref-example:pass@aws-1-ap-southeast-1.pooler.supabase.com:5432/postgres",
    STAGING_ADMIN_ID: "aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa",
    STAGING_BUYER_ID: "bbbbbbbb-2222-4222-8222-bbbbbbbbbbbb",
    STAGING_READER_ID: "cccccccc-3333-4333-8333-cccccccccccc",
  };

  it("menerima env staging yang valid", () => {
    const r = validateStagingSeedEnv(goodEnv);
    assert.equal(r.adminId, goodEnv.STAGING_ADMIN_ID);
  });

  it("menolak URL yang mengandung ref production", () => {
    assert.throws(
      () => validateStagingSeedEnv({ ...goodEnv, STAGING_DATABASE_URL: `postgresql://x:${PRODUCTION_REF}@db/postgres` }),
      /production/i,
    );
  });

  it("menolak STAGING_DATABASE_URL kosong", () => {
    assert.throws(() => validateStagingSeedEnv({ ...goodEnv, STAGING_DATABASE_URL: "" }), /STAGING_DATABASE_URL/);
  });

  it("menolak UUID placeholder dan UUID tidak valid", () => {
    assert.throws(
      () => validateStagingSeedEnv({ ...goodEnv, STAGING_ADMIN_ID: PLACEHOLDER_IDS.admin }),
      /placeholder/,
    );
    assert.throws(
      () => validateStagingSeedEnv({ ...goodEnv, STAGING_BUYER_ID: "bukan-uuid" }),
      /STAGING_BUYER_ID/,
    );
    assert.throws(() => validateStagingSeedEnv({ ...goodEnv, STAGING_READER_ID: "" }), /STAGING_READER_ID/);
  });

  it("substitusi mengganti SEMUA placeholder dan tidak menyisakan yang lama", () => {
    const out = substituteSeedIds(seedSql, {
      adminId: goodEnv.STAGING_ADMIN_ID,
      buyerId: goodEnv.STAGING_BUYER_ID,
      readerId: goodEnv.STAGING_READER_ID,
    });
    for (const p of Object.values(PLACEHOLDER_IDS)) assert.ok(!out.includes(p), `placeholder ${p} tersisa`);
    assert.ok(out.includes(goodEnv.STAGING_ADMIN_ID));
    assert.ok(out.includes(goodEnv.STAGING_BUYER_ID));
    assert.ok(out.includes(goodEnv.STAGING_READER_ID));
  });
});
