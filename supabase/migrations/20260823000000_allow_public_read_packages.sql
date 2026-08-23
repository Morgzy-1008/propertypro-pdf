-- Allow anonymous / public read access to active packages and land lots
-- so customers scanning flyer QR codes can see real database packages.

DROP POLICY IF EXISTS packages_public_select ON public.packages;
CREATE POLICY packages_public_select ON public.packages
  FOR SELECT TO anon, authenticated
  USING (status != 'sold');

DROP POLICY IF EXISTS land_lots_public_select ON public.land_lots;
CREATE POLICY land_lots_public_select ON public.land_lots
  FOR SELECT TO anon, authenticated
  USING (true);
