
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
  WITH ranked AS (
    SELECT
      s.client_id,
      s.client_code,
      s.client_name,
      s.representative_id,
      s.invoice_date,
      ROW_NUMBER() OVER (
        PARTITION BY COALESCE(s.client_code, s.client_id::text)
        ORDER BY s.invoice_date DESC NULLS LAST
      ) AS rn
    FROM public.sales s
    WHERE s.client_code IS NOT NULL OR s.client_id IS NOT NULL
  ),
  last_sale AS (
    SELECT client_id, client_code, client_name, representative_id, invoice_date AS last_invoice
    FROM ranked WHERE rn = 1 AND invoice_date IS NOT NULL
  ),
  inactive AS (
    SELECT *,
      (EXTRACT(YEAR  FROM age(CURRENT_DATE, last_invoice))::int * 12)
      + EXTRACT(MONTH FROM age(CURRENT_DATE, last_invoice))::int AS months_inactive
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

REVOKE EXECUTE ON FUNCTION public.generate_inactive_client_alerts() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.generate_inactive_client_alerts() TO service_role;
