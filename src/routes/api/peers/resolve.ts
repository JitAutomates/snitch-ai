import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

// The sole importer/caller of the peer resolver. Import only inside the server handler.
const RequestBody = z.object({
  reason: z.enum(["onboarding", "profile_change", "monthly"]),
}).strict();
const Profile = z.object({
  industry: z.string().trim().min(1).max(120),
  product: z.string().trim().min(1).max(200),
  region: z.string().trim().min(1).max(120),
  scale: z.string().trim().min(1).max(120),
  sales: z.string().trim().min(1).max(100).refine((value) => Number.isFinite(Number(value)) && Number(value) >= 0),
});

async function handlePost({ request }: { request: Request }) {
  const parsed = RequestBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "reason must be onboarding | profile_change | monthly" },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const token = /^Bearer ([^\s,]+)$/i.exec(request.headers.get("authorization") ?? "")?.[1];
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  // --- Path A: monthly cron (no user JWT) ---
  if (body.reason === "monthly") {
    const monthlySecret = process.env['PEER_MONTHLY_CRON_SECRET'] ?? "";
    const { createHash, timingSafeEqual } = await import("node:crypto");
    const digest = (value: string) => createHash("sha256").update(value, "utf8").digest();
    const monthlyOk = Boolean(monthlySecret) && timingSafeEqual(digest(token), digest(monthlySecret));
    if (!monthlyOk) {
      const { authenticateCronRequest } = await import("@/integrations/supabase/cron-auth");
      const denied = await authenticateCronRequest(request);
      if (denied) return denied;
    }

    // Generated service-role client handles opaque keys; only load after cron authorization.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;

    // Users whose peers are older than ~30 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { data: due, error } = await db
      .from("profiles")
      .select("id, industry, product, region, scale, sales_volume, peers_resolved_at")
      .eq("onboarded", true)
      .or(`peers_resolved_at.is.null,peers_resolved_at.lt.${cutoff.toISOString()}`);
    if (error) return Response.json({ error: "Could not list due profiles" }, { status: 500 });

    const { resolvePeersWithExa } = await import("@/server/peers/resolve-peers");
    const results = [];
    for (const row of due ?? []) {
      const profile = Profile.safeParse({
        industry: row.industry, product: row.product, region: row.region,
        scale: row.scale, sales: String(row.sales_volume ?? ""),
      });
      if (!profile.success || !z.string().uuid().safeParse(row.id).success) continue;
      try {
        const r = await resolvePeersWithExa(row.id, profile.data);
        results.push({ userId: row.id, count: r.peers.length });
      } catch {
        results.push({
          userId: row.id,
          error: "Peer resolution failed",
        });
      }
    }
    return Response.json({ ok: true, results });
  }

  // --- Path B: logged-in user (onboarding / profile_change) ---
  const userClient = createClient(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_PUBLISHABLE_KEY']!,
    { global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { persistSession: false, autoRefreshToken: false, storage: undefined } },
  );

  const { data: userData, error: userErr } = await userClient.auth.getUser(token);
  if (userErr || !userData.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meta = userData.user.user_metadata ?? {};
  const profile = Profile.safeParse({
    industry: meta['industry'], product: meta['product'], region: meta['region'],
    scale: meta['scale'], sales: String(meta['sales_volume'] ?? ""),
  });
  if (!profile.success) {
    return Response.json(
      { error: "Complete onboarding fields first" },
      { status: 400 },
    );
  }

  try {
    const { resolvePeersWithExa } = await import("@/server/peers/resolve-peers");
    const { peers } = await resolvePeersWithExa(userData.user.id, profile.data);
    return Response.json({ ok: true, count: peers.length, peers });
  } catch {
    return Response.json({ error: "Peer resolution failed" }, { status: 502 });
  }
}

export const Route = createFileRoute("/api/peers/resolve")({
  server: {
    handlers: {
      POST: ({ request }) => handlePost({ request }),
    },
  },
});
