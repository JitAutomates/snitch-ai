import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const Body = z
  .object({
    email: z.string().email().max(320),
    password: z.string().min(8).max(128),
    display_name: z.string().trim().max(80).optional().default(""),
    birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    agree: z.literal(true),
  })
  .strict();

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function isAdult(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return d <= cutoff;
}

async function post({ request }: { request: Request }) {
  try {
    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid signup payload" }, 400);
    if (!isAdult(parsed.data.birth_date)) {
      return json({ error: "You must be 18 or older to use Snitch." }, 400);
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;
    const {
      clientIp,
      hashIp,
      countRecent,
      recordEvent,
      SIGNUP_LIMIT,
    } = await import("@/server/auth-rate-limit");

    const ipHash = hashIp(clientIp(request));
    const recent = await countRecent(db, ipHash, "signup");
    if (recent >= SIGNUP_LIMIT) {
      return json(
        { error: "Too many signups from this network. Try again in a minute." },
        429,
      );
    }

    // Count attempt before calling Auth (limits abuse even when email is invalid)
    await recordEvent(db, ipHash, "signup");

    const url = process.env["SUPABASE_URL"];
    const anon = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
    if (!url || !anon) return json({ error: "Auth is not configured" }, 500);

    const origin =
      process.env["SNITCH_APP_URL"]?.replace(/\/$/, "") ??
      new URL(request.url).origin;

    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });

    const { data, error } = await client.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: origin,
        data: {
          display_name: parsed.data.display_name,
          birth_date: parsed.data.birth_date,
        },
      },
    });

    if (error) return json({ error: error.message }, 400);

    // Prefer session tokens when email confirmation is off
    return json({
      ok: true,
      needsEmailConfirm: !data.session,
      session: data.session
        ? {
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
          }
        : null,
    });
  } catch (e) {
    console.error("[auth/signup]", e);
    return json({ error: "Signup failed" }, 502);
  }
}

export const Route = createFileRoute("/api/auth/signup")({
  server: { handlers: { POST: post } },
});
