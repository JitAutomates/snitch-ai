import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUser, authError, getPlan } from "@/server/require-user";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const PatchBody = z
  .object({
    display_name: z.string().trim().max(80).nullable().optional(),
    industry: z.string().trim().max(120).optional(),
    product: z.string().trim().max(200).optional(),
    region: z.string().trim().max(120).optional(),
    scale: z.string().trim().max(80).optional(),
    sales_volume: z.number().finite().nonnegative().optional(),
    email_opt_in: z.boolean().optional(),
    onboarded: z.boolean().optional(),
  })
  .strict();

async function get({ request }: { request: Request }) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const { data, error } = await auth.db
    .from("profiles")
    .select(
      "display_name, industry, product, region, scale, sales_volume, email_opt_in, onboarded, plan, plan_renews_at, is_adult, age_verified",
    )
    .eq("id", auth.user.id)
    .maybeSingle();
  if (error) return json({ error: "Could not load profile" }, 502);
  return json({
    profile: data,
    plan: data?.plan === "premium" ? "premium" : "free",
    premium: data?.plan === "premium",
    renewsAt: data?.plan_renews_at ?? null,
  });
}

async function patch({ request }: { request: Request }) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  const parsed = PatchBody.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid profile payload" }, 400);

  const payload: Record<string, unknown> = { ...parsed.data };
  if ("display_name" in payload && payload.display_name === "") {
    payload.display_name = null;
  }

  const { data, error } = await auth.db
    .from("profiles")
    .update(payload)
    .eq("id", auth.user.id)
    .select(
      "display_name, industry, product, region, scale, sales_volume, email_opt_in, onboarded, plan, plan_renews_at",
    )
    .maybeSingle();

  if (error) {
    // Profile cooldown trigger uses P0001
    return json(
      { error: error.message || "Could not save profile" },
      error.code === "P0001" ? 429 : 502,
    );
  }
  return json({
    profile: data,
    plan: await getPlan(auth.db, auth.user.id),
  });
}

export const Route = createFileRoute("/api/me/profile")({
  server: { handlers: { GET: get, PATCH: patch } },
});
