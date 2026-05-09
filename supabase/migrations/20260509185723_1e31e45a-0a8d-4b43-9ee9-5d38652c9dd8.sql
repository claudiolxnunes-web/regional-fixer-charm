
CREATE OR REPLACE VIEW public.clients_view 
WITH (security_invoker = true)
AS
SELECT 
  c.*,
  CASE 
    WHEN c.last_purchase_date IS NULL THEN 'prospect'
    WHEN c.last_purchase_date >= (CURRENT_DATE - INTERVAL '6 months') THEN 'active'
    ELSE 'inactive'
  END AS effective_status,
  (CURRENT_DATE - c.last_purchase_date) AS days_since_last_purchase
FROM public.clients c;

GRANT SELECT ON public.clients_view TO authenticated, anon;
