// Cron guard bersama: Vercel Cron mengirim header Authorization:
// Bearer <CRON_SECRET>. Tanpa secret yang cocok -> 401. Jangan pernah
// memanggil job ini dari client.
import "server-only";
import { NextResponse } from "next/server";

export function cronAuth(req: Request): NextResponse | null {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "CRON_SECRET belum diisi — job cron belum dikonfigurasi." },
      { status: 503 },
    );
  }
  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Tidak diizinkan." }, { status: 401 });
  }
  return null;
}
