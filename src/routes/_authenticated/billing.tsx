import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Radar,
  FileText,
  CreditCard,
  Settings,
  Check,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/billing")({
  head: () => ({
    meta: [
      { title: "Billing | Snitch" },
      {
        name: "description",
        content: "Free and Premium plans for Hong Kong startup founders.",
      },
      { property: "og:title", content: "Billing | Snitch" },
      { property: "og:description", content: "Free and Premium plans for Hong Kong startup founders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Billing,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/monitors", label: "Monitors", icon: Radar },
  { to: "/briefs", label: "Briefs", icon: FileText },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const STORAGE_KEY = "snitch_premium";

type PremiumState = {
  active: boolean;
  /** ISO date of next charge */
  nextPaymentAt: string;
};

const FREE_FEATURES = [
  "1 active monitor",
  "Weekly brief only",
  "7-day brief history",
  "Basic competitor alerts",
  "HK niche news (limited)",
];

const PREMIUM_FEATURES = [
  "3 active monitors",
  "Daily briefs",
  "2-month brief history",
  "Priority competitor alerts",
  "Full peer pricing band (±50%)",
  "Pinned briefs & unfinished business",
  "Email delivery of daily brief",
];

function loadPremium(): PremiumState | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PremiumState;
    if (!parsed?.active || !parsed.nextPaymentAt) return null;
    return parsed;
  } catch {
    return null;
  }
}

function savePremium(state: PremiumState | null) {
  if (!state) localStorage.removeItem(STORAGE_KEY);
  else localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function formatCountdown(targetIso: string, now: number): string {
  const ms = new Date(targetIso).getTime() - now;
  if (ms <= 0) return "Renewing soon";
  const totalSec = Math.floor(ms / 1000);
  const d = Math.floor(totalSec / 86400);
  const h = Math.floor((totalSec % 86400) / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  if (d > 0) return `${d}d ${h}h ${m}m`;
  return `${h}h ${m}m ${s}s`;
}

function Billing() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [premium, setPremium] = useState<PremiumState | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    setPremium(loadPremium());
  }, []);

  useEffect(() => {
    if (!premium?.active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [premium?.active]);

  const countdown = useMemo(() => {
    if (!premium?.nextPaymentAt) return "";
    return formatCountdown(premium.nextPaymentAt, now);
  }, [premium?.nextPaymentAt, now]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut({ scope: "global" });
    navigate({ to: "/auth", replace: true });
  }

  function cancelSubscription() {
    const ok = window.confirm(
      "Cancel Premium? Access continues until the end of the current period. This is a local demo until payments are connected.",
    );
    if (!ok) return;
    savePremium(null);
    setPremium(null);
    toast.success("Subscription cancelled (demo).");
  }

  function requestRefund() {
    toast.message("Refund request", {
      description:
        "Demo only. Real refunds will follow the refund policy after Stripe is connected.",
    });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <style>{`
        @keyframes snitch-sparkle {
          0%, 100% { opacity: 0.35; transform: scale(1) rotate(0deg); }
          50% { opacity: 1; transform: scale(1.15) rotate(12deg); }
        }
        .snitch-sparkle {
          animation: snitch-sparkle 2.4s ease-in-out infinite;
        }
        .snitch-sparkle-delay {
          animation-delay: 0.8s;
        }
        .snitch-gold-glow {
          box-shadow: 0 0 0 1px rgba(212, 175, 55, 0.55), 0 0 28px rgba(212, 175, 55, 0.12);
        }
      `}</style>

      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-5">
          <Link to="/" className="text-xl tracking-tight">
            Snitch
          </Link>
          <Button variant="secondary" size="sm" onClick={signOut}>
            Sign out
          </Button>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="hidden w-16 shrink-0 border-r md:flex md:w-52 md:flex-col">
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to as never}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 px-5 py-8 md:px-8">
          <div className="mx-auto max-w-4xl space-y-8">
            <div>
              <h1 className="text-3xl tracking-tight md:text-4xl">Billing</h1>
              <p className="mt-1 text-muted-foreground">
                Simple plans for Hong Kong startup founders.
              </p>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Free — plain, blends with page */}
              <div className="flex flex-col rounded-2xl border border-transparent bg-background p-6 md:p-8">
                <p className="text-sm text-muted-foreground">Free</p>
                <p className="mt-2 text-3xl tracking-tight">HK$0</p>
                <p className="mt-1 text-sm text-muted-foreground">Forever</p>
                <ul className="mt-8 flex-1 space-y-3">
                  {FREE_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-muted-foreground">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 opacity-50" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-8 text-center text-xs text-muted-foreground">
                  {premium?.active ? "Your account is on Premium" : "Current plan"}
                </p>
              </div>

              {/* Premium — gold + sparkle */}
              <div
                className={cn(
                  "relative flex flex-col overflow-hidden rounded-2xl border border-[#d4af37]/70 bg-card p-6 md:p-8 snitch-gold-glow",
                )}
              >
                <Sparkles
                  className="pointer-events-none absolute right-5 top-5 h-5 w-5 text-[#d4af37] snitch-sparkle"
                  aria-hidden
                />
                <Sparkles
                  className="pointer-events-none absolute bottom-8 left-6 h-4 w-4 text-[#d4af37]/80 snitch-sparkle snitch-sparkle-delay"
                  aria-hidden
                />

                <div className="flex items-center gap-2">
                  <p className="text-sm text-[#d4af37]">Premium</p>
                  <span className="rounded-full border border-[#d4af37]/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#d4af37]">
                    Recommended
                  </span>
                </div>
                <p className="mt-2 text-3xl tracking-tight">
                  HK$80
                  <span className="text-base font-normal text-muted-foreground"> / month</span>
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  or HK$700 / year (save ~2 months)
                </p>

                <ul className="mt-8 flex-1 space-y-3">
                  {PREMIUM_FEATURES.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <Check className="mt-0.5 h-4 w-4 shrink-0 text-[#d4af37]" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-8 space-y-3">
                  {premium?.active ? (
                    <>
                      <div className="rounded-xl border border-[#d4af37]/30 bg-background/50 px-4 py-3 text-center">
                        <p className="text-xs text-muted-foreground">Next auto-payment in</p>
                        <p className="mt-1 text-lg tracking-tight text-[#d4af37]">{countdown}</p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {new Date(premium.nextPaymentAt).toLocaleString("en-HK", {
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </p>
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row">
                        <Button
                          type="button"
                          variant="secondary"
                          size="pill"
                          className="flex-1"
                          onClick={requestRefund}
                        >
                          Request refund
                        </Button>
                        <Button
                          type="button"
                          variant="secondary"
                          size="pill"
                          className="flex-1"
                          onClick={cancelSubscription}
                        >
                          Cancel subscription
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button asChild size="pill" className="w-full">
                      <Link to={"/payment" as never}>Upgrade to Premium</Link>
                    </Button>
                  )}
                </div>
              </div>
            </div>

            <p className="text-center text-xs text-muted-foreground/80">
              <Link to={"/" as never} className="underline-offset-4 hover:underline">
                Terms of service
              </Link>
              <span className="mx-2">·</span>
              <Link to={"/" as never} className="underline-offset-4 hover:underline">
                Refund policy
              </Link>
              <span className="mx-2">·</span>
              <Link to={"/" as never} className="underline-offset-4 hover:underline">
                Subscription policy
              </Link>
            </p>
            <p className="text-center text-[11px] text-muted-foreground/60">
              Payments are not live yet. Premium status is stored locally for UI testing.
            </p>
          </div>
        </main>
      </div>
    </div>
  );
}
