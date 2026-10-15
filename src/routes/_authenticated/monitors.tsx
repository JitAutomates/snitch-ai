import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Radar,
  FileText,
  CreditCard,
  Settings,
  Plus,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/monitors")({
  head: () => ({
    meta: [
      { title: "Monitors | Snitch" },
      {
        name: "description",
        content: "Track competitors, prices, and niche news with Snitch monitors.",
      },
      { property: "og:title", content: "Monitors | Snitch" },
      {
        property: "og:description",
        content: "Track competitors, prices, and niche news with Snitch monitors.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Monitors,
});

// ---------------------------------------------------------------------------
// Placeholder data (local state only; swap for the database later)
// ---------------------------------------------------------------------------

type MonitorType = "competitor" | "price" | "news";
type MonitorStatus = "active" | "paused";

interface Monitor {
  id: string;
  name: string;
  type: MonitorType;
  target: string;
  status: MonitorStatus;
  lastChecked: string;
}

const INITIAL_MONITORS: Monitor[] = [
  {
    id: "m1",
    name: "Orbit AI",
    type: "competitor",
    target: "Orbit AI",
    status: "active",
    lastChecked: "2h ago",
  },
  {
    id: "m2",
    name: "Entry tier pricing",
    type: "price",
    target: "orbitai.com/pricing",
    status: "paused",
    lastChecked: "1d ago",
  },
  {
    id: "m3",
    name: "Funding news",
    type: "news",
    target: "AI developer tools funding",
    status: "active",
    lastChecked: "6h ago",
  },
];

const TYPE_OPTIONS: { value: MonitorType; label: string }[] = [
  { value: "competitor", label: "Competitor" },
  { value: "price", label: "Price" },
  { value: "news", label: "News" },
];

const TARGET_PLACEHOLDER: Record<MonitorType, string> = {
  competitor: "Company name, e.g. Orbit AI",
  price: "Product or pricing page URL",
  news: "Topic or keyword, e.g. AI funding",
};

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/monitors", label: "Monitors", icon: Radar },
  { to: "/briefs", label: "Briefs", icon: FileText },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: Settings },
] as const;

function Monitors() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [monitors, setMonitors] = useState<Monitor[]>(INITIAL_MONITORS);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [name, setName] = useState("");
  const [type, setType] = useState<MonitorType>("competitor");
  const [target, setTarget] = useState("");

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut({ scope: "global" });
    navigate({ to: "/auth", replace: true });
  }

  function toggleStatus(id: string) {
    setMonitors((prev) =>
      prev.map((m) =>
        m.id === id
          ? { ...m, status: m.status === "active" ? "paused" : "active" }
          : m,
      ),
    );
  }

  function removeMonitor(id: string) {
    setMonitors((prev) => prev.filter((m) => m.id !== id));
  }

  function openDialog() {
    setName("");
    setType("competitor");
    setTarget("");
    setDialogOpen(true);
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !target.trim()) {
      toast.error("Please fill in all fields.");
      return;
    }
    if (monitors.some((m) => m.status === "active")) {
      toast.error("Free plan limit reached", {
        description: "Free plan: 1 active monitor. Pause or delete one first.",
      });
      setDialogOpen(false);
      return;
    }
    setMonitors((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        name: name.trim(),
        type,
        target: target.trim(),
        status: "active",
        lastChecked: "Just added",
      },
    ]);
    setDialogOpen(false);
    toast.success("Monitor added.");
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
                // Briefs, billing, and settings routes ship later; cast keeps
                // the shared NAV pattern typechecking until they exist.
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
          <div className="mx-auto max-w-3xl space-y-8">
            {/* Header row */}
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <h1 className="text-3xl tracking-tight md:text-4xl">Monitors</h1>
                <p className="mt-1 text-muted-foreground">
                  Track competitors, prices, and niche news.
                </p>
              </div>
              <Button asChild size="pill">
                <button onClick={openDialog}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add monitor
                </button>
              </Button>
            </div>

            {/* Free-plan note */}
            <p className="text-sm text-muted-foreground">
              Free plan: 1 active monitor.
            </p>

            {/* Monitor list */}
            {monitors.length === 0 ? (
              <div className="rounded-2xl border border-border/60 bg-card p-8 text-center">
                <p className="text-sm text-muted-foreground">
                  No monitors yet. Add one to start tracking competitors,
                  prices, and niche news.
                </p>
                <Button size="pill" className="mt-5" onClick={openDialog}>
                  Add your first monitor
                </Button>
              </div>
            ) : (
              <ul className="space-y-3">
                {monitors.map((m) => (
                  <li
                    key={m.id}
                    className="rounded-2xl border border-border/60 bg-card p-5"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base">{m.name}</h3>
                        <Badge variant="secondary" className="text-xs">
                          {m.type}
                        </Badge>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {m.status === "active" ? (
                          <span className="text-foreground/70">Active</span>
                        ) : (
                          "Paused"
                        )}
                      </span>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {m.target}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">
                        Last checked {m.lastChecked}
                      </span>
                      <div className="flex items-center gap-4">
                        <button
                          type="button"
                          onClick={() => toggleStatus(m.id)}
                          className="text-xs text-muted-foreground underline-offset-4 hover:text-foreground hover:underline"
                        >
                          {m.status === "active" ? "Pause" : "Resume"}
                        </button>
                        <button
                          type="button"
                          onClick={() => removeMonitor(m.id)}
                          className="text-xs text-muted-foreground underline-offset-4 hover:text-destructive hover:underline"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>

      {/* Add monitor dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="rounded-2xl bg-card sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Add monitor</DialogTitle>
            <DialogDescription>
              Track a competitor, a price, or a niche news topic.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="monitor-name">Name</Label>
              <Input
                id="monitor-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Orbit AI pricing"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="monitor-type">Type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as MonitorType)}
              >
                <SelectTrigger id="monitor-type" className="w-full">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="monitor-target">Target</Label>
              <Input
                id="monitor-target"
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder={TARGET_PLACEHOLDER[type]}
              />
            </div>
            <DialogFooter>
              <Button type="submit" size="pill">
                Add monitor
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
