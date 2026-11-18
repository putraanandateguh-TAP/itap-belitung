// validate-license — validasi lisensi FULL server-side (Workstream B).
// Menggantikan generator/lock.js + kasir/lock.js (client-side, K1).
//
//   POST /functions/v1/validate-license  { action: "validate"|"activate",
//        code, device_id?, device_label? }
//   GET  /functions/v1/validate-license?action=entitlement
//
// Auth: JWT pengguna (verify_jwt = true di config.toml). Service-role key
// HANYA hidup di fungsi ini (Deno.env) — tidak pernah ke client.
// Pepper: secret LICENSE_PEPPER (Supabase Edge Function secrets).
//
// Fail-closed: konfigurasi hilang, pepper hilang, atau error apa pun
// -> 503 / entitled:false. Kode mentah, pepper, dan salt TIDAK PERNAH
// ditulis ke log/audit — hanya lookup_hash / ip_hash.
//
// Rate limit: maks 5 percobaan gagal per kode dalam 15 menit, maks 10
// percobaan gagal per IP-hash dalam 15 menit (tabel license_attempts).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

const MAX_FAILS_PER_CODE = 5;
const MAX_FAILS_PER_IP = 10;
const WINDOW_MS = 15 * 60 * 1000;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
}

function normalize(code: string): string {
  return (code || '').toUpperCase().replace(/[\s-]/g, '');
}

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') || '').split(',')[0].trim()
    || req.headers.get('x-real-ip') || 'unknown';
}

function randomSaltHex(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const pepper = Deno.env.get('LICENSE_PEPPER') || '';
  if (!supabaseUrl || !anon || !service || !pepper) {
    // Fail-closed: tanpa pepper/konfigurasi, tidak ada lisensi yang valid.
    return json({ error: 'unconfigured' }, 503);
  }

  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: 'auth' }, 401);
  const user = authData.user;
  const admin = createClient(supabaseUrl, service);
  const ip = clientIp(req);
  const ipH = await sha256Hex('ip:' + ip);
  const windowStart = new Date(Date.now() - WINDOW_MS).toISOString();

  async function audit(
    licenseId: string | null, action: string, deviceH: string | null, reason: string,
  ) {
    try {
      await admin.from('license_audit_log').insert({
        license_id: licenseId, user_id: user.id, action,
        device_hash: deviceH, ip_hash: ipH, reason,
      });
    } catch (_) { /* Audit tidak boleh menggagalkan jawaban. */ }
  }

  // ---------- GET ?action=entitlement ----------
  // Entitlement pengguna: produk apa saja yang aktif untuk akun ini,
  // dari license_activations yang masih berlaku. Dipakai hook frontend.
  if (req.method === 'GET') {
    const url = new URL(req.url);
    if (url.searchParams.get('action') !== 'entitlement') {
      return json({ error: 'bad_request' }, 400);
    }
    const { data: acts, error } = await admin
      .from('license_activations')
      .select('license_id, revoked_at, licenses!inner(id, product, plan, status, expires_at)')
      .eq('user_id', user.id)
      .is('revoked_at', null);
    if (error) return json({ entitled: false, products: [] }, 503);
    const now = new Date();
    const products: Array<{ product: string; plan: string; expires_at: string | null }> = [];
    for (const a of acts || []) {
      const lic = (a as unknown as { licenses: { product: string; plan: string; status: string; expires_at: string | null } }).licenses;
      if (!lic || lic.status !== 'active') continue;
      if (lic.expires_at && new Date(lic.expires_at) <= now) continue;
      products.push({ product: lic.product, plan: lic.plan, expires_at: lic.expires_at });
    }
    const first = products[0] || null;
    await audit(null, 'entitlement', null, products.length > 0 ? 'ok' : 'none');
    return json({
      entitled: products.length > 0,
      products: [...new Set(products.map((p) => p.product))],
      plan: first ? first.plan : null,
      expires_at: first ? first.expires_at : null,
    });
  }

  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const body = await req.json().catch(() => null) as {
    action?: string; code?: string; device_id?: string; device_label?: string;
  } | null;
  const action = body?.action;
  if (action !== 'validate' && action !== 'activate') {
    return json({ error: 'bad_request' }, 400);
  }
  const code = normalize(String(body?.code || ''));
  if (!/^[A-Z0-9]{8,32}$/.test(code)) {
    return json({ ok: false, reason: 'invalid' }, 200);
  }
  const deviceId = String(body?.device_id || 'default');
  const deviceH = await sha256Hex('device:' + deviceId);
  const lookupH = await sha256Hex(pepper + code);

  // ---------- Rate limit (per kode + per IP) ----------
  const { count: failsCode } = await admin
    .from('license_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('lookup_hash', lookupH).eq('success', false).gte('created_at', windowStart);
  const { count: failsIp } = await admin
    .from('license_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('ip_hash', ipH).eq('success', false).gte('created_at', windowStart);
  if ((failsCode || 0) >= MAX_FAILS_PER_CODE || (failsIp || 0) >= MAX_FAILS_PER_IP) {
    await audit(null, action === 'activate' ? 'activate_fail' : 'validate_fail', deviceH, 'rate_limited');
    return json({ ok: false, reason: 'rate_limited', retry_after_sec: 900 }, 429);
  }

  async function recordAttempt(success: boolean) {
    try {
      await admin.from('license_attempts').insert({
        lookup_hash: lookupH, ip_hash: ipH, success,
      });
    } catch (_) { /* Jangan gagalkan jawaban karena pencatatan. */ }
  }

  // ---------- Cari lisensi ----------
  const { data: lic } = await admin
    .from('licenses')
    .select('id, salt, code_hash, product, plan, status, origin, legacy_code_hash, expires_at, max_devices')
    .eq('lookup_hash', lookupH)
    .maybeSingle();

  let license = lic as {
    id: string; salt: string; code_hash: string; product: string; plan: string;
    status: string; origin: string; legacy_code_hash: string | null;
    expires_at: string | null; max_devices: number;
  } | null;

  // Jalur legacy: kode lama (hash tanpa salt di generator/lock.js).
  // Bila cocok, lisensi tetap harus di-re-issue — jawaban menandai
  // legacy:true agar frontend menampilkan peringatan re-issue.
  let isLegacy = false;
  if (!license) {
    const rawH = await sha256Hex(code);
    const { data: leg } = await admin
      .from('licenses')
      .select('id, salt, code_hash, product, plan, status, origin, legacy_code_hash, expires_at, max_devices')
      .eq('origin', 'legacy')
      .eq('legacy_code_hash', rawH)
      .maybeSingle();
    if (leg) { license = leg as typeof license; isLegacy = true; }
  }

  if (!license) {
    await recordAttempt(false);
    await audit(null, action === 'activate' ? 'activate_fail' : 'validate_fail', deviceH, 'not_found');
    return json({ ok: false, reason: 'invalid' });
  }

  // Verifikasi hash salted (jalur baru). Jalur legacy sudah diverifikasi
  // lewat legacy_code_hash di atas.
  if (!isLegacy) {
    const expect = await sha256Hex(license.salt + pepper + code);
    if (!timingSafeEqual(expect, license.code_hash)) {
      await recordAttempt(false);
      await audit(license.id, action === 'activate' ? 'activate_fail' : 'validate_fail', deviceH, 'hash_mismatch');
      return json({ ok: false, reason: 'invalid' });
    }
  }

  // ---------- Status + expiry ----------
  if (license.status === 'revoked') {
    await recordAttempt(false);
    await audit(license.id, action === 'activate' ? 'activate_fail' : 'validate_fail', deviceH, 'revoked');
    return json({ ok: false, reason: 'revoked' });
  }
  if (license.status === 'expired' || (license.expires_at && new Date(license.expires_at) <= new Date())) {
    await recordAttempt(false);
    await audit(license.id, action === 'activate' ? 'activate_fail' : 'validate_fail', deviceH, 'expired');
    return json({ ok: false, reason: 'expired' });
  }

  await recordAttempt(true);

  if (action === 'validate') {
    await audit(license.id, 'validate_ok', deviceH, 'ok');
    return json({
      ok: true, product: license.product, plan: license.plan,
      expires_at: license.expires_at, legacy: isLegacy,
    });
  }

  // ---------- activate: catat perangkat (batas max_devices) ----------
  const { data: existing } = await admin
    .from('license_activations')
    .select('id')
    .eq('license_id', license.id)
    .eq('user_id', user.id)
    .eq('device_hash', deviceH)
    .is('revoked_at', null)
    .maybeSingle();

  if (!existing) {
    const { count: activeCount } = await admin
      .from('license_activations')
      .select('id', { count: 'exact', head: true })
      .eq('license_id', license.id)
      .is('revoked_at', null);
    if ((activeCount || 0) >= license.max_devices) {
      await audit(license.id, 'activate_fail', deviceH, 'device_limit');
      return json({ ok: false, reason: 'device_limit' });
    }
    const { error: insErr } = await admin.from('license_activations').insert({
      license_id: license.id, user_id: user.id,
      device_hash: deviceH, device_label: String(body?.device_label || '').slice(0, 80) || null,
    });
    if (insErr) {
      await audit(license.id, 'activate_fail', deviceH, 'db_error');
      return json({ ok: false, reason: 'error' }, 503);
    }
  } else {
    await admin.from('license_activations')
      .update({ last_seen_at: new Date().toISOString() })
      .eq('id', (existing as { id: string }).id);
  }

  await audit(license.id, 'activate_ok', deviceH, 'ok');
  return json({
    ok: true, product: license.product, plan: license.plan,
    expires_at: license.expires_at, legacy: isLegacy,
  });
});
