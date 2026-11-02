import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  LayoutDashboard,
  Radar,
  FileText,
  CreditCard,
  Settings,
  ArrowLeft,
  ExternalLink,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/competitor-monitor")({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search["id"] === "string" ? (search["id"] as string) : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Competitor monitor | Snitch" },
      { name: "description", content: "Peers matched to your company profile." },
      { property: "og:title", content: "Competitor monitor | Snitch" },
      { property: "og:description", content: "Peers matched to your company profile." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
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

const peerRowSchema = z.object({
  id: z.string(),
  name: z.string(),
  company_url: z.string().nullable(),
  scale: z.string().nullable(),
  sales_estimate: z.string().nullable(),
  rank: z.number().nullable(),
  resolved_at: z.string().nullable(),
  source: z.string().nullable(),
  exa_id: z.string().nullable(),
});

type PeerRow = z.infer<typeof peerRowSchema>;

function truncateUrl(url: string, max = 40): string {
  const clean = url.replace(/^https?:\/\//, "");
  return clean.length > max ? `${clean.slice(0, max)}…` : clean;
}

function CompetitorMonitor() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { id: preselectId } = Route.useSearch();

  const [peers, setPeers] = useState<PeerRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function loadPeers() {
      setLoading(true);
      setError(null);
      // Cast needed while the managed schema lacks peer table types. Read-only SELECT under existing RLS.
      const { data, error: queryError } = await (supabase as SupabaseClient)
        .from("competitors")
        .select("id, name, company_url, scale, sales_estimate, rank, resolved_at, source, exa_id")
        .order("rank", { ascending: true });
      if (cancelled) return;
      if (queryError) {
        setError(queryError.message);
        setPeers([]);
      } else {
        const parsed = z.array(peerRowSchema).safeParse(data ?? []);
        if (parsed.success) {
          setPeers(parsed.data);
        } else {
          setPeers([]);
          setError("Invalid competitor data");
        }
      }
      setLoading(false);
    }
    void loadPeers();
    return () => {
      cancelled = true;
    };
  }, []);

  // Preselect from ?id= once peers load; otherwise default to the first peer.
  useEffect(() => {
    if (peers.length === 0) return;
    setSelectedId((current) => {
      if (current && peers.some((p) => p.id === current)) return current;
      if (preselectId && peers.some((p) => p.id === preselectId)) return preselectId;
      return peers[0]!.id;
    });
  }, [peers, preselectId]);

  const selected = useMemo(
    () => peers.find((p) => p.id === selectedId) ?? null,
    [peers, selectedId],
  );

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
          <div className="mx-auto max-w-4xl space-y-8">
            <div>
              <Button asChild variant="secondary" size="sm" className="mb-4">
                <Link to="/monitors">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to monitors
                </Link>
              </Button>
              <h1 className="text-3xl tracking-tight md:text-4xl">Competitor monitor</h1>
              <p className="mt-1 text-muted-foreground">
                Peers matched to your company profile. Summaries are placeholders until research AI is connected.
              </p>
            </div>

            {loading ? (
              <p className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-muted-foreground">
                Loading competitors…
              </p>
            ) : error ? (
              <p className="rounded-2xl border border-border/60 bg-card p-5 text-sm text-destructive">
                Could not load competitors: {error}
              </p>
            ) : peers.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  No competitors yet. Finish onboarding so peers can be resolved.
                </p>
                <div className="mt-4 flex flex-wrap justify-center gap-2">
                  <Button asChild size="sm">
                    <Link to="/onboarding">Go to onboarding</Link>
                  </Button>
                  <Button asChild variant="secondary" size="sm">
                    <Link to="/monitors">Back to monitors</Link>
                  </Button>
                </div>
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
                {/* Peer list */}
                <ul className="space-y-3">
                  {peers.map((peer, index) => {
                    const isSelected = peer.id === selectedId;
                    return (
                      <li key={peer.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedId(peer.id)}
                          className={`w-full rounded-2xl border bg-card p-4 text-left transition-colors ${
                            isSelected
                              ? "border-foreground/40"
                              : "border-border/60 hover:border-border"
                          }`}
                        >
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="truncate text-sm font-medium">{peer.name}</span>
                            <span className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                              #{peer.rank ?? index + 1}
                            </span>
                          </div>
                          <p className="mt-1 truncate text-xs text-muted-foreground">
                            {[peer.scale, peer.sales_estimate].filter(Boolean).join(" · ") ||
                              "Peer in your band"}
                          </p>
                          {peer.company_url && (
                            <p className="mt-1 truncate text-xs text-muted-foreground">
                              {truncateUrl(peer.company_url)}
                            </p>
                          )}
                        </button>
                      </li>
                    );
                  })}
                </ul>

                {/* Detail panel */}
                {selected && (
                  <section className="rounded-2xl border border-border/60 bg-card p-6">
                    <h2 className="text-2xl tracking-tight">{selected.name}</h2>

                    <dl className="mt-4 space-y-2 text-sm">
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Rank</dt>
                        <dd>#{selected.rank ?? "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Scale</dt>
                        <dd>{selected.scale ?? "—"}</dd>
                      </div>
                      <div className="flex justify-between gap-4">
                        <dt className="text-muted-foreground">Sales estimate</dt>
                        <dd>{selected.sales_estimate ?? "—"}</dd>
                      </div>
                      {selected.company_url && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">Website</dt>
                          <dd>
                            <a
                              href={selected.company_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 underline underline-offset-2 hover:text-foreground"
                            >
                              {truncateUrl(selected.company_url)}
                              <ExternalLink className="h-3 w-3" />
                            </a>
                          </dd>
                        </div>
                      )}
                      {selected.resolved_at && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">Resolved</dt>
                          <dd>
                            {new Date(selected.resolved_at).toLocaleString("en-HK", {
                              dateStyle: "medium",
                              timeStyle: "short",
                            })}
                          </dd>
                        </div>
                      )}
                      {selected.source && (
                        <div className="flex justify-between gap-4">
                          <dt className="text-muted-foreground">Source</dt>
                          <dd>{selected.source}</dd>
                        </div>
                      )}
                    </dl>

                    <div className="mt-6 border-t border-border/60 pt-5">
                      <h3 className="text-sm font-medium tracking-tight">AI summary</h3>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        Full event and research summaries for {selected.name} will appear here once
                        the research AI is connected. For now this panel only shows the peer data
                        already resolved from your company profile.
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                        When live, summaries will be labelled as AI estimates from public sources
                        and will always list their sources.
                      </p>
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
