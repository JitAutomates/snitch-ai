import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

/** Tables keyed by user_id (delete before auth user). */
const USER_TABLES = [
  "briefs",
  "brief_generation_limits",
  "niche_news",
  "peer_prices",
  "peer_price_runs",
  "competitor_activity",
  "competitor_activity_runs",
  "competitor_summaries",
  "competitors",
  "profiles",
] as const;

async function post({ request }: { request: Request }) {
  try {
    const token = /^Bearer ([^\s,]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
    if (!token) return json({ error: "Unauthorized" }, 401);

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

    // Best-effort: cancel Stripe subscription before wiping profile ids
    try {
      const { data: profile } = await db
        .from("profiles")
        .select("stripe_customer_id, stripe_subscription_id")
        .eq("id", userId)
        .maybeSingle();

      const subId = (profile as { stripe_subscription_id?: string | null } | null)
        ?.stripe_subscription_id;
      if (subId && process.env["STRIPE_SECRET_KEY"]) {
        const { getStripe } = await import("@/server/stripe");
        const stripe = getStripe();
        await stripe.subscriptions.cancel(subId).catch(() => {
          /* already canceled or missing — continue deletion */
        });
      }
    } catch {
      /* do not block account deletion on billing failures */
    }

    const failures: string[] = [];
    for (const table of USER_TABLES) {
      const { error } = await db.from(table).delete().eq(table === "profiles" ? "id" : "user_id", userId);
      if (error) failures.push(`${table}: ${error.message}`);
    }

    // Remove Auth user (requires service role)
    const { error: authDeleteError } = await db.auth.admin.deleteUser(userId);
    if (authDeleteError) {
      return json(
        {
          error: "Data cleared but auth user could not be removed. Contact support.",
          detail: authDeleteError.message,
          failures,
        },
        502,
      );
    }

    if (failures.length > 0) {
      // Auth gone; residual rows are orphaned — still report soft warning
      return json({ ok: true, warnings: failures });
    }

    return json({ ok: true });
  } catch (e) {
    console.error("[account/delete]", e);
    return json(
      {
        error: "Could not delete account",
        detail: e instanceof Error ? e.message.slice(0, 200) : undefined,
      },
      502,
    );
  }
}

export const Route = createFileRoute("/api/account/delete")({
  server: { handlers: { POST: post } },
});
