
-- 1) Queda de consumo: últimos 3 meses vs 3 meses anteriores, queda >= 30%
CREATE OR REPLACE FUNCTION public.generate_consumption_drop_alerts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period TEXT := to_char(now(), 'YYYY-MM');
  v_count INTEGER := 0;
BEGIN
  WITH base AS (
    SELECT
      COALESCE(s.client_code, s.client_id::text) AS ck,
      MAX(s.client_name) AS client_name,
      MAX(s.client_code) AS client_code,
      MAX(s.client_id)   AS client_id,
      MAX(s.representative_id) AS representative_id,
      SUM(CASE WHEN s.invoice_date >= (CURRENT_DATE - INTERVAL '3 months')
               AND s.invoice_date <  CURRENT_DATE
               THEN COALESCE(s.revenue, 0) ELSE 0 END) AS recent_rev,
      SUM(CASE WHEN s.invoice_date >= (CURRENT_DATE - INTERVAL '6 months')
               AND s.invoice_date <  (CURRENT_DATE - INTERVAL '3 months')
               THEN COALESCE(s.revenue, 0) ELSE 0 END) AS prev_rev
    FROM public.sales s
    WHERE s.invoice_date >= (CURRENT_DATE - INTERVAL '6 months')
      AND (s.client_code IS NOT NULL OR s.client_id IS NOT NULL)
    GROUP BY 1
  ),
  drops AS (
    SELECT *,
      CASE WHEN prev_rev > 0 THEN ((prev_rev - recent_rev) / prev_rev) * 100 ELSE 0 END AS drop_pct
    FROM base
    WHERE prev_rev > 0 AND recent_rev < prev_rev
  )
  INSERT INTO public.alerts (
    type, severity, title, message,
    client_id, client_code, client_name,
    representative_id, rep_user_id, metadata, dedupe_key
  )
  SELECT
    'consumption_drop',
    CASE WHEN d.drop_pct >= 60 THEN 'high'
         WHEN d.drop_pct >= 30 THEN 'medium'
         ELSE 'low' END,
    'Queda de consumo de ' || ROUND(d.drop_pct)::text || '%',
    COALESCE(d.client_name, d.client_code) || ' caiu ' || ROUND(d.drop_pct)::text
      || '% nos últimos 3 meses (R$ ' || ROUND(d.recent_rev, 2)::text
      || ' vs R$ ' || ROUND(d.prev_rev, 2)::text || ').',
    d.client_id, d.client_code, d.client_name,
    d.representative_id, r.user_id,
    jsonb_build_object('drop_pct', d.drop_pct, 'recent_rev', d.recent_rev, 'prev_rev', d.prev_rev),
    'consumption_drop:' || d.ck || ':' || v_period
  FROM drops d
  LEFT JOIN public.representatives r ON r.id = d.representative_id
  WHERE d.drop_pct >= 30
  ON CONFLICT (dedupe_key) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 2) Estoque baixo no cliente: cliente provavelmente sem produto
-- Heurística: dias desde a última compra > 1.5 * intervalo médio entre compras (com pelo menos 3 compras históricas)
CREATE OR REPLACE FUNCTION public.generate_low_stock_alerts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period TEXT := to_char(now(), 'YYYY-MM');
  v_count INTEGER := 0;
BEGIN
  WITH per_client AS (
    SELECT
      COALESCE(s.client_code, s.client_id::text) AS ck,
      MAX(s.client_name) AS client_name,
      MAX(s.client_code) AS client_code,
      MAX(s.client_id)   AS client_id,
      MAX(s.representative_id) AS representative_id,
      MAX(s.invoice_date) AS last_invoice,
      MIN(s.invoice_date) AS first_invoice,
      COUNT(DISTINCT s.invoice_date) AS distinct_days
    FROM public.sales s
    WHERE s.invoice_date IS NOT NULL
      AND (s.client_code IS NOT NULL OR s.client_id IS NOT NULL)
    GROUP BY 1
  ),
  scored AS (
    SELECT *,
      (CURRENT_DATE - last_invoice) AS days_since_last,
      CASE WHEN distinct_days > 1
           THEN GREATEST(((last_invoice - first_invoice)::numeric / NULLIF(distinct_days - 1, 0)), 1)
           ELSE NULL END AS avg_interval_days
    FROM per_client
    WHERE distinct_days >= 3
  )
  INSERT INTO public.alerts (
    type, severity, title, message,
    client_id, client_code, client_name,
    representative_id, rep_user_id, metadata, dedupe_key
  )
  SELECT
    'low_stock',
    CASE WHEN days_since_last > avg_interval_days * 2 THEN 'high' ELSE 'medium' END,
    'Provável estoque baixo no cliente',
    COALESCE(client_name, client_code) || ' costuma comprar a cada ~'
      || ROUND(avg_interval_days)::text || ' dias e está há '
      || days_since_last::text || ' dias sem comprar.',
    client_id, client_code, client_name,
    representative_id, r.user_id,
    jsonb_build_object('days_since_last', days_since_last, 'avg_interval_days', avg_interval_days),
    'low_stock:' || ck || ':' || v_period
  FROM scored sc
  LEFT JOIN public.representatives r ON r.id = sc.representative_id
  WHERE avg_interval_days IS NOT NULL
    AND days_since_last > (avg_interval_days * 1.5)
    AND days_since_last <= 90  -- acima disso já cai em "cliente inativo"
  ON CONFLICT (dedupe_key) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 3) Meta em risco: rep abaixo do pacing mensal
CREATE OR REPLACE FUNCTION public.generate_goal_at_risk_alerts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_period TEXT := to_char(now(), 'YYYY-MM');
  v_year   INT  := EXTRACT(YEAR FROM CURRENT_DATE)::int;
  v_month  INT  := EXTRACT(MONTH FROM CURRENT_DATE)::int;
  v_day    INT  := EXTRACT(DAY FROM CURRENT_DATE)::int;
  v_dim    INT  := EXTRACT(DAY FROM (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month - 1 day'))::int;
  v_pace   NUMERIC := v_day::numeric / NULLIF(v_dim, 0);
  v_count  INTEGER := 0;
BEGIN
  IF v_pace IS NULL OR v_pace <= 0 THEN
    RETURN 0;
  END IF;

  WITH targets AS (
    SELECT
      gt.representative_id,
      gt.representative_code,
      gt.representative_name,
      SUM(COALESCE(gt.revenue_target, 0)) AS revenue_target
    FROM public.goal_targets gt
    WHERE gt.year = v_year AND gt.month = v_month
    GROUP BY 1,2,3
    HAVING SUM(COALESCE(gt.revenue_target, 0)) > 0
  ),
  achieved AS (
    SELECT
      s.representative_id,
      s.rep_code,
      SUM(COALESCE(s.revenue, 0)) AS revenue
    FROM public.sales s
    WHERE s.invoice_date >= date_trunc('month', CURRENT_DATE)
      AND s.invoice_date <  (date_trunc('month', CURRENT_DATE) + INTERVAL '1 month')
    GROUP BY 1,2
  ),
  joined AS (
    SELECT
      t.representative_id,
      t.representative_code,
      t.representative_name,
      t.revenue_target,
      COALESCE(a.revenue, 0) AS achieved,
      (COALESCE(a.revenue, 0) / t.revenue_target) AS achieved_pct,
      v_pace AS expected_pct
    FROM targets t
    LEFT JOIN achieved a
      ON a.representative_id = t.representative_id
      OR a.rep_code = t.representative_code
  )
  INSERT INTO public.alerts (
    type, severity, title, message,
    representative_id, rep_user_id, metadata, dedupe_key
  )
  SELECT
    'goal_at_risk',
    CASE WHEN j.achieved_pct < (j.expected_pct * 0.5) THEN 'high' ELSE 'medium' END,
    'Meta em risco: ' || ROUND(j.achieved_pct * 100)::text || '% atingido',
    COALESCE(j.representative_name, j.representative_code, 'Representante')
      || ' atingiu ' || ROUND(j.achieved_pct * 100)::text
      || '% da meta com ' || ROUND(j.expected_pct * 100)::text
      || '% do mês decorrido (R$ ' || ROUND(j.achieved, 2)::text
      || ' de R$ ' || ROUND(j.revenue_target, 2)::text || ').',
    j.representative_id, r.user_id,
    jsonb_build_object('achieved', j.achieved, 'target', j.revenue_target,
                       'achieved_pct', j.achieved_pct, 'expected_pct', j.expected_pct),
    'goal_at_risk:' || COALESCE(j.representative_id::text, j.representative_code) || ':' || v_period
  FROM joined j
  LEFT JOIN public.representatives r ON r.id = j.representative_id
  WHERE j.achieved_pct < (j.expected_pct * 0.8)
  ON CONFLICT (dedupe_key) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 4) Proposta vencendo: pendentes com validade nos próximos 7 dias
CREATE OR REPLACE FUNCTION public.generate_quote_expiring_alerts()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count INTEGER := 0;
BEGIN
  INSERT INTO public.alerts (
    type, severity, title, message,
    client_id, client_name,
    representative_id, rep_user_id, metadata, dedupe_key
  )
  SELECT
    'quote_expiring',
    CASE WHEN q.valid_until <= CURRENT_DATE + INTERVAL '2 days' THEN 'high' ELSE 'medium' END,
    'Proposta vencendo em ' || (q.valid_until - CURRENT_DATE)::text || ' dia(s)',
    'Proposta para ' || COALESCE(q.client_name, 'cliente')
      || ' (R$ ' || ROUND(COALESCE(q.total, 0), 2)::text
      || ') vence em ' || to_char(q.valid_until, 'DD/MM/YYYY') || '.',
    q.client_id, q.client_name,
    q.representative_id, q.rep_user_id,
    jsonb_build_object('quote_id', q.id, 'valid_until', q.valid_until, 'total', q.total),
    'quote_expiring:' || q.id::text || ':' || to_char(q.valid_until, 'YYYY-MM-DD')
  FROM public.quotes q
  WHERE q.status = 'pending'
    AND q.valid_until IS NOT NULL
    AND q.valid_until >= CURRENT_DATE
    AND q.valid_until <= CURRENT_DATE + INTERVAL '7 days'
  ON CONFLICT (dedupe_key) DO NOTHING;

  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

-- 5) Orquestrador: roda todas as regras e devolve contagem por tipo
CREATE OR REPLACE FUNCTION public.generate_all_alerts()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_inactive   INT := 0;
  c_drop       INT := 0;
  c_low_stock  INT := 0;
  c_goal       INT := 0;
  c_quote      INT := 0;
BEGIN
  c_inactive  := public.generate_inactive_client_alerts();
  c_drop      := public.generate_consumption_drop_alerts();
  c_low_stock := public.generate_low_stock_alerts();
  c_goal      := public.generate_goal_at_risk_alerts();
  c_quote     := public.generate_quote_expiring_alerts();

  RETURN jsonb_build_object(
    'inactive_client', c_inactive,
    'consumption_drop', c_drop,
    'low_stock', c_low_stock,
    'goal_at_risk', c_goal,
    'quote_expiring', c_quote,
    'total', c_inactive + c_drop + c_low_stock + c_goal + c_quote
  );
END;
$$;
