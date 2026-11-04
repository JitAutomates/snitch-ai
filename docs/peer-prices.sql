-- Run manually in your Supabase SQL editor. This file has not been applied.
CREATE TABLE public.peer_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  competitor_id uuid NOT NULL REFERENCES public.competitors(id) ON DELETE CASCADE,
  competitor_name text NOT NULL,
  company_url text,
  plan_label text NOT NULL DEFAULT 'default',
  currency text NOT NULL DEFAULT 'USD',
  amount numeric CHECK (amount >= 0),
  amount_display text,
  observed_at timestamptz NOT NULL DEFAULT now(),
  source_url text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.peer_prices TO authenticated;
GRANT ALL ON public.peer_prices TO service_role;
REVOKE ALL ON public.peer_prices FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.peer_prices FROM authenticated;
ALTER TABLE public.peer_prices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own peer prices" ON public.peer_prices
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE INDEX peer_prices_user_observed_idx ON public.peer_prices (user_id, observed_at DESC);
CREATE INDEX peer_prices_user_competitor_observed_idx ON public.peer_prices (user_id, competitor_id, observed_at DESC);
NOTIFY pgrst, 'reload schema';
