-- Free users: only today's brief (UTC). Premium: full own history.
-- Matches live policies on public.briefs.

CREATE OR REPLACE FUNCTION public.is_premium_user()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles p
    WHERE p.id = auth.uid()
      AND p.plan = 'premium'
  );
$$;

REVOKE ALL ON FUNCTION public.is_premium_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_premium_user() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_premium_user() TO service_role;

CREATE TABLE IF NOT EXISTS public.briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  day date NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  action_plan text NOT NULL,
  highlights jsonb NOT NULL DEFAULT '[]'::jsonb,
  pinned boolean NOT NULL DEFAULT false,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, day)
);

GRANT SELECT ON public.briefs TO authenticated;
GRANT ALL ON public.briefs TO service_role;
REVOKE ALL ON public.briefs FROM anon;
REVOKE INSERT, UPDATE, DELETE ON public.briefs FROM authenticated;
GRANT UPDATE (pinned) ON public.briefs TO authenticated;

CREATE INDEX IF NOT EXISTS briefs_user_day_idx ON public.briefs (user_id, day DESC);
CREATE INDEX IF NOT EXISTS briefs_user_pinned_idx ON public.briefs (user_id, pinned) WHERE pinned = true;

ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own briefs" ON public.briefs;

CREATE POLICY "Users read own briefs"
  ON public.briefs
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (
      public.is_premium_user()
      OR day = (timezone('utc', now()))::date
    )
  );

DROP POLICY IF EXISTS "Users update own brief pins" ON public.briefs;

CREATE POLICY "Users update own brief pins"
  ON public.briefs
  FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = user_id
    AND (
      public.is_premium_user()
      OR day = (timezone('utc', now()))::date
    )
  )
  WITH CHECK (
    auth.uid() = user_id
    AND (
      public.is_premium_user()
      OR day = (timezone('utc', now()))::date
    )
  );

-- Inserts stay service_role / server only (no authenticated INSERT policy)
