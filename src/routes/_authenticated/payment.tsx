import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/payment")({
  component: PaymentPage,
});

function PaymentPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  function activateDemo() {
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    localStorage.setItem(
      "snitch_premium",
      JSON.stringify({ active: true, nextPaymentAt: next.toISOString() }),
    );
    navigate({ to: "/billing" as never });
  }

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut({ scope: "global" });
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-5">
      <Link to="/" className="text-xl tracking-tight">
        Snitch
      </Link>
      <div className="w-full max-w-sm space-y-4 rounded-2xl bg-card p-8 text-center">
        <h1 className="text-2xl tracking-tight">Payment</h1>
        <p className="text-sm text-muted-foreground">
          Stripe is not connected yet. Use the demo button to simulate Premium.
        </p>
        <Button size="pill" className="w-full" onClick={activateDemo}>
          Activate Premium (demo)
        </Button>
        <Button asChild variant="secondary" size="pill" className="w-full">
          <Link to="/billing">Back to billing</Link>
        </Button>
      </div>
      <button type="button" className="text-sm text-muted-foreground" onClick={signOut}>
        Sign out
      </button>
    </div>
  );
}
