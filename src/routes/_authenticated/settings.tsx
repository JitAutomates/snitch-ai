import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type FormEvent } from "react";
import { LayoutDashboard, Radar, FileText, CreditCard, Settings as SettingsIcon, Loader2, Download, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { COUNTRIES } from "@/lib/settings-countries";
import { APPEARANCE_KEY, DEFAULT_APPEARANCE, applyAppearance, loadAppearance, peerFieldsChanged, profileFromMetadata, type Appearance, type ProfileFields } from "@/lib/settings";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [
    { title: "Settings | Snitch" },
    { name: "description", content: "Manage your Snitch company profile, appearance, plan and account." },
    { property: "og:title", content: "Settings | Snitch" },
    { property: "og:description", content: "Manage your Snitch company profile, appearance, plan and account." },
    { property: "og:type", content: "website" }, { name: "twitter:card", content: "summary" },
  ] }),
  component: SettingsPage,
});

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/monitors", label: "Monitors", icon: Radar },
  { to: "/briefs", label: "Briefs", icon: FileText },
  { to: "/billing", label: "Billing", icon: CreditCard },
  { to: "/settings", label: "Settings", icon: SettingsIcon },
] as const;
const EMPTY = profileFromMetadata({});

function SettingsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [fields, setFields] = useState<ProfileFields>(EMPTY);
  const [original, setOriginal] = useState<ProfileFields>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [saving, setSaving] = useState(false);
  const [appearance, setAppearance] = useState<Appearance>(DEFAULT_APPEARANCE);
  const [premium, setPremium] = useState<{ active: boolean; nextPaymentAt?: string } | null>(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    setAppearance(loadAppearance());
    try {
      const value = JSON.parse(localStorage.getItem("snitch_premium") ?? "null");
      if (value?.active === true) setPremium(value);
    } catch { /* Invalid local plan state falls back to Free. */ }
    let cancelled = false;
    async function load() {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data.user) throw error ?? new Error("Please sign in again.");
        const values = profileFromMetadata(data.user.user_metadata);
        const { data: profile } = await supabase.from("profiles").select("display_name").eq("id", data.user.id).maybeSingle();
        if (!values.display_name && profile?.display_name) values.display_name = profile.display_name;
        if (!cancelled) { setFields(values); setOriginal(values); }
      } catch {
        if (!cancelled) { setLoadError(true); toast.error("Could not load your profile. Please reload and try again."); }
      } finally { if (!cancelled) setLoading(false); }
    }
    void load();
    return () => { cancelled = true; };
  }, []);

  function changeField(key: keyof ProfileFields, value: string) { setFields((previous) => ({ ...previous, [key]: value })); }
  function changeAppearance(value: Appearance) {
    setAppearance(value);
    applyAppearance(value);
    try { localStorage.setItem(APPEARANCE_KEY, JSON.stringify(value)); }
    catch { toast.error("Appearance applied, but this browser could not save your preferences."); }
  }

  async function saveProfile(event: FormEvent) {
    event.preventDefault();
    const values = { ...fields, display_name: fields.display_name.trim(), industry: fields.industry.trim(), product: fields.product.trim() };
    const sales = Number(values.sales_volume);
    if (!values.industry || !values.product || !values.region || !values.scale || !values.sales_volume || !Number.isFinite(sales) || sales < 0) {
      toast.error("Complete your company details and enter a valid annual sales volume."); return;
    }
    setSaving(true);
    try {
      const refreshPeers = peerFieldsChanged(original, values);
      const { data, error } = await supabase.auth.updateUser({ data: { ...values, sales_volume: sales } });
      if (error || !data.user) throw error ?? new Error("Could not save your profile.");
      // The existing profiles schema supports display_name; business details live in auth metadata.
      const { error: profileError } = await supabase.from("profiles").update({ display_name: values.display_name || null }).eq("id", data.user.id);
      setOriginal(values); setFields(values);
      if (profileError) toast.warning("Profile saved. Your display name could not be synced to the profile record.");
      else toast.success("Profile saved.");
      if (refreshPeers) {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (token) {
          void fetch("/api/peers/resolve", {
            method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
            body: JSON.stringify({ reason: "profile_change" }),
          }).then((response) => { if (!response.ok) toast.warning("Profile saved, but competitor peers could not be refreshed."); })
            .catch(() => toast.warning("Profile saved, but competitor peers could not be refreshed."));
        } else toast.warning("Profile saved. Sign in again to refresh competitor peers.");
      }
    } catch (error) { toast.error(error instanceof Error ? error.message : "Could not save your profile."); }
    finally { setSaving(false); }
  }

  async function signOut(clearPreferences = false) {
    setSigningOut(true);
    try {
      if (clearPreferences) {
        localStorage.removeItem("snitch_premium"); localStorage.removeItem(APPEARANCE_KEY);
        applyAppearance(DEFAULT_APPEARANCE);
      }
      await queryClient.cancelQueries(); queryClient.clear();
      const { error } = await supabase.auth.signOut({ scope: "global" });
      if (error) throw error;
      if (clearPreferences) toast.message("Signed out and local preferences cleared. Your account and Snitch data have NOT been deleted; full deletion requires server-side support.", { duration: 12000 });
      await navigate({ to: "/auth", replace: true });
    } catch { toast.error("Could not sign out. Your account and data have not been deleted."); }
    finally { setSigningOut(false); }
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur">
        <div className="flex h-14 items-center justify-between px-5">
          <Link to="/" className="text-xl">Snitch</Link>
          <Button variant="secondary" size="sm" disabled={signingOut} onClick={() => void signOut()}>Sign out</Button>
        </div>
      </header>
      <div className="flex flex-1">
        <aside className="hidden w-16 shrink-0 border-r md:flex md:w-52 md:flex-col">
          <nav className="flex flex-1 flex-col gap-1 p-3">
            {NAV.map(({ to, label, icon: Icon }) => <Link key={to} to={to} activeOptions={{ exact: true }} className="flex items-center gap-3 rounded-md px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground [&.active]:bg-accent [&.active]:text-foreground"><Icon className="h-4 w-4 shrink-0" /><span className="hidden md:inline">{label}</span></Link>)}
          </nav>
        </aside>
        <main className="min-w-0 flex-1 px-5 py-8 md:px-8">
          <div className="mx-auto max-w-3xl space-y-6">
            <h1 className="text-3xl md:text-4xl">Settings</h1>
            <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6" aria-labelledby="profile-title">
              <h2 id="profile-title" className="mb-5 text-xl text-emphasis">Profile</h2>
              {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />Loading profile</p> : loadError ? <p role="alert" className="text-sm text-destructive">Could not load your profile. Please reload this page.</p> :
                <form onSubmit={saveProfile} className="space-y-5">
                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2"><Label htmlFor="display-name">Display name (optional)</Label><Input id="display-name" value={fields.display_name} onChange={(e) => changeField("display_name", e.target.value)} maxLength={120} /></div>
                    <div className="space-y-2"><Label htmlFor="industry">Industry</Label><Input id="industry" value={fields.industry} onChange={(e) => changeField("industry", e.target.value)} maxLength={120} required /></div>
                    <div className="space-y-2 sm:col-span-2"><Label htmlFor="product">Main product/service</Label><Input id="product" value={fields.product} onChange={(e) => changeField("product", e.target.value)} maxLength={200} required /></div>
                    <div className="space-y-2"><Label htmlFor="region">Region</Label><Select value={fields.region} onValueChange={(value) => changeField("region", value)} required><SelectTrigger id="region" className="w-full"><SelectValue placeholder="Select a country" /></SelectTrigger><SelectContent className="max-h-72">{COUNTRIES.map((country) => <SelectItem key={country} value={country}>{country}</SelectItem>)}</SelectContent></Select></div>
                    <div className="space-y-2"><Label htmlFor="scale">Company scale</Label><Select value={fields.scale} onValueChange={(value) => changeField("scale", value)} required><SelectTrigger id="scale" className="w-full"><SelectValue placeholder="Select company scale" /></SelectTrigger><SelectContent><SelectItem value="indie">Indie (solo)</SelectItem><SelectItem value="small">Small team (under 12)</SelectItem><SelectItem value="large">Large team (12+)</SelectItem></SelectContent></Select></div>
                    <div className="space-y-2 sm:col-span-2"><Label htmlFor="sales">Annual sales volume HKD</Label><Input id="sales" type="number" min="0" step="any" inputMode="decimal" value={fields.sales_volume} onChange={(e) => changeField("sales_volume", e.target.value)} required /><p className="text-xs text-muted-foreground">Peers are matched roughly from half to double this figure.</p></div>
                  </div>
                  <Button type="submit" size="pill" disabled={saving}>{saving && <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" />}{saving ? "Saving" : "Save profile"}</Button>
                </form>}
            </section>
            <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6" aria-labelledby="subscription-title">
              <div className="flex flex-wrap items-center justify-between gap-4"><div><h2 id="subscription-title" className="text-xl text-emphasis">Subscription</h2><p className="mt-3">{premium?.active ? "Premium" : "Free"}</p>{premium?.nextPaymentAt && Number.isFinite(Date.parse(premium.nextPaymentAt)) && <p className="mt-1 text-sm text-muted-foreground">Next payment: {new Date(premium.nextPaymentAt).toLocaleString("en-HK", { dateStyle: "medium", timeStyle: "short" })}</p>}</div><Button asChild size="pill" variant="secondary"><Link to="/billing">Manage plan</Link></Button></div>
            </section>
            <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6" aria-labelledby="appearance-title">
              <h2 id="appearance-title" className="mb-5 text-xl text-emphasis">Appearance</h2>
              <div className="space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3"><Label>Theme</Label><div className="flex gap-1" role="group" aria-label="Theme">{(["dark", "light"] as const).map((theme) => <Button key={theme} variant={appearance.theme === theme ? "default" : "secondary"} size="sm" aria-pressed={appearance.theme === theme} onClick={() => changeAppearance({ ...appearance, theme })}>{theme === "dark" ? "Dark" : "Light"}</Button>)}</div></div>
                <div className="flex flex-wrap items-center justify-between gap-3"><Label>Font size</Label><div className="flex gap-1" role="group" aria-label="Font size">{(["small", "medium", "large"] as const).map((fontSize) => <Button key={fontSize} variant={appearance.fontSize === fontSize ? "default" : "secondary"} size="sm" aria-pressed={appearance.fontSize === fontSize} onClick={() => changeAppearance({ ...appearance, fontSize })}>{fontSize.charAt(0).toUpperCase() + fontSize.slice(1)}</Button>)}</div></div>
                <div className="flex items-center justify-between gap-3"><Label htmlFor="emphasis">Coloured emphasis</Label><Switch id="emphasis" checked={appearance.colouredEmphasis} onCheckedChange={(colouredEmphasis) => changeAppearance({ ...appearance, colouredEmphasis })} /></div>
              </div>
            </section>
            <section className="rounded-2xl border border-border/60 bg-card p-5 sm:p-6" aria-labelledby="account-title">
              <h2 id="account-title" className="text-xl text-emphasis">Data &amp; account</h2>
              <div className="mt-5 flex flex-wrap gap-3"><Button variant="secondary" onClick={() => toast.message("Data export is coming soon.")}><Download className="mr-2 h-4 w-4" />Download my data</Button><Button variant="destructive" onClick={() => { setConfirmation(""); setDeleteOpen(true); }}><Trash2 className="mr-2 h-4 w-4" />Delete account</Button></div>
              <p className="mt-4 text-sm text-muted-foreground">Account deletion permanently removes access and associated Snitch data. Full deletion is not available here yet; this action can only clear local preferences and sign you out.</p>
            </section>
            <p className="text-xs text-muted-foreground">Changes to industry, product, region, scale or sales may refresh competitor peers (up to 10) via the existing peer resolver.</p>
          </div>
        </main>
      </div>
      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}><DialogContent><DialogHeader><DialogTitle>Delete account</DialogTitle><DialogDescription>Full account deletion requires server-side support and is not available yet. Continuing clears local preferences and signs you out only. Your account and associated Snitch data will remain.</DialogDescription></DialogHeader><div className="space-y-2"><Label htmlFor="delete-confirmation">Type DELETE to confirm</Label><Input id="delete-confirmation" value={confirmation} onChange={(e) => setConfirmation(e.target.value)} autoComplete="off" /></div><DialogFooter><Button variant="secondary" onClick={() => setDeleteOpen(false)}>Cancel</Button><Button variant="destructive" disabled={confirmation !== "DELETE" || signingOut} onClick={() => { if (confirmation === "DELETE") void signOut(true); }}>Clear preferences &amp; sign out</Button></DialogFooter></DialogContent></Dialog>
    </div>
  );
}
