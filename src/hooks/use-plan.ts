import { useCallback, useEffect, useState } from "react";
import { isPremium, type Plan } from "@/lib/plan";
import { authFetch } from "@/lib/api";

export function usePlan() {
  const [plan, setPlan] = useState<Plan>("free");
  const [renewsAt, setRenewsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const data = await authFetch("/api/me/profile");
      setPlan(data.plan === "premium" ? "premium" : "free");
      setRenewsAt(typeof data.renewsAt === "string" ? data.renewsAt : null);
    } catch {
      setPlan("free");
      setRenewsAt(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return {
    plan,
    premium: isPremium(plan),
    renewsAt,
    loading,
    reload,
  };
}
