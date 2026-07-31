CREATE TABLE public.developers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  contact_name text,
  contact_phone text,
  contact_email text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.developers TO authenticated;
GRANT ALL ON public.developers TO service_role;

ALTER TABLE public.developers ENABLE ROW LEVEL SECURITY;

CREATE POLICY developers_staff ON public.developers
  FOR ALL TO authenticated
  USING (private.is_approved_staff())
  WITH CHECK (private.is_approved_staff());

CREATE TRIGGER developers_set_updated_at
  BEFORE UPDATE ON public.developers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();