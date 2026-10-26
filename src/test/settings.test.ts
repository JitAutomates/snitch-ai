import { describe, expect, it } from "vitest";
import { peerFieldsChanged, type ProfileFields } from "@/lib/settings";

const profile: ProfileFields = { display_name: "Founder", industry: "Software", product: "Analytics", region: "Hong Kong", scale: "indie", sales_volume: "1200000" };

describe("Settings peer refresh", () => {
  for (const [key, value] of Object.entries({ industry: "Finance", product: "Payments", region: "Japan", scale: "small", sales_volume: "2400000" })) {
    it(`refreshes when ${key} changes`, () => {
      expect(peerFieldsChanged(profile, { ...profile, [key]: value })).toBe(true);
    });
  }
  it("does not refresh for a name-only save", () => {
    expect(peerFieldsChanged(profile, { ...profile, display_name: "New name" })).toBe(false);
  });
  it("does not refresh when business values are unchanged", () => {
    expect(peerFieldsChanged(profile, { ...profile, sales_volume: "1200000.00" })).toBe(false);
  });
});