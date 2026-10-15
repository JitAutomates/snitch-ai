import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Radar,
  FileText,
  CreditCard,
  Settings,
  ArrowLeft,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/competitor-monitor")({
  head: () => ({
    meta: [
      { title: "Competitor monitor | Snitch" },
      { name: "description", content: "AI summaries of significant competitor events." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CompetitorMonitor,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/monitors", label: "Monitors", icon: Radar },
  { to: "/briefs", label: "Briefs", icon: FileText },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

const SUMMARIES = [
  {
    id: "c1",
    title: "Orbit AI: reported sales uptick in peer band",
    summary:
      "Placeholder AI summary: Multiple public signals (job posts, case studies, pricing page traffic estimates) point to stronger mid-market conversion for Orbit AI over the last 30 days. Their entry tier undercuts several HK peers. Recommended action: compare your starter plan value props and trial length against theirs before the next quarterly review.",
  },
  {
    id: "c2",
    title: "Three new companies entered your industry this quarter",
    summary:
      "Placeholder AI summary: Company registry and product-hunt style launches show three new entities targeting overlapping buyers in Hong Kong and Singapore. Two emphasise AI automation; one focuses on compliance. None yet match your sales band, but aggressive free tiers could siphon early trials.",
  },
  {
    id: "c3",
    title: "Nexus Soft in talks that may lead to a merger",
    summary:
      "Placeholder AI summary: Regional trade press described exploratory talks between Nexus Soft and a tools vendor with complementary distribution. If completed, the combined entity would sit near the top of your ±50% sales band. Watch for pricing freezes or bundle offers aimed at shared customers.",
  },
  {
    id: "c4",
    title: "Harborkit opened a free tier overnight",
    summary:
      "Placeholder AI summary: Harborkit published a free tier with core workflows unlocked and paid seats above five users. Documentation and changelog confirm the change. Expect higher top-of-funnel competition; consider tightening your free-to-paid path or adding a clear upgrade trigger.",
  },
];

function CompetitorMonitor() {
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
                className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span className="hidden md:inline">{label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        <main className="flex-1 px-5 py-8 md:px-8">
          <div className="mx-auto max-w-3xl space-y-8">
            <div>
              <Button asChild variant="secondary" size="sm" className="mb-4">
                <Link to="/monitors">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to monitors
                </Link>
              </Button>
              <h1 className="text-3xl tracking-tight md:text-4xl">Competitor monitor</h1>
              <p className="mt-1 text-muted-foreground">
                AI-generated summaries of significant peer events (placeholders until research is connected).
              </p>
            </div>

            <ul className="space-y-4">
              {SUMMARIES.map((s) => (
                <li key={s.id} className="rounded-2xl border border-border/60 bg-card p-6">
                  <h2 className="text-lg tracking-tight">{s.title}</h2>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{s.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        </main>
      </div>
    </div>
  );
}
