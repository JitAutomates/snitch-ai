import { createFileRoute } from "@tanstack/react-router";
import { requireUser, getPlan } from "@/server/require-user";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function utcDay(d = new Date()) {
  return d.toISOString().slice(0, 10);
}

async function get({ request }: { request: Request }) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const plan = await getPlan(auth.db, auth.user.id);
  const today = utcDay();

  let q = auth.db
    .from("briefs")
    .select(
      "id, user_id, day, title, body, action_plan, highlights, pinned, model, created_at",
    )
    .eq("user_id", auth.user.id)
    .order("day", { ascending: false });

  if (plan !== "premium") {
    q = q.eq("day", today).limit(1);
  } else {
    const since = utcDay(new Date(Date.now() - 59 * 86400000));
    q = q.gte("day", since).lte("day", today).limit(60);
  }

  const { data, error } = await q;
  if (error) return json({ error: "Could not load briefs" }, 502);
  return json({ briefs: data ?? [], plan, today });
}

export const Route = createFileRoute("/api/briefs/list")({
  server: { handlers: { GET: get } },
});
