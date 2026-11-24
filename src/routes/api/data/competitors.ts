import { createFileRoute } from "@tanstack/react-router";
import { requireUser, getPlan } from "@/server/require-user";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function get({ request }: { request: Request }) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  if ((await getPlan(auth.db, auth.user.id)) !== "premium") {
    return json({ error: "Premium required" }, 403);
  }
  const uid = auth.user.id;
  const [peers, activity, summaries, runs] = await Promise.all([
    auth.db
      .from("competitors")
      .select(
        "id, name, company_url, scale, sales_estimate, rank, resolved_at, source, exa_id",
      )
      .eq("user_id", uid)
      .order("rank", { ascending: true }),
    auth.db
      .from("competitor_activity")
      .select(
        "id, competitor_id, competitor_name, company_url, week_start, category, headline, summary, source_url, published_at, created_at",
      )
      .eq("user_id", uid)
      .order("created_at", { ascending: false })
      .limit(200),
    auth.db
      .from("competitor_summaries")
      .select("competitor_id, competitor_name, week_start, summary, source_urls")
      .eq("user_id", uid)
      .order("week_start", { ascending: false })
      .limit(50),
    auth.db
      .from("competitor_activity_runs")
      .select("status, started_at")
      .eq("user_id", uid)
      .order("started_at", { ascending: false })
      .limit(1),
  ]);

  return json({
    peers: peers.data ?? [],
    activity: activity.data ?? [],
    summaries: summaries.data ?? [],
    run: runs.data?.[0] ?? null,
  });
}

export const Route = createFileRoute("/api/data/competitors")({
  server: { handlers: { GET: get } },
});
