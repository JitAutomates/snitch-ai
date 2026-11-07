import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { isPremium, PlanSchema, type Plan } from "@/lib/plan";

export function usePlan() {
  const [plan, setPlan] = useState<Plan>("free");
  const [renewsAt, setRenewsAt] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) {
        setPlan("free");
        setRenewsAt(null);
        return;
      }
      const { data, error } = await (supabase as SupabaseClient)
        .from("profiles")
        .select("plan, plan_renews_at")
        .eq("id", auth.user.id)
        .maybeSingle();
      if (error || !data) {
        setPlan("free");
        setRenewsAt(null);
        return;
      }
      const parsed = PlanSchema.safeParse(data.plan);
      setPlan(parsed.success ? parsed.data : "free");
      setRenewsAt(
        typeof data.plan_renews_at === "string" ? data.plan_renews_at : null,
      );
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
