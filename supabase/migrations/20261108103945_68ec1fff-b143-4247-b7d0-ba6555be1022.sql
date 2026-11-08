CREATE TABLE public.brief_generation_limits (
 user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
 last_generated_at timestamptz, usage_day date, regeneration_count integer NOT NULL DEFAULT 0,
 reservation_id uuid, reserved_until timestamptz, reserved_regeneration boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.brief_generation_limits TO service_role;
ALTER TABLE public.brief_generation_limits ENABLE ROW LEVEL SECURITY;
CREATE OR REPLACE FUNCTION public.reserve_brief_generation(p_user_id uuid, p_reason text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE s public.brief_generation_limits; t timestamptz := clock_timestamp(); d date := (t AT TIME ZONE 'UTC')::date; regen boolean; premium boolean; ticket uuid := gen_random_uuid();
BEGIN
 IF p_reason NOT IN ('manual','onboarding','daily') THEN RAISE EXCEPTION 'Invalid reason'; END IF;
 INSERT INTO public.brief_generation_limits(user_id) VALUES(p_user_id) ON CONFLICT DO NOTHING;
 SELECT * INTO s FROM public.brief_generation_limits WHERE user_id=p_user_id FOR UPDATE;
 SELECT EXISTS(SELECT 1 FROM public.briefs WHERE user_id=p_user_id AND day=d) INTO regen;
 SELECT plan='premium' INTO premium FROM public.profiles WHERE id=p_user_id;
 IF s.reserved_until > t THEN RETURN jsonb_build_object('allowed',false,'status',429,'error','A brief is already generating. Please wait.','retry_after',greatest(1,ceil(extract(epoch FROM s.reserved_until-t)))); END IF;
 IF s.last_generated_at + interval '3 minutes' > t THEN RETURN jsonb_build_object('allowed',false,'status',429,'error','Please wait 3 minutes after generation before regenerating.','retry_after',greatest(1,ceil(extract(epoch FROM s.last_generated_at+interval '3 minutes'-t)))); END IF;
 IF regen AND p_reason <> 'daily' AND NOT coalesce(premium,false) THEN RETURN jsonb_build_object('allowed',false,'status',403,'error','Brief regeneration requires Premium.'); END IF;
 IF regen AND p_reason <> 'daily' AND s.usage_day=d AND s.regeneration_count >= 4 THEN RETURN jsonb_build_object('allowed',false,'status',429,'error','You have used all 4 brief regenerations for today (UTC).','retry_after',greatest(1,ceil(extract(epoch FROM ((d+1)::timestamp AT TIME ZONE 'UTC')-t)))); END IF;
 UPDATE public.brief_generation_limits SET reservation_id=ticket,reserved_until=t+interval '10 minutes',reserved_regeneration=regen AND p_reason<>'daily',updated_at=t WHERE user_id=p_user_id;
 RETURN jsonb_build_object('allowed',true,'reservation_id',ticket);
END $$;
REVOKE ALL ON FUNCTION public.reserve_brief_generation(uuid,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_brief_generation(uuid,text) TO service_role;
CREATE OR REPLACE FUNCTION public.finish_brief_generation(p_user_id uuid,p_reservation_id uuid,p_success boolean)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE t timestamptz:=clock_timestamp(); d date:=(t AT TIME ZONE 'UTC')::date;
BEGIN
 UPDATE public.brief_generation_limits SET
 last_generated_at=CASE WHEN p_success THEN t ELSE last_generated_at END,
 regeneration_count=CASE WHEN p_success AND reserved_regeneration THEN (CASE WHEN usage_day=d THEN regeneration_count ELSE 0 END)+1 ELSE regeneration_count END,
 usage_day=CASE WHEN p_success AND reserved_regeneration THEN d ELSE usage_day END,
 reservation_id=null,reserved_until=null,reserved_regeneration=false,updated_at=t
 WHERE user_id=p_user_id AND reservation_id=p_reservation_id;
 RETURN FOUND;
END $$;
REVOKE ALL ON FUNCTION public.finish_brief_generation(uuid,uuid,boolean) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.finish_brief_generation(uuid,uuid,boolean) TO service_role;
ALTER TABLE public.profiles ADD COLUMN profile_changed_at timestamptz;
CREATE OR REPLACE FUNCTION public.enforce_profile_cooldown()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
 IF ROW(NEW.display_name,NEW.industry,NEW.product,NEW.region,NEW.scale,NEW.sales_volume) IS DISTINCT FROM ROW(OLD.display_name,OLD.industry,OLD.product,OLD.region,OLD.scale,OLD.sales_volume) THEN
  IF OLD.onboarded AND OLD.profile_changed_at+interval '14 days' > clock_timestamp() THEN
   RAISE EXCEPTION 'Profile changes are available again at %', OLD.profile_changed_at+interval '14 days' USING ERRCODE='P0001';
  END IF;
  NEW.profile_changed_at:=clock_timestamp();
 ELSE NEW.profile_changed_at:=OLD.profile_changed_at;
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION public.enforce_profile_cooldown() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER enforce_profile_cooldown BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.enforce_profile_cooldown();