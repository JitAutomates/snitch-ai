import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({
    meta: [
      { title: "Set up Snitch" },
      { name: "description", content: "Tell Snitch a little about your company." },
      { property: "og:title", content: "Set up Snitch" },
      { property: "og:description", content: "Tell Snitch a little about your company." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: OnboardingPage,
});

const STEPS = ["industry", "product", "region", "scale", "sales"] as const;
type Step = (typeof STEPS)[number];

const SCALE_OPTIONS = [
  { value: "indie", label: "Indie (solo)" },
  { value: "small", label: "Small team (under 12 members)" },
  { value: "large", label: "Large team (12+ members)" },
] as const;

const COUNTRIES = [
  "Afghanistan","Albania","Algeria","Andorra","Angola","Argentina","Armenia","Australia",
  "Austria","Azerbaijan","Bahamas","Bahrain","Bangladesh","Barbados","Belarus","Belgium",
  "Belize","Benin","Bhutan","Bolivia","Bosnia and Herzegovina","Botswana","Brazil","Brunei",
  "Bulgaria","Burkina Faso","Burundi","Cambodia","Cameroon","Canada","Cape Verde",
  "Central African Republic","Chad","Chile","China","Colombia","Comoros","Congo","Costa Rica",
  "Croatia","Cuba","Cyprus","Czech Republic","Denmark","Djibouti","Dominica","Dominican Republic",
  "Ecuador","Egypt","El Salvador","Equatorial Guinea","Eritrea","Estonia","Eswatini","Ethiopia",
  "Fiji","Finland","France","Gabon","Gambia","Georgia","Germany","Ghana","Greece","Grenada",
  "Guatemala","Guinea","Guinea-Bissau","Guyana","Haiti","Honduras","Hong Kong","Hungary",
  "Iceland","India","Indonesia","Iran","Iraq","Ireland","Israel","Italy","Jamaica","Japan",
  "Jordan","Kazakhstan","Kenya","Kiribati","Kuwait","Kyrgyzstan","Laos","Latvia","Lebanon",
  "Lesotho","Liberia","Libya","Liechtenstein","Lithuania","Luxembourg","Macau","Madagascar",
  "Malawi","Malaysia","Maldives","Mali","Malta","Marshall Islands","Mauritania","Mauritius",
  "Mexico","Micronesia","Moldova","Monaco","Mongolia","Montenegro","Morocco","Mozambique",
  "Myanmar","Namibia","Nauru","Nepal","Netherlands","New Zealand","Nicaragua","Niger","Nigeria",
  "North Korea","North Macedonia","Norway","Oman","Pakistan","Palau","Palestine","Panama",
  "Papua New Guinea","Paraguay","Peru","Philippines","Poland","Portugal","Qatar","Romania",
  "Russia","Rwanda","Saint Kitts and Nevis","Saint Lucia","Saint Vincent and the Grenadines",
  "Samoa","San Marino","Sao Tome and Principe","Saudi Arabia","Senegal","Serbia","Seychelles",
  "Sierra Leone","Singapore","Slovakia","Slovenia","Solomon Islands","Somalia","South Africa",
  "South Korea","South Sudan","Spain","Sri Lanka","Sudan","Suriname","Sweden","Switzerland",
  "Syria","Taiwan","Tajikistan","Tanzania","Thailand","Timor-Leste","Togo","Tonga",
  "Trinidad and Tobago","Tunisia","Turkey","Turkmenistan","Tuvalu","Uganda","Ukraine",
  "United Arab Emirates","United Kingdom","United States","Uruguay","Uzbekistan","Vanuatu",
  "Vatican City","Venezuela","Vietnam","Yemen","Zambia","Zimbabwe",
] as const;

function OnboardingPage() {
  const navigate = useNavigate();
  const [stepIndex, setStepIndex] = useState(0);
  const [industry, setIndustry] = useState("");
  const [product, setProduct] = useState("");
  const [region, setRegion] = useState("");
  const [scale, setScale] = useState("");
  const [salesVolume, setSalesVolume] = useState("");
  const [busy, setBusy] = useState(false);

  const step: Step = STEPS[stepIndex] ?? "industry";
  const isLast = stepIndex === STEPS.length - 1;

  function canContinue(): boolean {
    if (step === "industry") return industry.trim().length > 0;
    if (step === "product") return product.trim().length > 0;
    if (step === "region") return region.length > 0;
    if (step === "scale") return scale.length > 0;
    if (step == "sales") {
      const n = Number(salesVolume);
      return Number.isFinite(n) && n > 0;
    }
    return false;
  }

    async function finish() {
    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          industry: industry.trim().slice(0, 120),
          product: product.trim().slice(0, 200),
          region,
          scale,
          sales_volume: Number(Number(salesVolume).toPrecision(2)),
        },
      });
      if (error) throw error;

      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (accessToken) {
        void fetch("/api/peers/resolve", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
          },
          body: JSON.stringify({ reason: "onboarding" }),
        }).catch(() => toast.warning("Profile saved, but competitor peers could not be refreshed."));
      }

      toast.success("Profile saved.");
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not save your answers.";
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

    function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!canContinue()) return;
    if (isLast) {
      void finish();
    } else {
      setStepIndex((i) => i + 1);
    }
  }
  
  const titles: Record<Step, string> = {
    industry: "What industry are you in?",
    product: "What is your main product or service?",
    region: "Where is your company based?",
    scale: "How large is your team?",
    sales: "Rough annual sales volume (HKD)? We only need this info to 2 significant figures, and you can always change your input if your business grows!"
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <p className="mb-10 text-2xl tracking-tight">Snitch</p>

      <div className="w-full max-w-sm rounded-2xl bg-card p-8">
        <p className="text-xs text-muted-foreground">
          Step {stepIndex + 1} of {STEPS.length}
        </p>
        <h1 className="mt-2 text-3xl">{titles[step]}</h1>

        <form onSubmit={onSubmit} className="mt-6 space-y-6">
          {step === "industry" && (
            <div className="space-y-2">
              <Label htmlFor="industry">Industry</Label>
              <Input
                id="industry"
                value={industry}
                onChange={(e) => setIndustry(e.target.value)}
                placeholder="e.g. SaaS, fintech, e-commerce"
                maxLength={120}
                autoFocus
                required
              />
            </div>
          )}

          {step === "product" && (
            <div className="space-y-2">
              <Label htmlFor="product">Main product or service</Label>
              <Input
                id="product"
                value={product}
                onChange={(e) => setProduct(e.target.value)}
                placeholder="e.g. AI writing assistant for marketers"
                maxLength={200}
                autoFocus
                required
              />
            </div>
          )}

          {step === "region" && (
            <div className="space-y-2">
              <Label htmlFor="region">Region</Label>
              <Select value={region} onValueChange={setRegion} required>
                <SelectTrigger id="region" className="w-full">
                  <SelectValue placeholder="Select a country" />
                </SelectTrigger>
                <SelectContent className="max-h-72">
                  {COUNTRIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

                    {step === "scale" && (
            <div className="space-y-2">
              <Label>Company scale</Label>
              <div className="space-y-2">
                {SCALE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setScale(opt.value)}
                    className={`flex w-full items-center rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                      scale === opt.value
                        ? "border-foreground bg-foreground/5"
                        : "border-input hover:bg-accent"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === "sales" && (
            <div className="space-y-2">
              <Label htmlFor="sales">Annual sales volume (HKD)</Label>
              <Input
                id="sales"
                type="number"
                inputMode="decimal"
                value={salesVolume}
                onChange={(e) => setSalesVolume(e.target.value)}
                placeholder="e.g. 1200000"
                autoFocus
                required
              />
              <p className="text-xs text-muted-foreground">
                Two significant figures is enough. We match competitors within ±50% of this band for pricing charts.
              </p>
            </div>
          )}

          <div className="flex gap-3">
            {stepIndex > 0 && (
              <Button
                type="button"
                variant="secondary"
                size="pill"
                className="flex-1"
                onClick={() => setStepIndex((i) => i - 1)}
                disabled={busy}
              >
                Back
              </Button>
            )}
            <Button
              type="submit"
              size="pill"
              className="flex-1"
              disabled={!canContinue() || busy}
            >
              {busy ? "Saving" : isLast ? "Finish" : "Continue"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
