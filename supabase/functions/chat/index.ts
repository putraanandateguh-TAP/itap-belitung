// Proxy asisten. Kunci model hanya ada di secret fungsi, tidak di browser.
// Secret: GEMINI_API_KEY (wajib), GEMINI_MODEL (opsional), RATE_SALT (opsional).
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const LIMIT_USER = 12;
const LIMIT_IP = 30;
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

async function sha(text: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  if (req.method !== 'POST') return json({ error: 'method' }, 405);

  const key = Deno.env.get('GEMINI_API_KEY') || '';
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anon = Deno.env.get('SUPABASE_ANON_KEY') || '';
  const service = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  if (!key || !supabaseUrl || !anon || !service) return json({ error: 'unconfigured' }, 503);

  const authHeader = req.headers.get('Authorization') || '';
  const userClient = createClient(supabaseUrl, anon, {
    global: { headers: { Authorization: authHeader } }
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  const user = userData?.user;
  if (userError || !user) return json({ error: 'auth' }, 401);

  let message = '';
  try {
    const body = await req.json();
    message = String(body?.message || '').trim();
  } catch {
    return json({ error: 'body' }, 400);
  }
  if (message.length < 2 || message.length > 800) return json({ error: 'message' }, 400);

  const ip = (req.headers.get('x-forwarded-for') || '').split(',')[0].trim();
  const ipHash = await sha((Deno.env.get('RATE_SALT') || 'itap') + '|' + ip);
  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const admin = createClient(supabaseUrl, service);
  const userCount = await admin.from('ai_usage').select('id', { count: 'exact', head: true }).eq('user_id', user.id).gte('created_at', since);
  const ipCount = await admin.from('ai_usage').select('id', { count: 'exact', head: true }).eq('ip_hash', ipHash).gte('created_at', since);
  if ((userCount.count || 0) >= LIMIT_USER || (ipCount.count || 0) >= LIMIT_IP) {
    return json({ error: 'limit' }, 429);
  }

  // Model lama dipensiunkan Google; urutan cadangan dari yang terbaru.
  const models = [...new Set(['gemini-3.8-flash', 'gemini-3.5-flash-lite', 'gemini-3.6-flash', 'gemini-3.1-flash-lite', 'gemini-flash-latest', 'gemini-flash-lite-latest', Deno.env.get('GEMINI_MODEL') || 'gemini-3.8-flash'])];
  const prompt = [
    'Kamu asisten singkat iTAP Belitung. Jawab dalam bahasa yang dipakai pengguna.',
    'Jangan mengarang harga, nomor telepon, jadwal kapal, atau berita.',
    'Jika tidak yakin, katakan tidak tahu dan arahkan ke halaman situs atau WhatsApp iTAP.',
    'Nomor darurat resmi tetap 112, 110, dan 115, plus nomor yang sudah terbit di situs iTAP.',
    'Pengguna: ' + message
  ].join('\n');
  let text = '';
  for (const model of models) {
    const ai = await fetch(
      'https://generativelanguage.googleapis.com/v1beta/models/' + encodeURIComponent(model) + ':generateContent',
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          // Jatah token longgar supaya mode "berpikir" tidak menghabiskannya sebelum jawaban keluar.
          generationConfig: model.startsWith('gemini-2.5')
            ? { maxOutputTokens: 1024, temperature: 0.4, thinkingConfig: { thinkingBudget: 0 } }
            : { maxOutputTokens: 2048, temperature: 0.4 }
        })
      }
    );
    if (!ai.ok) {
      console.error('gemini', model, ai.status, (await ai.text()).slice(0, 300));
      continue;
    }
    const payload = await ai.json();
    text = (payload?.candidates?.[0]?.content?.parts || []).map((part: { text?: string }) => part.text || '').join('').trim();
    if (text) break;
    console.error('gemini kosong', model, JSON.stringify(payload?.candidates?.[0]?.finishReason || payload?.promptFeedback || '').slice(0, 200));
  }
  if (!text) return json({ error: 'upstream' }, 502);

  await admin.from('ai_usage').insert({ user_id: user.id, ip_hash: ipHash });
  return json({ text });
});
