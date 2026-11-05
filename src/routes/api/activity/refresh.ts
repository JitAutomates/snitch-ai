import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z
  .object({
    reason: z.enum(["onboarding", "weekly", "manual"]),
    /** weekly only: batch offset so one HTTP request never has to cover every user. */
    offset: z.number().int().min(0).max(100000).optional(),
  })
  .strict();

const WEEKLY_BATCH = 10;
const MANUAL_COOLDOWN_MS = 10 * 60 * 1000;

async function isAllowedCronToken(token: string): Promise<boolean> {
  const secrets = [process.env["NEWS_CRON_SECRET"], process.env["PEER_MONTHLY_CRON_SECRET"]].filter(
    (s): s is string => Boolean(s),
  );
  if (secrets.length === 0) return false;
  const { createHash, timingSafeEqual } = await import("node:crypto");
  const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();
  const tokenDigest = digest(token);
  return secrets.some((secret) => timingSafeEqual(tokenDigest, digest(secret)));
}

async function post({ request }: { request: Request }) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "reason must be onboarding | weekly | manual" }, { status: 400 });
  }
  const token = /^Bearer ([^\s,]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { fetchCompetitorActivity } = await import("@/server/activity/fetch-competitor-activity");

    if (parsed.data.reason === "weekly") {
      if (!(await isAllowedCronToken(token))) {
        try {
          const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
          const denied = await authenticateCronRequest(request);
          if (denied) return denied;
        } catch {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
      }

      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const db = supabaseAdmin as SupabaseClient;
      const offset = parsed.data.offset ?? 0;
      const { data, error } = await db
        .from("profiles")
        .select("id")
        .eq("onboarded", true)
        .order("id", { ascending: true })
        .range(offset, offset + WEEKLY_BATCH - 1);
      if (error) return Response.json({ error: "Could not list profiles" }, { status: 500 });
      const users = z.array(z.object({ id: z.string().uuid() })).parse(data ?? []);

      let updated = 0;
      let skipped = 0;
      let throttled = 0;
      const failures: string[] = [];
      for (const [index, user] of users.entries()) {
        if (index > 0) await new Promise((r) => setTimeout(r, 250));
        try {
          const result = await fetchCompetitorActivity(user.id);
          updated += result.updated;
          skipped += result.skipped;
          if (result.throttled) throttled++;
          if (result.failures.length) failures.push(...result.failures);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "user failed";
          // Provider auth or missing-table problems are systemic: fail the job loudly.
          if (/Activity search failed|Could not save competitor activity|credentials/.test(msg)) throw err;
          failures.push(`${user.id}: ${msg.slice(0, 100)}`);
        }
      }
      return Response.json({
        ok: true,
        updated,
        skipped,
        throttled,
        failures: failures.slice(0, 20),
        nextOffset: users.length === WEEKLY_BATCH ? offset + WEEKLY_BATCH : null,
      });
    }

    // onboarding | manual: verified user JWT only. User ids never come from the body.
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
    if (!url || !key) {
      return Response.json({ error: "Authentication is not configured" }, { status: 500 });
    }
    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const result = await fetchCompetitorActivity(data.user.id, {
      minIntervalMs: parsed.data.reason === "manual" ? MANUAL_COOLDOWN_MS : 0,
    });
    if (result.throttled) {
      return Response.json(
        { error: "Activity was refreshed recently or is already running. Try again in a few minutes." },
        { status: 429 },
      );
    }
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Activity refresh failed";
    return Response.json({ error: message.slice(0, 200) || "Activity refresh failed" }, { status: 502 });
  }
}

export const Route = createFileRoute("/api/activity/refresh")({
  server: { handlers: { POST: post } },
});
