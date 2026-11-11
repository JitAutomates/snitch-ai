import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

/** Purple triangular warning for active severe items (any section). */
export function SevereBadge({
  className,
  title = "Severe — high significance (shown for 1 week)",
}: {
  className?: string;
  title?: string;
}) {
  return (
    <AlertTriangle
      className={cn("h-4 w-4 shrink-0 text-purple-500", className)}
      fill="currentColor"
      strokeWidth={1.5}
      aria-label={title}
      title={title}
    />
  );
}
