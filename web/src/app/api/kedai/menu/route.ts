import { NextResponse } from "next/server";
import { getKedai } from "@/lib/data";

// GET /api/kedai/menu — menu Kedai Baso Aci (+ link GrabFood/GoFood). §3.8.
export async function GET() {
  return NextResponse.json(await getKedai());
}
