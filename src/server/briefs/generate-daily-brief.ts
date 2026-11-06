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
  .transform((v) => (Array.isArray(v) ? v.filter((u) => typeof u === "string") : []));

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

function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    /* continue */
  }
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    try {
      return JSON.parse(fence[1].trim());
    } catch {
      /* continue */
    }
  }
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  if (start >= 0 && end > start) {
    return JSON.parse(trimmed.slice(start, end + 1));
  }
  throw new Error("Brief LLM returned invalid JSON");
}

export const generateDailyBrief = createServerOnlyFn(
  async (userId: string, day: string) => {
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

    const at = new Date(`${day}T00:00:00Z`).getTime();
    const since = (days: number) =>
      new Date(at - days * 86400000).toISOString();
    const until = new Date(at + 86400000).toISOString();

    const [profileResult, newsResult, priceResult, activityResult, summaryResult] =
      await Promise.all([
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
      throw new Error(`Could not load peer_prices: ${priceResult.error.message}`);
    }
    if (activityResult.error) {
      throw new Error(
        `Could not load competitor_activity: ${activityResult.error.message}`,
      );
    }
    // Optional table / missing is OK
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
          'Output ONLY valid JSON: {"title":string,"body":string,"action_plan":string,"highlights":[{"type":"news"|"pricing"|"activity"|"other","title":string,"detail":string}]}. Body: 2–4 short plain-text paragraphs. action_plan: 3–6 concrete imperative to-dos, newline-separated. Tone: practical, calm Hong Kong startup founder, no hype. Use ONLY supplied context. Never invent competitors, prices, events or headlines. Explicitly say when news, prices or activity has no data. Pricing moves only from priceChanges. Prefer what changed and what to do this week.',
      },
      { role: "user" as const, content: JSON.stringify(context) },
    ];

    const chat = (jsonFormat: boolean) =>
      fetch(`${base}/chat/completions`, {
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

    let response = await chat(true);
    if (response.status === 400) response = await chat(false);
    if (!response.ok) {
      const detail = (await response.text().catch(() => "")).slice(0, 120);
      throw new Error(
        `Brief LLM request failed (${response.status})${detail ? `: ${detail}` : ""}`,
      );
    }

    const reply = (await response.json()) as {
      choices?: Array<{ message?: { content?: string | null } }>;
    };
    const content = reply.choices?.[0]?.message?.content;
    if (!content) throw new Error("Brief LLM returned no content");

    const generated = GeneratedBrief.parse(extractJsonObject(content));

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

    // Upsert content; never touch pinned
    const { error: upsertError } = await db.from("briefs").upsert(
      { user_id: userId, day, ...fields, pinned: false },
      { onConflict: "user_id,day" },
    );
    if (upsertError) {
      throw new Error(`Could not save daily brief: ${upsertError.message}`);
    }

    // Restore pin if it was set before (upsert may have reset default)
    // Prefer update-only path when row exists with pin — simple re-read:
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

    // day may come back as date; normalize for zod
    const row = {
      ...saved.data,
      day:
        typeof saved.data.day === "string"
          ? saved.data.day
          : String(saved.data.day).slice(0, 10),
    };

    return { brief: BriefRow.parse(row) };
  },
);
