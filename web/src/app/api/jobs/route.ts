import { NextResponse } from "next/server";
import { listJobs } from "@/lib/data";

// GET /api/jobs — lowongan kerja. §3.8.
export async function GET(req: Request) {
  const u = new URL(req.url);
  return NextResponse.json(await listJobs({
    q: u.searchParams.get("q") ?? undefined,
    region: u.searchParams.get("region") ?? undefined,
  }));
}
