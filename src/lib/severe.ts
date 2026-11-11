/** Severe flags expire after 7 days so the dashboard does not stack forever. */
export const SEVERE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

export function severeUntilFrom(now = new Date()): string {
  return new Date(now.getTime() + SEVERE_TTL_MS).toISOString();
}

/** True only while severe is set and severe_until is still in the future. */
export function isSevereActive(
  severe: boolean | null | undefined,
  severeUntil: string | null | undefined,
  now = Date.now(),
): boolean {
  if (!severe || !severeUntil) return false;
  const t = Date.parse(severeUntil);
  return Number.isFinite(t) && t > now;
}

export type NotableKind = "news" | "activity" | "pricing";

export type NotableUpdate = {
  id: string;
  kind: NotableKind;
  title: string;
  detail: string;
  whenIso: string;
  href: string;
  sourceUrl?: string | null;
};
