import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

type Mode = "signin" | "signup" | "magic" | "forgot";

export const Route = createFileRoute("/auth")({
  validateSearch: (s: Record<string, unknown>): { mode?: Mode } => {
    const m = s["mode"];
    return m === "signup" || m === "magic" || m === "forgot" || m === "signin" ? { mode: m } : {};
  },
  head: () => ({
    meta: [
      { title: "Sign in to Snitch" },
      { name: "description", content: "Sign in or create your free Snitch account." },
      { property: "og:title", content: "Sign in to Snitch" },
      { property: "og:description", content: "Sign in or create your free Snitch account." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: AuthPage,
});

/** Returns true when the given ISO date is at least 18 years ago. */
function isAdult(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return d <= cutoff;
}

function AuthPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>(search.mode ?? "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [agree, setAgree] = useState(false);
  const [website, setWebsite] = useState(""); // honeypot: bots fill it, humans never see it
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => setMode(search.mode ?? "signin"), [search.mode]);

  // Signed-in users go straight to the dashboard.
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data.user) navigate({ to: "/dashboard", replace: true });
    });
    const { data } = supabase.auth.onAuthStateChange((e) => {
      if (e === "SIGNED_IN") navigate({ to: "/dashboard", replace: true });
    });
    return () => data.subscription.unsubscribe();
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (website) return; // bot
    setFormError(null);
    setBusy(true);
    try {
      if (mode === "signup") {
        if (!isAdult(birthDate)) throw new Error("You must be 18 or older to use Snitch.");
        if (!agree) throw new Error("Please accept the terms and privacy policy.");
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            // birth_date is checked on the server and then discarded; only a yes/no flag is kept.
            data: { display_name: name.trim().slice(0, 80), birth_date: birthDate },
          },
        });
        if (error) throw error;
        setSent("Check your email to confirm your account.");
      } else if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else if (mode === "magic") {
        const { error } = await supabase.auth.signInWithOtp({
          email,
          options: { emailRedirectTo: window.location.origin, shouldCreateUser: false },
        });
        if (error) throw error;
        setSent("Check your email for a sign-in link.");
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setSent("If an account exists, a reset link is on its way.");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong.";
      toast.error(msg.includes("18 or older") ? "You must be 18 or older to use Snitch." : msg);
    } finally {
      setBusy(false);
    }
  }

  async function onGoogle() {
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) toast.error("Google sign-in failed. Please try again.");
  }

  const titles: Record<Mode, string> = {
    signin: "Sign in",
    signup: "Create your account",
    magic: "Email me a sign-in link",
    forgot: "Reset your password",
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link to="/" className="mb-10 text-2xl">
        Snitch
      </Link>
      <div className="w-full max-w-sm rounded-2xl bg-card p-8">
        <h1 className="text-3xl">{titles[mode]}</h1>

        {sent ? (
          <p className="mt-6 text-muted-foreground">{sent}</p>
        ) : (
          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input id="name" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {(mode === "signin" || mode === "signup") && (
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type="password"
                  required
                  minLength={8}
                  autoComplete={mode === "signup" ? "new-password" : "current-password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
            )}
            {mode === "signup" && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input
                    id="dob"
                    type="date"
                    required
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                  />
                  <p className="text-xs text-muted-foreground">
                    You must be 18 or older. We only keep a yes or no, not your birth date.
                  </p>
                </div>
                <label className="flex items-start gap-3 text-sm text-muted-foreground">
                  <Checkbox checked={agree} onCheckedChange={(v) => setAgree(v === true)} />
                  <span>I agree to the Terms of Service and Privacy Policy.</span>
                </label>
              </>
            )}
            {/* Honeypot for bot protection, hidden from people and screen readers */}
            <input
              type="text"
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="hidden"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
            />
            <Button type="submit" size="pill" className="w-full" disabled={busy}>
              {busy ? "Please wait" : mode === "signup" ? "Create account" : mode === "signin" ? "Sign in" : "Send link"}
            </Button>
          </form>
        )}

        {!sent && (mode === "signin" || mode === "signup") && (
          <>
            <div className="my-6 text-center text-xs text-muted-foreground">or</div>
            <Button variant="secondary" size="pill" className="w-full" onClick={onGoogle}>
              Continue with Google
            </Button>
          </>
        )}

        <div className="mt-6 space-y-2 text-sm">
          {mode !== "signin" && (
            <button className="block text-link" onClick={() => { setSent(null); setMode("signin"); }}>
              Have an account? Sign in
            </button>
          )}
          {mode !== "signup" && (
            <button className="block text-link" onClick={() => { setSent(null); setMode("signup"); }}>
              New here? Create a free account
            </button>
          )}
          {mode === "signin" && (
            <>
              <button className="block text-link" onClick={() => setMode("magic")}>
                Email me a sign-in link instead
              </button>
              <button className="block text-link" onClick={() => setMode("forgot")}>
                Forgot password?
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
