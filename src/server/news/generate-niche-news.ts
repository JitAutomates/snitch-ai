import { createServerOnlyFn } from "@tanstack/react-start";
import {
  buildNicheNewsSearchQuery,
  buildNicheNewsSystemPrompt,
  buildNicheNewsUserPrompt,
  NICHE_NEWS_ARTICLE_COUNT,
} from "./news-query";

export type NewsProfile = {
  industry: string;
  product: string;
  region: string;
};

export type NicheArticle = {
  tag: string;
  headline: string;
  body: string;
  source_urls: string[];
};

/** ONLY function that may call Tavily + LLM for niche news. API route only. */
export const generateNicheNews = createServerOnlyFn(
  async function generateNicheNews(
    userId: string,
    profile: NewsProfile,
    day: string, // YYYY-MM-DD
  ): Promise<{ articles: NicheArticle[] }> {
    const tavilyKey = process.env["TAVILY_API_KEY"];
    const openaiKey = process.env["OPENAI_API_KEY"];
    if (!tavilyKey) throw new Error("TAVILY_API_KEY is not configured");
    if (!openaiKey) throw new Error("OPENAI_API_KEY is not configured");

    const searchQuery = buildNicheNewsSearchQuery(profile);

    const tavilyRes = await fetch("https://api.tavily.com/search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: tavilyKey,
        query: searchQuery,
        search_depth: "basic",
        include_answer: false,
        max_results: 8,
      }),
    });
    if (!tavilyRes.ok) {
      throw new Error(`Tavily request failed (${tavilyRes.status})`);
    }

    const tavilyData = (await tavilyRes.json()) as {
      results?: Array<{ title?: string; url?: string; content?: string }>;
    };

    const results = tavilyData.results ?? [];
    const sourceUrls = results
      .map((r) => r.url)
      .filter((u): u is string => Boolean(u))
      .slice(0, 8);

    const searchContext = results
      .map(
        (r, i) =>
          `[${i + 1}] ${r.title ?? ""}\nURL: ${r.url ?? ""}\n${(r.content ?? "").slice(0, 500)}`,
      )
      .join("\n\n")
      .slice(0, 12000);

    const openaiRes = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openaiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: buildNicheNewsSystemPrompt() },
          {
            role: "user",
            content: buildNicheNewsUserPrompt({
              ...profile,
              searchContext: searchContext || "No search hits; write cautious generic sector notes.",
            }),
          },
        ],
      }),
    });
    if (!openaiRes.ok) {
      throw new Error(`OpenAI request failed (${openaiRes.status})`);
    }

    const openaiData = (await openaiRes.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const raw = openaiData.choices?.[0]?.message?.content ?? "{}";
    let parsed: { articles?: Array<{ tag?: string; headline?: string; body?: string }> };
    try {
      parsed = JSON.parse(raw) as typeof parsed;
    } catch {
      throw new Error("LLM returned invalid JSON");
    }

    const articles: NicheArticle[] = (parsed.articles ?? [])
      .map((a) => ({
        tag: String(a.tag ?? "Market").slice(0, 40),
        headline: String(a.headline ?? "").trim().slice(0, 200),
        body: String(a.body ?? "").trim().slice(0, 2000),
        source_urls: sourceUrls,
      }))
      .filter((a) => a.headline && a.body)
      .slice(0, NICHE_NEWS_ARTICLE_COUNT);

    if (articles.length === 0) {
      throw new Error("No articles produced");
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as import("@supabase/supabase-js").SupabaseClient;

    // Replace this user's articles for that calendar day
    await db.from("niche_news").delete().eq("user_id", userId).eq("day", day);

    const { error: insertError } = await db.from("niche_news").insert(
      articles.map((a) => ({
        user_id: userId,
        day,
        tag: a.tag,
        headline: a.headline,
        body: a.body,
        source_urls: a.source_urls,
      })),
    );
    if (insertError) throw new Error("Could not save niche news");

    return { articles };
  },
);
