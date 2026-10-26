import { createClient } from "@supabase/supabase-js";
import {
  buildPeerResolverQuery,
  PEER_RESOLVER_NUM_RESULTS,
} from "./exa-query";

export type PeerProfile = {
  industry: string;
  product: string;
  region: string;
  scale: string;
  /** numeric sales volume as string for the template, e.g. "1200000" */
  sales: string;
};

export type ResolvedPeer = {
  name: string;
  company_url: string | null;
  scale: string | null;
  sales_estimate: string | null;
  exa_id: string | null;
  rank: number;
};

function adminDb() {
  const url = process.env['SUPABASE_URL']!;
  const key = process.env['SUPABASE_SERVICE_ROLE_KEY']!;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** ONLY function that may call Exa. Do not import this from client components. */
export async function resolvePeersWithExa(
  userId: string,
  profile: PeerProfile,
): Promise<{ peers: ResolvedPeer[]; query: string }> {
  const apiKey = process.env['EXA_API_KEY'];
  if (!apiKey) throw new Error("EXA_API_KEY is not configured");

  const query = buildPeerResolverQuery(profile);

  const res = await fetch("https://api.exa.ai/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      query,
      type: "auto",
      category: "company",
      numResults: PEER_RESOLVER_NUM_RESULTS,
      contents: { highlights: true },
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Exa error ${res.status}: ${body.slice(0, 400)}`);
  }

  const data = (await res.json()) as {
    results?: Array<{
      title?: string;
      url?: string;
      entities?: Array<{
        id?: string;
        type?: string;
        properties?: {
          name?: string;
          description?: string;
          workforce?: { total?: number };
          // sales rarely present; keep estimate text from description if needed
        };
      }>;
    }>;
  };

  const peers: ResolvedPeer[] = [];
  const seen = new Set<string>();

  for (const row of data.results ?? []) {
    const entity = row.entities?.find((e) => e.type === "company");
    const name = (entity?.properties?.name || row.title || "").trim();
    const url = (row.url || "").trim() || null;
    if (!name) continue;
    const key = (url || name).toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);

    const headcount = entity?.properties?.workforce?.total;
    const scaleGuess =
      headcount == null
        ? null
        : headcount <= 12
          ? "indie/small"
          : headcount < 50
            ? "small team"
            : "larger team";

    peers.push({
      name,
      company_url: url,
      scale: scaleGuess,
      sales_estimate: null, // Exa rarely has true sales; leave null or fill later
      exa_id: entity?.id ?? null,
      rank: peers.length + 1,
    });

    if (peers.length >= PEER_RESOLVER_NUM_RESULTS) break;
  }

  const db = adminDb();

  // Replace previous peer set for this user
  await db.from("competitors").delete().eq("user_id", userId);

  if (peers.length) {
    await db.from("competitors").insert(
      peers.map((p) => ({
        user_id: userId,
        name: p.name,
        company_url: p.company_url,
        scale: p.scale,
        sales_estimate: p.sales_estimate,
        exa_id: p.exa_id,
        rank: p.rank,
        source: "exa",
        resolved_at: new Date().toISOString(),
      })),
    );
  }

  await db
    .from("profiles")
    .update({
      industry: profile.industry,
      product: profile.product,
      region: profile.region,
      scale: profile.scale,
      sales_volume: Number(profile.sales) || null,
      peers_resolved_at: new Date().toISOString(),
      peers_resolve_status: "ok",
      onboarded: true,
    })
    .eq("id", userId);

  return { peers, query };
}
