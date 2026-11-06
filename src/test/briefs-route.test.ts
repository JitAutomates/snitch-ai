// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ generate: vi.fn(), getUser: vi.fn(), createClient: vi.fn(), from: vi.fn(), eq: vi.fn(), limit: vi.fn(), gt: vi.fn() }));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
vi.mock("@/server/briefs/generate-daily-brief", () => ({ generateDailyBrief: mocks.generate }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));
import { Route } from "@/routes/api/briefs/generate";
const post = (Route as unknown as { server: { handlers: { POST: (input: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
const id = "11111111-1111-4111-8111-111111111111";
async function request(body: unknown, token?: string) {
  return post({ request: new Request("http://localhost/api/briefs/generate", { method: "POST", headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) }) });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://test.invalid"); vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test");
  vi.stubEnv("NEWS_CRON_SECRET", "news-cron"); vi.stubEnv("PEER_MONTHLY_CRON_SECRET", "peer-cron");
  mocks.createClient.mockReturnValue({ auth: { getUser: mocks.getUser } });
  mocks.getUser.mockResolvedValue({ data: { user: { id } }, error: null });
  mocks.generate.mockResolvedValue({ brief: { day: "2026-11-06" } });
  mocks.from.mockReturnValue({ select: () => ({ eq: mocks.eq }) });
  mocks.eq.mockReturnValue({ order: () => ({ limit: mocks.limit }) });
  mocks.limit.mockReturnValue({ gt: mocks.gt, then: (resolve: (v: unknown) => void) => resolve({ data: [{ id }], error: null }) });
});
describe("daily briefs authentication", () => {
  it.each(["onboarding", "manual", "daily"])("requires authorization for %s", async reason => {
    expect((await request({ reason })).status).toBe(401); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it.each(["onboarding", "manual"])("uses only verified JWT identity for %s", async reason => {
    expect((await request({ reason }, "user-token")).status).toBe(200);
    expect(mocks.getUser).toHaveBeenCalledWith("user-token");
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith(id, new Date().toISOString().slice(0, 10));
  });
  it("rejects injected user_id and force fields", async () => {
    expect((await request({ reason: "manual", user_id: id }, "user-token")).status).toBe(400);
    expect((await request({ reason: "manual", force: true }, "user-token")).status).toBe(400);
    expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("rejects invalid JWT before accessing private inputs", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
    expect((await request({ reason: "manual" }, "invalid")).status).toBe(401);
    expect(mocks.generate).not.toHaveBeenCalled(); expect(mocks.from).not.toHaveBeenCalled();
  });
  it.each(["news-cron", "peer-cron"])("allows %s for daily generation", async token => {
    expect((await request({ reason: "daily" }, token)).status).toBe(200);
    expect(mocks.eq).toHaveBeenCalledWith("onboarded", true); expect(mocks.getUser).not.toHaveBeenCalled();
    expect(mocks.generate).toHaveBeenCalledExactlyOnceWith(id, new Date().toISOString().slice(0, 10));
  });
  it("rejects user JWT as daily authorization before admin access", async () => {
    expect((await request({ reason: "daily" }, "user-token")).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled(); expect(mocks.generate).not.toHaveBeenCalled();
  });
  it("returns HTTP 200 on partial success without provider details", async () => {
    const second = "22222222-2222-4222-8222-222222222222";
    mocks.limit.mockResolvedValue({ data: [{ id }, { id: second }], error: null });
    mocks.generate.mockRejectedValueOnce(new Error("private provider response"));
    const response = await request({ reason: "daily" }, "news-cron");
    expect(response.status).toBe(200); const body = await response.json();
    expect(body.failures).toEqual([{ user_id: id, error: "Could not generate daily brief" }]);
    expect(body.results).toEqual([{ user_id: second, day: new Date().toISOString().slice(0, 10) }]);
  });
  it("does not expose provider failure details", async () => {
    mocks.generate.mockRejectedValue(new Error("private provider response"));
    const response = await request({ reason: "manual" }, "user-token");
    expect(response.status).toBe(502); expect(JSON.stringify(await response.json())).not.toContain("private provider response");
  });
});
