// Menghapus akun yang sedang masuk. Service role hanya hidup di fungsi ini.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'method' }), { status: 405, headers: cors });
  }
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!supabaseUrl || !anon || !service) {
    return new Response(JSON.stringify({ error: 'unconfigured' }), {
      status: 503,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: req.headers.get('Authorization') || '' } }
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data.user) {
    return new Response(JSON.stringify({ error: 'auth' }), {
      status: 401,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
  const admin = createClient(supabaseUrl, service);
  // Hapus foto iklan milik akun ini dari bucket publik "listings" (struktur: <user_id>/<listing_id>/<file>).
  // Baris tabel ikut terhapus lewat cascade, tetapi file Storage tidak, jadi dibersihkan di sini.
  try {
    const uid = data.user.id;
    const bucket = admin.storage.from('listings');
    const top = await bucket.list(uid, { limit: 1000 });
    const paths: string[] = [];
    for (const entry of top.data || []) {
      if (entry.id) { paths.push(uid + '/' + entry.name); continue; }
      const inner = await bucket.list(uid + '/' + entry.name, { limit: 1000 });
      for (const f of inner.data || []) paths.push(uid + '/' + entry.name + '/' + f.name);
    }
    for (let i = 0; i < paths.length; i += 100) await bucket.remove(paths.slice(i, i + 100));
  } catch (_) {
    // Lanjut hapus akun; sisa file bisa dibersihkan admin lewat "Bersihkan foto yatim".
  }
  const removed = await admin.auth.admin.deleteUser(data.user.id);
  if (removed.error) {
    return new Response(JSON.stringify({ error: 'delete' }), {
      status: 500,
      headers: { ...cors, 'Content-Type': 'application/json' }
    });
  }
  return new Response(JSON.stringify({ ok: true }), {
    headers: { ...cors, 'Content-Type': 'application/json' }
  });
});
