-- 1. Private schema for internal security helpers (not exposed via the Data API)
CREATE SCHEMA IF NOT EXISTS private;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.is_approved_staff()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.approved_staff s
    JOIN auth.users u ON lower(u.email) = s.email
    WHERE u.id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION private.is_approved_staff() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.is_approved_staff() TO authenticated, service_role;

-- 2. Repoint every policy to the private helper
DROP POLICY IF EXISTS approved_staff_select ON public.approved_staff;
CREATE POLICY approved_staff_select ON public.approved_staff
  FOR SELECT TO authenticated USING (private.is_approved_staff());

DROP POLICY IF EXISTS facade_renders_staff_write ON public.facade_renders;
CREATE POLICY facade_renders_staff_write ON public.facade_renders
  FOR ALL TO authenticated
  USING (private.is_approved_staff()) WITH CHECK (private.is_approved_staff());

DROP POLICY IF EXISTS land_lots_staff ON public.land_lots;
CREATE POLICY land_lots_staff ON public.land_lots
  FOR ALL TO authenticated
  USING (private.is_approved_staff()) WITH CHECK (private.is_approved_staff());

DROP POLICY IF EXISTS package_requests_staff ON public.package_requests;
CREATE POLICY package_requests_staff ON public.package_requests
  FOR ALL TO authenticated
  USING (private.is_approved_staff()) WITH CHECK (private.is_approved_staff());

DROP POLICY IF EXISTS packages_staff ON public.packages;
CREATE POLICY packages_staff ON public.packages
  FOR ALL TO authenticated
  USING (private.is_approved_staff()) WITH CHECK (private.is_approved_staff());

DROP POLICY IF EXISTS profiles_select_own_or_staff ON public.profiles;
CREATE POLICY profiles_select_own_or_staff ON public.profiles
  FOR SELECT TO authenticated
  USING ((id = auth.uid()) OR private.is_approved_staff());

-- 3. Remove the API-callable SECURITY DEFINER function
DROP FUNCTION IF EXISTS public.is_approved_staff();

-- 4. Scope the private facades bucket to approved staff only
DROP POLICY IF EXISTS facades_read ON storage.objects;
DROP POLICY IF EXISTS facades_write ON storage.objects;
DROP POLICY IF EXISTS facades_update ON storage.objects;

CREATE POLICY facades_read ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'facades' AND private.is_approved_staff());

CREATE POLICY facades_write ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'facades' AND private.is_approved_staff());

CREATE POLICY facades_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'facades' AND private.is_approved_staff())
  WITH CHECK (bucket_id = 'facades' AND private.is_approved_staff());