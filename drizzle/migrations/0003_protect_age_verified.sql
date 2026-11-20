-- age_verified / is_adult: same protection model as plan (server-only writes)

REVOKE UPDATE (age_verified, is_adult) ON TABLE public.profiles FROM authenticated;

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
    -- Age flags
    NEW.age_verified := OLD.age_verified;
    NEW.is_adult := OLD.is_adult;
    -- Billing
    NEW.plan := OLD.plan;
    NEW.plan_updated_at := OLD.plan_updated_at;
    NEW.plan_renews_at := OLD.plan_renews_at;
    NEW.stripe_customer_id := OLD.stripe_customer_id;
    NEW.stripe_subscription_id := OLD.stripe_subscription_id;
    -- Peer metadata
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
