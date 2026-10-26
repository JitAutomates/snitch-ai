export type ProfileFields = {
  display_name: string;
  industry: string;
  product: string;
  region: string;
  scale: string;
  sales_volume: string;
};

export const PEER_FIELDS = ["industry", "product", "region", "scale", "sales_volume"] as const;

export function peerFieldsChanged(before: ProfileFields, after: ProfileFields) {
  return PEER_FIELDS.some((key) => key === "sales_volume"
    ? Number(before[key]) !== Number(after[key])
    : before[key].trim() !== after[key].trim());
}

export function profileFromMetadata(metadata: Record<string, unknown>): ProfileFields {
  const text = (key: string) => typeof metadata[key] === "string" ? String(metadata[key]) : "";
  return {
    display_name: text("display_name"), industry: text("industry"), product: text("product"),
    region: text("region"), scale: text("scale"),
    sales_volume: metadata["sales_volume"] == null ? "" : String(metadata["sales_volume"]),
  };
}

export const APPEARANCE_KEY = "snitch_appearance";
export function canConfirmAccountAction(value: string) { return value === "DELETE"; }
export type Appearance = { theme: "dark" | "light"; fontSize: "small" | "medium" | "large"; colouredEmphasis: boolean };
export const DEFAULT_APPEARANCE: Appearance = { theme: "dark", fontSize: "medium", colouredEmphasis: false };

export function loadAppearance(): Appearance {
  try {
    const value = JSON.parse(localStorage.getItem(APPEARANCE_KEY) ?? "null");
    return {
      theme: value?.theme === "light" ? "light" : "dark",
      fontSize: value?.fontSize === "small" || value?.fontSize === "large" ? value.fontSize : "medium",
      colouredEmphasis: value?.colouredEmphasis === true,
    };
  } catch { return DEFAULT_APPEARANCE; }
}

export function applyAppearance(value: Appearance) {
  const root = document.documentElement;
  root.classList.toggle("dark", value.theme === "dark");
  root.dataset["theme"] = value.theme;
  root.dataset["fontSize"] = value.fontSize;
  root.dataset["colouredEmphasis"] = String(value.colouredEmphasis);
}