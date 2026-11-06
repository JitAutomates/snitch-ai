import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState } from "react";
import { LayoutDashboard, Radar, FileText, CreditCard, Settings, Pin, Sparkles, Loader2, RotateCw } from "lucide-react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { BriefRow, briefDayLabel, briefSources, utcBriefDay, type DailyBrief } from "@/lib/daily-briefs";

export const Route = createFileRoute("/_authenticated/briefs")({
  head: () => ({ meta: [
    { title: "Daily Brief | Snitch" },
    { name: "description", content: "Generate sourced daily intelligence, review your history, and pin unfinished business." },
    { property: "og:title", content: "Daily Brief | Snitch" },
    { property: "og:description", content: "Your saved competitor activity, pricing moves, niche news and action plans." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: Briefs,
});
const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/monitors", label: "Monitors", icon: Radar },
  { to: "/briefs", label: "Briefs", icon: FileText },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Briefs() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const today = utcBriefDay();
  const [history, setHistory] = useState<DailyBrief[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [pinning, setPinning] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [selected, setSelected] = useState(today);
  const active = history.find(b => b.day === selected);
  const sources = active ? briefSources(active.highlights) : [];
  const loadBriefs = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const { data: auth, error: authError } = await supabase.auth.getUser();
      if (authError || !auth.user) throw new Error("Sign in to load your briefs.");
      const since = utcBriefDay(new Date(Date.now() - 59 * 86400000));
      const { data, error } = await (supabase as SupabaseClient).from("briefs")
        .select("id, user_id, day, title, body, action_plan, highlights, pinned, model, created_at")
        .eq("user_id", auth.user.id).gte("day", since).lte("day", utcBriefDay())
        .order("day", { ascending: false }).limit(60);
      if (error) throw new Error("Could not load briefs. Check that the briefs table has been set up, then retry.");
      setHistory(z.array(BriefRow).parse(data ?? []));
      return true;
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load briefs.");
      return false;
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void loadBriefs(); }, [loadBriefs]);

  async function signOut() {
    await queryClient.cancelQueries(); queryClient.clear();
    await supabase.auth.signOut({ scope: "global" });
    void navigate({ to: "/auth", replace: true });
  }
  async function generate() {
    setGenerating(true); setActionError(null);
    try {
      const { data, error } = await supabase.auth.getSession();
      if (error || !data.session) throw new Error("Sign in to generate a brief.");
      const response = await fetch("/api/briefs/generate", { method: "POST", headers: {
        "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}`,
      }, body: JSON.stringify({ reason: "manual" }) });
      const payload = await response.json().catch(() => ({} as Record<string, unknown>));
      if (!response.ok) {
        const apiError =
          typeof payload.error === "string" && payload.error.length > 0
          ? payload.error
          : `Could not generate (${response.status})`;
  throw new Error(apiError);
}
const result = z.object({ brief: BriefRow }).parse(payload);
      setSelected(result.brief.day);
      setHistory(h => [result.brief, ...h.filter(b => b.id !== result.brief.id)].sort((a, b) => b.day.localeCompare(a.day)));
      await loadBriefs();
    } catch (error) { setActionError(error instanceof Error ? error.message : "Could not generate brief."); }
    finally { setGenerating(false); }
  }
  async function togglePin() {
    if (!active) return;
    setPinning(true); setActionError(null);
    try {
      const { data, error } = await (supabase as SupabaseClient).from("briefs")
        .update({ pinned: !active.pinned }).eq("id", active.id).eq("user_id", active.user_id)
        .select("id, pinned").single();
      if (error) throw new Error("Could not save your pin. Please try again.");
      const saved = z.object({ id: z.string(), pinned: z.boolean() }).parse(data);
      setHistory(h => h.map(b => b.id === saved.id ? { ...b, pinned: saved.pinned } : b));
    } catch (error) { setActionError(error instanceof Error ? error.message : "Could not save your pin."); }
    finally { setPinning(false); }
  }
  const months = useMemo(() => [-1, 0].map(offset => {
    const now = new Date();
    const first = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset, 1));
    const count = new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth() + 1, 0)).getUTCDate();
    return { first, lead: first.getUTCDay(), days: Array.from({ length: count }, (_, i) => new Date(Date.UTC(first.getUTCFullYear(), first.getUTCMonth(), i + 1))) };
  }), []);
  const byDay = new Map(history.map(b => [b.day, b]));

  return <div className="flex min-h-screen flex-col bg-background">
    <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
      <div className="flex h-14 items-center justify-between px-5">
        <Link to="/" className="text-xl">Snitch</Link>
        <Button variant="secondary" size="sm" onClick={signOut}>Sign out</Button>
      </div>
    </header>
    <div className="flex flex-1">
      <aside className="hidden w-16 shrink-0 border-r md:flex md:w-52 md:flex-col">
        <nav className="flex flex-1 flex-col gap-1 p-3">{NAV.map(({ to, label, icon: Icon }) =>
          <Link key={to} to={to} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground">
            <Icon className="h-4 w-4 shrink-0" /><span className="hidden md:inline">{label}</span>
          </Link>)}</nav>
      </aside>
      <main className="min-w-0 flex-1 px-5 py-8 md:px-8">
        <div className="mx-auto max-w-3xl space-y-10">
          <section>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <h1 className="text-3xl md:text-4xl">Daily Brief</h1>
              {selected !== today && <Button variant="ghost" size="sm" onClick={() => setSelected(today)}>Today</Button>}
            </div>
            {actionError && <p role="alert" className="mb-4 text-sm text-destructive">{actionError}</p>}
            <div className="min-h-[280px] rounded-2xl border border-border/60 bg-card">
              {loading ? <p role="status" className="p-8 text-muted-foreground">Loading briefs…</p> : loadError ?
                <div className="space-y-4 p-8"><p role="alert" className="text-sm text-destructive">{loadError}</p><Button variant="secondary" onClick={() => void loadBriefs()}>Retry</Button></div> : active ?
                <article className="space-y-5 break-words p-6 md:p-8">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0"><p className="mb-2 text-xs text-muted-foreground">{briefDayLabel(active.day)}</p><h2 className="text-2xl">{active.title}</h2></div>
                    <Button variant="ghost" size="icon" aria-label={active.pinned ? "Unpin brief" : "Pin brief"} title={active.pinned ? "Unpin brief" : "Pin brief"} disabled={pinning} onClick={togglePin}><Pin className={cn("h-4 w-4", active.pinned && "fill-current")} /></Button>
                  </div>
                  <p className="whitespace-pre-line leading-relaxed">{active.body}</p>
                  <div><h3 className="mb-2 text-lg">Action plan</h3><p className="whitespace-pre-line leading-relaxed">{active.action_plan}</p></div>
                  <div className="space-y-2 border-t pt-4 text-xs text-muted-foreground">
                    <p>AI estimate from public sources</p><h3>Sources</h3>
                    {sources.length ? <ul className="space-y-1">{sources.map(source => <li key={source}><a href={source} target="_blank" rel="noopener noreferrer" className="break-all underline underline-offset-2">{source}</a></li>)}</ul> : <p>No public source links were available in the collected information.</p>}
                  </div>
                  {active.day === today && <Button variant="ghost" size="sm" onClick={generate} disabled={generating}>{generating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RotateCw className="mr-2 h-4 w-4" />}{generating ? "Generating…" : "Regenerate"}</Button>}
                </article> : <div className="flex min-h-[280px] flex-col items-center justify-center gap-4 p-6 text-center">
                  <p className="text-sm text-muted-foreground">{selected === today ? "No brief for today yet." : "No brief for this day."}</p>
                  {selected === today && <Button variant="outline" size="icon" className="h-16 w-16 rounded-full" onClick={generate} disabled={generating} aria-label="Generate today's brief" title="Generate today's brief">{generating ? <Loader2 className="h-6 w-6 animate-spin" /> : <Sparkles className="h-6 w-6" />}</Button>}
                  {generating && <p role="status" className="text-sm text-muted-foreground">Generating brief…</p>}
                </div>}
            </div>
          </section>
          <section>
            <h2 className="mb-4 text-lg">Unfinished Business</h2>
            <div className="grid gap-4 sm:grid-cols-2">{months.map(({ first, lead, days }) => <div key={first.toISOString()} className="rounded-2xl border border-border/60 bg-card p-4">
              <p className="mb-3 text-sm">{first.toLocaleDateString("en-HK", { timeZone: "UTC", month: "long", year: "numeric" })}</p>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-muted-foreground">
                {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => <span key={i}>{d}</span>)}
                {Array.from({ length: lead }, (_, i) => <span key={`lead-${i}`} />)}
                {days.map(date => { const day = utcBriefDay(date); const brief = byDay.get(day); return <Button key={day} variant="ghost" disabled={loading || generating} aria-label={briefDayLabel(day)} onClick={() => setSelected(day)} className={cn("relative h-auto min-w-0 aspect-square p-0 text-xs", brief && "text-foreground underline underline-offset-4", day === today && "border border-border", selected === day && "bg-accent text-foreground")}>
                  {date.getUTCDate()}{brief?.pinned && <Pin className="absolute right-0.5 top-0.5 h-2.5 w-2.5" />}</Button>; })}
              </div>
            </div>)}</div>
            {!loading && !loadError && !history.length && <p className="mt-4 text-sm text-muted-foreground">No saved briefs yet.</p>}
            <ul className="mt-4 space-y-2">{history.map(brief => <li key={brief.id}><Button variant="ghost" disabled={generating} onClick={() => setSelected(brief.day)} className={cn("h-auto w-full justify-start gap-2 whitespace-normal px-3 py-2 text-left text-sm text-muted-foreground", selected === brief.day && "bg-accent text-foreground")}>
              {brief.pinned && <Pin className="h-3.5 w-3.5 shrink-0" aria-label="Pinned" />}<span className="shrink-0">{brief.day}</span><span className="min-w-0 truncate">{brief.title}</span>
            </Button></li>)}</ul>
          </section>
        </div>
      </main>
    </div>
  </div>;
}
