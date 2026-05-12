
-- 1) Inactive client alerts: weekly dedupe (rep gets reminded every week from month 3)
CREATE OR REPLACE FUNCTION public.generate_inactive_client_alerts()
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_period TEXT := to_char(now(), 'IYYY-"W"IW'); -- weekly bucket
  v_count INTEGER := 0;
  v_med INT := COALESCE(public.alert_setting('inactive_client','months_medium',3),3)::int;
  v_high INT := COALESCE(public.alert_setting('inactive_client','months_high',6),6)::int;
BEGIN
  WITH ranked AS (
    SELECT s.client_id, s.client_code, s.client_name, s.representative_id, s.invoice_date,
      ROW_NUMBER() OVER (PARTITION BY COALESCE(s.client_code, s.client_id::text) ORDER BY s.invoice_date DESC NULLS LAST) AS rn
    FROM public.sales s WHERE s.client_code IS NOT NULL OR s.client_id IS NOT NULL
  ),
  last_sale AS (
    SELECT client_id, client_code, client_name, representative_id, invoice_date AS last_invoice
    FROM ranked WHERE rn = 1 AND invoice_date IS NOT NULL
  ),
  inactive AS (
    SELECT *,
      (EXTRACT(YEAR FROM age(CURRENT_DATE, last_invoice))::int * 12)
      + EXTRACT(MONTH FROM age(CURRENT_DATE, last_invoice))::int AS months_inactive
    FROM last_sale
    WHERE last_invoice < (CURRENT_DATE - (v_med || ' months')::interval)
  )
  INSERT INTO public.alerts (type, severity, title, message, client_id, client_code, client_name, representative_id, rep_user_id, metadata, dedupe_key)
  SELECT 'inactive_client',
    CASE WHEN i.months_inactive >= v_high THEN 'high' ELSE 'medium' END,
    CASE WHEN i.months_inactive >= v_high
         THEN 'Cliente INATIVO há ' || i.months_inactive || ' meses'
         ELSE 'Cliente sem compra há ' || i.months_inactive || ' meses'
    END,
    COALESCE(i.client_name, i.client_code) || ' não compra desde ' || to_char(i.last_invoice, 'DD/MM/YYYY')
      || CASE WHEN i.months_inactive >= v_high THEN ' — considerado INATIVO.' ELSE ' — fazer contato esta semana.' END,
    i.client_id, i.client_code, i.client_name, i.representative_id, r.user_id,
    jsonb_build_object('months_inactive', i.months_inactive, 'last_invoice', i.last_invoice),
    'inactive_client:' || COALESCE(i.client_code, i.client_id::text) || ':' || v_period
  FROM inactive i LEFT JOIN public.representatives r ON r.id = i.representative_id
  ON CONFLICT (dedupe_key) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $function$;

-- 2) Ensure settings are explicit (3 / 6 meses)
INSERT INTO public.alert_settings (rule_type, config)
VALUES ('inactive_client', '{"months_medium": 3, "months_high": 6}'::jsonb)
ON CONFLICT (rule_type) DO UPDATE SET config = EXCLUDED.config;

-- 3) Weekly cron to regenerate alerts every Monday 06:00 UTC (~03:00 BRT)
CREATE EXTENSION IF NOT EXISTS pg_cron;
DO $$
BEGIN
  PERFORM cron.unschedule('weekly-generate-alerts');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'weekly-generate-alerts',
  '0 6 * * 1',
  $$ SELECT public.generate_all_alerts(); $$
);
