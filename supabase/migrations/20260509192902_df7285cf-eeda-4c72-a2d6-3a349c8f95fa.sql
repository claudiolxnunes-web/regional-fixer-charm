
-- 1) Add representative role
ALTER TYPE app_role ADD VALUE IF NOT EXISTS 'representative';

-- 2) Helper functions
CREATE OR REPLACE FUNCTION public.current_rep_code()
RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT rep_code FROM public.representatives WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_rep_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id FROM public.representatives WHERE user_id = auth.uid() LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.current_rep_code() FROM anon;
REVOKE EXECUTE ON FUNCTION public.current_rep_id() FROM anon;

-- 3) Quotes
CREATE TABLE public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  representative_id uuid,
  rep_user_id uuid NOT NULL DEFAULT auth.uid(),
  client_id uuid,
  client_name text,
  items jsonb NOT NULL DEFAULT '[]'::jsonb,
  total numeric DEFAULT 0,
  payment_terms text,
  valid_until date,
  status text NOT NULL DEFAULT 'pending', -- pending|approved|rejected|converted
  notes text,
  manager_response text,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_quotes_rep_user ON public.quotes(rep_user_id);
CREATE INDEX idx_quotes_status ON public.quotes(status);
CREATE INDEX idx_quotes_created ON public.quotes(created_at DESC);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
CREATE POLICY quotes_read ON public.quotes FOR SELECT TO authenticated
  USING (rep_user_id = auth.uid() OR is_staff(auth.uid()));
CREATE POLICY quotes_insert ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (rep_user_id = auth.uid() OR is_staff(auth.uid()));
CREATE POLICY quotes_update ON public.quotes FOR UPDATE TO authenticated
  USING (rep_user_id = auth.uid() OR is_staff(auth.uid()))
  WITH CHECK (rep_user_id = auth.uid() OR is_staff(auth.uid()));
CREATE POLICY quotes_delete ON public.quotes FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role) OR rep_user_id = auth.uid());

CREATE TRIGGER quotes_set_updated_at BEFORE UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 4) Daily reports
CREATE TABLE public.daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  representative_id uuid,
  rep_user_id uuid NOT NULL DEFAULT auth.uid(),
  report_date date NOT NULL DEFAULT current_date,
  visits_count int NOT NULL DEFAULT 0,
  calls_count int NOT NULL DEFAULT 0,
  proposals_count int NOT NULL DEFAULT 0,
  orders_count int NOT NULL DEFAULT 0,
  observations text,
  submitted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (rep_user_id, report_date)
);

ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY daily_reports_read ON public.daily_reports FOR SELECT TO authenticated
  USING (rep_user_id = auth.uid() OR is_staff(auth.uid()));
CREATE POLICY daily_reports_insert ON public.daily_reports FOR INSERT TO authenticated
  WITH CHECK (rep_user_id = auth.uid() OR is_staff(auth.uid()));
CREATE POLICY daily_reports_update ON public.daily_reports FOR UPDATE TO authenticated
  USING (rep_user_id = auth.uid() OR is_staff(auth.uid()))
  WITH CHECK (rep_user_id = auth.uid() OR is_staff(auth.uid()));

CREATE TRIGGER daily_reports_set_updated_at BEFORE UPDATE ON public.daily_reports
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 5) Activities — let representatives manage their own
DROP POLICY IF EXISTS activities_insert ON public.activities;
CREATE POLICY activities_insert ON public.activities FOR INSERT TO authenticated
  WITH CHECK (
    is_staff(auth.uid())
    OR representative_id = current_rep_id()
  );

DROP POLICY IF EXISTS activities_update ON public.activities;
CREATE POLICY activities_update ON public.activities FOR UPDATE TO authenticated
  USING (is_staff(auth.uid()) OR representative_id = current_rep_id())
  WITH CHECK (is_staff(auth.uid()) OR representative_id = current_rep_id());

-- 6) Sales view for representatives — NO margins, NO costs, NO taxes
CREATE OR REPLACE VIEW public.sales_rep_view
WITH (security_invoker = true)
AS
SELECT
  id, invoice_date, order_date, invoice_number, order_number,
  client_code, client_name, segmentation, category,
  product_code, product_name, qty_bags, price_per_bag, price_per_kg,
  city, state, region, rep_code, representative,
  branch_code, branch, product_group,
  revenue,                       -- faturamento (rep precisa ver)
  volume_sales, volume_sales_bonus, bonus,
  product_group_code, solution, subsolution, line,
  month_year, currency, year,
  client_id, representative_id
FROM public.sales
WHERE rep_code = public.current_rep_code() OR public.is_staff(auth.uid());

GRANT SELECT ON public.sales_rep_view TO authenticated;
