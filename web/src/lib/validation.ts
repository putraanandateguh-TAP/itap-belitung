// Validasi input server-side (zod) — dipakai SEMUA route yang menerima body
// atau query. Pesan error berbahasa Indonesia; tidak ada data user di log.
import { z } from "zod";

export const emailSchema = z.string().trim().toLowerCase().email("Alamat email tidak valid").max(254);
export const passwordSchema = z.string().min(8, "Kata sandi minimal 8 karakter").max(128);
export const uuidSchema = z.string().uuid("ID tidak valid");
export const slugSchema = z.string().min(1).max(160).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug tidak valid");
export const channelSchema = z.enum(["berita", "kuliner", "wisata", "sejarah", "budaya", "legenda"]);
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).max(1000).default(1),
  perPage: z.coerce.number().int().min(1).max(50).default(9),
});

export const signupSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  displayName: z.string().trim().min(2, "Nama minimal 2 karakter").max(80),
});

export const emailOtpSendSchema = z.object({ email: emailSchema });
export const emailOtpVerifySchema = z.object({
  email: emailSchema,
  token: z.string().regex(/^\d{6}$/, "Kode harus 6 digit angka"),
});
export const passwordResetRequestSchema = z.object({ email: emailSchema });
export const passwordResetConfirmSchema = z.object({
  token: z.string().min(1, "Token reset wajib diisi"),
  password: passwordSchema,
});
export const whatsappOtpVerifySchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Kode harus 6 digit angka"),
});

export const profilePatchSchema = z.object({
  displayName: z.string().trim().min(2).max(80).optional(),
  languagePref: z.enum(["id", "en"]).optional(),
  locationName: z.string().trim().max(120).nullable().optional(),
  locationLat: z.number().min(-90).max(90).nullable().optional(),
  locationLng: z.number().min(-180).max(180).nullable().optional(),
  whatsappNumber: z.string().trim().regex(/^\+?[0-9\s-]{9,15}$/, "Nomor WhatsApp tidak valid").nullable().optional(),
});

export const commentSchema = z.object({
  text: z.string().trim().min(3, "Tanggapan minimal 3 karakter").max(2000),
});

export const contributionSchema = z.object({
  title_id: z.string().trim().min(3, "Judul minimal 3 karakter").max(200),
  title_en: z.string().trim().max(200).optional().default(""),
  body_id: z.string().trim().min(10, "Isi minimal 10 karakter").max(50000),
  body_en: z.string().trim().max(50000).optional().default(""),
  channel: channelSchema,
  category_id: z.string().trim().min(1, "Kategori wajib dipilih"),
  location_name: z.string().trim().max(160).optional().default(""),
  source: z.string().trim().max(300).optional().default(""),
});

export const contributionPatchSchema = contributionSchema.partial();

export const reviewSchema = z.object({
  decision: z.enum(["publish", "unpublish", "return"]),
  note: z.string().trim().max(1000).optional().default(""),
});

export const categorySchema = z.object({
  channel: channelSchema,
  name_id: z.string().trim().min(2).max(80),
  name_en: z.string().trim().max(80).optional().default(""),
});

export const contributorPatchSchema = z.object({
  verification_status: z.enum(["unverified", "pending", "verified"]).optional(),
  auto_approve: z.boolean().optional(),
});

export const reportActionSchema = z.object({
  action: z.enum(["hidden", "dismissed", "reviewed"]),
  note: z.string().trim().max(1000).optional().default(""),
});

export const moderationWordSchema = z.object({
  word: z.string().trim().min(2).max(60),
  action: z.enum(["sensor", "hold"]),
});

export const listingSchema = z.object({
  title: z.string().trim().min(3).max(120),
  description: z.string().trim().max(5000).optional().default(""),
  price_cents: z.number().int().min(0).max(100_000_000_00),
  location_name: z.string().trim().max(160).optional().default(""),
  location_lat: z.number().min(-90).max(90).nullable().optional(),
  location_lng: z.number().min(-180).max(180).nullable().optional(),
});
export const listingPatchSchema = listingSchema.partial();

export const bookmarkSchema = z.object({ type: z.enum(["save", "like"]) });
export const reportSchema = z.object({
  target_type: z.enum(["listing", "account", "comment"]),
  target_id: uuidSchema,
  reason: z.string().trim().min(3).max(1000),
});
export const blockSchema = z.object({ blocked_id: uuidSchema });
export const threadSchema = z.object({ listing_id: uuidSchema });
export const messageSchema = z.object({
  text: z.string().trim().min(1).max(4000),
  idempotency_key: z.string().trim().max(100).optional(),
});
export const deviceSchema = z.object({
  fcm_token: z.string().trim().min(10).max(500),
  platform: z.enum(["android", "ios", "web"]),
});
export const infoSubmissionSchema = z.object({
  text: z.string().trim().min(10).max(5000),
});
export const infoReviewSchema = z.object({
  decision: z.enum(["approved", "rejected"]),
});

/** Ambil + validasi body JSON; kembalikan {data} atau Response 400. */
export async function parseJsonBody<T>(
  req: Request,
  schema: z.ZodType<T>,
): Promise<{ data: T } | { error: Response }> {
  const body: unknown = await req.json().catch(() => null);
  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return {
      error: Response.json(
        { error: "Input tidak valid", details: parsed.error.issues.map((i) => i.message) },
        { status: 400 },
      ),
    };
  }
  return { data: parsed.data };
}
