import { z } from 'zod';

export const PRICING_PEER_LIMIT = 10;
export function publicCompanyUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    const host = url.hostname.toLowerCase();
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password ||
      (url.port && !['80', '443'].includes(url.port)) || !host.includes('.') ||
      /\.(localhost|local|internal|test|invalid)$/.test(host) || /^[\d.]+$/.test(host) || host.includes(':')) return null;
    url.hash = '';
    return url.href;
  } catch { return null; }
}
export function sameCompanyOrigin(source: string, company: string): boolean {
  const safe = publicCompanyUrl(source);
  return Boolean(safe && new URL(safe).origin === new URL(company).origin);
}
export const ExtractedPrices = z.object({ prices: z.array(z.object({
  plan_label: z.string().trim().min(1).max(120), currency: z.string().regex(/^[A-Z]{3}$/),
  amount: z.number().finite().nonnegative().nullable(), amount_display: z.string().max(300),
  confidence: z.enum(['high', 'low']), source_url: z.string().url().max(2048),
}).strict()).max(30) }).strict();
export function chooseEntryPrice(prices: z.infer<typeof ExtractedPrices>['prices'], company: string) {
  const allowed = prices.filter(p => sameCompanyOrigin(p.source_url, company));
  const numeric = allowed.filter(p => p.amount !== null);
  const confident = numeric.filter(p => p.confidence === 'high');
  const candidates = confident.length ? confident : numeric;
  const currency = candidates[0]?.currency;
  return candidates.filter(p => p.currency === currency)
    .sort((a, b) => (a.amount ?? Infinity) - (b.amount ?? Infinity))[0] ?? allowed[0] ?? null;
}
export const PriceObservations = z.array(z.object({
  competitor_id: z.string(), competitor_name: z.string(), currency: z.string(),
  amount: z.number().finite().nonnegative().nullable(), observed_at: z.string().datetime({ offset: true }),
  source_url: z.string().nullable(), plan_label: z.string(),
}));
export type PriceObservation = z.infer<typeof PriceObservations>[number];
export function buildPeerPriceSeries(observations: PriceObservation[]) {
  const lines = new Map<string, { key: string; name: string; currency: string }>();
  const points = new Map<string, Record<string, number | string>>();
  for (const row of [...observations].sort((a, b) => a.observed_at.localeCompare(b.observed_at))) {
    if (row.amount === null) continue;
    const key = `${row.competitor_id}:${row.currency}`;
    lines.set(key, { key, name: `${row.competitor_name} (${row.currency})`, currency: row.currency });
    const day = row.observed_at.slice(0, 10);
    const point = points.get(day) ?? { date: day };
    point[key] = row.amount;
    points.set(day, point);
  }
  return { lines: [...lines.values()], points: [...points.values()] };
}