DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'profiles','briefs','competitors','niche_news','peer_prices',
    'competitor_activity','competitor_activity_runs','competitor_summaries',
    'brief_generation_limits','auth_rate_events','password_reset_challenges'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format('REVOKE ALL ON TABLE public.%I FROM authenticated, anon, public', t);
    EXECUTE format('GRANT ALL ON TABLE public.%I TO service_role', t);
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  END LOOP;
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT policyname, tablename FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename IN (
        'profiles','briefs','competitors','niche_news','peer_prices',
        'competitor_activity','competitor_activity_runs','competitor_summaries',
        'brief_generation_limits','auth_rate_events','password_reset_challenges'
      )
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', r.policyname, r.tablename);
  END LOOP;
END $$;
