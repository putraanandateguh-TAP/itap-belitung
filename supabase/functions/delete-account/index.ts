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
