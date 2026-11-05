// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), select: vi.fn(), eq: vi.fn(), order: vi.fn(), limit: vi.fn(), insert: vi.fn(), update: vi.fn(), updateEq: vi.fn(), fetch: vi.fn() }));
vi.mock('@tanstack/react-start', () => ({ createServerOnlyFn: (fn: unknown) => fn }));
vi.mock('@/integrations/supabase/client.server', () => ({ supabaseAdmin: { from: mocks.from } }));
import { extractPeerPrices } from '@/server/pricing/extract-peer-prices';
const id = '11111111-1111-4111-8111-111111111111';
const peer = { id, name: 'Example', company_url: 'https://example.com/' };
beforeEach(() => {
  vi.resetAllMocks();
  for (const key of ['TAVILY_API_KEY', 'LLM_API_KEY', 'LLM_MODEL']) vi.stubEnv(key, 'test-value');
  vi.stubEnv('LLM_BASE_URL', 'https://llm.example.com/v1');
  vi.stubGlobal('fetch', mocks.fetch);
  mocks.from.mockReturnValue({ select: mocks.select, insert: mocks.insert, update: mocks.update });
  mocks.select.mockReturnValue({ eq: mocks.eq }); mocks.eq.mockReturnValue({ order: mocks.order });
  mocks.order.mockReturnValue({ limit: mocks.limit });
  mocks.limit.mockResolvedValue({ data: [peer, { ...peer, company_url: null }], error: null });
  // Thenable so `await insert(row)` works, with .select().single() for the run marker.
  mocks.insert.mockReturnValue({
    select: () => ({ single: async () => ({ data: { id: 'run-1' }, error: null }) }),
    then: (resolve: (value: unknown) => void) => resolve({ error: null }),
  });
  mocks.update.mockReturnValue({ eq: mocks.updateEq });
  mocks.updateEq.mockResolvedValue({ error: null });
  mocks.fetch.mockResolvedValueOnce(Response.json({ results: [{ url: peer.company_url, raw_content: 'Starter USD 19/month, Pro USD 49/month' }] }))
    .mockResolvedValueOnce(Response.json({ choices: [{ message: { content: JSON.stringify({ prices: [49, 19].map(amount => ({ plan_label: amount === 19 ? 'Starter' : 'Pro', currency: 'USD', amount, amount_display: `USD ${amount}/month`, confidence: 'high', source_url: peer.company_url })) }) } }] }));
});
describe('website-only pricing extraction', () => {
  it('loads ten ranked peers owned by the user, requests only their URL and appends one cheapest observation', async () => {
    expect(await extractPeerPrices(id)).toEqual({ updated: 1, skipped: 1, failures: [] });
    expect(mocks.eq).toHaveBeenCalledWith('user_id', id);
    expect(mocks.order).toHaveBeenCalledWith('rank', { ascending: true });
    expect(mocks.limit).toHaveBeenCalledWith(10);
    const firstCall = mocks.fetch.mock.calls[0] as [string, RequestInit];
    expect(firstCall[0]).toBe('https://api.tavily.com/extract');
    expect(JSON.parse(String(firstCall[1].body)).urls).toEqual([peer.company_url]);
    expect(mocks.fetch).toHaveBeenCalledTimes(2);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ user_id: id, competitor_id: id, amount: 19, currency: 'USD', plan_label: 'Starter', source_url: peer.company_url }));
  });
  it('marks the run done when collection finishes', async () => {
    await extractPeerPrices(id);
    expect(mocks.insert).toHaveBeenCalledWith({ user_id: id, status: 'running' });
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'done' }));
    expect(mocks.updateEq).toHaveBeenCalledWith('id', 'run-1');
  });
  it('stores null when the website cannot be parsed rather than inventing a price', async () => {
    mocks.fetch.mockReset().mockResolvedValue(Response.json({ results: [] }));
    await extractPeerPrices(id);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ amount: null, plan_label: 'unknown' }));
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
  });
  it('never sends off-origin extracted text to the LLM', async () => {
    mocks.fetch.mockReset().mockResolvedValue(Response.json({ results: [{ url: 'https://unrelated.com/', raw_content: 'USD 5/month' }] }));
    await extractPeerPrices(id);
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.insert).toHaveBeenCalledWith(expect.objectContaining({ amount: null }));
  });
  it('stops on a provider denial without retrying or saving fabricated observations', async () => {
    mocks.fetch.mockReset().mockResolvedValue(new Response('denied', { status: 403 }));
    await expect(extractPeerPrices(id)).rejects.toThrow('Website extraction failed (403)');
    expect(mocks.fetch).toHaveBeenCalledTimes(1);
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({ status: 'failed' }));
  });
});
