ALTER TYPE public.lot_status ADD VALUE IF NOT EXISTS 'nhc_exclusive';
ALTER TABLE public.land_lots ADD COLUMN IF NOT EXISTS exclusive_consultants text[] NOT NULL DEFAULT '{}';