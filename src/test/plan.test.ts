import { describe, expect, it } from "vitest";
import { planDisplayAccess } from "@/lib/plan";

describe("Free plan displays", () => {
  it("blurs niche news and pricing for Free, not Premium", () => {
    expect(planDisplayAccess(false).monitorsBlurred).toBe(true);
    expect(planDisplayAccess(true).monitorsBlurred).toBe(false);
  });
  it("blurs brief history for Free, not Premium", () => {
    expect(planDisplayAccess(false).briefHistoryBlurred).toBe(true);
    expect(planDisplayAccess(true).briefHistoryBlurred).toBe(false);
  });
  it("disables regeneration for Free and enables it for Premium", () => {
    expect(planDisplayAccess(false).canRegenerateBrief).toBe(false);
    expect(planDisplayAccess(true).canRegenerateBrief).toBe(true);
  });
  it("does not unlock areas while the plan is loading", () => {
    expect(planDisplayAccess(true, true)).toEqual({ monitorsBlurred: true, briefHistoryBlurred: true, canRegenerateBrief: false });
  });
});