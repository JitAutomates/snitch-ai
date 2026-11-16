import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";

const WINDOW_MS = 60_000;
export const SIGNUP_LIMIT = 10;
export const LOGIN_FAIL_LIMIT = 5;

export function clientIp(request: Request): string {
  const xf = request.headers.get("x-forwarded-for");
  if (xf) {
    const first = xf.split(",")[0]?.trim();
    if (first) return first;
  }
  const real = request.headers.get("x-real-ip")?.trim();
  if (real) return real;
  const cf = request.headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  return "unknown";
}

/** Store hash only — never keep raw IPs in the DB. */
export function hashIp(ip: string): string {
  const salt = process.env["AUTH_RATE_SALT"] ?? "snitch-auth-rate-v1";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex");
}

type Kind = "signup" | "login_fail";

export async function countRecent(
  db: SupabaseClient,
  ipHash: string,
  kind: Kind,
  windowMs = WINDOW_MS,
): Promise<number> {
  const since = new Date(Date.now() - windowMs).toISOString();
  const { count, error } = await db
    .from("auth_rate_events")
    .select("id", { count: "exact", head: true })
    .eq("ip_hash", ipHash)
    .eq("kind", kind)
    .gte("created_at", since);
  if (error) throw new Error(`Rate limit read failed: ${error.message}`);
  return count ?? 0;
}

export async function recordEvent(
  db: SupabaseClient,
  ipHash: string,
  kind: Kind,
): Promise<void> {
  const { error } = await db.from("auth_rate_events").insert({ ip_hash: ipHash, kind });
  if (error) throw new Error(`Rate limit write failed: ${error.message}`);
}

/** Best-effort prune (optional, call occasionally). */
export async function pruneOld(db: SupabaseClient, olderThanMs = 2 * WINDOW_MS): Promise<void> {
  const cutoff = new Date(Date.now() - olderThanMs).toISOString();
  await db.from("auth_rate_events").delete().lt("created_at", cutoff);
}
