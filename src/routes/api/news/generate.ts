import { createClient } from "@supabase/supabase-js";
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

const RequestBody = z
  .object({
    reason: z.enum(["onboarding", "daily"]),
  })
  .strict();

const Profile = z.object({
  industry: z.string().trim().min(1).max(120),
  product: z.string().trim().min(1).max(200),
  region: z.string().trim().min(1).max(120),
});

function todayUTC(): string {
  return new Date().toISOString().slice(0, 10);
}

async function handlePost({ request }: { request: Request }) {
  const parsed = RequestBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json(
      { error: "reason must be onboarding | daily" },
      { status: 400 },
    );
  }
  const body = parsed.data;
  const token = /^Bearer ([^\s,]+)$/i.exec(
    request.headers.get("authorization") ?? "",
  )?.[1];
  if (!token) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const day = todayUTC();

  // --- daily cron ---
  if (body.reason === "daily") {
    const cronSecret =
      process.env["NEWS_CRON_SECRET"] ??
      process.env["PEER_MONTHLY_CRON_SECRET"] ??
      "";
    const { createHash, timingSafeEqual } = await import("node:crypto");
    const digest = (v: string) =>
      createHash("sha256").update(v, "utf8").digest();
    const ok =
      Boolean(cronSecret) &&
      timingSafeEqual(digest(token), digest(cronSecret));
    if (!ok) {
      const { authenticateCronRequest } = await import(
        "@/integrations/supabase/cron-auth"
      );
      const denied = await authenticateCronRequest(request);
      if (denied) return denied;
    }

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;

    const { data: due, error } = await db
      .from("profiles")
      .select("id, industry, product, region")
      .eq("onboarded", true);
    if (error) {
      return Response.json({ error: "Could not list profiles" }, { status: 500 });
    }

    const { generateNicheNews } = await import(
      "@/server/news/generate-niche-news"
    );
    const results = [];
    for (const row of due ?? []) {
      const profile = Profile.safeParse({
        industry: row.industry,
        product: row.product,
        region: row.region,
      });
      if (!profile.success) continue;
      try {
        const r = await generateNicheNews(row.id, profile.data, day);
        results.push({ userId: row.id, count: r.articles.length });
      } catch {
        results.push({ userId: row.id, error: "news generation failed" });
      }
    }
    return Response.json({ ok: true, day, results });
  }

  // --- onboarding (user JWT) ---
  const userClient = createClient(
    process.env["SUPABASE_URL"]!,
    process.env["SUPABASE_PUBLISHABLE_KEY"] ?? process.env["SUPABASE_ANON_KEY"]!,
    {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storage: undefined,
      },
    },
  );

  const { data: userData, error: userErr } =
    await userClient.auth.getUser(token);
  if (userErr || !userData.user) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: meta, error: profileError } = await userClient.from("profiles").select("industry, product, region").eq("id", userData.user.id).single();
  if (profileError || !meta) return Response.json({ error: "Could not load saved profile" }, { status: 500 });
  const profile = Profile.safeParse({
    industry: meta["industry"],
    product: meta["product"],
    region: meta["region"],
  });
  if (!profile.success) {
    return Response.json(
      { error: "Complete onboarding fields first" },
      { status: 400 },
    );
  }

  try {
    const { generateNicheNews } = await import(
      "@/server/news/generate-niche-news"
    );
    const { articles } = await generateNicheNews(
      userData.user.id,
      profile.data,
      day,
    );
    return Response.json({ ok: true, day, count: articles.length });
  } catch {
    return Response.json({ error: "News generation failed" }, { status: 502 });
  }
}

export const Route = createFileRoute("/api/news/generate")({
  server: {
    handlers: {
      POST: ({ request }) => handlePost({ request }),
    },
  },
});
