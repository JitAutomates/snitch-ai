import { z } from "zod";

export const BriefHighlight = z.object({
  type: z.enum(["news", "pricing", "activity", "other"]),
  title: z.string().trim().min(1).max(200),
  detail: z.string().trim().max(1200),
  source: z.string().url().optional(),
  sources: z.array(z.string().url()).max(100).optional(),
});
export const BriefRow = z.object({
  id: z.string().uuid(), user_id: z.string().uuid(), day: z.string(),
  title: z.string(), body: z.string(), action_plan: z.string(),
  highlights: z.array(BriefHighlight), pinned: z.boolean(),
  model: z.string().nullable(), created_at: z.string(),
});
export type DailyBrief = z.infer<typeof BriefRow>;
export const GeneratedBrief = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(6000),
  action_plan: z.string().trim().min(1).max(2500),
  highlights: z.array(z.object({
    type: z.enum(["news", "pricing", "activity", "other"]),
    title: z.string().trim().min(1).max(200),
    detail: z.string().trim().min(1).max(1200),
  }).strict()).max(12),
}).strict();

export function utcBriefDay(date = new Date()): string {
  return date.toISOString().slice(0, 10);
}
export function briefDayLabel(day: string): string {
  return new Date(`${day}T12:00:00Z`).toLocaleDateString("en-HK", {
    timeZone: "UTC", weekday: "long", year: "numeric", month: "long", day: "numeric",
  });
}
export const BriefPrice = z.object({
  competitor_id: z.string(), competitor_name: z.string(),
  amount: z.number().finite().nonnegative().nullable(), currency: z.string(),
  plan_label: z.string(), amount_display: z.string().nullable(), observed_at: z.string(),
  source_url: z.string().nullable(),
});
export type BriefPriceRow = z.infer<typeof BriefPrice>;

/** Never compare currencies or different plans as if they were a price move. */
export function briefPriceChanges(rows: BriefPriceRow[]) {
  const groups = new Map<string, BriefPriceRow[]>();
  for (const row of [...rows].sort((a, b) => b.observed_at.localeCompare(a.observed_at))) {
    if (row.amount === null) continue;
    const key = `${row.competitor_id}:${row.currency}:${row.plan_label}`;
    const group = groups.get(key) ?? [];
    group.push(row);
    groups.set(key, group);
  }
  return [...groups.values()].flatMap(([latest, previous]) => {
    if (!latest || !previous || latest.amount === previous.amount) return [];
    return [{ name: latest.competitor_name, from: previous.amount, to: latest.amount,
      currency: latest.currency, plan_label: latest.plan_label,
      amount_display: latest.amount_display, source_url: latest.source_url }];
  });
}
export function briefSources(highlights: DailyBrief["highlights"]): string[] {
  return [...new Set(highlights.flatMap(h => [...(h.sources ?? []), ...(h.source ? [h.source] : [])]))]
    .filter(url => /^https?:\/\//i.test(url));
}