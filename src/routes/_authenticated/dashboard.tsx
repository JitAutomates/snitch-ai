import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Radar,
  FileText,
  CreditCard,
  Settings,
  Pin,
  Bell,
  Sparkles,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

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

// ---------------------------------------------------------------------------
// Placeholder data (swap for real AI output later)
// These stand in until briefs / monitor research are wired up.
// ---------------------------------------------------------------------------

const PINNED_BRIEFS = [
  {
    id: "1",
    title: "Competitor pricing shift this week",
    summary:
      "Two peers adjusted list prices. Review whether your positioning still holds.",
    source: "Price monitor",
    pinnedAt: "Today",
  },
  {
    id: "2",
    title: "Niche news: funding round in adjacent space",
    summary:
      "A series A in a neighbouring category may pull attention and talent.",
    source: "News monitor",
    pinnedAt: "Yesterday",
  },
];

const NOTABLE_UPDATES = [
  {
    id: "n1",
    type: "price" as const,
    title: "Orbit AI dropped entry tier by 12%",
    detail: "Public pricing page updated. May pressure mid-market deals.",
    when: "2h ago",
  },
  {
    id: "n2",
    type: "news" as const,
    title: "Industry report flags higher churn in your segment",
    detail: "Third-party analysis cited in two trade outlets this morning.",
    when: "5h ago",
  },
  {
    id: "n3",
    type: "competitor" as const,
    title: "Nexus Soft launched a free tier",
    detail: "Product hunt and docs updated. Worth a brief competitor note.",
    when: "1d ago",
  },
];

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

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut({ scope: "global" });
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      {/* Top bar */}
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
        {/* Sidebar */}
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

        {/* Main */}
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

            {/* Pinned briefs */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Pin className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-lg tracking-tight">Pinned briefs</h2>
              </div>
              {PINNED_BRIEFS.length === 0 ? (
                <p className="rounded-2xl bg-card p-6 text-sm text-muted-foreground">
                  No pinned briefs yet. Generate a brief and pin items that need action.
                </p>
              ) : (
                <ul className="space-y-3">
                  {PINNED_BRIEFS.map((b) => (
                    <li
                      key={b.id}
                      className="rounded-2xl border border-border/60 bg-card p-5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-base">{b.title}</h3>
                        <span className="text-xs text-muted-foreground">{b.pinnedAt}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{b.summary}</p>
                      <p className="mt-3 text-xs text-muted-foreground">Source: {b.source}</p>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Notification board */}
            <section>
              <div className="mb-4 flex items-center gap-2">
                <Bell className="h-4 w-4 text-muted-foreground" />
                <h2 className="text-lg tracking-tight">Notable updates</h2>
              </div>
              {NOTABLE_UPDATES.length === 0 ? (
                <p className="rounded-2xl bg-card p-6 text-sm text-muted-foreground">
                  Nothing marked as notable yet. Monitors will surface significant
                  price, news, and competitor moves here.
                </p>
              ) : (
                <ul className="space-y-3">
                  {NOTABLE_UPDATES.map((n) => (
                    <li
                      key={n.id}
                      className="rounded-2xl border border-border/60 bg-card p-5"
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <h3 className="text-base">{n.title}</h3>
                        <span className="text-xs text-muted-foreground">{n.when}</span>
                      </div>
                      <p className="mt-2 text-sm text-muted-foreground">{n.detail}</p>
                      <p className="mt-3 text-xs uppercase tracking-wide text-muted-foreground">
                        {n.type}
                      </p>
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
