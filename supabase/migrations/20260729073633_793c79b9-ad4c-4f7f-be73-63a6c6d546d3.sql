-- profiles
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "profiles_select" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "profiles_update_own" ON public.profiles FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "profiles_insert_own" ON public.profiles FOR INSERT TO authenticated WITH CHECK (id = auth.uid());

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name'), NEW.email)
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

-- land lots
CREATE TYPE public.lot_status AS ENUM ('available','on_hold','sold');
CREATE TABLE public.land_lots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estate text NOT NULL DEFAULT '',
  suburb text NOT NULL DEFAULT '',
  developer text NOT NULL DEFAULT '',
  developer_contact_name text,
  developer_contact_phone text,
  developer_contact_email text,
  lot_number text,
  address text,
  land_size numeric,
  frontage numeric,
  land_price numeric,
  titled boolean NOT NULL DEFAULT false,
  registration_date date,
  status public.lot_status NOT NULL DEFAULT 'available',
  deadline date,
  notes text,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.land_lots TO authenticated;
GRANT ALL ON public.land_lots TO service_role;
ALTER TABLE public.land_lots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "land_lots_all" ON public.land_lots FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER land_lots_updated_at BEFORE UPDATE ON public.land_lots FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX land_lots_status_idx ON public.land_lots(status);
CREATE INDEX land_lots_suburb_idx ON public.land_lots(suburb);

-- packages
CREATE TYPE public.package_status AS ENUM ('draft','live','sold');
CREATE TABLE public.packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid REFERENCES public.land_lots(id) ON DELETE SET NULL,
  name text,
  housing_type text NOT NULL DEFAULT 'single-storey',
  design text NOT NULL DEFAULT '',
  range_id text NOT NULL DEFAULT 'value',
  facade_id text,
  facade_name text,
  facade_url text,
  facade_uplift numeric NOT NULL DEFAULT 0,
  house_price numeric,
  land_price numeric,
  total_price numeric,
  beds text,
  baths text,
  cars text,
  floorplan_size text,
  status public.package_status NOT NULL DEFAULT 'draft',
  deadline date,
  needs_review boolean NOT NULL DEFAULT false,
  notes text,
  flyer_data jsonb,
  created_by uuid,
  updated_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.packages TO authenticated;
GRANT ALL ON public.packages TO service_role;
ALTER TABLE public.packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "packages_all" ON public.packages FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER packages_updated_at BEFORE UPDATE ON public.packages FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX packages_status_idx ON public.packages(status);
CREATE INDEX packages_lot_idx ON public.packages(lot_id);

-- package requests
CREATE TYPE public.request_status AS ENUM ('open','in_progress','done','declined');
CREATE TABLE public.package_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lot_id uuid REFERENCES public.land_lots(id) ON DELETE CASCADE,
  requested_design text,
  requested_range text,
  note text,
  status public.request_status NOT NULL DEFAULT 'open',
  handled_by uuid,
  package_id uuid REFERENCES public.packages(id) ON DELETE SET NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.package_requests TO authenticated;
GRANT ALL ON public.package_requests TO service_role;
ALTER TABLE public.package_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "package_requests_all" ON public.package_requests FOR ALL TO authenticated USING (true) WITH CHECK (true);
CREATE TRIGGER package_requests_updated_at BEFORE UPDATE ON public.package_requests FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- widened facade cache
CREATE TABLE public.facade_renders (
  id text PRIMARY KEY,
  facade_name text,
  source_url text,
  widened_url text NOT NULL,
  aspect text NOT NULL DEFAULT '3x2',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.facade_renders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facade_renders TO authenticated;
GRANT ALL ON public.facade_renders TO service_role;
ALTER TABLE public.facade_renders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "facade_renders_read" ON public.facade_renders FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "facade_renders_write" ON public.facade_renders FOR ALL TO authenticated USING (true) WITH CHECK (true);