import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { requireUser, getPlan } from "@/server/require-user";

const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

const Body = z.object({
  id: z.string().uuid(),
  pinned: z.boolean(),
});

async function post({ request }: { request: Request }) {
  const auth = await requireUser(request);
  if (auth instanceof Response) return auth;
  if ((await getPlan(auth.db, auth.user.id)) !== "premium") {
    return json({ error: "Pinning requires Premium" }, 403);
  }
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return json({ error: "Invalid pin payload" }, 400);

  const { data, error } = await auth.db
    .from("briefs")
    .update({ pinned: parsed.data.pinned })
    .eq("id", parsed.data.id)
    .eq("user_id", auth.user.id)
    .select("id, pinned")
    .maybeSingle();

  if (error || !data) return json({ error: "Could not save pin" }, 502);
  return json({ id: data.id, pinned: data.pinned });
}

export const Route = createFileRoute("/api/briefs/pin")({
  server: { handlers: { POST: post } },
});
