CREATE TABLE IF NOT EXISTS public.facade_renders (
  id text PRIMARY KEY,
  facade_name text,
  source_url text,
  widened_url text NOT NULL,
  aspect text NOT NULL DEFAULT '3x2',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Ensure anon (unauthenticated users) can read and write to the table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facade_renders TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.facade_renders TO authenticated;
GRANT ALL ON public.facade_renders TO service_role;

ALTER TABLE public.facade_renders ENABLE ROW LEVEL SECURITY;

-- Allow anon to read
DROP POLICY IF EXISTS "facade_renders_anon_read" ON public.facade_renders;
CREATE POLICY "facade_renders_anon_read" ON public.facade_renders FOR SELECT TO anon USING (true);

-- Allow anon to insert (necessary for upsert)
DROP POLICY IF EXISTS "facade_renders_anon_write" ON public.facade_renders;
CREATE POLICY "facade_renders_anon_write" ON public.facade_renders FOR INSERT TO anon WITH CHECK (true);

-- Allow anon to update (necessary for upsert)
DROP POLICY IF EXISTS "facade_renders_anon_update" ON public.facade_renders;
CREATE POLICY "facade_renders_anon_update" ON public.facade_renders FOR UPDATE TO anon USING (true) WITH CHECK (true);
