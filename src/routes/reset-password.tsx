import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Set a new password | Snitch" },
      { name: "description", content: "Choose a new password for your Snitch account." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [session, setSession] = useState<{ email: string; resetToken: string } | null>(null);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("snitch_reset");
      if (!raw) {
        void navigate({ to: "/forget-password", replace: true });
        return;
      }
      const parsed = JSON.parse(raw) as { email?: string; resetToken?: string };
      if (!parsed.email || !parsed.resetToken) {
        void navigate({ to: "/forget-password", replace: true });
        return;
      }
      setSession({ email: parsed.email, resetToken: parsed.resetToken });
    } catch {
      void navigate({ to: "/forget-password", replace: true });
    }
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (!session) return;
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: session.email,
          resetToken: session.resetToken,
          password,
        }),
      });
      const body = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(body?.error ?? "Could not update password.");
        return;
      }
      sessionStorage.removeItem("snitch_reset");
      toast.success("Password updated. Sign in with your new password.");
      await navigate({ to: "/auth", search: { mode: "signin" }, replace: true });
    } finally {
      setBusy(false);
    }
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5 text-sm text-muted-foreground">
        Checking reset session…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link to="/" className="mb-10 text-2xl">
        Snitch
      </Link>
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-8">
        <h1 className="text-3xl">New password</h1>
        <p className="text-sm text-muted-foreground">For {session.email}</p>
        <div className="space-y-2">
          <Label htmlFor="pw">Password</Label>
          <Input
            id="pw"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="pw2">Confirm password</Label>
          <Input
            id="pw2"
            type="password"
            minLength={8}
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button type="submit" size="pill" className="w-full" disabled={busy}>
          {busy ? "Saving…" : "Save password"}
        </Button>
      </form>
    </div>
  );
}
