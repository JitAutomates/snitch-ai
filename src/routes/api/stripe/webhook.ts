import { createFileRoute } from "@tanstack/react-router";
import type Stripe from "stripe";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function unixToIso(sec: number | null | undefined): string | null {
  if (!sec || !Number.isFinite(sec)) return null;
  return new Date(sec * 1000).toISOString();
}

async function applySubscription(
  db: import("@supabase/supabase-js").SupabaseClient,
  opts: {
    userId?: string | null;
    customerId?: string | null;
    subscription: Stripe.Subscription;
  },
) {
  const status = opts.subscription.status;
  const active = status === "active" || status === "trialing";
  const subId = opts.subscription.id;
  const customerId =
    typeof opts.subscription.customer === "string"
      ? opts.subscription.customer
      : opts.subscription.customer?.id ?? opts.customerId ?? null;
  const renewsAt = unixToIso(opts.subscription.current_period_end);

  let userId = opts.userId ?? opts.subscription.metadata?.["supabase_user_id"] ?? null;

  if (!userId && customerId) {
    const { data } = await db
      .from("profiles")
      .select("id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();
    userId = data?.id ?? null;
  }

  if (!userId) {
    console.error("[stripe/webhook] no user for subscription", subId);
    return;
  }

  const { error } = await db
    .from("profiles")
    .update({
      plan: active ? "premium" : "free",
      plan_updated_at: new Date().toISOString(),
      plan_renews_at: active ? renewsAt : null,
      stripe_customer_id: customerId,
      stripe_subscription_id: active ? subId : null,
    })
    .eq("id", userId);

  if (error) console.error("[stripe/webhook] profile update failed", error.message);
}

async function post({ request }: { request: Request }) {
  const secret = process.env["STRIPE_WEBHOOK_SECRET"];
  if (!secret) return json({ error: "STRIPE_WEBHOOK_SECRET is not set" }, 500);

  const { getStripe } = await import("@/server/stripe");
  const stripe = getStripe();
  const signature = request.headers.get("stripe-signature");
  if (!signature) return json({ error: "Missing stripe-signature" }, 400);

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, secret);
  } catch (e) {
    console.error("[stripe/webhook] signature", e);
    return json({ error: "Invalid signature" }, 400);
  }

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        if (session.mode !== "subscription") break;
        const userId = session.client_reference_id ?? session.metadata?.["supabase_user_id"] ?? null;
        const customerId = typeof session.customer === "string" ? session.customer : session.customer?.id;
        const subId =
          typeof session.subscription === "string"
            ? session.subscription
            : session.subscription?.id;
        if (subId) {
          const subscription = await stripe.subscriptions.retrieve(subId);
          await applySubscription(db, { userId, customerId, subscription });
        }
        break;
      }
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await applySubscription(db, { subscription });
        break;
      }
      default:
        break;
    }
  } catch (e) {
    console.error("[stripe/webhook] handler", e);
    return json({ error: "Webhook handler failed" }, 500);
  }

  return json({ received: true });
}

export const Route = createFileRoute("/api/stripe/webhook")({
  server: { handlers: { POST: post } },
});
