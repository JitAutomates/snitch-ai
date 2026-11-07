import { z } from "zod";

export const PlanSchema = z.enum(["free", "premium"]);
export type Plan = z.infer<typeof PlanSchema>;

export function isPremium(plan: Plan | string | null | undefined): boolean {
  return plan === "premium";
}

/** Free: list peers, no deep competitor monitor. */
export const FREE_PEER_DETAIL_LOCKED = true;

/** Free: no manual brief regenerate. */
export const FREE_BRIEF_REGENERATE_LOCKED = true;
