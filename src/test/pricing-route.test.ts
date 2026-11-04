// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ extract: vi.fn(), getUser: vi.fn(), createClient: vi.fn(), cron: vi.fn(), from: vi.fn(), select: vi.fn(), eq: vi.fn() }));
vi.mock('@tanstack/react-router', () => ({ createFileRoute: () => (options: unknown) => options }));
vi.mock('@supabase/supabase-js', () => ({ createClient: mocks.createClient }));
vi.mock('@/server/pricing/extract-peer-prices', () => ({ extractPeerPrices: mocks.extract }));
vi.mock('@/integrations/supabase/cron-auth', () => ({ authenticateCronRequest: mocks.cron }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: mocks.from } }));
import { Route } from '@/routes/api/pricing/refresh';
const post = (Route as unknown as { server: { handlers: { POST: (input: { request: Request }) => Promise<Response> } } }).server.handlers.POST;
const id = '11111111-1111-4111-8111-111111111111';
function request(body: unknown, authorization?: string) {
  return post({ request: new Request('http://localhost/api/pricing/refresh', { method: 'POST', headers: { 'Content-Type': 'application/json', ...(authorization ? { Authorization: authorization } : {}) }, body: JSON.stringify(body) }) });
}
beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv('SUPABASE_URL', 'https://test.invalid');
  vi.stubEnv('SUPABASE_PUBLISHABLE_KEY', 'test-key');
  vi.stubEnv('NEWS_CRON_SECRET', 'news-cron');
  vi.stubEnv('PEER_MONTHLY_CRON_SECRET', 'peer-cron');
  mocks.createClient.mockReturnValue({ auth: { getUser: mocks.getUser } });
  mocks.getUser.mockResolvedValue({ data: { user: { id } }, error: null });
  mocks.extract.mockResolvedValue({ updated: 2, skipped: 1 });
  mocks.cron.mockResolvedValue(new Response('Unauthorized', { status: 401 }));
  mocks.from.mockReturnValue({ select: mocks.select });
  mocks.select.mockReturnValue({ eq: mocks.eq });
  mocks.eq.mockResolvedValue({ data: [{ id }], error: null });
});
describe('pricing refresh authorization', () => {
  it.each(['onboarding', 'manual', 'daily'])('requires bearer authorization for %s', async reason => {
    expect((await request({ reason })).status).toBe(401);
    expect(mocks.extract).not.toHaveBeenCalled();
  });
  it.each(['onboarding', 'manual'])('uses only verified JWT identity for %s', async reason => {
    const response = await request({ reason }, 'Bearer user-token');
    expect(response.status).toBe(200);
    expect(mocks.getUser).toHaveBeenCalledWith('user-token');
    expect(mocks.extract).toHaveBeenCalledExactlyOnceWith(id);
    expect(await response.json()).toEqual({ ok: true, updated: 2, skipped: 1 });
  });
  it('rejects body user identity and unsupported reasons', async () => {
    expect((await request({ reason: 'manual', userId: id }, 'Bearer user-token')).status).toBe(400);
    expect((await request({ reason: 'profile_change' }, 'Bearer user-token')).status).toBe(400);
    expect(mocks.extract).not.toHaveBeenCalled();
  });
  it('rejects invalid JWT before price extraction', async () => {
    mocks.getUser.mockResolvedValue({ data: { user: null }, error: new Error('invalid') });
    expect((await request({ reason: 'manual' }, 'Bearer invalid')).status).toBe(401);
    expect(mocks.extract).not.toHaveBeenCalled();
  });
  it.each(['news-cron', 'peer-cron'])('accepts %s for daily only and lists onboarded profiles', async token => {
    expect((await request({ reason: 'daily' }, `Bearer ${token}`)).status).toBe(200);
    expect(mocks.eq).toHaveBeenCalledWith('onboarded', true);
    expect(mocks.extract).toHaveBeenCalledExactlyOnceWith(id);
    expect(mocks.getUser).not.toHaveBeenCalled();
  });
  it('rejects user bearer as daily authorization', async () => {
    expect((await request({ reason: 'daily' }, 'Bearer user-token')).status).toBe(401);
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('stops daily work at the first provider failure', async () => {
    mocks.eq.mockResolvedValue({ data: [{ id }, { id: '22222222-2222-4222-8222-222222222222' }], error: null });
    mocks.extract.mockRejectedValue(new Error('Website extraction failed (403)'));
    expect((await request({ reason: 'daily' }, 'Bearer peer-cron')).status).toBe(502);
    expect(mocks.extract).toHaveBeenCalledTimes(1);
  });
});