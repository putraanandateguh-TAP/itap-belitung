import { NextResponse } from "next/server";
import { listAdminArticles } from "@/lib/data";
import { errorToResponse, requireAdmin } from "@/lib/api";
import { contributionSchema, parseJsonBody } from "@/lib/validation";
import { getDb, isDbConfigured } from "@/lib/db";
import * as t from "@/lib/db/schema";
import { z } from "zod";

// GET /api/admin/articles — tabel konten (semua status). §3.5.
// POST — buat artikel (redaksi). §3.5.
export async function GET(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const u = new URL(req.url);
  return NextResponse.json(await listAdminArticles(u.searchParams.get("status") ?? undefined));
}

const adminArticleSchema = contributionSchema.extend({
  status: z.enum(["draft", "published"]).default("draft"),
});

export async function POST(req: Request) {
  const a = await requireAdmin();
  if ("error" in a) return a.error;
  const parsed = await parseJsonBody(req, adminArticleSchema);
  if ("error" in parsed) return parsed.error;
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "DATABASE_URL belum diisi (P1)." }, { status: 503 });
  }
  try {
    const d = parsed.data;
    const slug = `${d.title_id.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${Date.now().toString(36)}`;
    const db = getDb();
    const inserted = await db.insert(t.articles).values({
      authorId: a.profile.id,
      categoryId: d.category_id || null,
      channel: d.channel,
      slug,
      titleId: d.title_id,
      titleEn: d.title_en || null,
      bodyId: d.body_id,
      bodyEn: d.body_en || null,
      gallery: [],
      locationName: d.location_name || null,
      source: d.source || null,
      status: d.status,
      publishedAt: d.status === "published" ? new Date() : null,
    }).returning();
    return NextResponse.json(inserted[0], { status: 201 });
  } catch (e) {
    return errorToResponse(e);
  }
}
