import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

/** Legacy route: never grant Premium here. Redirect to billing / real Checkout. */
export const Route = createFileRoute("/_authenticated/payment")({
  head: () => ({
    meta: [
      { title: "Payment | Snitch" },
      { name: "description", content: "Upgrade to Snitch Premium via secure checkout." },
      { property: "og:title", content: "Payment | Snitch" },
      { property: "og:description", content: "Upgrade to Snitch Premium via secure checkout." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaymentRedirect,
});

function PaymentRedirect() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      localStorage.removeItem("snitch_premium");
    } catch {
      /* ignore */
    }

    let cancelled = false;

    async function go() {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;
        if (!token) {
          await navigate({ to: "/auth", replace: true });
          return;
        }

        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        });
        const body = (await res.json().catch(() => null)) as {
          url?: string;
          error?: string;
        } | null;

        if (!res.ok || !body?.url) {
          if (!cancelled) {
            setError(body?.error ?? "Could not start checkout.");
            setBusy(false);
          }
          return;
        }

        window.location.href = body.url;
      } catch {
        if (!cancelled) {
          setError("Could not start checkout.");
          setBusy(false);
        }
      }
    }

    void go();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-5">
      <Link to="/" className="text-xl tracking-tight">
        Snitch
      </Link>
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-8 text-center">
        <h1 className="text-2xl tracking-tight">Payment</h1>
        {error ? (
          <>
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
            <Button asChild size="pill" className="w-full">
              <Link to="/billing">Go to billing</Link>
            </Button>
          </>
        ) : (
          <p className="text-sm text-muted-foreground">
            {busy ? "Redirecting to secure checkout…" : "Continue on the billing page."}
          </p>
        )}
        {!busy && !error && (
          <Button asChild variant="secondary" size="pill" className="w-full">
            <Link to="/billing">Back to billing</Link>
          </Button>
        )}
      </div>
    </div>
  );
}
