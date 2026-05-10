
-- Tabela de configurações por tipo de regra
CREATE TABLE IF NOT EXISTS public.alert_settings (
  rule_type TEXT PRIMARY KEY,
  config JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by UUID
);

ALTER TABLE public.alert_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "alert_settings_read" ON public.alert_settings FOR SELECT TO authenticated USING (true);
CREATE POLICY "alert_settings_insert" ON public.alert_settings FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "alert_settings_update" ON public.alert_settings FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "alert_settings_delete" ON public.alert_settings FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

-- Defaults
INSERT INTO public.alert_settings (rule_type, config) VALUES
  ('inactive_client',  '{"months_medium":3,"months_high":6}'),
  ('consumption_drop', '{"min_drop_pct":30,"high_drop_pct":60,"window_months":3}'),
  ('low_stock',        '{"interval_factor_medium":1.5,"interval_factor_high":2.0,"max_days":90,"min_purchases":3}'),
  ('goal_at_risk',     '{"warn_pct":80,"high_pct":50}'),
  ('quote_expiring',   '{"warn_days":7,"high_days":2}')
ON CONFLICT (rule_type) DO NOTHING;

-- Helper para ler config com fallback
CREATE OR REPLACE FUNCTION public.alert_setting(_rule TEXT, _key TEXT, _default NUMERIC)
RETURNS NUMERIC
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT COALESCE((config ->> _key)::numeric, _default)
  FROM public.alert_settings WHERE rule_type = _rule
  LIMIT 1
$$;

-- Recriar funções usando settings
CREATE OR REPLACE FUNCTION public.generate_inactive_client_alerts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_period TEXT := to_char(now(), 'YYYY-MM');
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
    'Cliente inativo há ' || i.months_inactive || ' meses',
    COALESCE(i.client_name, i.client_code) || ' não compra desde ' || to_char(i.last_invoice, 'DD/MM/YYYY'),
    i.client_id, i.client_code, i.client_name, i.representative_id, r.user_id,
    jsonb_build_object('months_inactive', i.months_inactive, 'last_invoice', i.last_invoice),
    'inactive_client:' || COALESCE(i.client_code, i.client_id::text) || ':' || v_period
  FROM inactive i LEFT JOIN public.representatives r ON r.id = i.representative_id
  ON CONFLICT (dedupe_key) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_consumption_drop_alerts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_period TEXT := to_char(now(), 'YYYY-MM');
  v_count INTEGER := 0;
  v_min  NUMERIC := COALESCE(public.alert_setting('consumption_drop','min_drop_pct',30),30);
  v_high NUMERIC := COALESCE(public.alert_setting('consumption_drop','high_drop_pct',60),60);
  v_win  INT     := COALESCE(public.alert_setting('consumption_drop','window_months',3),3)::int;
BEGIN
  WITH base AS (
    SELECT COALESCE(s.client_code, s.client_id::text) AS ck,
      MAX(s.client_name) AS client_name, MAX(s.client_code) AS client_code,
      MAX(s.client_id) AS client_id, MAX(s.representative_id) AS representative_id,
      SUM(CASE WHEN s.invoice_date >= (CURRENT_DATE - (v_win || ' months')::interval) AND s.invoice_date < CURRENT_DATE
               THEN COALESCE(s.revenue,0) ELSE 0 END) AS recent_rev,
      SUM(CASE WHEN s.invoice_date >= (CURRENT_DATE - ((v_win*2) || ' months')::interval) AND s.invoice_date < (CURRENT_DATE - (v_win || ' months')::interval)
               THEN COALESCE(s.revenue,0) ELSE 0 END) AS prev_rev
    FROM public.sales s
    WHERE s.invoice_date >= (CURRENT_DATE - ((v_win*2) || ' months')::interval)
      AND (s.client_code IS NOT NULL OR s.client_id IS NOT NULL)
    GROUP BY 1
  ),
  drops AS (
    SELECT *, CASE WHEN prev_rev > 0 THEN ((prev_rev - recent_rev)/prev_rev)*100 ELSE 0 END AS drop_pct
    FROM base WHERE prev_rev > 0 AND recent_rev < prev_rev
  )
  INSERT INTO public.alerts (type, severity, title, message, client_id, client_code, client_name, representative_id, rep_user_id, metadata, dedupe_key)
  SELECT 'consumption_drop',
    CASE WHEN d.drop_pct >= v_high THEN 'high' WHEN d.drop_pct >= v_min THEN 'medium' ELSE 'low' END,
    'Queda de consumo de ' || ROUND(d.drop_pct)::text || '%',
    COALESCE(d.client_name, d.client_code) || ' caiu ' || ROUND(d.drop_pct)::text || '% (R$ ' || ROUND(d.recent_rev,2)::text || ' vs R$ ' || ROUND(d.prev_rev,2)::text || ').',
    d.client_id, d.client_code, d.client_name, d.representative_id, r.user_id,
    jsonb_build_object('drop_pct', d.drop_pct, 'recent_rev', d.recent_rev, 'prev_rev', d.prev_rev),
    'consumption_drop:' || d.ck || ':' || v_period
  FROM drops d LEFT JOIN public.representatives r ON r.id = d.representative_id
  WHERE d.drop_pct >= v_min
  ON CONFLICT (dedupe_key) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_low_stock_alerts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_period TEXT := to_char(now(), 'YYYY-MM');
  v_count INTEGER := 0;
  v_med  NUMERIC := COALESCE(public.alert_setting('low_stock','interval_factor_medium',1.5),1.5);
  v_high NUMERIC := COALESCE(public.alert_setting('low_stock','interval_factor_high',2.0),2.0);
  v_max  INT     := COALESCE(public.alert_setting('low_stock','max_days',90),90)::int;
  v_min  INT     := COALESCE(public.alert_setting('low_stock','min_purchases',3),3)::int;
BEGIN
  WITH per_client AS (
    SELECT COALESCE(s.client_code, s.client_id::text) AS ck,
      MAX(s.client_name) AS client_name, MAX(s.client_code) AS client_code,
      MAX(s.client_id) AS client_id, MAX(s.representative_id) AS representative_id,
      MAX(s.invoice_date) AS last_invoice, MIN(s.invoice_date) AS first_invoice,
      COUNT(DISTINCT s.invoice_date) AS distinct_days
    FROM public.sales s
    WHERE s.invoice_date IS NOT NULL AND (s.client_code IS NOT NULL OR s.client_id IS NOT NULL)
    GROUP BY 1
  ),
  scored AS (
    SELECT *, (CURRENT_DATE - last_invoice) AS days_since_last,
      CASE WHEN distinct_days > 1
        THEN GREATEST(((last_invoice - first_invoice)::numeric / NULLIF(distinct_days - 1, 0)), 1)
        ELSE NULL END AS avg_interval_days
    FROM per_client WHERE distinct_days >= v_min
  )
  INSERT INTO public.alerts (type, severity, title, message, client_id, client_code, client_name, representative_id, rep_user_id, metadata, dedupe_key)
  SELECT 'low_stock',
    CASE WHEN days_since_last > avg_interval_days * v_high THEN 'high' ELSE 'medium' END,
    'Provável estoque baixo no cliente',
    COALESCE(client_name, client_code) || ' costuma comprar a cada ~' || ROUND(avg_interval_days)::text || ' dias e está há ' || days_since_last::text || ' dias sem comprar.',
    client_id, client_code, client_name, representative_id, r.user_id,
    jsonb_build_object('days_since_last', days_since_last, 'avg_interval_days', avg_interval_days),
    'low_stock:' || ck || ':' || v_period
  FROM scored sc LEFT JOIN public.representatives r ON r.id = sc.representative_id
  WHERE avg_interval_days IS NOT NULL
    AND days_since_last > (avg_interval_days * v_med)
    AND days_since_last <= v_max
  ON CONFLICT (dedupe_key) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_goal_at_risk_alerts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_period TEXT := to_char(now(), 'YYYY-MM');
  v_year INT := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_month INT := EXTRACT(MONTH FROM CURRENT_DATE)::int;
  v_day INT := EXTRACT(DAY FROM CURRENT_DATE)::int;
  v_dim INT := EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int;
  v_pace NUMERIC := v_day::numeric / NULLIF(v_dim, 0);
  v_warn NUMERIC := COALESCE(public.alert_setting('goal_at_risk','warn_pct',80),80) / 100.0;
  v_high NUMERIC := COALESCE(public.alert_setting('goal_at_risk','high_pct',50),50) / 100.0;
  v_count INTEGER := 0;
BEGIN
  IF v_pace IS NULL OR v_pace <= 0 THEN RETURN 0; END IF;
  WITH targets AS (
    SELECT gt.representative_id, gt.representative_code, gt.representative_name,
      SUM(COALESCE(gt.revenue_target,0)) AS revenue_target
    FROM public.goal_targets gt WHERE gt.year = v_year AND gt.month = v_month
    GROUP BY 1,2,3 HAVING SUM(COALESCE(gt.revenue_target,0)) > 0
  ),
  achieved AS (
    SELECT s.representative_id, s.rep_code, SUM(COALESCE(s.revenue,0)) AS revenue
    FROM public.sales s
    WHERE s.invoice_date >= date_trunc('month', CURRENT_DATE)
      AND s.invoice_date < (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')
    GROUP BY 1,2
  ),
  joined AS (
    SELECT t.representative_id, t.representative_code, t.representative_name, t.revenue_target,
      COALESCE(a.revenue,0) AS achieved,
      (COALESCE(a.revenue,0) / t.revenue_target) AS achieved_pct, v_pace AS expected_pct
    FROM targets t LEFT JOIN achieved a
      ON a.representative_id = t.representative_id OR a.rep_code = t.representative_code
  )
  INSERT INTO public.alerts (type, severity, title, message, representative_id, rep_user_id, metadata, dedupe_key)
  SELECT 'goal_at_risk',
    CASE WHEN j.achieved_pct < (j.expected_pct * v_high) THEN 'high' ELSE 'medium' END,
    'Meta em risco: ' || ROUND(j.achieved_pct*100)::text || '% atingido',
    COALESCE(j.representative_name, j.representative_code, 'Representante')
      || ' atingiu ' || ROUND(j.achieved_pct*100)::text || '% da meta com '
      || ROUND(j.expected_pct*100)::text || '% do mês decorrido (R$ '
      || ROUND(j.achieved,2)::text || ' de R$ ' || ROUND(j.revenue_target,2)::text || ').',
    j.representative_id, r.user_id,
    jsonb_build_object('achieved', j.achieved, 'target', j.revenue_target,
      'achieved_pct', j.achieved_pct, 'expected_pct', j.expected_pct),
    'goal_at_risk:' || COALESCE(j.representative_id::text, j.representative_code) || ':' || v_period
  FROM joined j LEFT JOIN public.representatives r ON r.id = j.representative_id
  WHERE j.achieved_pct < (j.expected_pct * v_warn)
  ON CONFLICT (dedupe_key) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;

CREATE OR REPLACE FUNCTION public.generate_quote_expiring_alerts()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count INTEGER := 0;
  v_warn INT := COALESCE(public.alert_setting('quote_expiring','warn_days',7),7)::int;
  v_high INT := COALESCE(public.alert_setting('quote_expiring','high_days',2),2)::int;
BEGIN
  INSERT INTO public.alerts (type, severity, title, message, client_id, client_name, representative_id, rep_user_id, metadata, dedupe_key)
  SELECT 'quote_expiring',
    CASE WHEN q.valid_until <= CURRENT_DATE + (v_high || ' days')::interval THEN 'high' ELSE 'medium' END,
    'Proposta vencendo em ' || (q.valid_until - CURRENT_DATE)::text || ' dia(s)',
    'Proposta para ' || COALESCE(q.client_name,'cliente') || ' (R$ ' || ROUND(COALESCE(q.total,0),2)::text || ') vence em ' || to_char(q.valid_until, 'DD/MM/YYYY') || '.',
    q.client_id, q.client_name, q.representative_id, q.rep_user_id,
    jsonb_build_object('quote_id', q.id, 'valid_until', q.valid_until, 'total', q.total),
    'quote_expiring:' || q.id::text || ':' || to_char(q.valid_until, 'YYYY-MM-DD')
  FROM public.quotes q
  WHERE q.status = 'pending' AND q.valid_until IS NOT NULL
    AND q.valid_until >= CURRENT_DATE
    AND q.valid_until <= CURRENT_DATE + (v_warn || ' days')::interval
  ON CONFLICT (dedupe_key) DO NOTHING;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END; $$;
