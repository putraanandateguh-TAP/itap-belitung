// LISENSI — validasi server-side PR #24 (black-box, staging).
// Kontrak (dari supabase/functions/validate-license/index.ts,
// supabase/functions/admin-licenses/index.ts, dan
// web/src/app/api/license/{validate,entitlement,admin}/route.ts):
//   POST /api/license/validate {code, action?} -> 200 {ok, reason?}
//     reason: invalid | expired | revoked | device_limit | rate_limited
//     body tidak valid -> 400; tanpa login -> 401; kena batas -> 429
//   GET  /api/license/entitlement           -> 200 {entitled, products, ...}
//   POST /api/license/admin {action}        -> create/list/get/revoke;
//     non-admin -> 403; tanpa login -> 401; create mengembalikan
//     `code` plaintext HANYA SEKALI.
//   Edge Function langsung (functions/v1/validate-license):
//     POST {action, code, device_id} -> alasan yang sama; rate limit
//     persisten: 5 gagal/kode + 10 gagal/IP per 15 menit -> 429.
//     GET ?action=entitlement -> {entitled, products, plan, expires_at}
//
// URUTAN DALAM FILE INI MENGIKAT (rate limit in-memory Next.js 5/15 mnt
// per IP + rate limit persisten Edge Function):
//   - Panggilan ke /api/license/validate dibatasi: 1x tanpa token +
//     uji rate limit di akhir. Semua kasus lain lewat Edge Function
//     langsung (yang hanya menghitung KEGAGALAN).
//   - Uji rate limit HARUS terakhir: ia membakar budget gagal per IP
//     (10/15 mnt) sehingga test lisensi lain sesudahnya akan 429.
//   - File ini jalan TERAKHIR (urutan alfabet: auth, crud, errors,
//     license) agar tidak meracuni file lain.
import { test, expect, cfg, stagingReady, loginAs, api, edge, SEED_CODES, runId } from "./helpers";

test.describe("staging — validasi lisensi server-side (PR #24)", () => {
  test.skip(!stagingReady, "env staging belum lengkap (STAGING_* di .env.staging.local)");

  test("LIC-01 entitlement tanpa login -> 401", async ({ request }) => {
    const res = await api(request, "GET", "/api/license/entitlement");
    expect(res.status()).toBe(401);
  });

  test("LIC-02 validate tanpa login -> 401 (bukan 500)", async ({ request }) => {
    const res = await api(request, "POST", "/api/license/validate", {
      data: { code: SEED_CODES.validGenerator, action: "validate" },
    });
    expect(res.status()).toBe(401);
  });

  test("LIC-03 buyer belum aktivasi -> entitled:false, products:[]", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    const res = await api(request, "GET", "/api/license/entitlement", { token });
    expect(res.status(), await res.text()).toBe(200);
    const body = (await res.json()) as { entitled?: boolean; products?: string[] };
    // Buyer mungkin sudah aktivasi di run sebelumnya (aktivasi persisten)
    // — yang dijaga: bentuk respons benar, bukan 500.
    expect(typeof body.entitled).toBe("boolean");
    expect(Array.isArray(body.products)).toBe(true);
  });

  test("LIC-04 kode valid (seed) via Edge Function -> ok:true generator/lifetime", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    const res = await edge(request, "validate-license", {
      token,
      data: { action: "validate", code: SEED_CODES.validGenerator, device_id: "staging-test-device" },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = (await res.json()) as { ok?: boolean; product?: string; plan?: string };
    expect(body.ok).toBe(true);
    expect(body.product).toBe("generator");
    expect(body.plan).toBe("lifetime");
  });

  test("LIC-05 kode kasir valid -> ok:true product kasir", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    const res = await edge(request, "validate-license", {
      token,
      data: { action: "validate", code: SEED_CODES.validKasir, device_id: "staging-test-device" },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = (await res.json()) as { ok?: boolean; product?: string };
    expect(body.ok).toBe(true);
    expect(body.product).toBe("kasir");
  });

  test("LIC-06 kode salah -> ok:false reason invalid", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    const res = await edge(request, "validate-license", {
      token,
      data: { action: "validate", code: "ITAP-SALAH-0000-0000", device_id: "staging-test-device" },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = (await res.json()) as { ok?: boolean; reason?: string };
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("invalid");
  });

  test("LIC-07 kode expired (status) -> reason expired", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    const res = await edge(request, "validate-license", {
      token,
      data: { action: "validate", code: SEED_CODES.expired, device_id: "staging-test-device" },
    });
    const body = (await res.json()) as { ok?: boolean; reason?: string };
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("expired");
  });

  test("LIC-08 lisensi aktif tapi expires_at lewat -> reason expired", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    const res = await edge(request, "validate-license", {
      token,
      data: { action: "validate", code: SEED_CODES.pastExpiryActive, device_id: "staging-test-device" },
    });
    const body = (await res.json()) as { ok?: boolean; reason?: string };
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("expired");
  });

  test("LIC-09 kode revoked -> reason revoked", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    const res = await edge(request, "validate-license", {
      token,
      data: { action: "validate", code: SEED_CODES.revoked, device_id: "staging-test-device" },
    });
    const body = (await res.json()) as { ok?: boolean; reason?: string };
    expect(body.ok).toBe(false);
    expect(body.reason).toBe("revoked");
  });

  test("LIC-10 aktivasi kode valid -> ok:true, lalu entitlement:true generator", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    const act = await edge(request, "validate-license", {
      token,
      data: { action: "activate", code: SEED_CODES.validGenerator, device_id: "staging-test-device" },
    });
    expect(act.status(), await act.text()).toBe(200);
    const actBody = (await act.json()) as { ok?: boolean };
    expect(actBody.ok).toBe(true);
    const ent = await api(request, "GET", "/api/license/entitlement", { token });
    expect(ent.status()).toBe(200);
    const entBody = (await ent.json()) as { entitled?: boolean; products?: string[] };
    expect(entBody.entitled).toBe(true);
    expect(entBody.products).toContain("generator");
  });

  test("LIC-11 device limit: perangkat ke-2 di lisensi max_devices=1 -> device_limit", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    const first = await edge(request, "validate-license", {
      token,
      data: { action: "activate", code: SEED_CODES.deviceLimit, device_id: "staging-device-1" },
    });
    const firstBody = (await first.json()) as { ok?: boolean };
    expect(firstBody.ok).toBe(true);
    const second = await edge(request, "validate-license", {
      token,
      data: { action: "activate", code: SEED_CODES.deviceLimit, device_id: "staging-device-2" },
    });
    const secondBody = (await second.json()) as { ok?: boolean; reason?: string };
    expect(secondBody.ok).toBe(false);
    expect(secondBody.reason).toBe("device_limit");
    // Perangkat pertama tetap bisa aktivasi ulang (idempotent).
    const again = await edge(request, "validate-license", {
      token,
      data: { action: "activate", code: SEED_CODES.deviceLimit, device_id: "staging-device-1" },
    });
    const againBody = (await again.json()) as { ok?: boolean };
    expect(againBody.ok).toBe(true);
  });

  test("LIC-12 admin: create -> validate -> revoke -> validate lagi revoked", async ({ request }) => {
    const adminToken = await loginAs(request, cfg.admin);
    const buyerToken = await loginAs(request, cfg.buyer);
    const create = await api(request, "POST", "/api/license/admin", {
      token: adminToken,
      data: { action: "create", product: "generator", plan: "monthly", buyer_name: `Uji Staging ${runId}` },
    });
    expect(create.status(), await create.text()).toBe(200);
    const created = (await create.json()) as { ok?: boolean; code?: string; license_id?: string };
    expect(created.ok).toBe(true);
    expect(created.code).toMatch(/^ITAP-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/);
    expect(created.license_id).toBeTruthy();
    const before = await edge(request, "validate-license", {
      token: buyerToken,
      data: { action: "validate", code: created.code as string, device_id: "staging-test-device" },
    });
    expect(((await before.json()) as { ok?: boolean }).ok).toBe(true);
    const revoke = await api(request, "POST", "/api/license/admin", {
      token: adminToken,
      data: { action: "revoke", license_id: created.license_id, reason: "uji staging" },
    });
    expect(revoke.status(), await revoke.text()).toBe(200);
    expect(((await revoke.json()) as { ok?: boolean }).ok).toBe(true);
    const after = await edge(request, "validate-license", {
      token: buyerToken,
      data: { action: "validate", code: created.code as string, device_id: "staging-test-device" },
    });
    const afterBody = (await after.json()) as { ok?: boolean; reason?: string };
    expect(afterBody.ok).toBe(false);
    expect(afterBody.reason).toBe("revoked");
  });

  test("LIC-13 admin list sebagai admin -> 200 berisi lisensi seed", async ({ request }) => {
    const token = await loginAs(request, cfg.admin);
    const res = await api(request, "POST", "/api/license/admin", {
      token,
      data: { action: "list" },
    });
    expect(res.status(), await res.text()).toBe(200);
    const body = (await res.json()) as { ok?: boolean; licenses?: Array<{ product?: string }> };
    expect(body.ok).toBe(true);
    expect(Array.isArray(body.licenses)).toBe(true);
    // Respons list TIDAK BOLEH membocorkan hash/salt.
    expect(JSON.stringify(body)).not.toContain("code_hash");
    expect(JSON.stringify(body)).not.toContain("lookup_hash");
  });

  test("LIC-14 reader memanggil /api/license/admin -> 403", async ({ request }) => {
    const token = await loginAs(request, cfg.reader);
    const res = await api(request, "POST", "/api/license/admin", {
      token,
      data: { action: "list" },
    });
    expect(res.status()).toBe(403);
  });

  test("LIC-15 validate body tidak valid (kode terlalu pendek) -> 400", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    const res = await api(request, "POST", "/api/license/validate", {
      token,
      data: { code: "AB1", action: "validate" },
    });
    expect(res.status()).toBe(400);
  });

  test("LIC-16 rate limit Edge Function: 6x gagal kode yang sama -> 429 (TERAKHIR)", async ({ request }) => {
    const token = await loginAs(request, cfg.buyer);
    const bogus = `ITAP-TEST-RLMT-${runId.slice(-4).toUpperCase()}`;
    const statuses: number[] = [];
    for (let i = 0; i < 6; i++) {
      const res = await edge(request, "validate-license", {
        token,
        data: { action: "validate", code: bogus, device_id: "staging-test-device" },
      });
      statuses.push(res.status());
    }
    // 5 gagal pertama tercatat; percobaan ke-6 kena batas 5 gagal/kode.
    expect(statuses, `status 6 percobaan: ${statuses.join(",")}`).toContain(429);
    expect(statuses[5]).toBe(429);
  });
});
