-- 1. Approved staff allowlist (server-side source of truth)
CREATE TABLE public.approved_staff (
  email text PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.approved_staff TO authenticated;
GRANT ALL ON public.approved_staff TO service_role;

ALTER TABLE public.approved_staff ENABLE ROW LEVEL SECURITY;

INSERT INTO public.approved_staff (email) VALUES
  ('morgan.hales@hudsonhomes.com.au'),
  ('alyssa.pippig@hudsonhomes.com.au'),
  ('jesse.jenkins@hudsonhomes.com.au'),
  ('adrian.baxter@hudsonhomes.com.au');

-- 2. Security definer helper: is the current user approved staff?
CREATE OR REPLACE FUNCTION public.is_approved_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.approved_staff s
    JOIN auth.users u ON lower(u.email) = s.email
    WHERE u.id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_approved_staff() FROM public;
GRANT EXECUTE ON FUNCTION public.is_approved_staff() TO authenticated, service_role;

-- approved_staff readable only by staff themselves
CREATE POLICY approved_staff_select ON public.approved_staff
  FOR SELECT TO authenticated
  USING (public.is_approved_staff());

-- 3. Reject signups for non-approved emails at the database level
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.approved_staff s WHERE s.email = lower(NEW.email)
  ) THEN
    RAISE EXCEPTION 'Account creation is restricted to approved Hudson Homes staff.';
  END IF;

  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Replace always-true policies with staff-scoped policies
DROP POLICY IF EXISTS land_lots_all ON public.land_lots;
CREATE POLICY land_lots_staff ON public.land_lots
  FOR ALL TO authenticated
  USING (public.is_approved_staff())
  WITH CHECK (public.is_approved_staff());

DROP POLICY IF EXISTS packages_all ON public.packages;
CREATE POLICY packages_staff ON public.packages
  FOR ALL TO authenticated
  USING (public.is_approved_staff())
  WITH CHECK (public.is_approved_staff());

DROP POLICY IF EXISTS package_requests_all ON public.package_requests;
CREATE POLICY package_requests_staff ON public.package_requests
  FOR ALL TO authenticated
  USING (public.is_approved_staff())
  WITH CHECK (public.is_approved_staff());

DROP POLICY IF EXISTS facade_renders_write ON public.facade_renders;
CREATE POLICY facade_renders_staff_write ON public.facade_renders
  FOR ALL TO authenticated
  USING (public.is_approved_staff())
  WITH CHECK (public.is_approved_staff());

-- 5. Profiles: own row always, team list only for approved staff
DROP POLICY IF EXISTS profiles_select ON public.profiles;
CREATE POLICY profiles_select_own_or_staff ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_approved_staff());
