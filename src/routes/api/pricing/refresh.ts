import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const Body = z
  .object({ reason: z.enum(["onboarding", "daily", "manual"]) })
  .strict();

function isAllowedCronToken(token: string): boolean {
  const secrets = [
    process.env["NEWS_CRON_SECRET"],
    process.env["PEER_MONTHLY_CRON_SECRET"],
  ].filter((s): s is string => Boolean(s));
  if (secrets.length === 0) return false;
  // Constant-time-ish compare via SHA-256 digests (equal length).
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const { createHash, timingSafeEqual } = require("node:crypto") as typeof import("node:crypto");
  const digest = (s: string) => createHash("sha256").update(s, "utf8").digest();
  const tokenDigest = digest(token);
  return secrets.some((secret) => timingSafeEqual(tokenDigest, digest(secret)));
}

async function post({ request }: { request: Request }) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "reason must be onboarding | daily | manual" },
      { status: 400 },
    );
  }
  const token = /^Bearer ([^\s,]+)$/i.exec(
    request.headers.get("authorization") ?? "",
  )?.[1];
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    if (parsed.data.reason === "daily") {
      if (!isAllowedCronToken(token)) {
        try {
          const { authenticateCronRequest } = await import(
            "@/integrations/supabase/cron-auth"
          );
          const denied = await authenticateCronRequest(request);
          if (denied) return denied;
        } catch {
          return Response.json({ error: "Unauthorized" }, { status: 401 });
        }
      }

      const { supabaseAdmin } = await import(
        "@/integrations/supabase/client.server"
      );
      const db = supabaseAdmin as SupabaseClient;
      const { data, error } = await db
        .from("profiles")
        .select("id")
        .eq("onboarded", true);
      if (error) {
        return Response.json({ error: "Could not list profiles" }, { status: 500 });
      }
      const users = z.array(z.object({ id: z.string().uuid() })).parse(data ?? []);
      const { extractPeerPrices } = await import(
        "@/server/pricing/extract-peer-prices"
      );

      let updated = 0;
      let skipped = 0;
      const failures: string[] = [];

      for (const [index, user] of users.entries()) {
        if (index > 0) await new Promise((r) => setTimeout(r, 250));
        try {
          const result = await extractPeerPrices(user.id);
          updated += result.updated;
          skipped += result.skipped;
          if (result.failures?.length) failures.push(...result.failures);
        } catch (err) {
          const msg = err instanceof Error ? err.message : "user failed";
          // Table missing should fail the job clearly
          if (msg.includes("Could not save peer prices")) throw err;
          failures.push(`${user.id}: ${msg.slice(0, 100)}`);
        }
      }

      return Response.json({
        ok: true,
        updated,
        skipped,
        failures: failures.slice(0, 20),
      });
    }

    // onboarding | manual — user JWT
    const url = process.env["SUPABASE_URL"];
    const key =
      process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"];
    if (!url || !key) {
      return Response.json(
        { error: "Authentication is not configured" },
        { status: 500 },
      );
    }
    const client = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storage: undefined,
      },
    });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { extractPeerPrices } = await import(
      "@/server/pricing/extract-peer-prices"
    );
    const result = await extractPeerPrices(data.user.id);
    return Response.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Pricing refresh failed";
    const safe =
      /Could not save peer prices|Pricing credentials are not configured|Could not load competitor websites|Website extraction failed|Pricing interpretation failed/.test(
        message,
      );
    return Response.json(
      { error: safe ? message : message.slice(0, 200) || "Pricing refresh failed" },
      { status: 502 },
    );
  }
}

export const Route = createFileRoute("/api/pricing/refresh")({
  server: {
    handlers: {
      POST: post,
    },
  },
});
