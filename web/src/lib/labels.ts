// Helper label murni (client-safe) — TIDAK boleh mengimpor server code
// (Supabase/Drizzle/next/headers). data.ts me-re-export channelLabel dari sini.
import { CHANNELS } from "./seed-data";
import type { Channel } from "./types";

export function channelLabel(channel: Channel): string {
  return CHANNELS[channel];
}
