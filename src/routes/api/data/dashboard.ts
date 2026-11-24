import { createFileRoute } from "@tanstack/react-router";
import { requireUser, getPlan } from "@/server/require-user";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function get({ request }: { request: Request }) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const uid = auth.user.id;
  const plan = await getPlan(auth.db, uid);
  if (plan !== "premium") {
    return json({ plan, premium: false, pinned: [], notables: { news: [], activity: [], prices: [] } });
  }

  const nowIso = new Date().toISOString();
  const [pinnedRes, newsRes, actRes, priceRes] = await Promise.all([
    auth.db
      .from("briefs")
      .select(
        "id, user_id, day, title, body, action_plan, highlights, pinned, model, created_at",
      )
      .eq("user_id", uid)
      .eq("pinned", true)
      .order("day", { ascending: false })
      .limit(20),
    auth.db
      .from("niche_news")
      .select("id, headline, body, day, severe, severe_until, source_urls")
      .eq("user_id", uid)
      .eq("severe", true)
      .gt("severe_until", nowIso)
      .order("day", { ascending: false })
      .limit(15),
    auth.db
      .from("competitor_activity")
      .select(
        "id, headline, summary, category, competitor_name, created_at, published_at, severe, severe_until, source_url",
      )
      .eq("user_id", uid)
      .eq("severe", true)
      .gt("severe_until", nowIso)
      .order("created_at", { ascending: false })
      .limit(15),
    auth.db
      .from("peer_prices")
      .select(
        "id, competitor_name, amount, amount_display, currency, plan_label, observed_at, severe, severe_until, source_url, notes",
      )
      .eq("user_id", uid)
      .eq("severe", true)
      .gt("severe_until", nowIso)
      .order("observed_at", { ascending: false })
      .limit(15),
  ]);

  return json({
    plan,
    premium: true,
    pinned: pinnedRes.data ?? [],
    notables: {
      news: newsRes.data ?? [],
      activity: actRes.data ?? [],
      prices: priceRes.data ?? [],
    },
  });
}

export const Route = createFileRoute("/api/data/dashboard")({
  server: { handlers: { GET: get } },
});
