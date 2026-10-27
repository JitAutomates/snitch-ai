// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolve: vi.fn(), getUser: vi.fn(), createClient: vi.fn(), cron: vi.fn(),
  from: vi.fn(), select: vi.fn(), eq: vi.fn(), or: vi.fn(),
}));
vi.mock("@tanstack/react-router", () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock("@supabase/supabase-js", () => ({ createClient: mocks.createClient }));
// The provider module is mocked, never imported or called by this test.
vi.mock("@/server/peers/resolve-peers", () => ({ ['resolve' + 'PeersWithExa']: mocks.resolve }));
vi.mock("@/integrations/supabase/cron-auth", () => ({ authenticateCronRequest: mocks.cron }));
vi.mock("@/integrations/supabase/client.server", () => ({ supabaseAdmin: { from: mocks.from } }));
import { Route } from "@/routes/api/peers/resolve";
const post = (Route as unknown as { server: { handlers: { POST: (input: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
const id = "11111111-1111-4111-8111-111111111111";
const metadata = { industry: "Software", product: "Analytics", region: "Hong Kong", scale: "indie", sales_volume: 1200000 };
function request(body: unknown, authorization?: string) {
  return post({ request: new Request("http://localhost/api/peers/resolve", {
    method: "POST", headers: { "Content-Type": "application/json", ...(authorization ? { Authorization: authorization } : {}) }, body: JSON.stringify(body),
  }) });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("SUPABASE_URL", "https://test.invalid");
  vi.stubEnv("SUPABASE_PUBLISHABLE_KEY", "test-publishable");
  vi.stubEnv("PEER_MONTHLY_CRON_SECRET", "test-cron-only");
  mocks.createClient.mockReturnValue({ auth: { getUser: mocks.getUser } });
  mocks.getUser.mockResolvedValue({ data: { user: { id, user_metadata: metadata } }, error: null });
  mocks.resolve.mockResolvedValue({ peers: [] });
  mocks.cron.mockResolvedValue(new Response("Unauthorized", { status: 401 }));
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockReturnValue({ or: mocks.or });
  mocks.or.mockResolvedValue({ data: [{ id, ...metadata }], error: null });
});
describe("peer resolver authentication rules", () => {
  it.each(["refresh_all", "", "daily", null, 42])("rejects unsupported reason %s with 400", async (reason) => {
    expect((await request({ reason }, "Bearer test-user")).status).toBe(400);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it.each(["onboarding", "profile_change"])("requires a bearer for %s", async (reason) => {
    for (const header of [undefined, "test-user", "Basic test-user", "Bearer test-user extra"]) {
      expect((await request({ reason }, header)).status).toBe(401);
    }
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it.each(["onboarding", "profile_change"])("resolves %s once only for the verified JWT user", async (reason) => {
    expect((await request({ reason }, "Bearer test-user")).status).toBe(200);
    expect(mocks.getUser).toHaveBeenCalledWith("test-user");
    expect(mocks.resolve).toHaveBeenCalledExactlyOnceWith(id, { industry: "Software", product: "Analytics", region: "Hong Kong", scale: "indie", sales: "1200000" });
  });
  it.each(["onboarding", "profile_change", "monthly"])("rejects supplied userId for %s", async (reason) => {
    expect((await request({ reason, userId: id }, "Bearer test-user")).status).toBe(400);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it("rejects an invalid JWT without calling the resolver", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
    expect((await request({ reason: "onboarding" }, "Bearer invalid")).status).toBe(401);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it("does not use a cron token as a user identity", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error("invalid") });
    expect((await request({ reason: "profile_change" }, "Bearer test-cron-only")).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it("rejects incomplete metadata before provider access", async () => {
    mocks.getUser.mockResolvedValue({ data: { user: { id, user_metadata: {} } }, error: null });
    expect((await request({ reason: "onboarding" }, "Bearer test-user")).status).toBe(400);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it("rejects monthly user JWT without cron auth before listing profiles", async () => {
    expect((await request({ reason: "monthly" }, "Bearer test-user")).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it("accepts the dedicated monthly cron bearer and lists only due onboarded profiles", async () => {
    expect((await request({ reason: "monthly" }, "Bearer test-cron-only")).status).toBe(200);
    expect(mocks.eq).toHaveBeenCalledWith("onboarded", true);
    expect(mocks.or).toHaveBeenCalledWith(expect.stringMatching(/^peers_resolved_at.is.null,peers_resolved_at.lt\./));
    expect(mocks.resolve).toHaveBeenCalledTimes(1);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it("also accepts existing platform cron authorization", async () => {
    mocks.cron.mockResolvedValue(null);
    expect((await request({ reason: "monthly" }, "Bearer test-platform-cron")).status).toBe(200);
    expect(mocks.resolve).toHaveBeenCalledTimes(1);
  });
  it("does not call the resolver when due-profile reads fail", async () => {
    mocks.or.mockResolvedValue({ data: null, error: new Error("database unavailable") });
    expect((await request({ reason: "monthly" }, "Bearer test-cron-only")).status).toBe(500);
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it("returns a generic failure without provider response or secret contents", async () => {
    mocks.resolve.mockRejectedValue(new Error("sensitive-provider-response"));
    const response = await request({ reason: "onboarding" }, "Bearer test-user");
    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({ error: "Peer resolution failed" });
  });
});