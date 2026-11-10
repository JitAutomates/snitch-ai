import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function post({ request }: { request: Request }) {
  try {
    const { bearerUserId, getStripe, appOrigin } = await import("@/server/stripe");
    const userId = await bearerUserId(request);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;

    const { data: profile, error } = await db
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", userId)
      .single();
    if (error || !profile?.stripe_customer_id) {
      return json({ error: "No Stripe customer on this account" }, 400);
    }

    const customerId = z.string().min(1).parse(profile.stripe_customer_id);
    const stripe = getStripe();
    const origin = appOrigin(request);

    const session = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/billing`,
    });

    return json({ url: session.url });
  } catch (e) {
    console.error("[stripe/portal]", e);
    return json({ error: "Could not open billing portal" }, 502);
  }
}

export const Route = createFileRoute("/api/stripe/portal")({
  server: { handlers: { POST: post } },
});
