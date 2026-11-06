import { createFileRoute } from "@tanstack/react-router";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { utcBriefDay } from "@/lib/daily-briefs";

const Body = z.object({ reason: z.enum(["onboarding", "daily", "manual"]) }).strict();
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

async function post({ request }: { request: Request }) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "reason must be onboarding | daily | manual" }, 400);
  const token = /^Bearer ([^\s,]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return json({ error: "Unauthorized" }, 401);
  const day = utcBriefDay();
  try {
    if (parsed.data.reason === "daily") {
      const allowed = [process.env["NEWS_CRON_SECRET"], process.env["PEER_MONTHLY_CRON_SECRET"]].filter((s): s is string => Boolean(s));
      const { createHash, timingSafeEqual } = await import("node:crypto");
      const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();
      if (!allowed.some(s => timingSafeEqual(digest(token), digest(s)))) return json({ error: "Unauthorized" }, 401);
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as SupabaseClient;
      const { generateDailyBrief } = await import("@/server/briefs/generate-daily-brief");
      const results: { user_id: string; day: string }[] = [];
      const failures: { user_id: string; error: string }[] = [];
      // Keyset pagination processes all onboarded users, not only the first Data API page.
      let lastId: string | undefined;
      for (;;) {
        let query = db.from("profiles").select("id").eq("onboarded", true).order("id", { ascending: true }).limit(10);
        if (lastId) query = query.gt("id", lastId);
        const { data, error } = await query;
        if (error) throw new Error("Could not list onboarded profiles");
        const users = z.array(z.object({ id: z.string().uuid() })).parse(data ?? []);
        for (const user of users) {
          if (results.length + failures.length > 0) await new Promise(resolve => setTimeout(resolve, 250));
          try { await generateDailyBrief(user.id, day); results.push({ user_id: user.id, day }); }
          catch { failures.push({ user_id: user.id, error: "Could not generate daily brief" }); }
        }
        if (users.length < 10) break;
        lastId = users.at(-1)?.id;
        if (!lastId) break;
      }
      return json({ ok: failures.length === 0, results, failures });
    }
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
    if (!url || !key) return json({ error: "Authentication is not configured" }, 500);
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return json({ error: "Unauthorized" }, 401);
    const { generateDailyBrief } = await import("@/server/briefs/generate-daily-brief");
    return json({ ok: true, ...(await generateDailyBrief(data.user.id, day)) });
   } catch (error) {
    const message =
      error instanceof Error ? error.message : "Could not generate daily brief";
    return json(
      {
        error: message.slice(0, 300),
        hint: "Check LLM_API_KEY, briefs table, and input tables (niche_news, peer_prices, competitor_activity).",
      },
      502,
    );
  }
}

export const Route = createFileRoute("/api/briefs/generate")({ server: { handlers: { POST: post } } });
