-- Align repo with live DB: authenticated cannot set plan / Stripe fields.

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_updated_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan_renews_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_customer_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_subscription_id text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS industry text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS product text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS region text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS scale text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS sales_volume numeric;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_adult boolean;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS peers_resolved_at timestamptz;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS peers_resolve_status text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS profile_changed_at timestamptz;

REVOKE UPDATE ON TABLE public.profiles FROM authenticated;
REVOKE UPDATE ON TABLE public.profiles FROM anon;
REVOKE UPDATE ON TABLE public.profiles FROM public;

GRANT UPDATE (
  display_name,
  email_opt_in,
  age_verified,
  is_adult,
  onboarded,
  industry,
  product,
  region,
  scale,
  sales_volume
) ON TABLE public.profiles TO authenticated;

GRANT SELECT ON TABLE public.profiles TO authenticated;
GRANT ALL ON TABLE public.profiles TO service_role;

CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  jwt_role text;
  req_role text;
BEGIN
  jwt_role := coalesce(
    auth.jwt() ->> 'role',
    current_setting('request.jwt.claim.role', true),
    ''
  );
  req_role := coalesce(auth.role(), '');

  IF req_role = 'service_role' OR jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    NEW.id := OLD.id;
    NEW.created_at := OLD.created_at;
    NEW.plan := OLD.plan;
    NEW.plan_updated_at := OLD.plan_updated_at;
    NEW.plan_renews_at := OLD.plan_renews_at;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    NEW.peers_resolved_at := OLD.peers_resolved_at;
    NEW.peers_resolve_status := OLD.peers_resolve_status;
  ELSIF TG_OP = 'INSERT' THEN
    NEW.plan := 'free';
    NEW.plan_updated_at := NULL;
    NEW.plan_renews_at := NULL;
    NEW.stripe_customer_id := NULL;
    NEW.stripe_subscription_id := NULL;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_billing_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN public.protect_profile_fields();
END;
$$;

DROP TRIGGER IF EXISTS profiles_protect ON public.profiles;
CREATE TRIGGER profiles_protect
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_fields();

DROP TRIGGER IF EXISTS trg_protect_profile_billing ON public.profiles;
CREATE TRIGGER trg_protect_profile_billing
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.protect_profile_billing_columns();
