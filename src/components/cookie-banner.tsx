import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";

const KEY = "snitch-cookie-consent";

/** Snitch only uses essential cookies (sign-in). No tracking, no session replay. */
export function CookieBanner() {
  const [show, setShow] = useState(false);
  useEffect(() => setShow(!localStorage.getItem(KEY)), []);
  if (!show) return null;

  const choose = (v: string) => {
    localStorage.setItem(KEY, v);
    setShow(false);
  };

  return (
    <div className="fixed inset-x-3 bottom-3 z-50 mx-auto max-w-xl rounded-2xl border bg-card p-5 shadow-lg">
      <p className="text-sm text-muted-foreground">
        We use only essential cookies to keep you signed in. No advertising or tracking cookies, and
        no session recording.
      </p>
      <div className="mt-4 flex gap-2">
        <Button size="sm" onClick={() => choose("accepted")}>Accept</Button>
        <Button size="sm" variant="secondary" onClick={() => choose("essential")}>Essential only</Button>
      </div>
    </div>
  );
}
