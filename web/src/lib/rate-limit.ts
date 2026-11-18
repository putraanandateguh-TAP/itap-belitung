// Rate limit sederhana (token bucket in-memory, per proses).
// Cukup untuk satu instance Vercel kecil; bila scale-out, ganti ke Upstash
// Redis (env UPSTASH_REDIS_REST_URL/TOKEN) tanpa mengubah pemakaian.
// Diterapkan di: signup, kirim OTP, reset kata sandi, kirim pesan, komentar.
// Batas default: 5 percobaan / 15 menit per kunci (IP + aksi).
const buckets = new Map<string, { tokens: number; resetAt: number }>();

export interface RateLimitResult { ok: boolean; retryAfterSec: number }

export function rateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000,
): RateLimitResult {
  const now = Date.now();
  const b = buckets.get(key);
  if (!b || now >= b.resetAt) {
    buckets.set(key, { tokens: limit - 1, resetAt: now + windowMs });
    return { ok: true, retryAfterSec: 0 };
  }
  if (b.tokens > 0) {
    b.tokens -= 1;
    return { ok: true, retryAfterSec: 0 };
  }
  return { ok: false, retryAfterSec: Math.ceil((b.resetAt - now) / 1000) };
}

/** Kunci dari header request (IP) + nama aksi. Jangan masukkan data user. */
export function rateLimitKey(req: Request, action: string): string {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown";
  return `${action}:${ip}`;
}

export function rateLimitResponse(retryAfterSec: number): Response {
  return Response.json(
    { error: `Terlalu banyak percobaan. Coba lagi dalam ${retryAfterSec} detik.` },
    { status: 429, headers: { "Retry-After": String(retryAfterSec) } },
  );
}
