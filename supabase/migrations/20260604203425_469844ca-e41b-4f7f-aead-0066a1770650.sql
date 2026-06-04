CREATE OR REPLACE FUNCTION public.get_client_sales_totals()
RETURNS TABLE (
  client_id UUID,
  total_revenue NUMERIC,
  total_volume NUMERIC
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.client_id,
    SUM(COALESCE(s.revenue, 0))::NUMERIC as total_revenue,
    SUM(COALESCE(s.volume_sales, 0))::NUMERIC as total_volume
  FROM public.sales s
  GROUP BY s.client_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_client_sales_totals() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_client_sales_totals() TO service_role;
