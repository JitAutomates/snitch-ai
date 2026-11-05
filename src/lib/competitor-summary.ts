import { z } from "zod";

/** Browser-safe helpers for weekly competitor summaries. No provider calls here. */

export const SUMMARY_PEER_LIMIT = 10;
export const SUMMARY_MAX_CHARS = 420;

/** Monday (UTC) of the week containing `date`, as YYYY-MM-DD. */
export function weekStartUTC(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** What the LLM must return. */
export const ExtractedSummary = z.object({
  summary: z.string().trim().max(1200).default(""),
  source_urls: z.array(z.string().url().max(2048)).max(10).default([]),
});

/** Keep the LLM's text short and plain, whatever it returns. */
export function cleanSummary(text: string): string {
  const plain = text.replace(/[*_`#>]/g, "").replace(/\s+/g, " ").trim();
  if (plain.length <= SUMMARY_MAX_CHARS) return plain;
  const cut = plain.slice(0, SUMMARY_MAX_CHARS);
  const lastStop = Math.max(cut.lastIndexOf(". "), cut.lastIndexOf("。"));
  return lastStop > 120 ? cut.slice(0, lastStop + 1) : `${cut.trimEnd()}…`;
}

export const SummaryRows = z.array(
  z.object({
    competitor_id: z.string().nullable(),
    competitor_name: z.string(),
    week_start: z.string(),
    summary: z.string(),
    source_urls: z.array(z.string()).catch([]),
  }),
);
export type SummaryRow = z.infer<typeof SummaryRows>[number];

/**
 * Latest summary per competitor, keyed by competitor id AND name (name survives a
 * re-resolve that changes ids). Rows must be newest-first.
 */
export function latestSummaries(rows: SummaryRow[]): Map<string, SummaryRow> {
  const out = new Map<string, SummaryRow>();
  for (const row of rows) {
    if (row.competitor_id && !out.has(`id:${row.competitor_id}`)) out.set(`id:${row.competitor_id}`, row);
    const nameKey = `name:${row.competitor_name.toLowerCase()}`;
    if (!out.has(nameKey)) out.set(nameKey, row);
  }
  return out;
}

export function summaryFor(
  map: Map<string, SummaryRow>,
  peer: { id: string; name: string },
): SummaryRow | undefined {
  return map.get(`id:${peer.id}`) ?? map.get(`name:${peer.name.toLowerCase()}`);
}
