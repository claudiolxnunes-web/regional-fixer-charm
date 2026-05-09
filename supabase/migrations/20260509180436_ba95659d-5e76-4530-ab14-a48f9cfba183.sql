ALTER TABLE public.representatives
  ADD COLUMN IF NOT EXISTS company text,
  ADD COLUMN IF NOT EXISTS company_cnpj text,
  ADD COLUMN IF NOT EXISTS home_city text;