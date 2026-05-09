
-- Tabela de alertas
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'medium',
  title TEXT NOT NULL,
  message TEXT,
  client_id UUID,
  client_code TEXT,
  client_name TEXT,
  representative_id UUID,
  rep_user_id UUID,
  status TEXT NOT NULL DEFAULT 'new',
  metadata JSONB DEFAULT '{}'::jsonb,
  dedupe_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ
);

CREATE INDEX idx_alerts_status ON public.alerts(status);
CREATE INDEX idx_alerts_type ON public.alerts(type);
CREATE INDEX idx_alerts_rep ON public.alerts(representative_id);
CREATE INDEX idx_alerts_created ON public.alerts(created_at DESC);

ALTER TABLE public.alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY alerts_read ON public.alerts FOR SELECT TO authenticated
  USING (is_staff(auth.uid()) OR rep_user_id = auth.uid() OR representative_id = current_rep_id());

CREATE POLICY alerts_insert ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (is_staff(auth.uid()));

CREATE POLICY alerts_update ON public.alerts FOR UPDATE TO authenticated
  USING (is_staff(auth.uid()) OR rep_user_id = auth.uid() OR representative_id = current_rep_id())
  WITH CHECK (is_staff(auth.uid()) OR rep_user_id = auth.uid() OR representative_id = current_rep_id());

CREATE POLICY alerts_delete ON public.alerts FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER alerts_updated_at BEFORE UPDATE ON public.alerts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Função geradora: clientes sem compra há 3+ meses, alerta mensal recorrente
CREATE OR REPLACE FUNCTION public.generate_inactive_client_alerts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period TEXT := to_char(now(), 'YYYY-MM');
  v_count INTEGER := 0;
BEGIN
  WITH last_sale AS (
    SELECT
      client_id,
      client_code,
      MAX(client_name) AS client_name,
      MAX(representative_id) AS representative_id,
      MAX(invoice_date) AS last_invoice
    FROM public.sales
    WHERE client_code IS NOT NULL
    GROUP BY client_id, client_code
  ),
  inactive AS (
    SELECT *,
      EXTRACT(MONTH FROM age(CURRENT_DATE, last_invoice))::int
        + EXTRACT(YEAR FROM age(CURRENT_DATE, last_invoice))::int * 12 AS months_inactive
    FROM last_sale
    WHERE last_invoice < (CURRENT_DATE - INTERVAL '3 months')
  )
  INSERT INTO public.alerts (
    type, severity, title, message,
    client_id, client_code, client_name,
    representative_id, rep_user_id,
    metadata, dedupe_key
  )
  SELECT
    'inactive_client',
    CASE WHEN i.months_inactive >= 6 THEN 'high' ELSE 'medium' END,
    'Cliente inativo há ' || i.months_inactive || ' meses',
    COALESCE(i.client_name, i.client_code) || ' não compra desde ' || to_char(i.last_invoice, 'DD/MM/YYYY'),
    i.client_id, i.client_code, i.client_name,
    i.representative_id, r.user_id,
    jsonb_build_object('months_inactive', i.months_inactive, 'last_invoice', i.last_invoice),
    'inactive_client:' || COALESCE(i.client_code, i.client_id::text) || ':' || v_period
  FROM inactive i
  LEFT JOIN public.representatives r ON r.id = i.representative_id
  ON CONFLICT (dedupe_key) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;
