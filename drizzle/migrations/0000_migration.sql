CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text,
  age_verified boolean NOT NULL DEFAULT false,
  email_opt_in boolean NOT NULL DEFAULT true,
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile read" ON public.profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "own profile update" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Block field tampering: users may only change display_name and email_opt_in
CREATE OR REPLACE FUNCTION public.protect_profile_fields()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF current_user = 'authenticated' THEN
    NEW.age_verified := OLD.age_verified;
    NEW.onboarded := OLD.onboarded;
    NEW.id := OLD.id;
    NEW.created_at := OLD.created_at;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER profiles_protect BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_fields();

-- Before insert: enforce 18+, then replace birth date with a boolean flag (birth date never stored)
CREATE OR REPLACE FUNCTION public.verify_age_on_signup()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE bd date;
BEGIN
  IF NEW.raw_user_meta_data ? 'birth_date' THEN
    bd := (NEW.raw_user_meta_data->>'birth_date')::date;
    IF bd > (current_date - interval '18 years') THEN
      RAISE EXCEPTION 'You must be 18 or older to use Snitch';
    END IF;
    NEW.raw_user_meta_data := (NEW.raw_user_meta_data - 'birth_date') || '{"age_verified": true}'::jsonb;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_verify_age BEFORE INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.verify_age_on_signup();

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, age_verified)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'display_name',
          COALESCE((NEW.raw_user_meta_data->>'age_verified')::boolean, false));
  RETURN NEW;
END $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();