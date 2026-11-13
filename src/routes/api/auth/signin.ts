import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";

const Body = z
  .object({
    email: z.string().email().max(320),
    password: z.string().min(1).max(128),
  })
  .strict();

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function post({ request }: { request: Request }) {
  try {
    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid login payload" }, 400);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;
    const {
      clientIp,
      hashIp,
      countRecent,
      recordEvent,
      LOGIN_FAIL_LIMIT,
    } = await import("@/server/auth-rate-limit");

    const ipHash = hashIp(clientIp(request));
    const fails = await countRecent(db, ipHash, "login_fail");
    if (fails >= LOGIN_FAIL_LIMIT) {
      return json(
        { error: "Too many failed sign-ins from this network. Try again in a minute." },
        429,
      );
    }

    const url = process.env["SUPABASE_URL"];
    const anon = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
    if (!url || !anon) return json({ error: "Auth is not configured" }, 500);

    const client = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });

    const { data, error } = await client.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (error || !data.session) {
      await recordEvent(db, ipHash, "login_fail").catch(() => undefined);
      return json({ error: "Incorrect email or password. Please try again." }, 401);
    }

    return json({
      ok: true,
      session: {
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
      },
    });
  } catch (e) {
    console.error("[auth/signin]", e);
    return json({ error: "Sign-in failed" }, 502);
  }
}

export const Route = createFileRoute("/api/auth/signin")({
  server: { handlers: { POST: post } },
});
