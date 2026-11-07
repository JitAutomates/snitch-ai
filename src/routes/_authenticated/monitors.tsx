import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Radar,
  FileText,
  CreditCard,
  Settings,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { buildPeerPriceSeries, PriceObservations, type PriceObservation, publicCompanyUrl, summarizePeerPricing } from "@/lib/peer-pricing";

export const Route = createFileRoute("/_authenticated/monitors")({
  head: () => ({
    meta: [
      { title: "Monitors | Snitch" },
      {
        name: "description",
        content: "Niche news, peer pricing, and competitor alerts for HK founders.",
      },
      { property: "og:title", content: "Monitors | Snitch" },
      { property: "og:description", content: "Niche news, peer pricing, and competitor alerts for HK founders." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Monitors,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/monitors", label: "Monitors", icon: Radar },
  { to: "/briefs", label: "Briefs", icon: FileText },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

// ---- Niche news (from public.niche_news) ----
type NewsArticle = { headline: string; body: string; tag: string };
type NewsDay = { dateKey: string; dateLabel: string; articles: NewsArticle[] };

// ---- Competitor alerts (carousel) ----
type CompetitorAlert = {
  id: string;
  title: string;
  detail: string;
  severity: "high" | "medium";
};

function Monitors() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dayOffset, setDayOffset] = useState(0); // 0 = today, 49 = 49 days ago
  const [alertIndex, setAlertIndex] = useState(0);
  type PeerRow = {
    id: string;
    name: string;
    company_url: string | null;
    scale: string | null;
    sales_estimate: string | null;
    rank: number | null;
    resolved_at: string | null;
  };

  const [peers, setPeers] = useState<PeerRow[]>([]);
  const [peersLoading, setPeersLoading] = useState(true);
  const [peersError, setPeersError] = useState<string | null>(null);

  const [newsDays, setNewsDays] = useState<NewsDay[]>([]);
  const [newsLoading, setNewsLoading] = useState(true);
  const [prices, setPrices] = useState<PriceObservation[]>([]);
  const [pricesLoading, setPricesLoading] = useState(true);
  const [pricesError, setPricesError] = useState<string | null>(null);
  const [runStatus, setRunStatus] = useState<string | null>(null);
  const priceSeries = useMemo(() => buildPeerPriceSeries(prices), [prices]);
  const priceCurrencies = [...new Set(priceSeries.lines.map(line => line.currency))];
  const pricingSummary = useMemo(() => summarizePeerPricing(prices, runStatus), [prices, runStatus]);

  const loadPrices = useCallback(async () => {
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in to load peer pricing.");
      const since = new Date(Date.now() - 12 * 7 * 24 * 60 * 60 * 1000).toISOString();
      const { data, error } = await (supabase as SupabaseClient).from("peer_prices")
        .select("competitor_id, competitor_name, currency, amount, observed_at, source_url, plan_label")
        .eq("user_id", auth.user.id).gte("observed_at", since)
        .order("observed_at", { ascending: false }).limit(5000);
      if (error) throw new Error(error.message);
      const parsed = PriceObservations.safeParse(data ?? []);
      if (!parsed.success) throw new Error("Invalid peer pricing data.");
      setPrices(parsed.data);
      setPricesError(null);
      // Latest collection run; the table may not exist yet, so ignore errors.
      const { data: runData } = await (supabase as SupabaseClient).from("peer_price_runs")
        .select("status, started_at").eq("user_id", auth.user.id)
        .order("started_at", { ascending: false }).limit(1);
      const run = z.array(z.object({ status: z.string(), started_at: z.string() })).safeParse(runData ?? []);
      const latest = run.success ? run.data[0] : undefined;
      const fresh = latest ? Date.now() - new Date(latest.started_at).getTime() < 15 * 60 * 1000 : false;
      setRunStatus(latest?.status === "running" && fresh ? "running" : latest?.status ?? null);
    } catch (error) {
      setPricesError(error instanceof Error ? error.message : "Could not load peer pricing.");
    } finally {
      setPricesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPrices();
  }, [loadPrices]);

  // While a collection run is in progress, re-check until it finishes.
  useEffect(() => {
    if (runStatus !== "running") return;
    const t = setInterval(() => {
      void loadPrices();
    }, 10000);
    return () => clearInterval(t);
  }, [runStatus, loadPrices]);

  useEffect(() => {
    let cancelled = false;
    async function loadPeers() {
      setPeersLoading(true);
      setPeersError(null);
      // Preserve the existing authenticated client while the managed schema lacks peer table types.
      const { data, error } = await (supabase as SupabaseClient)
        .from("competitors")
        .select("id, name, company_url, scale, sales_estimate, rank, resolved_at")
        .order("rank", { ascending: true });
      if (cancelled) return;
      if (error) {
        setPeersError(error.message);
        setPeers([]);
      } else {
        const parsed = z.array(z.object({
          id: z.string(), name: z.string(), company_url: z.string().nullable(),
          scale: z.string().nullable(), sales_estimate: z.string().nullable(),
          rank: z.number().nullable(), resolved_at: z.string().nullable(),
        })).safeParse(data ?? []);
        if (parsed.success) setPeers(parsed.data);
        else { setPeers([]); setPeersError("Invalid competitor data"); }
      }
      setPeersLoading(false);
    }
    void loadPeers();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadNews() {
      setNewsLoading(true);
      // Safe cast: generated Database types may not include niche_news yet.
      const { data, error } = await (supabase as SupabaseClient)
        .from("niche_news")
        .select("day, headline, body, tag")
        .order("day", { ascending: false })
        .limit(150);
      if (cancelled) return;
      if (error) {
        setNewsDays([]);
      } else {
        const parsed = z.array(z.object({
          day: z.string(), headline: z.string(), body: z.string(), tag: z.string(),
        })).safeParse(data ?? []);
        if (!parsed.success) {
          setNewsDays([]);
        } else {
          const byDay = new Map<string, NewsArticle[]>();
          for (const row of parsed.data) {
            const list = byDay.get(row.day) ?? [];
            list.push({ headline: row.headline, body: row.body, tag: row.tag });
            byDay.set(row.day, list);
          }
          const days: NewsDay[] = [...byDay.entries()]
            .sort((a, b) => (a[0] < b[0] ? 1 : -1))
            .map(([dateKey, articles]) => ({
              dateKey,
              // Noon UTC avoids timezone shifting the calendar day.
              dateLabel: new Date(`${dateKey}T12:00:00Z`).toLocaleDateString("en-HK", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              }),
              articles,
            }));
          setNewsDays(days);
        }
      }
      setNewsLoading(false);
    }
    void loadNews();
    return () => {
      cancelled = true;
    };
  }, []);

  const maxOffset = Math.max(0, newsDays.length - 1);
  const clampedOffset = Math.min(dayOffset, maxOffset);
  const issue = newsDays[clampedOffset];

   useEffect(() => {
    if (peers.length === 0) return;
    const t = setInterval(() => {
      setAlertIndex((i) => (i + 1) % peers.length);
    }, 5000);
    return () => clearInterval(t);
  }, [peers.length]);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut({ scope: "global" });
    navigate({ to: "/auth", replace: true });
  }

   const activePeer = peers.length > 0 ? peers[alertIndex % peers.length] ?? null : null;

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
          <div className="mx-auto max-w-4xl space-y-12">
            <div>
              <h1 className="text-3xl tracking-tight md:text-4xl">Monitors</h1>
              <p className="mt-1 text-muted-foreground">
                Niche news, peer pricing, and competitor alerts for HK founders.
              </p>
            </div>

            {/* Competitor alerts carousel */}
            <section>
              <h2 className="mb-3 text-lg tracking-tight">Competitor peers</h2>
              {peersLoading ? (
                <p className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
                  Loading peers…
                </p>
              ) : peersError ? (
                <p className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-destructive">
                  Could not load peers: {peersError}
                </p>
              ) : !activePeer ? (
                <p className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
                  No peers yet. Finish onboarding so Exa can resolve up to 10 competitors.
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    if (!premium) {
                      navigate({ to: "/billing" as never });
                      return;
                    }
  navigate({ to: "/competitor-monitor" as never });
}}
                  className="w-full rounded-2xl border border-amber-500/30 bg-card p-5 text-left transition-colors hover:border-amber-500/50"
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-base">{activePeer.name}</h3>
                        <span className="text-xs uppercase tracking-wide text-muted-foreground">
                          #{activePeer.rank ?? alertIndex + 1}
                        </span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">
                        {[activePeer.scale, activePeer.sales_estimate]
                          .filter(Boolean)
                          .join(" · ") || "Peer in your band"}
                        {activePeer.company_url ? ` · ${activePeer.company_url}` : ""}
                      </p>
                      <p className="mt-3 text-xs text-muted-foreground">
                        Tap for detail · {alertIndex + 1}/{peers.length}
                        {activePeer.resolved_at
                          ? ` · resolved ${new Date(activePeer.resolved_at).toLocaleDateString("en-HK")}`
                          : ""}
                      </p>
                    </div>
                  </div>
                </button>
              )}
            </section>

            {/* Newspaper niche news */}
            <section>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                <h2 className="text-lg tracking-tight">Niche news</h2>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={clampedOffset >= maxOffset}
                    onClick={() => setDayOffset((d) => Math.min(maxOffset, d + 1))}
                    aria-label="Older issue"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[9rem] text-center text-xs text-muted-foreground">
                    {clampedOffset === 0 ? "Latest" : `${clampedOffset}d back`}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={clampedOffset <= 0}
                    onClick={() => setDayOffset((d) => Math.max(0, d - 1))}
                    aria-label="Newer issue"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {newsLoading ? (
                <p className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
                  Loading niche news…
                </p>
              ) : !issue ? (
                <p className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
                  No niche news yet. It appears after onboarding or the daily job.
                </p>
              ) : (
                <article
                  className="rounded-sm border border-neutral-700 bg-[#111] px-6 py-8 shadow-inner md:px-10"
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    if (touch) (e.currentTarget as HTMLElement).dataset["tx"] = String(touch.clientX);
                  }}
                  onTouchEnd={(e) => {
                    const start = Number((e.currentTarget as HTMLElement).dataset["tx"] ?? 0);
                    const touch = e.changedTouches[0];
                    if (!touch) return;
                    const end = touch.clientX;
                    const dx = end - start;
                    if (dx < -40) setDayOffset((d) => Math.min(maxOffset, d + 1)); // swipe left → older
                    if (dx > 40) setDayOffset((d) => Math.max(0, d - 1));
                  }}
                >
                  <header className="border-b border-neutral-600 pb-4 text-center">
                    <p className="text-[10px] uppercase tracking-[0.25em] text-neutral-400">
                      The Snitch · Hong Kong edition
                    </p>
                    <h3 className="mt-2 font-serif text-2xl tracking-tight text-neutral-100 md:text-3xl">
                      {issue.dateLabel}
                    </h3>
                  </header>
                  <div className="mt-6 space-y-8">
                    {issue.articles.map((a, idx) => (
                      <div
                        key={`${issue.dateKey}-${idx}`}
                        className={idx > 0 ? "border-t border-neutral-700 pt-6" : ""}
                      >
                        <p className="text-[10px] uppercase tracking-widest text-neutral-500">{a.tag}</p>
                        <h4 className="mt-1 font-serif text-xl leading-snug text-neutral-100 md:text-2xl">
                          {a.headline}
                        </h4>
                        <p className="mt-3 font-serif text-sm leading-relaxed text-neutral-400 md:text-base">
                          {a.body}
                        </p>
                      </div>
                    ))}
                  </div>
                  <p className="mt-8 text-center text-[10px] text-neutral-600">
                    Swipe left for older issues
                  </p>
                </article>
              )}
            </section>

            {/* Pricing line chart */}
            <section>
              <h2 className="mb-1 text-lg tracking-tight">Peer pricing</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Entry/list prices from competitor websites (peers only). Not live checkout quotes.
              </p>
              {pricesLoading ? (
                <p className="text-sm text-muted-foreground">Loading peer pricing…</p>
              ) : pricesError ? (
                <p className="text-sm text-destructive">Could not load peer pricing: {pricesError}</p>
              ) : pricingSummary.state === "fetching" ? (
                <p className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
                  Fetching pricing information…
                </p>
              ) : pricingSummary.state === "empty" ? (
                <p className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
                  No pricing information yet. Will appear after monthly refresh.
                </p>
              ) : pricingSummary.state === "all-null" ? (
                <p className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
                  Pricing information is not public for all competitors listed. It is important that Snitch AI only searches for public information in correspondence with ethical computer use ordinances.
                </p>
              ) : (
              <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-6">
                {priceCurrencies.map(currency => (
                <div key={currency} className="mb-4 h-72 w-full" aria-label={`Peer pricing in ${currency}`}>
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={priceSeries.points} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" stroke="var(--muted-foreground)" fontSize={12} tickFormatter={(day: string) => new Date(`${day}T12:00:00Z`).toLocaleDateString("en-HK", { month: "short", day: "numeric", timeZone: "UTC" })} />
                      <YAxis stroke="var(--muted-foreground)" fontSize={12} />
                      <Tooltip
                        contentStyle={{
                          background: "var(--card)",
                          border: "1px solid var(--border)",
                          borderRadius: 8,
                        }}
                        formatter={(value: number) => [`${currency} ${value.toLocaleString("en-HK")}`]}
                      />
                      <Legend />
                      {priceSeries.lines.filter(line => line.currency === currency).map((l, index) => (
                        <Line
                          key={l.key}
                          type="monotone"
                          dataKey={(point: Record<string, number | string>) => point[l.key]}
                          name={l.name}
                          stroke={`var(--chart-${index % 5 + 1})`}
                          strokeDasharray={index >= 5 ? "5 3" : undefined}
                          strokeWidth={2}
                          dot={{ r: 3 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
                ))}
                <p className="text-xs text-muted-foreground">AI estimate from public sources</p>
                {pricingSummary.state === "ready" && pricingSummary.nullNames.length > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Pricing information is not public for {pricingSummary.nullNames.join(", ")}. It is important that Snitch AI only searches for public information in correspondence with ethical computer use ordinances.
                  </p>
                )}
                <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                  {[...new Map(prices.filter(row => row.amount !== null && publicCompanyUrl(row.source_url)).map(row => [row.competitor_id, row])).values()].map(row => (
                    <li key={row.competitor_id}>
                      <a href={row.source_url ?? undefined} target="_blank" rel="noopener noreferrer" className="underline">{row.competitor_name}: {row.plan_label}</a>
                    </li>
                  ))}
                </ul>
              </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
