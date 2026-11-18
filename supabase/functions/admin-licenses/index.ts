// admin-licenses — manajemen lisensi untuk admin portal / superadmin.
//   POST /functions/v1/admin-licenses
//     { action: "create", product, plan, max_devices?, expires_at?,
//       buyer_name?, buyer_contact? }  -> { ok, code, license_id, ... }
//       Kode plaintext dikembalikan HANYA SEKALI di respons ini.
//       Admin wajib menyampaikannya ke pembeli lewat jalur aman (WA/email)
//       dan TIDAK menyimpannya di repo/chat/log.
//     { action: "list", product? }    -> { ok, licenses: [...] } (tanpa hash)
//     { action: "revoke", license_id, reason? } -> { ok }
//     { action: "get", license_id }    -> { ok, license } (tanpa hash)
//
// Auth: JWT pengguna (verify_jwt = true). Peran dicek server-side dari
// profiles.role via service client — TIDAK PERNAH dari klaim client.
// Hanya admin_portal / superadmin. Service-role key + LICENSE_PEPPER
// hanya hidup di fungsi ini.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

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

function randomSaltHex(): string {
  const b = new Uint8Array(16);
  crypto.getRandomValues(b);
  return [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function generateCode(): string {
  const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'; // tanpa 0/O/1/I/L
  const b = new Uint8Array(12);
  crypto.getRandomValues(b);
  const groups: string[] = [];
  for (let g = 0; g < 3; g++) {
    let s = '';
    for (let i = 0; i < 4; i++) s += alphabet[b[g * 4 + i] % alphabet.length];
    groups.push(s);
  }
  return 'ITAP-' + groups.join('-');
}

function planDays(plan: string): number | null {
  if (plan === 'monthly') return 30;
  if (plan === 'quarterly') return 90;
  if (plan === 'yearly') return 365;
  return null; // lifetime
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const pepper = Deno.env.get('LICENSE_PEPPER') || '';
  if (!supabaseUrl || !anon || !service || !pepper) {
    return json({ error: 'unconfigured' }, 503);
  }

  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
  });
  const { data: authData, error: authError } = await userClient.auth.getUser();
  if (authError || !authData.user) return json({ error: 'auth' }, 401);

  const admin = createClient(supabaseUrl, service);
  const { data: profile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', authData.user.id)
    .maybeSingle();
  const role = (profile as { role?: string } | null)?.role;
  if (role !== 'admin_portal' && role !== 'superadmin') {
    return json({ error: 'forbidden' }, 403);
  }
  const adminId = authData.user.id;

  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const action = body?.action;

  // ---------- list / get (tanpa hash/salt — tidak pernah ke client) ----------
  const publicCols = 'id, product, plan, status, origin, expires_at, max_devices, buyer_name, buyer_contact, issued_by, revoked_at, revoke_reason, created_at';
  if (action === 'list') {
    let q = admin.from('licenses').select(publicCols).order('created_at', { ascending: false }).limit(200);
    if (body?.product === 'generator' || body?.product === 'kasir') q = q.eq('product', body.product);
    if (body?.status === 'active' || body?.status === 'revoked' || body?.status === 'expired') q = q.eq('status', body.status);
    const { data, error } = await q;
    if (error) return json({ error: 'db_error' }, 503);
    return json({ ok: true, licenses: data || [] });
  }
  if (action === 'get') {
    const id = String(body?.license_id || '');
    if (!id) return json({ error: 'bad_request' }, 400);
    const { data, error } = await admin.from('licenses').select(publicCols).eq('id', id).maybeSingle();
    if (error || !data) return json({ error: 'not_found' }, 404);
    const { count: activations } = await admin
      .from('license_activations')
      .select('id', { count: 'exact', head: true })
      .eq('license_id', id).is('revoked_at', null);
    return json({ ok: true, license: data, active_activations: activations || 0 });
  }

  // ---------- create ----------
  if (action === 'create') {
    const product = body?.product;
    const plan = body?.plan;
    if (product !== 'generator' && product !== 'kasir') return json({ error: 'bad_request' }, 400);
    if (plan !== 'lifetime' && plan !== 'monthly' && plan !== 'quarterly' && plan !== 'yearly') {
      return json({ error: 'bad_request' }, 400);
    }
    const maxDevices = Math.min(Math.max(Number(body?.max_devices) || 3, 1), 10);
    const days = planDays(plan as string);
    const expiresAt = body?.expires_at
      ? new Date(String(body.expires_at)).toISOString()
      : days ? new Date(Date.now() + days * 86400000).toISOString() : null;

    const code = generateCode();
    const normalized = normalize(code);
    const salt = randomSaltHex();
    const lookupH = await sha256Hex(pepper + normalized);
    const codeH = await sha256Hex(salt + pepper + normalized);
    const { data, error } = await admin.from('licenses').insert({
      lookup_hash: lookupH, salt, code_hash: codeH,
      product, plan, status: 'active', origin: 'issued',
      expires_at: expiresAt, max_devices: maxDevices,
      buyer_name: String(body?.buyer_name || '').slice(0, 120) || null,
      buyer_contact: String(body?.buyer_contact || '').slice(0, 120) || null,
      issued_by: adminId,
    }).select('id').single();
    if (error || !data) return json({ error: 'db_error' }, 503);
    try {
      await admin.from('license_audit_log').insert({
        license_id: (data as { id: string }).id, user_id: adminId, action: 'create', reason: 'ok',
      });
    } catch (_) { /* abaikan */ }
    // `code` hanya ada di respons ini — JANGAN log, JANGAN simpan ulang.
    return json({
      ok: true, code, license_id: (data as { id: string }).id,
      product, plan, expires_at: expiresAt, max_devices: maxDevices,
    });
  }

  // ---------- revoke ----------
  if (action === 'revoke') {
    const id = String(body?.license_id || '');
    if (!id) return json({ error: 'bad_request' }, 400);
    const { data, error } = await admin.from('licenses').update({
      status: 'revoked', revoked_at: new Date().toISOString(),
      revoked_by: adminId, revoke_reason: String(body?.reason || '').slice(0, 200) || null,
    }).eq('id', id).eq('status', 'active').select('id').maybeSingle();
    if (error) return json({ error: 'db_error' }, 503);
    if (!data) return json({ error: 'not_found' }, 404);
    try {
      await admin.from('license_activations').update({ revoked_at: new Date().toISOString() })
        .eq('license_id', id).is('revoked_at', null);
      await admin.from('license_audit_log').insert({
        license_id: id, user_id: adminId, action: 'revoke', reason: 'ok',
      });
    } catch (_) { /* abaikan */ }
    return json({ ok: true });
  }

  return json({ error: 'bad_request' }, 400);
});
