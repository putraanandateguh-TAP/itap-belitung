import { NextResponse } from "next/server";
import { listInfoSubmissions } from "@/lib/data";
import { requireAdmin } from "@/lib/api";

// GET /api/admin/info-submissions — kiriman info warga untuk kurasi. §3.5.
// Mode seed: daftar contoh dari store in-memory (bukan data nyata).
export async function GET(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const u = new URL(req.url);
  const status = u.searchParams.get("status") ?? undefined;
  return NextResponse.json(await listInfoSubmissions(status));
}
