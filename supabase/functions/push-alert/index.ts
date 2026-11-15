// Cek BMKG (gempa) dan Open-Meteo (hujan, angin, gelombang) lalu kirim Web Push. Dipanggil terjadwal oleh GitHub Actions.
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push@3.6.7";

const LAT = -2.75, LON = 107.65;
const km = (a: number, b: number, c: number, d: number) => {
  const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
};
const j = async (u: string) => { const r = await fetch(u); if (!r.ok) throw new Error(u); return r.json(); };

Deno.serve(async (req) => {
  if (req.headers.get("x-cron-secret") !== Deno.env.get("PUSH_CRON_SECRET")) return new Response("forbidden", { status: 403 });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:admin@itapbelitung.my.id", Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
  if (new URL(req.url).searchParams.get("selftest") === "1") { // uji kripto web-push di runtime ini; tidak mengirim apa pun
    try {
      const k = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
      const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const raw = new Uint8Array(await crypto.subtle.exportKey("raw", k.publicKey));
      const d = webpush.generateRequestDetails({ endpoint: "https://fcm.googleapis.com/fcm/send/selftest", keys: { p256dh: b64(raw), auth: b64(crypto.getRandomValues(new Uint8Array(16))) } }, JSON.stringify({ title: "uji" }), { TTL: 60 });
      return Response.json({ selftest: "ok", host: new URL(d.endpoint).host });
    } catch (e) { return Response.json({ selftest: "gagal", error: String(e) }, { status: 500 }); }
  }
  const hari = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const alerts: { key: string; title: string; body: string }[] = [];

  try { // Gempa M5+ dalam 600 km dari Belitung
    const g = (await j("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json")).Infogempa.gempa;
    const [la, lo] = String(g.Coordinates).split(",").map(Number);
    const d = km(LAT, LON, la, lo);
    if (Number(g.Magnitude) >= 5 && d <= 600) alerts.push({ key: "gempa:" + g.DateTime, title: `Gempa M${g.Magnitude} · ${Math.round(d)} km dari Belitung`, body: `${g.Wilayah}. ${g.Potensi || ""}`.trim() });
  } catch (_) { /* sumber sedang gangguan */ }

  try { // Hujan lebat / angin kencang 3 jam ke depan
    const w = (await j(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=precipitation,wind_gusts_10m&forecast_hours=3&timezone=Asia%2FJakarta`)).hourly;
    const hujan = w.precipitation.reduce((a: number, b: number) => a + b, 0), angin = Math.max(...w.wind_gusts_10m);
    if (hujan >= 20) alerts.push({ key: `hujan:${hari}`, title: "Hujan lebat di Belitung", body: `Perkiraan ${Math.round(hujan)} mm dalam 3 jam ke depan. Hati-hati di jalan.` });
    if (angin >= 60) alerts.push({ key: `angin:${hari}`, title: "Angin kencang di Belitung", body: `Hembusan sampai ${Math.round(angin)} km/jam dalam 3 jam ke depan.` });
  } catch (_) { /* abaikan */ }

  try { // Gelombang tinggi 6 jam ke depan
    const m = (await j(`https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}&hourly=wave_height&forecast_hours=6&timezone=Asia%2FJakarta`)).hourly.wave_height;
    const tinggi = Math.max(...m);
    if (tinggi >= 2.5) alerts.push({ key: `ombak:${hari}`, title: "Gelombang tinggi di perairan Belitung", body: `Tinggi gelombang sampai ${tinggi.toFixed(1)} m. Tunda melaut atau wisata pantai.` });
  } catch (_) { /* abaikan */ }

  let terkirim = 0, baru = 0;
  for (const a of alerts) {
    const { data: ada } = await sb.from("push_state").select("key").eq("key", a.key).maybeSingle();
    if (ada) continue;
    baru++;
    const { data: subs } = await sb.from("push_subscriptions").select("endpoint,p256dh,auth");
    for (const s of subs || []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: a.title, body: a.body, tag: a.key }), { TTL: 3600 });
        terkirim++;
      } catch (e) {
        if ([404, 410].includes((e as { statusCode?: number }).statusCode ?? 0)) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
    await sb.from("push_state").upsert({ key: a.key, value: "1", updated_at: new Date().toISOString() });
  }
  return Response.json({ peringatan_baru: baru, terkirim });
});
