// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { buildPeerPriceSeries, chooseEntryPrice, PRICING_PEER_LIMIT, publicCompanyUrl, type PriceObservation } from '@/lib/peer-pricing';
const url = 'https://example.com/';
const price = (amount: number | null, confidence: 'high' | 'low' = 'high', source_url = url, currency = 'USD') => ({
  amount, confidence, source_url, currency, plan_label: 'Starter', amount_display: amount === null ? 'Contact sales' : `$${amount}/month`,
});
describe('peer pricing rules', () => {
  it('limits collection to ten peers', () => { expect(PRICING_PEER_LIMIT).toBe(10); });
  it('chooses the cheapest explicit monthly price with high confidence', () => {
    expect(chooseEntryPrice([price(49), price(19), price(5, 'low')], url)?.amount).toBe(19);
  });
  it('retains unknown prices as null', () => {
    expect(chooseEntryPrice([price(null)], url)?.amount).toBeNull();
  });
  it('rejects unrelated source domains', () => {
    expect(chooseEntryPrice([price(1, 'high', 'https://unrelated.com/')], url)).toBeNull();
  });
  it('never compares prices across currencies', () => {
    expect(chooseEntryPrice([price(49), price(1, 'high', url, 'HKD')], url)?.currency).toBe('USD');
  });
  it.each(['http://127.0.0.1', 'http://169.254.169.254/', 'http://[::1]', 'http://localhost/', 'https://user:password@example.com', 'file:///tmp/private', 'https://example.com:9000'])('rejects unsafe company URL %s', value => {
    expect(publicCompanyUrl(value)).toBeNull();
  });
  it('keeps currency changes as separate series and does not invent unknown points', () => {
    const observation = (amount: number | null, currency: string, observed_at: string): PriceObservation => ({ competitor_id: 'peer1', competitor_name: 'Example', amount, currency, observed_at, source_url: url, plan_label: 'Starter' });
    const series = buildPeerPriceSeries([
      observation(49, 'USD', '2026-11-01T12:00:00Z'),
      observation(39, 'USD', '2026-11-01T15:00:00Z'),
      observation(300, 'HKD', '2026-11-02T12:00:00Z'),
      observation(null, 'USD', '2026-11-03T12:00:00Z'),
    ]);
    expect(series.lines.map(line => line.currency)).toEqual(['USD', 'HKD']);
    expect(series.points).toEqual([{ date: '2026-11-01', 'peer1:USD': 39 }, { date: '2026-11-02', 'peer1:HKD': 300 }]);
  });
});