import { describe, expect, it } from "vitest";
import { briefPriceChanges, utcBriefDay, briefSources, type BriefPriceRow } from "@/lib/daily-briefs";
const price = (amount: number | null, observed_at: string, currency = "USD", plan_label = "Starter"): BriefPriceRow => ({ competitor_id: "peer", competitor_name: "Example", amount, observed_at, currency, plan_label, amount_display: String(amount), source_url: "https://example.com/pricing" });
describe("daily brief rules", () => {
  it("uses the UTC day even when Hong Kong is already tomorrow", () => {
    expect(utcBriefDay(new Date("2026-11-06T23:30:00Z"))).toBe("2026-11-06");
  });
  it("compares the latest two numeric prices and skips null observations", () => {
    expect(briefPriceChanges([price(42, "2026-11-01"), price(null, "2026-11-05"), price(39, "2026-11-04")])).toEqual([expect.objectContaining({ name: "Example", from: 42, to: 39, currency: "USD", plan_label: "Starter" })]);
  });
  it("does not invent a change from one numeric observation", () => {
    expect(briefPriceChanges([price(42, "2026-11-01"), price(null, "2026-11-02")])).toEqual([]);
  });
  it("does not report unchanged pricing", () => {
    expect(briefPriceChanges([price(42, "2026-11-01"), price(42, "2026-11-02")])).toEqual([]);
  });
  it("never compares different currencies", () => {
    expect(briefPriceChanges([price(42, "2026-11-01"), price(39, "2026-11-02", "HKD")])).toEqual([]);
  });
  it("never compares different plans", () => {
    expect(briefPriceChanges([price(42, "2026-11-01"), price(39, "2026-11-02", "USD", "Pro")])).toEqual([]);
  });
  it("returns only distinct web sources", () => {
    expect(briefSources([{ type: "news", title: "Sources", detail: "", sources: ["https://example.com", "https://example.com", "javascript:alert(1)"] }])).toEqual(["https://example.com"]);
  });
});
