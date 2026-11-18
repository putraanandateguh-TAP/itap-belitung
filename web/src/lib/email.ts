// Email transaksional — Resend sebagai SMTP Supabase Auth (P5).
//
// Kode ini TIDAK mengirim email sendiri: Supabase Auth yang mengirim
// (verifikasi + reset kata sandi) lewat SMTP yang dikonfigurasi di Dashboard
// Supabase -> Authentication -> SMTP Settings:
//   Host: smtp.resend.com, Port: 465, User: resend, Pass: <RESEND_API_KEY>
//   Sender: noreply@itapbelitung.my.id (domain harus terverifikasi SPF/DKIM)
// Helper di bawah hanya untuk email APLIKASI (mis. notifikasi redaksi) via
// Resend HTTP API — dan tetap butuh RESEND_API_KEY + domain terverifikasi.
// Selama P5 belum selesai, semua pemanggilan mengembalikan {sent:false,
// reason:'resend-not-configured'} — JANGAN pura-pura terkirim.
export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<{ sent: boolean; reason?: string }> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { sent: false, reason: "resend-not-configured" };
  const from = process.env.RESEND_FROM ?? "iTAP Belitung <noreply@itapbelitung.my.id>";
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from, to: input.to, subject: input.subject, html: input.html, text: input.text }),
  });
  if (!res.ok) return { sent: false, reason: `resend-http-${res.status}` };
  return { sent: true };
}
