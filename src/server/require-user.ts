import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export type Authed = {
  user: User;
  accessToken: string;
  db: SupabaseClient;
};

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

export function authError(message: string, status = 401) {
  return json({ error: message }, status);
}

/** Validate Bearer JWT; return service-role DB client scoped by caller checks. */
export async function requireUser(request: Request): Promise<Authed | Response> {
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(.+)$/i.exec(header);
  if (!match) return authError("Sign in required");

  const accessToken = match[1]!.trim();
  const url = process.env["SUPABASE_URL"];
  const anon =
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
  if (!url || !anon) return authError("Auth is not configured", 500);

  const userClient = createClient(url, anon, {
    auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
  const { data, error } = await userClient.auth.getUser(accessToken);
  if (error || !data.user) return authError("Invalid or expired session");

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return {
    user: data.user,
    accessToken,
    db: supabaseAdmin as SupabaseClient,
  };
}

export async function getPlan(
  db: SupabaseClient,
  userId: string,
): Promise<"free" | "premium"> {
  const { data } = await db
    .from("profiles")
    .select("plan")
    .eq("id", userId)
    .maybeSingle();
  return data?.plan === "premium" ? "premium" : "free";
}
