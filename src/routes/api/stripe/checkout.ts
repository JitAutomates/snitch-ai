import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function post({ request }: { request: Request }) {
  try {
    const { bearerUserId, getStripe, appOrigin } = await import("@/server/stripe");
    const userId = await bearerUserId(request);
    if (!userId) return json({ error: "Unauthorized" }, 401);

    const priceId = process.env["STRIPE_PRICE_MONTHLY"];
    if (!priceId) return json({ error: "STRIPE_PRICE_MONTHLY is not set" }, 500);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;

    const { data: profile, error: profileError } = await db
      .from("profiles")
      .select("id, stripe_customer_id")
      .eq("id", userId)
      .single();
    if (profileError || !profile) return json({ error: "Profile not found" }, 404);

    const stripe = getStripe();
    let customerId = z.string().min(1).optional().catch(undefined).parse(profile.stripe_customer_id);

    if (!customerId) {
      const customer = await stripe.customers.create({
        metadata: { supabase_user_id: userId },
      });
      customerId = customer.id;
      const { error: upErr } = await db
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("id", userId);
      if (upErr) return json({ error: "Could not save Stripe customer" }, 500);
    }

    const origin = appOrigin(request);
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?checkout=success`,
      cancel_url: `${origin}/billing?checkout=cancelled`,
      client_reference_id: userId,
      metadata: { supabase_user_id: userId },
      subscription_data: {
        metadata: { supabase_user_id: userId },
      },
      allow_promotion_codes: true,
    });

    if (!session.url) return json({ error: "Could not create Checkout session" }, 502);
    return json({ url: session.url });
  } catch (e) {
    console.error("[stripe/checkout]", e);
    return json({ error: "Checkout failed" }, 502);
  }
}

export const Route = createFileRoute("/api/stripe/checkout")({
  server: { handlers: { POST: post } },
});
