-- Run in your Supabase SQL editor. Safe to run again.
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
ALTER TABLE public.briefs ENABLE ROW LEVEL SECURITY;
CREATE INDEX IF NOT EXISTS briefs_user_day_idx ON public.briefs (user_id, day DESC);
CREATE INDEX IF NOT EXISTS briefs_user_pinned_idx ON public.briefs (user_id, pinned) WHERE pinned = true;
DROP POLICY IF EXISTS "Users read own briefs" ON public.briefs;
CREATE POLICY "Users read own briefs" ON public.briefs FOR SELECT TO authenticated
  USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Users pin own briefs" ON public.briefs;
CREATE POLICY "Users pin own briefs" ON public.briefs FOR UPDATE TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
NOTIFY pgrst, 'reload schema';