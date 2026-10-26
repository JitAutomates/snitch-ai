import { authenticateCronRequest } from "@/integrations/supabase/cron-auth";
import { createClient } from "@supabase/supabase-js";
import { resolvePeersWithExa } from "@/server/peers/resolve-peers";

const ALLOWED = new Set(["onboarding", "profile_change", "monthly"]);

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    reason?: string;
    userId?: string;
  };

  if (!body.reason || !ALLOWED.has(body.reason)) {
    return Response.json(
      { error: "reason must be onboarding | profile_change | monthly" },
      { status: 400 },
    );
  }

  // --- Path A: monthly cron (no user JWT) ---
  if (body.reason === "monthly") {
    const denied = await authenticateCronRequest(request);
    if (denied) return denied;

    const db = createClient(
      process.env['SUPABASE_URL']!,
      process.env['SUPABASE_SERVICE_ROLE_KEY']!,
    );

    // Users whose peers are older than ~30 days
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - 30);

    const { data: due } = await db
      .from("profiles")
      .select("id, industry, product, region, scale, sales_volume, peers_resolved_at")
      .eq("onboarded", true)
      .or(`peers_resolved_at.is.null,peers_resolved_at.lt.${cutoff.toISOString()}`);

    const results = [];
    for (const row of due ?? []) {
      if (!row.industry || !row.product || !row.region || !row.scale) continue;
      try {
        const r = await resolvePeersWithExa(row.id, {
          industry: row.industry,
          product: row.product,
          region: row.region,
          scale: row.scale,
          sales: String(row.sales_volume ?? ""),
        });
        results.push({ userId: row.id, count: r.peers.length });
      } catch (e) {
        results.push({
          userId: row.id,
          error: e instanceof Error ? e.message : "failed",
        });
      }
    }
    return Response.json({ ok: true, results });
  }

  // --- Path B: logged-in user (onboarding / profile_change) ---
  const authHeader = request.headers.get("authorization") ?? "";
  const token = authHeader.replace(/^Bearer\s+/i, "");
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userClient = createClient(
    process.env['SUPABASE_URL']!,
    process.env['SUPABASE_ANON_KEY']!,
    { global: { headers: { Authorization: `Bearer ${token}` } } },
  );

  const { data: userData, error: userErr } = await userClient.auth.getUser();
  if (userErr || !userData.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const meta = userData.user.user_metadata ?? {};
  const industry = String(meta['industry'] ?? "");
  const product = String(meta['product'] ?? "");
  const region = String(meta['region'] ?? "");
  const scale = String(meta['scale'] ?? "");
  const sales = String(meta['sales_volume'] ?? "");

  if (!industry || !product || !region || !scale || !sales) {
    return Response.json(
      { error: "Complete onboarding fields first" },
      { status: 400 },
    );
  }

  const { peers } = await resolvePeersWithExa(userData.user.id, {
    industry,
    product,
    region,
    scale,
    sales,
  });

  return Response.json({ ok: true, count: peers.length, peers });
}
