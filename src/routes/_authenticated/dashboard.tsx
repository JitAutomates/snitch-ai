import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard | Snitch" },
      { name: "description", content: "Your Snitch intelligence dashboard." },
      { property: "og:title", content: "Dashboard | Snitch" },
      { property: "og:description", content: "Your Snitch intelligence dashboard." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Dashboard,
});

// Temporary landing spot after sign-in. Onboarding and the full dashboard come next.
function Dashboard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  async function signOut() {
    await queryClient.cancelQueries();
    queryClient.clear();
    // scope "global" revokes the session on the server, not just in this browser
    await supabase.auth.signOut({ scope: "global" });
    navigate({ to: "/auth", replace: true });
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-5 text-center">
      <h1 className="text-4xl">You are signed in.</h1>
      <p className="max-w-md text-muted-foreground">
        Onboarding and your dashboard are being built next.
      </p>
      <Button variant="secondary" size="pill" onClick={signOut}>
        Sign out
      </Button>
    </div>
  );
}
