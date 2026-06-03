
DROP POLICY IF EXISTS "Team isolation for clients" ON public.clients;
DROP POLICY IF EXISTS "Team isolation for sales" ON public.sales;
DROP POLICY IF EXISTS "Team isolation for opportunities" ON public.opportunities;
DROP POLICY IF EXISTS "Team isolation for representatives" ON public.representatives;
DROP POLICY IF EXISTS "Team isolation for goals" ON public.goals;
DROP POLICY IF EXISTS "Team isolation for activities" ON public.activities;

ALTER FUNCTION public.handle_import_sync() SET search_path = public;
ALTER FUNCTION public.handle_orders_import_sync() SET search_path = public;
ALTER FUNCTION public.refresh_rep_totals() SET search_path = public;
