import { createFileRoute } from "@tanstack/react-router";
import { requireUser, getPlan } from "@/server/require-user";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function get({ request }: { request: Request }) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const uid = auth.user.id;
  const plan = await getPlan(auth.db, uid);
  const premium = plan === "premium";

  const peersRes = await auth.db
    .from("competitors")
    .select("id, name, company_url, scale, sales_estimate, rank, resolved_at")
    .eq("user_id", uid)
    .order("rank", { ascending: true });

  let news: unknown[] = [];
  let prices: unknown[] = [];
  if (premium) {
    const since = new Date(Date.now() - 12 * 7 * 86400000).toISOString();
    const [newsRes, priceRes] = await Promise.all([
      auth.db
        .from("niche_news")
        .select("day, headline, body, tag, severe, severe_until")
        .eq("user_id", uid)
        .order("day", { ascending: false })
        .limit(150),
      auth.db
        .from("peer_prices")
        .select(
          "competitor_id, competitor_name, currency, amount, observed_at, source_url, plan_label",
        )
        .eq("user_id", uid)
        .gte("observed_at", since)
        .order("observed_at", { ascending: false })
        .limit(5000),
    ]);
    news = newsRes.data ?? [];
    prices = priceRes.data ?? [];
  }

  return json({
    plan,
    premium,
    peers: peersRes.data ?? [],
    peersError: peersRes.error?.message ?? null,
    news,
    prices,
  });
}

export const Route = createFileRoute("/api/data/monitors")({
  server: { handlers: { GET: get } },
});
