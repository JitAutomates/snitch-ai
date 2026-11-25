import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

const Body = z
  .object({
    birth_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    agree: z.literal(true),
  })
  .strict();

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Parse YYYY-MM-DD as local calendar date (avoid UTC midnight edge cases). */
function isAdult(iso: string): boolean {
  const parts = iso.split("-").map((p) => Number(p));
  if (parts.length !== 3 || parts.some((n) => !Number.isFinite(n))) return false;
  const [y, m, d] = parts as [number, number, number];
  const birth = new Date(y, m - 1, d, 12, 0, 0, 0);
  const cutoff = new Date();
  cutoff.setHours(12, 0, 0, 0);
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return birth.getTime() <= cutoff.getTime();
}

async function post({ request }: { request: Request }) {
  try {
    const token = /^Bearer\s+(\S+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
    if (!token) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid age confirmation." }, 400);

    const url = process.env["SUPABASE_URL"];
    const anon =
      process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
    if (!url || !anon) return json({ error: "Auth is not configured" }, 500);

    const userClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as SupabaseClient;

    if (!isAdult(parsed.data.birth_date)) {
      try {
        await db.from("profiles").delete().eq("id", userId);
      } catch {
        /* ignore */
      }
      try {
        await db.auth.admin.deleteUser(userId);
      } catch {
        /* ignore */
      }
      return json(
        { error: "You must be 18 or older to use Snitch.", rejected: true },
        403,
      );
    }

    const displayName =
      (userData.user.user_metadata?.["full_name"] as string | undefined) ??
      (userData.user.user_metadata?.["name"] as string | undefined) ??
      null;

    // Prefer update; insert if no row (manual / broken signup paths)
    const { data: existing, error: readErr } = await db
      .from("profiles")
      .select("id")
      .eq("id", userId)
      .maybeSingle();
    if (readErr) {
      console.error("[auth/confirm-age] read profile", readErr);
      return json({ error: `Could not load profile: ${readErr.message}` }, 502);
    }

    if (existing?.id) {
      const { error: updateErr } = await db
        .from("profiles")
        .update({
          is_adult: true,
          age_verified: true,
          display_name: displayName,
        })
        .eq("id", userId);
      if (updateErr) {
        console.error("[auth/confirm-age] update profile", updateErr);
        return json({ error: `Could not update profile: ${updateErr.message}` }, 502);
      }
    } else {
      const { error: insertErr } = await db.from("profiles").insert({
        id: userId,
        is_adult: true,
        age_verified: true,
        display_name: displayName,
        plan: "free",
        onboarded: false,
      });
      if (insertErr) {
        console.error("[auth/confirm-age] insert profile", insertErr);
        return json({ error: `Could not create profile: ${insertErr.message}` }, 502);
      }
    }

    const { error: metaErr } = await db.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...(userData.user.user_metadata ?? {}),
        is_adult: true,
        age_verified: true,
      },
    });
    if (metaErr) {
      console.error("[auth/confirm-age] updateUserById", metaErr);
      // Profile is set; metadata is best-effort
    }

    return json({ ok: true });
  } catch (e) {
    console.error("[auth/confirm-age]", e);
    const message = e instanceof Error ? e.message : "Could not confirm age.";
    return json({ error: message }, 502);
  }
}

export const Route = createFileRoute("/api/auth/confirm-age")({
  server: { handlers: { POST: post } },
});
