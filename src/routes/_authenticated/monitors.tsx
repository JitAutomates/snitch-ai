import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
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
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/monitors")({
  head: () => ({
    meta: [
      { title: "Monitors | Snitch" },
      {
        name: "description",
        content: "Niche news, peer pricing, and competitor alerts for HK founders.",
      },
      { property: "og:title", content: "Monitors | Snitch" },
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

// ---- Placeholder niche news (50 days of synthetic issues) ----
type NewsArticle = { headline: string; body: string; tag: string };

function buildNewsArchive(): { dateLabel: string; dateKey: string; articles: NewsArticle[] }[] {
  const seeds: NewsArticle[] = [
    {
      tag: "Funding",
      headline: "Two Central SaaS startups close seed rounds in the same week",
      body: "Investors favoured B2B tools with clear HK enterprise pilots. Founders noted longer sales cycles but stronger retention after local reference customers.",
    },
    {
      tag: "Policy",
      headline: "Cyberport cohort opens applications for AI productivity tools",
      body: "The programme prioritises teams selling into Hong Kong SMEs. Several alumni reported faster intros to corporate IT buyers after demo day.",
    },
    {
      tag: "Market",
      headline: "Regional logistics software vendors cut entry pricing",
      body: "Public list prices for mid-tier plans fell about 8–15% across three peers. Analysts linked the moves to slower warehouse digitisation spend.",
    },
    {
      tag: "Talent",
      headline: "Hiring spike for product engineers in Kowloon East",
      body: "Job boards showed a rise in full-stack roles at seed-stage companies. Compensation packages increasingly include equity refreshers at 18 months.",
    },
    {
      tag: "Competition",
      headline: "Singapore-based rival launches Cantonese onboarding",
      body: "The product is aimed at cross-border founders operating in both cities. Local teams may feel pressure to localise support, not only marketing copy.",
    },
  ];

  const out = [];
  const today = new Date();
  for (let i = 0; i < 50; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = d.toISOString().slice(0, 10);
    const dateLabel = d.toLocaleDateString("en-HK", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
    const articles = [0, 1, 2].map((j) => {
      const s = seeds[(i + j) % seeds.length]!;
      return {
        ...s,
        headline: i === 0 ? s.headline : `${s.headline} (${i}d archive)`,
      };
    });
    out.push({ dateLabel, dateKey, articles });
  }
  return out;
}

const NEWS_ARCHIVE = buildNewsArchive();

// ---- Placeholder price series (peer band ±50%) ----
const PRICE_SERIES = [
  { week: "W1", "Orbit AI": 49, "Nexus Soft": 59, "Aether Labs": 39, "Harborkit": 45, "Lantern HQ": 55 },
  { week: "W2", "Orbit AI": 49, "Nexus Soft": 59, "Aether Labs": 39, "Harborkit": 45, "Lantern HQ": 52 },
  { week: "W3", "Orbit AI": 45, "Nexus Soft": 59, "Aether Labs": 42, "Harborkit": 45, "Lantern HQ": 52 },
  { week: "W4", "Orbit AI": 45, "Nexus Soft": 54, "Aether Labs": 42, "Harborkit": 49, "Lantern HQ": 52 },
  { week: "W5", "Orbit AI": 45, "Nexus Soft": 54, "Aether Labs": 42, "Harborkit": 49, "Lantern HQ": 48 },
  { week: "W6", "Orbit AI": 43, "Nexus Soft": 54, "Aether Labs": 40, "Harborkit": 49, "Lantern HQ": 48 },
  { week: "W7", "Orbit AI": 43, "Nexus Soft": 49, "Aether Labs": 40, "Harborkit": 47, "Lantern HQ": 48 },
  { week: "W8", "Orbit AI": 43, "Nexus Soft": 49, "Aether Labs": 40, "Harborkit": 47, "Lantern HQ": 46 },
];

const PRICE_LINES = [
  { key: "Orbit AI", color: "#e8e8e8" },
  { key: "Nexus Soft", color: "#a3a3a3" },
  { key: "Aether Labs", color: "#737373" },
  { key: "Harborkit", color: "#525252" },
  { key: "Lantern HQ", color: "#d4d4d4" },
];

// ---- Competitor alerts (carousel) ----
type CompetitorAlert = {
  id: string;
  title: string;
  detail: string;
  severity: "high" | "medium";
};

const COMPETITOR_ALERTS: CompetitorAlert[] = [
  {
    id: "c1",
    title: "Orbit AI: reported sales uptick in peer band",
    detail: "Public signals suggest a sharp rise in mid-market deals this month. Review your positioning against their new entry tier.",
    severity: "high",
  },
  {
    id: "c2",
    title: "Three new companies entered your industry this quarter",
    detail: "Fresh HK-registered entities targeting similar buyers. Early pricing is aggressive; monitor free-tier launches.",
    severity: "medium",
  },
  {
    id: "c3",
    title: "Nexus Soft in talks that may lead to a merger",
    detail: "Trade press noted exploratory discussions with a regional tools vendor. Consolidation could reshape shortlists.",
    severity: "high",
  },
  {
    id: "c4",
    title: "Harborkit opened a free tier overnight",
    detail: "Docs and pricing page updated. May pull trials away from paid starters in your band.",
    severity: "medium",
  },
];

function Monitors() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [dayOffset, setDayOffset] = useState(0); // 0 = today, 49 = 49 days ago
  const [alertIndex, setAlertIndex] = useState(0);

  const issue = NEWS_ARCHIVE[dayOffset]!;

  useEffect(() => {
    const t = setInterval(() => {
      setAlertIndex((i) => (i + 1) % COMPETITOR_ALERTS.length);
    }, 5000);
    return () => clearInterval(t);
  }, []);

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut({ scope: "global" });
    navigate({ to: "/auth", replace: true });
  }

  const activeAlert = COMPETITOR_ALERTS[alertIndex]!;

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
              <h2 className="mb-3 text-lg tracking-tight">Competitor alerts</h2>
              <button
                type="button"
                onClick={() => navigate({ to: "/competitor-monitor" as never })}
                className="w-full rounded-2xl border border-amber-500/30 bg-card p-5 text-left transition-colors hover:border-amber-500/50"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-500" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <h3 className="text-base">{activeAlert.title}</h3>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {activeAlert.severity}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{activeAlert.detail}</p>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Tap for full summary · {alertIndex + 1}/{COMPETITOR_ALERTS.length}
                    </p>
                  </div>
                </div>
              </button>
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
                    disabled={dayOffset >= 49}
                    onClick={() => setDayOffset((d) => Math.min(49, d + 1))}
                    aria-label="Older issue"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[9rem] text-center text-xs text-muted-foreground">
                    {dayOffset === 0 ? "Today" : `${dayOffset}d ago`}
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={dayOffset <= 0}
                    onClick={() => setDayOffset((d) => Math.max(0, d - 1))}
                    aria-label="Newer issue"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              <article
                className="rounded-sm border border-neutral-700 bg-[#111] px-6 py-8 shadow-inner md:px-10"
                onTouchStart={(e) => {
                  (e.currentTarget as HTMLElement).dataset["tx"] = String(e.touches[0]!.clientX);
                }}
                onTouchEnd={(e) => {
                  const start = Number((e.currentTarget as HTMLElement).dataset["tx"] ?? 0);
                  const end = e.changedTouches[0]!.clientX;
                  const dx = end - start;
                  if (dx < -40) setDayOffset((d) => Math.min(49, d + 1)); // swipe left → older
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
                  Swipe left for older issues · up to 50 days
                </p>
              </article>
            </section>

            {/* Pricing line chart */}
            <section>
              <h2 className="mb-1 text-lg tracking-tight">Peer pricing</h2>
              <p className="mb-4 text-sm text-muted-foreground">
                Placeholder chart: top peers in a ±50% sales band (entry plan, USD/mo). Later this uses your onboarding sales volume.
              </p>
              <div className="rounded-2xl border border-border/60 bg-card p-4 md:p-6">
                <div className="h-72 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={PRICE_SERIES} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                      <XAxis dataKey="week" stroke="#888" fontSize={12} />
                      <YAxis stroke="#888" fontSize={12} unit="$" />
                      <Tooltip
                        contentStyle={{
                          background: "#1a1a1a",
                          border: "1px solid #333",
                          borderRadius: 8,
                        }}
                      />
                      <Legend />
                      {PRICE_LINES.map((l) => (
                        <Line
                          key={l.key}
                          type="monotone"
                          dataKey={l.key}
                          stroke={l.color}
                          strokeWidth={2}
                          dot={false}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
