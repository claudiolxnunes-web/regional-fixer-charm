
-- ============ SALES (faturamento realizado) ============
CREATE TABLE public.sales (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_date date,
  order_date date,
  group_code text,
  client_group text,
  invoice_number text,
  order_number text,
  client_code text,
  client_name text,
  segmentation text,
  category text,
  product_code text,
  product_name text,
  qty_bags numeric,
  price_per_bag numeric,
  price_per_kg numeric,
  pmr numeric,
  discount_pct numeric,
  city text,
  state text,
  region text,
  rep_code text,
  representative text,
  operation_type text,
  branch_code text,
  branch text,
  product_group text,
  revenue numeric,                  -- Faturamento Realizado
  revenue_no_charges numeric,       -- Faturamento S/ Encargos
  mb_cb_pct numeric,
  mb_cb_total numeric,
  ml_cb_pct numeric,
  ml_cb_total numeric,
  volume_sales numeric,
  volume_sales_bonus numeric,
  bonus numeric,
  icms_total numeric,
  pis_total numeric,
  cofins_total numeric,
  cost_total numeric,               -- Custo Brill Total
  commercial_expense numeric,
  freight numeric,
  volume_converted numeric,
  customized text,
  product_group_code text,
  solution text,
  subsolution text,
  line text,
  grv text,
  gnv text,
  month_year text,
  cfop text,
  fl_vef text,
  commission_pct numeric,
  commission_value numeric,
  currency text,
  year integer,
  client_id uuid,
  representative_id uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (invoice_number, product_code, order_number)
);

CREATE INDEX idx_sales_client_code ON public.sales(client_code);
CREATE INDEX idx_sales_invoice_date ON public.sales(invoice_date);
CREATE INDEX idx_sales_rep_code ON public.sales(rep_code);
CREATE INDEX idx_sales_line ON public.sales(line);
CREATE INDEX idx_sales_solution ON public.sales(solution);

ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
CREATE POLICY sales_read ON public.sales FOR SELECT TO authenticated USING (true);
CREATE POLICY sales_insert ON public.sales FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY sales_update ON public.sales FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY sales_delete ON public.sales FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER sales_set_updated_at BEFORE UPDATE ON public.sales
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ OPEN ORDERS (carteira / snapshot) ============
CREATE TABLE public.open_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_tracking text,
  branch_code text,
  order_number text,
  green_order text,
  pre_load text,
  load_id text,
  order_inclusion_date date,
  forecast_billing_requested date,
  forecast_billing_real date,
  billing_real date,
  delivery_requested date,
  delivery_real date,
  block_type text,                  -- Bloqueio (Financeiro, etc)
  financial_block_reason text,
  prescription_block_reason text,
  director text,                    -- Diretoria
  gev text,
  grv text,
  erc_code text,
  erc text,
  client_code text,
  client_name text,
  category text,
  segment text,
  line text,
  product_code text,
  product_name text,
  oc text,
  driver text,
  ddd text,
  driver_phone text,
  order_value numeric,
  order_volume numeric,
  is_vef text,
  client_id uuid,
  representative_id uuid,
  snapshot_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_open_orders_client_code ON public.open_orders(client_code);
CREATE INDEX idx_open_orders_order ON public.open_orders(order_number);
CREATE INDEX idx_open_orders_status ON public.open_orders(status_tracking);
CREATE INDEX idx_open_orders_erc ON public.open_orders(erc_code);
CREATE INDEX idx_open_orders_forecast ON public.open_orders(forecast_billing_requested);

ALTER TABLE public.open_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY open_orders_read ON public.open_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY open_orders_insert ON public.open_orders FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY open_orders_update ON public.open_orders FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY open_orders_delete ON public.open_orders FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER open_orders_set_updated_at BEFORE UPDATE ON public.open_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- ============ Refresh clients_view to derive from sales ============
DROP VIEW IF EXISTS public.clients_view;
CREATE VIEW public.clients_view
WITH (security_invoker = true)
AS
SELECT
  c.*,
  COALESCE(s.last_sale_date, c.last_purchase_date) AS computed_last_purchase_date,
  COALESCE(s.total_revenue, c.total_purchases) AS computed_total_purchases,
  CASE
    WHEN COALESCE(s.last_sale_date, c.last_purchase_date) IS NULL THEN 'prospect'
    WHEN COALESCE(s.last_sale_date, c.last_purchase_date) >= (CURRENT_DATE - INTERVAL '6 months') THEN 'active'
    ELSE 'inactive'
  END AS effective_status,
  CASE
    WHEN COALESCE(s.last_sale_date, c.last_purchase_date) IS NULL THEN NULL
    ELSE (CURRENT_DATE - COALESCE(s.last_sale_date, c.last_purchase_date))
  END AS days_since_last_purchase
FROM public.clients c
LEFT JOIN (
  SELECT client_code,
         MAX(invoice_date) AS last_sale_date,
         SUM(revenue) AS total_revenue
  FROM public.sales
  WHERE client_code IS NOT NULL
  GROUP BY client_code
) s ON s.client_code = c.client_code;

GRANT SELECT ON public.clients_view TO authenticated, anon;
