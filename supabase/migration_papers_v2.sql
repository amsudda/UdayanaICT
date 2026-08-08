-- Migration to support structured Papers categorization (Past, Provincial, Model)

-- 1. Add new columns
ALTER TABLE public.papers 
  ADD COLUMN IF NOT EXISTS paper_type text check (paper_type in ('past_paper', 'provincial_paper', 'model_paper')),
  ADD COLUMN IF NOT EXISTS year integer,
  ADD COLUMN IF NOT EXISTS province text,
  ADD COLUMN IF NOT EXISTS marking_scheme_url text;

-- 2. Update existing rows to a default type to avoid null constraints
UPDATE public.papers SET paper_type = 'model_paper' WHERE paper_type IS NULL;

-- 3. Enforce NOT NULL on paper_type now that existing data is migrated
ALTER TABLE public.papers ALTER COLUMN paper_type SET NOT NULL;
