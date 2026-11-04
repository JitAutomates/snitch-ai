import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createFileRoute } from '@tanstack/react-router';
import { z } from 'zod';

const Body = z.object({ reason: z.enum(['onboarding', 'daily', 'manual']) }).strict();
async function post({ request }: { request: Request }) {
  const parsed = Body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return Response.json({ error: 'reason must be onboarding | daily | manual' }, { status: 400 });
  const token = /^Bearer ([^\s,]+)$/i.exec(request.headers.get('authorization') ?? '')?.[1];
  if (!token) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  try {
    if (parsed.data.reason === 'daily') {
      const secrets = [process.env['NEWS_CRON_SECRET'], process.env['PEER_MONTHLY_CRON_SECRET']].filter((s): s is string => Boolean(s));
      const { createHash, timingSafeEqual } = await import('node:crypto');
      const digest = (s: string) => createHash('sha256').update(s).digest();
      if (!secrets.some(secret => timingSafeEqual(digest(token), digest(secret)))) {
        const { authenticateCronRequest } = await import('@/integrations/supabase/cron-auth');
        const denied = await authenticateCronRequest(request);
        if (denied) return denied;
      }
      const { supabaseAdmin } = await import('@/integrations/supabase/client.server');
      const db = supabaseAdmin as SupabaseClient;
      const { data, error } = await db.from('profiles').select('id').eq('onboarded', true);
      if (error) return Response.json({ error: 'Could not list profiles' }, { status: 500 });
      const users = z.array(z.object({ id: z.string().uuid() })).parse(data ?? []);
      const { extractPeerPrices } = await import('@/server/pricing/extract-peer-prices');
      let updated = 0; let skipped = 0;
      for (const [index, user] of users.entries()) {
        if (index > 0) await new Promise(resolve => setTimeout(resolve, 250));
        // Stop on provider/configuration errors rather than replaying them for every user.
        const result = await extractPeerPrices(user.id);
        updated += result.updated; skipped += result.skipped;
      }
      return Response.json({ ok: true, updated, skipped });
    }
    const url = process.env['SUPABASE_URL'];
    const key = process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['SUPABASE_ANON_KEY'];
    if (!url || !key) return Response.json({ error: 'Authentication is not configured' }, { status: 500 });
    const client = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, storage: undefined } });
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { extractPeerPrices } = await import('@/server/pricing/extract-peer-prices');
    return Response.json({ ok: true, ...await extractPeerPrices(data.user.id) });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Pricing refresh failed';
    const safe = /^(Website extraction failed \(\d+\)|Pricing interpretation failed \(\d+\)|Pricing credentials are not configured|Could not save peer prices; run the peer_prices SQL in Supabase|Could not load competitor websites|Pricing interpretation returned no result)$/.test(message);
    return Response.json({ error: safe ? message : 'Pricing refresh failed' }, { status: 502 });
  }
}
export const Route = createFileRoute('/api/pricing/refresh')({ server: { handlers: { POST: post } } });