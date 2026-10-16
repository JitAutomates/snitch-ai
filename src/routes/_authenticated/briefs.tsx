import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  LayoutDashboard,
  Radar,
  FileText,
  CreditCard,
  Settings,
  Pin,
  Sparkles,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/briefs")({
  head: () => ({
    meta: [
      { title: "Daily Brief | Snitch" },
      { name: "description", content: "Generate today's brief and review past briefs." },
      { property: "og:title", content: "Daily Brief | Snitch" },
      { property: "og:description", content: "Generate today's brief and review past briefs." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Briefs,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/monitors", label: "Monitors", icon: Radar },
  { to: "/briefs", label: "Briefs", icon: FileText },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

type Brief = { date: string; text: string[]; pinned?: boolean };

function dayKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return dayKey(d);
}

const TODAY_BRIEF = [
  "Orbit AI cut its entry tier by 12% overnight, now undercutting most Hong Kong SaaS tools in your segment. Nexus Soft held prices but added a free tier aimed at small teams.",
  "On the news side, Cyberport announced a new round of incubation grants, and two regional trade outlets reported rising churn among SME customers in Hong Kong and Shenzhen.",
  "To do: 1. Review whether your entry pricing still holds against Orbit AI. 2. Check eligibility and deadline for the Cyberport grant. 3. Reach out to your three largest SME accounts this week to get ahead of churn.",
];

const INITIAL_HISTORY: Brief[] = [
  {
    date: daysAgo(3),
    pinned: true,
    text: [
      "Aether Labs raised list prices by 8% and moved annual billing to the default. Their support forum shows early complaints from small customers.",
      "To do: 1. Prepare a short switching offer for Aether Labs customers. 2. Update your comparison page.",
    ],
  },
  {
    date: daysAgo(17),
    text: [
      "A Series A in an adjacent category (logistics analytics) may pull attention from local investors over the next quarter.",
      "To do: 1. Tighten your investor update. 2. Note the lead investor for future outreach.",
    ],
  },
  {
    date: daysAgo(41),
    text: [
      "Nexus Soft published a public roadmap including features overlapping yours. Pricing unchanged across all three tracked competitors.",
      "To do: 1. Decide which overlapping feature to ship first. 2. Brief your sales lead on positioning.",
    ],
  },
];

function Briefs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const todayKey = dayKey(new Date());
  const [history, setHistory] = useState<Brief[]>(INITIAL_HISTORY);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<string | null>(INITIAL_HISTORY[0].date);
  const today = history.find((b) => b.date === todayKey);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut({ scope: "global" });
    navigate({ to: "/auth", replace: true });
  }

  function generate() {
    setLoading(true);
    setTimeout(() => {
      setHistory((h) => [{ date: todayKey, text: TODAY_BRIEF }, ...h.filter((b) => b.date !== todayKey)]);
      setSelected(todayKey);
      setLoading(false);
    }, 1200);
  }

  // Two months: previous and current
  const months = useMemo(() => {
    const now = new Date();
    return [-1, 0].map((offset) => {
      const first = new Date(now.getFullYear(), now.getMonth() + offset, 1);
      const count = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
      const days = Array.from({ length: count }, (_, i) =>
        new Date(first.getFullYear(), first.getMonth(), i + 1),
      );
      return { first, lead: first.getDay(), days };
    });
  }, []);

  const byDate = new Map(history.map((b) => [b.date, b]));
  const selectedBrief = selected ? byDate.get(selected) : undefined;

  return (
    <div className="flex min-h-screen flex-col bg-background">
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
                // Billing and Settings routes are not built yet.
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
          <div className="mx-auto max-w-3xl space-y-10">
            <section>
              <h1 className="mb-4 text-3xl tracking-tight md:text-4xl">Daily Brief</h1>
              <div className="flex min-h-[280px] rounded-2xl border border-border/60 bg-card">
                {today ? (
                  <div className="w-full space-y-4 p-6 md:p-8">
                    {today.text.map((p, i) => (
                      <p key={i} className="leading-relaxed">{p}</p>
                    ))}
                    <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
                      <span>Sample brief. AI estimate from public sources: placeholder data.</span>
                      <button onClick={generate} disabled={loading} className="hover:text-foreground">
                        {loading ? "Regenerating..." : "Regenerate"}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex w-full items-center justify-center">
                    <button
                      onClick={generate}
                      disabled={loading}
                      aria-label="Generate today's brief"
                      className="flex h-16 w-16 items-center justify-center rounded-full border border-border bg-background transition-colors hover:bg-accent disabled:opacity-60"
                    >
                      {loading ? (
                        <Loader2 className="h-6 w-6 animate-spin" />
                      ) : (
                        <Sparkles className="h-6 w-6" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </section>

            <section>
              <h2 className="mb-4 text-lg tracking-tight">Unfinished Business</h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {months.map(({ first, lead, days }) => (
                  <div key={first.toISOString()} className="rounded-2xl border border-border/60 bg-card p-4">
                    <p className="mb-3 text-sm">
                      {first.toLocaleDateString("en-GB", { month: "long", year: "numeric" })}
                    </p>
                    <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                      {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
                        <span key={i}>{d}</span>
                      ))}
                      {Array.from({ length: lead }, (_, i) => (
                        <span key={`l${i}`} />
                      ))}
                      {days.map((d) => {
                        const k = dayKey(d);
                        const b = byDate.get(k);
                        return (
                          <button
                            key={k}
                            onClick={() => setSelected(k)}
                            className={cn(
                              "relative flex aspect-square items-center justify-center rounded-md transition-colors hover:bg-accent",
                              b && "text-foreground underline underline-offset-4",
                              k === todayKey && "border border-border",
                              selected === k && "bg-accent text-foreground",
                            )}
                          >
                            {d.getDate()}
                            {b?.pinned && <Pin className="absolute right-0.5 top-0.5 h-2.5 w-2.5" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <ul className="mt-4 space-y-2">
                {[...history].sort((a, b) => b.date.localeCompare(a.date)).map((b) => (
                  <li key={b.date}>
                    <button
                      onClick={() => setSelected(b.date)}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-sm text-muted-foreground hover:bg-accent hover:text-foreground",
                        selected === b.date && "bg-accent text-foreground",
                      )}
                    >
                      {b.pinned && <Pin className="h-3.5 w-3.5" aria-label="Pinned" />}
                      <span>{new Date(b.date + "T00:00").toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}</span>
                      <span className="truncate">{b.text[0]}</span>
                    </button>
                  </li>
                ))}
              </ul>

              <div className="mt-4 rounded-2xl border border-border/60 bg-card p-5">
                {selectedBrief ? (
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-xs text-muted-foreground">
                      {selectedBrief.pinned && <Pin className="h-3.5 w-3.5" />}
                      {new Date(selectedBrief.date + "T00:00").toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })}
                    </p>
                    {selectedBrief.text.map((p, i) => (
                      <p key={i} className="text-sm leading-relaxed">{p}</p>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No brief for this day.</p>
                )}
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
