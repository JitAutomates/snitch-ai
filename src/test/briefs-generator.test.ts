// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ from: vi.fn(), fetch: vi.fn(), upsert: vi.fn(), update: vi.fn(), filters: vi.fn(), limits: vi.fn() }));
vi.mock("@tanstack/react-start", () => ({ createServerOnlyFn: (fn: unknown) => fn }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));
import { generateDailyBrief } from "@/server/briefs/generate-daily-brief";
const id = "11111111-1111-4111-8111-111111111111";
const output = { title: "No collected updates", body: "No news, prices or activity has been collected.", action_plan: "Check monitors.\nReview saved inputs.\nRevisit tomorrow.", highlights: [] };
const saved = { id, user_id: id, day: "2026-11-06", ...output, pinned: true, model: "test-model", created_at: "2026-11-06T02:00:00Z" };
function builder(table: string) {
  const chain: Record<string, unknown> = {};
  for (const method of ["select", "eq", "gte", "lte", "lt", "order"]) chain[method] = (...args: unknown[]) => { mocks.filters(table, method, ...args); return chain; };
  chain["limit"] = (value: number) => { mocks.limits(table, value); return Promise.resolve({ data: [], error: null }); };
  chain["maybeSingle"] = () => Promise.resolve({ data: null, error: null });
  chain["upsert"] = mocks.upsert;
  chain["update"] = (fields: unknown) => { mocks.update(fields); return chain; };
  chain["single"] = () => Promise.resolve({ data: saved, error: null });
  return chain;
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("LLM_API_KEY", "test-key"); vi.stubEnv("LLM_BASE_URL", "https://llm.example.com/v1"); vi.stubEnv("LLM_MODEL", "test-model");
  mocks.from.mockImplementation(builder); mocks.upsert.mockResolvedValue({ error: null });
  vi.stubGlobal("fetch", mocks.fetch);
  mocks.fetch.mockImplementation(async () => Response.json({ choices: [{ message: { content: JSON.stringify(output) } }] }));
});
describe("DB-only brief generation", () => {
  it("loads only user-owned inputs with 7/30/14-day windows and bounded context", async () => {
    await generateDailyBrief(id, "2026-11-06");
    for (const table of ["niche_news", "peer_prices", "competitor_activity", "competitor_summaries"]) expect(mocks.filters).toHaveBeenCalledWith(table, "eq", "user_id", id);
    expect(mocks.filters).toHaveBeenCalledWith("niche_news", "gte", "day", "2026-10-30");
    expect(mocks.filters).toHaveBeenCalledWith("peer_prices", "gte", "observed_at", "2026-10-07T00:00:00.000Z");
    expect(mocks.filters).toHaveBeenCalledWith("competitor_activity", "gte", "created_at", "2026-10-23T00:00:00.000Z");
    expect(mocks.limits).toHaveBeenCalledWith("niche_news", 12); expect(mocks.limits).toHaveBeenCalledWith("peer_prices", 30); expect(mocks.limits).toHaveBeenCalledWith("competitor_activity", 20);
    expect(mocks.fetch).toHaveBeenCalledTimes(1); expect(mocks.fetch.mock.calls[0]?.[0]).toBe("https://llm.example.com/v1/chat/completions");
    const body = JSON.parse(mocks.fetch.mock.calls[0]?.[1].body);
    expect(JSON.parse(body.messages[1].content)).toMatchObject({ news: [], prices: [], activity: [], priceChanges: [] });
  });
  it("preserves pinned by never sending it in insert or update", async () => {
    const result = await generateDailyBrief(id, "2026-11-06");
    expect(result.brief.pinned).toBe(true);
    const inserted = mocks.upsert.mock.calls[0]?.[0]; const updated = mocks.update.mock.calls[0]?.[0];
    expect(inserted).not.toHaveProperty("pinned"); expect(updated).not.toHaveProperty("pinned");
    expect(mocks.upsert).toHaveBeenCalledWith(expect.objectContaining({ user_id: id, day: "2026-11-06" }), { onConflict: "user_id,day", ignoreDuplicates: true });
  });
  it("retries a 400 without response_format", async () => {
    mocks.fetch.mockResolvedValueOnce(new Response("unsupported", { status: 400 }));
    await generateDailyBrief(id, "2026-11-06");
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(JSON.parse(mocks.fetch.mock.calls[1]?.[1].body)).not.toHaveProperty("response_format");
  });
  it("does not save invalid LLM output", async () => {
    mocks.fetch.mockResolvedValue(Response.json({ choices: [{ message: { content: '{"title":"invented"}' } }] }));
    await expect(generateDailyBrief(id, "2026-11-06")).rejects.toThrow();
    expect(mocks.upsert).not.toHaveBeenCalled();
  });
  it("retries malformed model output before saving a valid brief", async () => {
    mocks.fetch.mockResolvedValueOnce(Response.json({ choices: [{ message: { content: '{"title":"incomplete"}' } }] }));
    const result = await generateDailyBrief(id, "2026-11-06");
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(result.brief.title).toBe("No collected updates");
    expect(mocks.upsert).toHaveBeenCalledTimes(1);
  });
  it("does not treat database errors as empty input", async () => {
    mocks.from.mockImplementation(table => table === "niche_news" ? { select: () => ({ eq: () => ({ gte: () => ({ lte: () => ({ order: () => ({ limit: () => Promise.resolve({ error: { code: "42501" }, data: null }) }) }) }) }) }) } : builder(table));
    await expect(generateDailyBrief(id, "2026-11-06")).rejects.toThrow("Could not load niche_news");
    expect(mocks.fetch).not.toHaveBeenCalled();
  });
});
