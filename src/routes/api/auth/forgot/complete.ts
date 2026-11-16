import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z
  .object({
    email: z.string().email().max(320),
    resetToken: z.string().min(20).max(200),
    password: z.string().min(8).max(128),
  })
  .strict();

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function post({ request }: { request: Request }) {
  try {
    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Invalid password reset request." }, 400);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;
    const { normalizeEmail, hashSecret, findAuthUserIdByEmail } = await import(
      "@/server/password-reset"
    );

    const email = normalizeEmail(parsed.data.email);
    const tokenHash = hashSecret(parsed.data.resetToken);

    const { data: rows, error } = await db
      .from("password_reset_challenges")
      .select("id, reset_token_hash, expires_at, verified_at, consumed_at")
      .eq("email_normalized", email)
      .is("consumed_at", null)
      .not("verified_at", "is", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);
    const row = rows?.[0] as
      | {
          id: number;
          reset_token_hash: string | null;
          expires_at: string;
          verified_at: string | null;
        }
      | undefined;

    if (!row?.reset_token_hash || row.reset_token_hash !== tokenHash) {
      return json({ error: "Reset session expired. Start again." }, 400);
    }
    if (Date.parse(row.expires_at) < Date.now()) {
      return json({ error: "Reset session expired. Start again." }, 400);
    }

    const userId = await findAuthUserIdByEmail(db, email);
    if (!userId) return json({ error: "Account not found." }, 400);

    const { error: pwError } = await db.auth.admin.updateUserById(userId, {
      password: parsed.data.password,
    });
    if (pwError) return json({ error: pwError.message }, 400);

    await db
      .from("password_reset_challenges")
      .update({ consumed_at: new Date().toISOString() })
      .eq("id", row.id);

    return json({ ok: true });
  } catch (e) {
    console.error("[forgot/complete]", e);
    return json({ error: "Could not update password." }, 502);
  }
}

export const Route = createFileRoute("/api/auth/forgot/complete")({
  server: { handlers: { POST: post } },
});
