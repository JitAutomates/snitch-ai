import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/forget-password")({
  head: () => ({
    meta: [
      { title: "Forgot password | Snitch" },
      { name: "description", content: "Reset your Snitch password with an email code." },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ForgetPasswordPage,
});

type Step = "email" | "code";

function ForgetPasswordPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function requestCode(e?: FormEvent) {
    e?.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        message?: string;
        cooldownSec?: number;
      } | null;
      if (!res.ok) {
        setError(body?.error ?? "Could not send code.");
        if (typeof body?.cooldownSec === "number") setCooldown(body.cooldownSec);
        return;
      }
      setCooldown(body?.cooldownSec ?? 90);
      setStep("code");
      toast.message(body?.message ?? "Check your email for a 6-letter code.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/auth/forgot/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code: code.trim().toUpperCase() }),
      });
      const body = (await res.json().catch(() => null)) as {
        error?: string;
        resetToken?: string;
        email?: string;
      } | null;
      if (!res.ok || !body?.resetToken) {
        setError(body?.error ?? "Invalid code.");
        return;
      }
      sessionStorage.setItem(
        "snitch_reset",
        JSON.stringify({ email: body.email ?? email, resetToken: body.resetToken }),
      );
      await navigate({ to: "/reset-password", replace: true });
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-5 py-12">
      <Link to="/" className="mb-10 text-2xl">
        Snitch
      </Link>
      <div className="w-full max-w-sm rounded-2xl bg-card p-8">
        <h1 className="text-3xl">{step === "email" ? "Forgot password" : "Enter code"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {step === "email"
            ? "We will email a 6-letter code if an account exists."
            : "Type the 6-letter code. You can resend after the cooldown."}
        </p>

        {step === "email" ? (
          <form onSubmit={requestCode} className="mt-6 space-y-4">
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
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="pill" className="w-full" disabled={busy}>
              {busy ? "Sending…" : "Send code"}
            </Button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="mt-6 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">6-letter code</Label>
              <Input
                id="code"
                required
                maxLength={6}
                autoComplete="one-time-code"
                className="uppercase tracking-[0.3em]"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>
            {error && (
              <p role="alert" className="text-sm text-destructive">
                {error}
              </p>
            )}
            <Button type="submit" size="pill" className="w-full" disabled={busy || code.length !== 6}>
              {busy ? "Checking…" : "Continue"}
            </Button>
            <Button
              type="button"
              variant="secondary"
              size="pill"
              className="w-full"
              disabled={busy || cooldown > 0}
              onClick={() => void requestCode()}
            >
              {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend code"}
            </Button>
          </form>
        )}

        <button
          type="button"
          className="mt-6 block text-sm text-link"
          onClick={() => void navigate({ to: "/auth", search: { mode: "signin" } })}
        >
          Back to sign in
        </button>
      </div>
    </div>
  );
}
