import { NextResponse } from "next/server";
import { listProducts } from "@/lib/data";

// GET /api/products — katalog produk digital iTAP (TANPA logika lisensi). §3.8.
export async function GET() {
  return NextResponse.json(await listProducts());
}
