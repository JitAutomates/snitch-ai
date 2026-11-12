import { z } from "zod";

/** Browser-safe helpers for weekly competitor activity. No provider calls here. */

export const ACTIVITY_CATEGORIES = [
  "Product",
  "Pricing",
  "Funding",
  "Hiring",
  "Partnership",
  "Marketing",
  "Other",
] as const;
export type ActivityCategory = (typeof ACTIVITY_CATEGORIES)[number];

export const ACTIVITY_PEER_LIMIT = 10;
export const ACTIVITY_MAX_EVENTS_PER_PEER = 4;
/** A "running" marker older than this is treated as dead (crashed / timed out). */
export const STALE_RUN_MS = 15 * 60 * 1000;

/** Monday (UTC) of the week containing `date`, as YYYY-MM-DD. */
export function weekStartUTC(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
}

/** What the LLM must return. Lenient on extra keys, strict on what we store. */
export const ExtractedActivity = z.object({
  events: z
    .array(
      z.object({
        category: z.string().trim().max(40).default("Other"),
        headline: z.string().trim().min(1).max(160),
        summary: z.string().trim().min(1).max(600),
        source_url: z.string().url().max(2048),
        severe: z.boolean().optional().default(false),
      }),
    )
    .max(20)
    .default([]),
});

export function normalizeCategory(value: string): ActivityCategory {
  const hit = ACTIVITY_CATEGORIES.find((c) => c.toLowerCase() === value.trim().toLowerCase());
  return hit ?? "Other";
}

export const ActivityRows = z.array(
  z.object({
    id: z.string(),
    competitor_id: z.string().nullable(),
    competitor_name: z.string(),
    company_url: z.string().nullable(),
    week_start: z.string(),
    category: z.string(),
    headline: z.string(),
    summary: z.string(),
    source_url: z.string(),
    published_at: z.string().nullable(),
    created_at: z.string(),
    severe: z.boolean().optional().default(false),
    severe_until: z.string().nullable().optional(),
  }),
);
export type ActivityRow = z.infer<typeof ActivityRows>[number];

/**
 * Effective run status from the latest run marker. A "running" marker that is older
 * than STALE_RUN_MS is dead, so it must NOT keep the UI in "fetching" forever.
 */
export function effectiveRunStatus(
  latest: { status: string; started_at: string } | undefined | null,
  now: number = Date.now(),
): string | null {
  if (!latest) return null;
  if (latest.status !== "running") return latest.status;
  const started = new Date(latest.started_at).getTime();
  return Number.isFinite(started) && now - started < STALE_RUN_MS ? "running" : "failed";
}

export type ActivitySummary =
  | { state: "fetching" }
  | { state: "empty" }
  | { state: "ready"; refreshing: boolean };

/** Never hide existing history while a refresh runs; only show "fetching" when there is nothing yet. */
export function summarizeActivity(rows: ActivityRow[], runStatus: string | null): ActivitySummary {
  const refreshing = runStatus === "running";
  if (rows.length === 0) return refreshing ? { state: "fetching" } : { state: "empty" };
  return { state: "ready", refreshing };
}

export function groupActivityByWeek(rows: ActivityRow[]) {
  const byWeek = new Map<string, ActivityRow[]>();
  for (const row of rows) {
    const list = byWeek.get(row.week_start) ?? [];
    list.push(row);
    byWeek.set(row.week_start, list);
  }
  return [...byWeek.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([weekStart, items]) => ({
      weekStart,
      items: items.sort((a, b) =>
        (b.published_at ?? b.created_at).localeCompare(a.published_at ?? a.created_at),
      ),
    }));
}
