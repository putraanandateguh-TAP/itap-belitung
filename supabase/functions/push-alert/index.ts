// Cek BMKG (gempa) dan Open-Meteo (hujan, angin, gelombang) lalu kirim Web Push. Dipanggil terjadwal oleh GitHub Actions.
import { createClient } from "npm:@supabase/supabase-js@2.119.0";
import webpush from "npm:web-push@3.6.7";

const LAT = -2.75, LON = 107.65;
// Batas waktu tiap fetch sumber data: sumber yang menggantung tidak boleh
// menahan seluruh fungsi (limit eksekusi Edge Function).
const FETCH_TIMEOUT_MS = 8000;
// Perbandingan string waktu-konstan (anti timing attack) untuk rahasia cron.
const safeEqual = (a: string, b: string) => {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
};
const km = (a: number, b: number, c: number, d: number) => {
  const r = Math.PI / 180, x = Math.sin((c - a) * r / 2) ** 2 + Math.cos(a * r) * Math.cos(c * r) * Math.sin((d - b) * r / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(x));
};
const j = async (u: string) => {
  const r = await fetch(u, { signal: AbortSignal.timeout(FETCH_TIMEOUT_MS) });
  if (!r.ok) throw new Error(u + " -> HTTP " + r.status);
  return r.json();
};

type Alert = { key: string; title: string; body: string };

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("method tidak diizinkan", { status: 405 });
  const secret = Deno.env.get("PUSH_CRON_SECRET") || "";
  if (!secret || !safeEqual(req.headers.get("x-cron-secret") || "", secret)) return new Response("forbidden", { status: 403 });
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
  webpush.setVapidDetails(Deno.env.get("VAPID_SUBJECT") || "mailto:admin@itapbelitung.my.id", Deno.env.get("VAPID_PUBLIC_KEY")!, Deno.env.get("VAPID_PRIVATE_KEY")!);
  if (new URL(req.url).searchParams.get("selftest") === "1") { // uji kripto web-push di runtime ini; tidak mengirim apa pun
    try {
      const k = await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, ["deriveBits"]);
      const b64 = (u: Uint8Array) => btoa(String.fromCharCode(...u)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      const raw = new Uint8Array(await crypto.subtle.exportKey("raw", k.publicKey));
      const d = webpush.generateRequestDetails({ endpoint: "https://fcm.googleapis.com/fcm/send/selftest", keys: { p256dh: b64(raw), auth: b64(crypto.getRandomValues(new Uint8Array(16))) } }, JSON.stringify({ title: "uji" }), { TTL: 60 });
      return Response.json({ selftest: "ok", host: new URL(d.endpoint).host });
    } catch (e) { console.error("selftest gagal:", e); return Response.json({ selftest: "gagal" }, { status: 500 }); }
  }
  // Mode uji (?test=1): kirim SATU notifikasi uji nyata ke semua langganan.
  // Sesuai PAKET-LANJUTAN.md (L3): {"test":"ok","langganan":N,"terkirim":M}.
  // Hanya dengan x-cron-secret. Jangan jalankan lebih dari sekali tanpa diminta.
  if (new URL(req.url).searchParams.get("test") === "1") {
    const { data: subs } = await sb.from("push_subscriptions").select("endpoint,p256dh,auth");
    let ok = 0;
    for (const s of subs || []) {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify({ title: "Tes notifikasi iTAP", body: "Peringatan cuaca dan gempa sudah aktif di HP ini.", tag: "itap-test" }), { TTL: 300 });
        ok++;
      } catch (e) {
        if ([404, 410].includes((e as { statusCode?: number }).statusCode ?? 0)) await sb.from("push_subscriptions").delete().eq("endpoint", s.endpoint);
      }
    }
    return Response.json({ test: "ok", langganan: (subs || []).length, terkirim: ok });
  }
  const hari = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });

  // Ketiga sumber diambil PARALEL (dulu berurutan): satu sumber lambat tidak
  // boleh menunda sumber lain. Tiap sumber gagal sendiri-sendiri; kegagalan
  // dicatat di log, bukan ditelan diam-diam.
  const sumber: { nama: string; ambil: () => Promise<Alert[]> }[] = [
    {
      nama: "gempa",
      ambil: async () => { // Gempa M5+ dalam 600 km dari Belitung
        const g = (await j("https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json")).Infogempa.gempa;
        const [la, lo] = String(g.Coordinates).split(",").map(Number);
        const d = km(LAT, LON, la, lo);
        if (Number(g.Magnitude) >= 5 && d <= 600) {
          return [{ key: "gempa:" + g.DateTime, title: `Gempa M${g.Magnitude} · ${Math.round(d)} km dari Belitung`, body: `${g.Wilayah}. ${g.Potensi || ""}`.trim() }];
        }
        return [];
      },
    },
    {
      nama: "cuaca",
      ambil: async () => { // Hujan lebat / angin kencang 3 jam ke depan
        const w = (await j(`https://api.open-meteo.com/v1/forecast?latitude=${LAT}&longitude=${LON}&hourly=precipitation,wind_gusts_10m&forecast_hours=3&timezone=Asia%2FJakarta`)).hourly;
        const out: Alert[] = [];
        const hujan = w.precipitation.reduce((a: number, b: number) => a + b, 0), angin = Math.max(...w.wind_gusts_10m);
        if (hujan >= 20) out.push({ key: `hujan:${hari}`, title: "Hujan lebat di Belitung", body: `Perkiraan ${Math.round(hujan)} mm dalam 3 jam ke depan. Hati-hati di jalan.` });
        if (angin >= 60) out.push({ key: `angin:${hari}`, title: "Angin kencang di Belitung", body: `Hembusan sampai ${Math.round(angin)} km/jam dalam 3 jam ke depan.` });
        return out;
      },
    },
    {
      nama: "ombak",
      ambil: async () => { // Gelombang tinggi 6 jam ke depan
        const m = (await j(`https://marine-api.open-meteo.com/v1/marine?latitude=${LAT}&longitude=${LON}&hourly=wave_height&forecast_hours=6&timezone=Asia%2FJakarta`)).hourly.wave_height;
        const tinggi = Math.max(...m);
        if (tinggi >= 2.5) {
          return [{ key: `ombak:${hari}`, title: "Gelombang tinggi di perairan Belitung", body: `Tinggi gelombang sampai ${tinggi.toFixed(1)} m. Tunda melaut atau wisata pantai.` }];
        }
        return [];
      },
    },
  ];
  const hasil = await Promise.allSettled(sumber.map((s) => s.ambil()));
  const alerts: Alert[] = [];
  const statusSumber: Record<string, string> = {};
  hasil.forEach((h, i) => {
    if (h.status === "fulfilled") {
      statusSumber[sumber[i].nama] = "ok";
      alerts.push(...h.value);
    } else {
      statusSumber[sumber[i].nama] = "gagal";
      console.error("push-alert sumber gagal:", sumber[i].nama, String(h.reason));
    }
  });

  // Mode simulasi (?dry=1): laporkan apa yang AKAN dikirim tanpa mengirim
  // push dan tanpa menulis push_state. Tetap butuh x-cron-secret seperti biasa.
  if (new URL(req.url).searchParams.get("dry") === "1") {
    const { count } = await sb.from("push_subscriptions").select("endpoint", { count: "exact", head: true });
    return Response.json({ dry: true, tanggal: hari, sumber: statusSumber, peringatan: alerts, pelanggan: count ?? 0 });
  }

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
