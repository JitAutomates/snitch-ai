import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";

export const Route = createFileRoute("/complete-signup")({
  head: () => ({
    meta: [
      { title: "Confirm age | Snitch" },
      { name: "description", content: "Confirm you are 18 or older to use Snitch." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CompleteSignupPage,
});

function isAdult(iso: string): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const cutoff = new Date();
  cutoff.setFullYear(cutoff.getFullYear() - 18);
  return d <= cutoff;
}

function CompleteSignupPage() {
  const navigate = useNavigate();
  const [birthDate, setBirthDate] = useState("");
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        await navigate({ to: "/auth", replace: true });
        return;
      }
      const { data: profile } = await supabase
        .from("profiles")
        .select("is_adult, industry, product, region, scale")
        .eq("id", data.user.id)
        .maybeSingle();
      if (cancelled) return;
      if (profile?.is_adult === true) {
        const done = Boolean(
          profile.industry && profile.product && profile.region && profile.scale,
        );
        await navigate({ to: done ? "/dashboard" : "/onboarding", replace: true });
        return;
      }
      setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!agree) {
      setError("Please accept the terms and privacy policy.");
      return;
    }
    if (!isAdult(birthDate)) {
      setError("You must be 18 or older to use Snitch.");
      return;
    }
    setBusy(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) throw new Error("Sign in again.");

      const res = await fetch("/api/auth/confirm-age", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ birth_date: birthDate, agree: true }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        rejected?: boolean;
        ok?: boolean;
      } | null;

      if (body?.rejected || res.status === 403) {
        await supabase.auth.signOut({ scope: "global" }).catch(() => undefined);
        throw new Error(body?.error ?? "You must be 18 or older to use Snitch.");
      }
      if (!res.ok || !body?.ok) {
        throw new Error(body?.error ?? "Could not confirm age.");
      }

      toast.success("Age confirmed.");
      await navigate({ to: "/onboarding", replace: true });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not confirm age.";
      setError(msg);
      toast.error(msg);
    } finally {
      setBusy(false);
    }
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 text-sm text-muted-foreground">
        Checking account…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link to="/" className="mb-10 text-2xl">
        Snitch
      </Link>
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-8">
        <h1 className="text-3xl">One more step</h1>
        <p className="text-sm text-muted-foreground">
          Google does not share your date of birth. Confirm you are 18 or older to continue.
        </p>
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
            We only keep a yes or no, not your birth date.
          </p>
        </div>
        <label className="flex items-start gap-3 text-sm text-muted-foreground">
          <Checkbox
            checked={agree}
            onCheckedChange={(v) => setAgree(v === true)}
            required
          />
          <span>
            I agree to the{" "}
            <Link to="/terms" className="text-foreground underline underline-offset-4" target="_blank">
              Terms and Conditions
            </Link>{" "}
            and{" "}
            <Link to="/privacy" className="text-foreground underline underline-offset-4" target="_blank">
              Privacy Policy
            </Link>
            .
          </span>
        </label>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="pill" className="w-full" disabled={busy}>
          {busy ? "Please wait" : "Continue"}
        </Button>
      </form>
    </div>
  );
}
