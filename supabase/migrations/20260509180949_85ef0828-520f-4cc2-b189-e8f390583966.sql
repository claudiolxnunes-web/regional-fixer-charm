CREATE TABLE IF NOT EXISTS public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_code text,
  name text NOT NULL,
  product_group text,
  solution text,
  subsolution text,
  line text,
  group_code text,
  base_price numeric DEFAULT 0,
  unit text DEFAULT 'SC',
  active boolean DEFAULT true,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS products_code_unique
  ON public.products (product_code) WHERE product_code IS NOT NULL;

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE POLICY products_read ON public.products FOR SELECT TO authenticated USING (true);
CREATE POLICY products_insert ON public.products FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY products_update ON public.products FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY products_delete ON public.products FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

CREATE TRIGGER products_set_updated_at
  BEFORE UPDATE ON public.products
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS group_code text,
  ADD COLUMN IF NOT EXISTS group_name text;

ALTER TABLE public.representatives
  ADD COLUMN IF NOT EXISTS filial text;