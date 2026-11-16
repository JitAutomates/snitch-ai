import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z
  .object({
    email: z.string().email().max(320),
    code: z.string().trim().toUpperCase().regex(/^[A-Z]{6}$/),
  })
  .strict();

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function post({ request }: { request: Request }) {
  try {
    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Enter the 6-letter code from your email." }, 400);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;
    const {
      normalizeEmail,
      hashSecret,
      generateResetToken,
      MAX_VERIFY_ATTEMPTS,
      RESET_TOKEN_TTL_MS,
    } = await import("@/server/password-reset");

    const email = normalizeEmail(parsed.data.email);
    const codeHash = hashSecret(parsed.data.code);

    const { data: rows, error } = await db
      .from("password_reset_challenges")
      .select("id, code_hash, expires_at, attempt_count, verified_at, consumed_at")
      .eq("email_normalized", email)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1);

    if (error) throw new Error(error.message);
    const row = rows?.[0] as
      | {
          id: number;
          code_hash: string;
          expires_at: string;
          attempt_count: number;
          verified_at: string | null;
          consumed_at: string | null;
        }
      | undefined;

    if (!row) return json({ error: "Invalid or expired code. Request a new one." }, 400);
    if (row.attempt_count >= MAX_VERIFY_ATTEMPTS) {
      return json({ error: "Too many attempts. Request a new code." }, 429);
    }
    if (Date.parse(row.expires_at) < Date.now()) {
      return json({ error: "Code expired. Request a new one." }, 400);
    }

    if (row.code_hash !== codeHash) {
      await db
        .from("password_reset_challenges")
        .update({ attempt_count: row.attempt_count + 1 })
        .eq("id", row.id);
      return json({ error: "Invalid or expired code. Request a new one." }, 400);
    }

    const resetToken = generateResetToken();
    const tokenHash = hashSecret(resetToken);
    const tokenExpires = new Date(Date.now() + RESET_TOKEN_TTL_MS).toISOString();

    const { error: updError } = await db
      .from("password_reset_challenges")
      .update({
        verified_at: new Date().toISOString(),
        reset_token_hash: tokenHash,
        expires_at: tokenExpires,
      })
      .eq("id", row.id);
    if (updError) throw new Error(updError.message);

    return json({ ok: true, resetToken, email });
  } catch (e) {
    console.error("[forgot/verify]", e);
    return json({ error: "Could not verify code." }, 502);
  }
}

export const Route = createFileRoute("/api/auth/forgot/verify")({
  server: { handlers: { POST: post } },
});
