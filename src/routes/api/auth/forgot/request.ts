import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z.object({ email: z.string().email().max(320) }).strict();

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const GENERIC =
  "If an account exists for that email, a 6-letter code is on its way. You can request another after 90 seconds.";

async function post({ request }: { request: Request }) {
  try {
    const parsed = Body.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return json({ error: "Enter a valid email." }, 400);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;
    const {
      normalizeEmail,
      hashSecret,
      generateLetterCode,
      sendResetCodeEmail,
      findAuthUserIdByEmail,
      CODE_TTL_MS,
      RESEND_COOLDOWN_MS,
    } = await import("@/server/password-reset");

    const email = normalizeEmail(parsed.data.email);
    const userId = await findAuthUserIdByEmail(db, email);

    // Always respond generically; only send if user exists
    if (!userId) {
      return json({ ok: true, message: GENERIC, cooldownSec: 90 });
    }

    const { data: latest } = await db
      .from("password_reset_challenges")
      .select("last_sent_at")
      .eq("email_normalized", email)
      .is("consumed_at", null)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (latest?.last_sent_at) {
      const elapsed = Date.now() - new Date(latest.last_sent_at as string).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const wait = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return json(
          { error: `Please wait ${wait}s before requesting another code.`, cooldownSec: wait },
          429,
        );
      }
    }

    const code = generateLetterCode();
    const codeHash = hashSecret(code);
    const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

    const { error: insertError } = await db.from("password_reset_challenges").insert({
      email_normalized: email,
      code_hash: codeHash,
      expires_at: expiresAt,
      last_sent_at: new Date().toISOString(),
    });
    if (insertError) throw new Error(insertError.message);

    await sendResetCodeEmail(email, code);

    return json({ ok: true, message: GENERIC, cooldownSec: 90 });
  } catch (e) {
    console.error("[forgot/request]", e);
    return json({ error: "Could not start password reset. Try again later." }, 502);
  }
}

export const Route = createFileRoute("/api/auth/forgot/request")({
  server: { handlers: { POST: post } },
});
