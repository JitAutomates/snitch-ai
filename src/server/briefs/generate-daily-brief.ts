import { createServerOnlyFn } from "@tanstack/react-start";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import {
  BriefPrice,
  BriefRow,
  GeneratedBrief,
  briefPriceChanges,
} from "@/lib/daily-briefs";

const str = (max: number) =>
  z
    .union([z.string(), z.number(), z.null(), z.undefined()])
    .transform((v) => String(v ?? "").slice(0, max));

const strList = z
  .union([z.array(z.string()), z.null(), z.undefined()])
  .transform((v) =>
    Array.isArray(v) ? v.filter((u) => typeof u === "string") : [],
  );

const News = z.object({
  day: z.string(),
  tag: str(40),
  headline: str(200),
  body: str(1600),
  source_urls: strList,
});

const Activity = z.object({
  category: str(40),
  headline: str(200),
  summary: str(1000),
  source_url: z.string().catch(""),
  competitor_name: str(120),
  published_at: z.string().nullable().optional().catch(null),
  created_at: z.string().catch(""),
});

const Summary = z.object({
  competitor_id: z.string().nullable().optional().catch(null),
  competitor_name: str(120),
  week_start: z.string(),
  summary: str(1200),
  source_urls: strList,
});

const Profile = z.object({
  industry: str(200).nullable().optional(),
  product: str(500).nullable().optional(),
  region: str(200).nullable().optional(),
  scale: str(100).nullable().optional(),
});

/** Free models often wrap JSON in fences or prose; take the outermost object. */
function extractJsonObject(raw: string): unknown {
  let text = raw.trim();
  const fence = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) text = fence[1].trim();

  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end <= start) {
    throw new Error("Brief LLM returned invalid JSON");
  }
  text = text.slice(start, end + 1).replace(/,\s*([}\]])/g, "$1");

  try {
    return JSON.parse(text);
  } catch {
    throw new Error("Brief LLM returned invalid JSON");
  }
}

export const generateDailyBrief = createServerOnlyFn(
  async (userId: string, day: string, reason: "manual" | "onboarding" | "daily" = "manual") => {
    z.string().uuid().parse(userId);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) {
      throw new Error("Invalid brief day");
    }

    const apiKey = process.env["LLM_API_KEY"] ?? process.env["OPENAI_API_KEY"];
    if (!apiKey) throw new Error("LLM_API_KEY is not configured");

    const base = (
      process.env["LLM_BASE_URL"] ?? "https://openrouter.ai/api/v1"
    ).replace(/\/$/, "");
    const model = process.env["LLM_MODEL"] ?? "openrouter/free";

    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const db = supabaseAdmin as SupabaseClient;
    const reservation = await db.rpc("reserve_brief_generation", { p_user_id: userId, p_reason: reason });
    if (reservation.error) throw new Error("Could not verify brief generation limits");
    const permission = z.object({ allowed: z.boolean(), reservation_id: z.string().uuid().optional(), status: z.number().optional(), error: z.string().optional(), retry_after: z.number().optional() }).parse(reservation.data);
    if (!permission.allowed) {
      throw Object.assign(new Error(permission.error ?? "Brief generation is unavailable."), { status: permission.status ?? 429, retryAfter: permission.retry_after });
    }
    const ticket = permission.reservation_id;
    if (!ticket) throw new Error("Could not reserve brief generation");
    let success = false;
    try {

    const at = new Date(`${day}T00:00:00Z`).getTime();
    const since = (days: number) =>
      new Date(at - days * 86400000).toISOString();
    const until = new Date(at + 86400000).toISOString();

    const [
      profileResult,
      newsResult,
      priceResult,
      activityResult,
      summaryResult,
    ] = await Promise.all([
      db
        .from("profiles")
        .select("industry, product, region, scale")
        .eq("id", userId)
        .maybeSingle(),
      db
        .from("niche_news")
        .select("day, tag, headline, body, source_urls")
        .eq("user_id", userId)
        .gte("day", since(7).slice(0, 10))
        .lte("day", day)
        .order("day", { ascending: false })
        .limit(12),
      db
        .from("peer_prices")
        .select(
          "competitor_id, competitor_name, amount, amount_display, currency, plan_label, observed_at, source_url",
        )
        .eq("user_id", userId)
        .gte("observed_at", since(30))
        .lt("observed_at", until)
        .order("observed_at", { ascending: false })
        .limit(30),
      db
        .from("competitor_activity")
        .select(
          "category, headline, summary, source_url, competitor_name, published_at, created_at",
        )
        .eq("user_id", userId)
        .gte("created_at", since(14))
        .lt("created_at", until)
        .order("created_at", { ascending: false })
        .limit(20),
      db
        .from("competitor_summaries")
        .select(
          "competitor_id, competitor_name, week_start, summary, source_urls",
        )
        .eq("user_id", userId)
        .lte("week_start", day)
        .order("week_start", { ascending: false })
        .limit(30),
    ]);

    if (profileResult.error) {
      throw new Error(`Could not load profile: ${profileResult.error.message}`);
    }
    if (newsResult.error) {
      throw new Error(`Could not load niche_news: ${newsResult.error.message}`);
    }
    if (priceResult.error) {
      throw new Error(
        `Could not load peer_prices: ${priceResult.error.message}`,
      );
    }
    if (activityResult.error) {
      throw new Error(
        `Could not load competitor_activity: ${activityResult.error.message}`,
      );
    }
    if (
      summaryResult.error &&
      !["42P01", "PGRST205"].includes(summaryResult.error.code ?? "")
    ) {
      throw new Error(
        `Could not load competitor_summaries: ${summaryResult.error.message}`,
      );
    }

    const news = z.array(News).parse(newsResult.data ?? []);
    const prices = z.array(BriefPrice).parse(priceResult.data ?? []);
    const activity = z
      .array(Activity)
      .parse(activityResult.data ?? [])
      .filter((a) => a.source_url);

    const seen = new Set<string>();
    const summaries = z
      .array(Summary)
      .parse(summaryResult.data ?? [])
      .filter((row) => {
        const key = row.competitor_id ?? row.competitor_name;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .slice(0, 10);

    const profile = profileResult.data
      ? Profile.parse(profileResult.data)
      : null;
    const priceChanges = briefPriceChanges(prices);
    const context = {
      day,
      profile,
      news,
      prices,
      priceChanges,
      activity,
      summaries,
    };

    const sourcesFor = (type: string) => {
      const urls =
        type === "news"
          ? news.flatMap((n) => n.source_urls)
          : type === "pricing"
            ? prices.flatMap((p) => (p.source_url ? [p.source_url] : []))
            : type === "activity"
              ? activity.map((a) => a.source_url)
              : summaries.flatMap((s) => s.source_urls);
      return [
        ...new Set(
          urls.filter((url) => {
            try {
              return ["https:", "http:"].includes(new URL(url).protocol);
            } catch {
              return false;
            }
          }),
        ),
      ].slice(0, 100);
    };

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    };
    if (process.env["LLM_HTTP_REFERER"]) {
      headers["HTTP-Referer"] = process.env["LLM_HTTP_REFERER"];
    }
    if (process.env["LLM_APP_TITLE"]) {
      headers["X-Title"] = process.env["LLM_APP_TITLE"];
    }

    const messages = [
      {
        role: "system" as const,
        content:
          'Output ONLY valid JSON: {"title":string,"body":string,"action_plan":string,"highlights":[{"type":"news"|"pricing"|"activity"|"other","title":string,"detail":string}]}. Body: 2–4 short plain-text paragraphs. action_plan: 3–6 concrete imperative to-dos, newline-separated. Tone: practical, calm Hong Kong startup founder, no hype. Use ONLY supplied context. Never invent competitors, prices, events or headlines. Explicitly say when news, prices or activity has no data. Pricing moves only from priceChanges. Prefer what changed and what to do this week. Return a single JSON object only. No markdown. No code fences. No text before or after the object.',
      },
      { role: "user" as const, content: JSON.stringify(context) },
    ];

        const chat = (jsonFormat: boolean) =>
      fetch(`${base}/chat/completions`, {
        signal: AbortSignal.timeout(60000),
        method: "POST",
        headers,
        body: JSON.stringify({
          model,
          temperature: 0.2,
          max_tokens: 2200,
          messages,
          ...(jsonFormat ? { response_format: { type: "json_object" } } : {}),
        }),
      });

    const MAX_LLM_ATTEMPTS = 3;
    let generated: z.infer<typeof GeneratedBrief> | null = null;
    let lastError = "Brief LLM failed";

    for (let attempt = 1; attempt <= MAX_LLM_ATTEMPTS; attempt++) {
      try {
        let response = await chat(true);
        if (response.status === 400) response = await chat(false);
        if (!response.ok) {
          const detail = (await response.text().catch(() => "")).slice(0, 120);
          throw new Error(
            `Brief LLM request failed (${response.status})${detail ? `: ${detail}` : ""}`,
          );
        }

        const reply = (await response.json()) as {
          choices?: Array<{
            message?: { content?: string | null; refusal?: string | null };
          }>;
        };
        const choice = reply.choices?.[0]?.message;
        const content = choice?.content;
        if (!content) {
          const refusal =
            typeof choice?.refusal === "string" ? choice.refusal : null;
          throw new Error(
            refusal
              ? `Brief LLM refused: ${refusal.slice(0, 160)}`
              : "Brief LLM returned no content",
          );
        }

        const parsedBrief = GeneratedBrief.safeParse(extractJsonObject(content));
        if (!parsedBrief.success) throw new Error("Brief LLM JSON shape invalid");
        generated = parsedBrief.data;
        break; // success
      } catch (e) {
        lastError =
          e instanceof Error ? e.message.slice(0, 200) : "Brief LLM failed";
        // Retry only empty content / bad JSON / schema — not auth or missing key
        const retryable =
          /no content|invalid JSON|JSON shape invalid|refused|request failed \(5\d\d\)|request failed \(429\)/i.test(
            lastError,
          );
        if (!retryable || attempt === MAX_LLM_ATTEMPTS) {
          throw new Error(lastError);
        }
        // Brief backoff before next attempt
        await new Promise((r) => setTimeout(r, 400 * attempt));
      }
    }

    if (!generated) {
      throw new Error(lastError);
    }

    const allSources = [
      ...new Set(
        ["news", "pricing", "activity", "other"].flatMap((t) => sourcesFor(t)),
      ),
    ].slice(0, 100);

    const highlights = [
      ...generated.highlights.map((h) => ({
        ...h,
        sources: sourcesFor(h.type),
      })),
      {
        type: "other" as const,
        title: "Sources",
        detail: "Public sources from saved research used for this brief.",
        sources: allSources,
      },
    ];

    const fields = {
      title: generated.title,
      body: generated.body,
      action_plan: generated.action_plan,
      highlights,
      model,
    };

    const { error: upsertError } = await db.from("briefs").upsert(
      { user_id: userId, day, ...fields },
      { onConflict: "user_id,day", ignoreDuplicates: true },
    );
    if (upsertError) {
      throw new Error(`Could not save daily brief: ${upsertError.message}`);
    }

    const saved = await db
      .from("briefs")
      .update(fields)
      .eq("user_id", userId)
      .eq("day", day)
      .select(
        "id, user_id, day, title, body, action_plan, highlights, pinned, model, created_at",
      )
      .single();

    if (saved.error) {
      throw new Error(`Could not save daily brief: ${saved.error.message}`);
    }

    const row = {
      ...saved.data,
      day:
        typeof saved.data.day === "string"
          ? saved.data.day
          : String(saved.data.day).slice(0, 10),
    };

    const brief = BriefRow.parse(row);
    success = true;
    return { brief };
    } finally {
      const completed = await db.rpc("finish_brief_generation", { p_user_id: userId, p_reservation_id: ticket, p_success: success });
      if (completed.error || completed.data !== true) throw new Error("Could not finalize brief generation limits");
    }
  },
);
