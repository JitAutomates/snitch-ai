import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";

export function PlanBlur({ locked, loading = false, label, children }: {
  locked: boolean;
  loading?: boolean;
  label: string;
  children: ReactNode;
}) {
  if (!locked) return <>{children}</>;
  return (
    <div className="relative isolate">
      <div inert aria-hidden="true" className="pointer-events-none select-none blur-sm">
        {children}
      </div>
      {!loading && (
        <Button asChild variant="ghost" className="absolute inset-0 z-10 h-full w-full rounded-none p-0 hover:bg-transparent">
          <Link to="/billing" aria-label={`View plans to unlock ${label}`} />
        </Button>
      )}
    </div>
  );
}