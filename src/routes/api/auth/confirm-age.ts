import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const Body = z
  .object({
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
    const token = /^Bearer ([^\s,]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
    if (!token) return json({ error: "Unauthorized" }, 401);

    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid age confirmation." }, 400);

    const url = process.env["SUPABASE_URL"];
    const anon = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
    if (!url || !anon) return json({ error: "Auth is not configured" }, 500);

    const userClient = createClient(url, anon, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser(token);
    if (userErr || !userData.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;

    if (!isAdult(parsed.data.birth_date)) {
      // Remove the OAuth account — minors cannot use Snitch
      await db.from("profiles").delete().eq("id", userId).catch(() => undefined);
      await db.auth.admin.deleteUser(userId);
      return json(
        { error: "You must be 18 or older to use Snitch.", rejected: true },
        403,
      );
    }

    // Do not store birth_date — only is_adult
    const { error: profileError } = await db
      .from("profiles")
      .upsert(
        {
          id: userId,
          is_adult: true,
          display_name:
            (userData.user.user_metadata?.["full_name"] as string | undefined) ??
            (userData.user.user_metadata?.["name"] as string | undefined) ??
            null,
        },
        { onConflict: "id" },
      );
    if (profileError) throw new Error(profileError.message);

    await db.auth.admin.updateUserById(userId, {
      user_metadata: {
        ...(userData.user.user_metadata ?? {}),
        is_adult: true,
      },
    });

    return json({ ok: true });
  } catch (e) {
    console.error("[auth/confirm-age]", e);
    return json({ error: "Could not confirm age." }, 502);
  }
}

export const Route = createFileRoute("/api/auth/confirm-age")({
  server: { handlers: { POST: post } },
});
