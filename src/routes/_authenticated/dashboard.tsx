import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useState } from "react";
import {
  LayoutDashboard,
  Radar,
  FileText,
  CreditCard,
  Settings,
  Pin,
  Bell,
  Sparkles,
  Loader2,
} from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { usePlan } from "@/hooks/use-plan";
import { planDisplayAccess } from "@/lib/plan";
import { PlanBlur } from "@/components/plan-blur";
import { BriefRow, briefDayLabel, type DailyBrief } from "@/lib/daily-briefs";
import { SevereBadge } from "@/components/severe-badge";
import { isSevereActive, type NotableUpdate } from "@/lib/severe";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Snitch" },
      { name: "description", content: "Your Snitch intelligence dashboard." },
      { property: "og:title", content: "Dashboard | Snitch" },
      { property: "og:description", content: "Your Snitch intelligence dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});


const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/monitors", label: "Monitors", icon: Radar },
  { to: "/briefs", label: "Briefs", icon: FileText },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { premium, loading: planLoading } = usePlan();
  const access = planDisplayAccess(premium, planLoading);
  const [pinned, setPinned] = useState<DailyBrief[]>([]);
  const [loadingPinned, setLoadingPinned] = useState(true);
  const [pinnedError, setPinnedError] = useState<string | null>(null);

  const loadPinned = useCallback(async () => {
    setLoadingPinned(true);
    setPinnedError(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in to load pinned briefs.");
      const { data, error } = await (supabase as SupabaseClient)
        .from("briefs")
        .select("id, user_id, day, title, body, action_plan, highlights, pinned, model, created_at")
        .eq("user_id", auth.user.id)
        .eq("pinned", true)
        .order("day", { ascending: false })
        .limit(20);
      if (error) throw new Error("Could not load pinned briefs.");
      setPinned(z.array(BriefRow).parse(data ?? []));
    } catch (e) {
      setPinnedError(e instanceof Error ? e.message : "Could not load pinned briefs.");
      setPinned([]);
    } finally {
      setLoadingPinned(false);
    }
}, []);
    const [notables, setNotables] = useState<NotableUpdate[]>([]);
  const [loadingNotables, setLoadingNotables] = useState(true);
  const [notablesError, setNotablesError] = useState<string | null>(null);

  const loadNotables = useCallback(async () => {
    setLoadingNotables(true);
    setNotablesError(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in to load notable updates.");
      const uid = auth.user.id;
      const nowIso = new Date().toISOString();
      const db = supabase as SupabaseClient;

      const [newsRes, actRes, priceRes] = await Promise.all([
        db
          .from("niche_news")
          .select("id, headline, body, day, severe, severe_until, source_urls")
          .eq("user_id", uid)
          .eq("severe", true)
          .gt("severe_until", nowIso)
          .order("day", { ascending: false })
          .limit(15),
        db
          .from("competitor_activity")
          .select(
            "id, headline, summary, category, competitor_name, created_at, published_at, severe, severe_until, source_url",
          )
          .eq("user_id", uid)
          .eq("severe", true)
          .gt("severe_until", nowIso)
          .order("created_at", { ascending: false })
          .limit(15),
        db
          .from("peer_prices")
          .select(
            "id, competitor_name, amount, amount_display, currency, plan_label, observed_at, severe, severe_until, source_url, notes",
          )
          .eq("user_id", uid)
          .eq("severe", true)
          .gt("severe_until", nowIso)
          .order("observed_at", { ascending: false })
          .limit(15),
      ]);

      if (newsRes.error || actRes.error || priceRes.error) {
        throw new Error("Could not load notable updates. Confirm severe columns exist.");
      }

      const items: NotableUpdate[] = [];

      for (const row of newsRes.data ?? []) {
        const r = row as {
          id: string;
          headline: string;
          body: string;
          day: string;
          severe: boolean;
          severe_until: string | null;
        };
        if (!isSevereActive(r.severe, r.severe_until)) continue;
        items.push({
          id: `news-${r.id}`,
          kind: "news",
          title: r.headline,
          detail: r.body,
          whenIso: `${r.day}T12:00:00.000Z`,
          href: "/monitors",
        });
      }

      for (const row of actRes.data ?? []) {
        const r = row as {
          id: string;
          headline: string;
          summary: string;
          competitor_name: string;
          created_at: string;
          published_at: string | null;
          severe: boolean;
          severe_until: string | null;
          source_url: string;
        };
        if (!isSevereActive(r.severe, r.severe_until)) continue;
        items.push({
          id: `activity-${r.id}`,
          kind: "activity",
          title: r.headline,
          detail: `${r.competitor_name}: ${r.summary}`,
          whenIso: r.published_at ?? r.created_at,
          href: "/competitor-monitor",
          sourceUrl: r.source_url,
        });
      }

      for (const row of priceRes.data ?? []) {
        const r = row as {
          id: string;
          competitor_name: string;
          amount: number | null;
          amount_display: string | null;
          currency: string;
          plan_label: string;
          observed_at: string;
          severe: boolean;
          severe_until: string | null;
          source_url: string | null;
          notes: string | null;
        };
        if (!isSevereActive(r.severe, r.severe_until)) continue;
        const priceLabel =
          r.amount_display ??
          (r.amount != null ? `${r.currency} ${r.amount}` : "price change");
        items.push({
          id: `pricing-${r.id}`,
          kind: "pricing",
          title: `${r.competitor_name} — ${r.plan_label}`,
          detail: `Significant pricing move: ${priceLabel}. ${r.notes ?? ""}`.trim(),
          whenIso: r.observed_at,
          href: "/monitors",
          sourceUrl: r.source_url,
        });
      }

      items.sort((a, b) => b.whenIso.localeCompare(a.whenIso));
      setNotables(items.slice(0, 20));
    } catch (e) {
      setNotablesError(e instanceof Error ? e.message : "Could not load notables.");
      setNotables([]);
    } finally {
      setLoadingNotables(false);
    }
  }, []);

  useEffect(() => {
    void loadNotables();
  }, [loadNotables]);

  useEffect(() => {
    void loadPinned();
  }, [loadPinned]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut({ scope: "global" });
    navigate({ to: "/auth", replace: true });
  }

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
                to={to as never}
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground"
                activeOptions={{ exact: to === "/dashboard" }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 px-5 py-8 md:px-8">
          <div className="mx-auto max-w-3xl space-y-10">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl tracking-tight md:text-4xl">Dashboard</h1>
                <p className="mt-1 text-muted-foreground">
                  Pinned actions and notable changes from your monitors.
                </p>
              </div>
              <Button asChild size="pill">
                <Link to="/briefs">
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate daily brief
                </Link>
              </Button>
            </div>

            <section>
              <div className="mb-4 flex items-center gap-2">
                <Pin className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-lg tracking-tight">Pinned briefs</h2>
              </div>
              <PlanBlur
                locked={access.pinnedBriefsBlurred}
                loading={planLoading}
                label="pinned briefs"
              >
                {loadingPinned ? (
                  <p className="flex items-center gap-2 rounded-2xl bg-card p-6 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading pinned briefs…
                  </p>
                ) : pinnedError ? (
                  <div className="space-y-3 rounded-2xl bg-card p-6">
                    <p role="alert" className="text-sm text-destructive">
                      {pinnedError}
                    </p>
                    <Button variant="secondary" size="sm" onClick={() => void loadPinned()}>
                      Retry
                    </Button>
                  </div>
                ) : pinned.length === 0 ? (
                  <p className="rounded-2xl bg-card p-6 text-sm text-muted-foreground">
                    No pinned briefs yet. Open a daily brief and pin it when it needs follow-up.
                  </p>
                ) : (
                  <ul className="space-y-3">
                    {pinned.map((b) => (
                      <li key={b.id}>
                        <Link
                          to="/briefs"
                          search={{ day: b.day }}
                          className="block rounded-2xl border border-border/60 bg-card p-5 transition-colors hover:bg-accent/40"
                        >
                          <div className="flex flex-wrap items-baseline justify-between gap-2">
                            <h3 className="text-base text-foreground">{b.title}</h3>
                            <span className="text-xs text-muted-foreground">
                              {briefDayLabel(b.day)}
                            </span>
                          </div>
                          <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">
                            {b.body}
                          </p>
                          <p className="mt-3 flex items-center gap-1 text-xs text-muted-foreground">
                            <Pin className="h-3 w-3 fill-current" />
                            Pinned · open this day
                          </p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </PlanBlur>
            </section>

                        <section>
              <div className="mb-4 flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-lg tracking-tight">Notable updates</h2>
              </div>
              {loadingNotables ? (
                <p className="flex items-center gap-2 rounded-2xl bg-card p-6 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading notable updates…
                </p>
              ) : notablesError ? (
                <div className="space-y-3 rounded-2xl bg-card p-6">
                  <p role="alert" className="text-sm text-destructive">
                    {notablesError}
                  </p>
                  <Button variant="secondary" size="sm" onClick={() => void loadNotables()}>
                    Retry
                  </Button>
                </div>
              ) : notables.length === 0 ? (
                <p className="rounded-2xl bg-card p-6 text-sm text-muted-foreground">
                  No severe updates in the last week. High-impact news, competitor moves, and
                  large pricing changes will appear here for 7 days.
                </p>
              ) : (
                <ul className="space-y-3">
                  {notables.map((n) => (
                    <li key={n.id}>
                      <Link
                        to={n.href as never}
                        className="block rounded-2xl border border-purple-500/30 bg-card p-5 transition-colors hover:bg-accent/40"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="flex min-w-0 items-start gap-2">
                            <SevereBadge className="mt-0.5" />
                            <h3 className="text-base text-foreground">{n.title}</h3>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {new Date(n.whenIso).toLocaleString("en-HK", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </span>
                        </div>
                        <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
                          {n.detail}
                        </p>
                        <p className="mt-3 text-xs uppercase tracking-wide text-purple-500/90">
                          {n.kind} · severe (7 days)
                        </p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
