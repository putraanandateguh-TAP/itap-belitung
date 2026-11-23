// Panggilan Gemini (server-only). Kunci dibaca dari env GEMINI_API_KEY —
// JANGAN pernah diekspos ke klien (bukan NEXT_PUBLIC) dan jangan di-log.

const DEFAULT_MODELS = ["gemini-3.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash"];

export function isGeminiConfigured(): boolean {
  return Boolean(process.env.GEMINI_API_KEY);
}

function models(): string[] {
  const fromEnv = process.env.GEMINI_MODEL?.split(",").map((s) => s.trim()).filter(Boolean);
  return fromEnv && fromEnv.length > 0 ? fromEnv : DEFAULT_MODELS;
}

export class GeminiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

/** Satu giliran teks → teks. Mencoba model berikutnya bila 404/429/5xx. */
export async function geminiGenerate(opts: {
  system: string;
  contents: { role: "user" | "model"; text: string }[];
  temperature?: number;
  maxOutputTokens?: number;
  timeoutMs?: number;
}): Promise<{ text: string; model: string }> {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new GeminiError(501, "not-configured");
  let last: GeminiError | null = null;
  for (const model of models()) {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), opts.timeoutMs ?? 20000);
    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json", "x-goog-api-key": key },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: opts.system }] },
            contents: opts.contents.map((c) => ({ role: c.role, parts: [{ text: c.text }] })),
            generationConfig: {
              temperature: opts.temperature ?? 0.2,
              maxOutputTokens: opts.maxOutputTokens ?? 900,
            },
          }),
          signal: ctrl.signal,
          cache: "no-store",
        },
      );
      if (!res.ok) {
        last = new GeminiError(res.status, `gemini ${model} ${res.status}`);
        if (res.status === 404 || res.status === 429 || res.status >= 500) continue;
        throw last;
      }
      const data = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text = (data.candidates?.[0]?.content?.parts ?? [])
        .map((p) => p.text ?? "")
        .join("")
        .trim();
      if (!text) { last = new GeminiError(502, `gemini ${model} empty`); continue; }
      return { text, model };
    } catch (e) {
      if (e instanceof GeminiError && e.status !== 404 && e.status !== 429 && e.status < 500) throw e;
      last = e instanceof GeminiError ? e : new GeminiError(504, `gemini ${model} timeout/network`);
    } finally {
      clearTimeout(timer);
    }
  }
  throw last ?? new GeminiError(502, "gemini failed");
}
