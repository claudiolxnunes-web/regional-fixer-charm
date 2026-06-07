
-- 1. crop_cycles: restrict ALL public policy
DROP POLICY IF EXISTS "Users can manage crop_cycles" ON public.crop_cycles;
CREATE POLICY "Authenticated can view crop_cycles" ON public.crop_cycles
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins/managers can insert crop_cycles" ON public.crop_cycles
  FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admins/managers can update crop_cycles" ON public.crop_cycles
  FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'superadmin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'superadmin'));
CREATE POLICY "Admins/managers can delete crop_cycles" ON public.crop_cycles
  FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin') OR public.has_role(auth.uid(), 'manager') OR public.has_role(auth.uid(), 'superadmin'));

-- 2. customer_health_logs: scope by team via clients
DROP POLICY IF EXISTS "Users can manage customer_health_logs" ON public.customer_health_logs;
CREATE POLICY "Team can manage customer_health_logs" ON public.customer_health_logs
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = customer_health_logs.client_id
        AND c.team_id = public.current_team_id()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = customer_health_logs.client_id
        AND c.team_id = public.current_team_id()
    )
  );

-- 3. nutrition_alerts: add explicit auth + team scope
DROP POLICY IF EXISTS "Users can see nutrition alerts for their clients" ON public.nutrition_alerts;
CREATE POLICY "Team can view nutrition alerts" ON public.nutrition_alerts
  FOR SELECT TO authenticated
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = nutrition_alerts.client_id
        AND c.team_id = public.current_team_id()
    )
  );

-- 4. rebanhos
DROP POLICY IF EXISTS "Users can manage rebanhos of their clients" ON public.rebanhos;
CREATE POLICY "Team can manage rebanhos" ON public.rebanhos
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = rebanhos.client_id
        AND c.team_id = public.current_team_id()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = rebanhos.client_id
        AND c.team_id = public.current_team_id()
    )
  );

-- 5. crop_cycle_client_links
DROP POLICY IF EXISTS "Users can manage cycle links for their clients" ON public.crop_cycle_client_links;
CREATE POLICY "Team can manage cycle links" ON public.crop_cycle_client_links
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = crop_cycle_client_links.client_id
        AND c.team_id = public.current_team_id()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.clients c
      WHERE c.id = crop_cycle_client_links.client_id
        AND c.team_id = public.current_team_id()
    )
  );

-- 6. supplementation_plans
DROP POLICY IF EXISTS "Users can manage supplementation plans for their links" ON public.supplementation_plans;
CREATE POLICY "Team can manage supplementation plans" ON public.supplementation_plans
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.crop_cycle_client_links l
      JOIN public.clients c ON c.id = l.client_id
      WHERE l.id = supplementation_plans.link_id
        AND c.team_id = public.current_team_id()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.crop_cycle_client_links l
      JOIN public.clients c ON c.id = l.client_id
      WHERE l.id = supplementation_plans.link_id
        AND c.team_id = public.current_team_id()
    )
  );

-- 7. plan_executions
DROP POLICY IF EXISTS "Users can manage executions for their plans" ON public.plan_executions;
CREATE POLICY "Team can manage plan executions" ON public.plan_executions
  FOR ALL TO authenticated
  USING (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.supplementation_plans p
      JOIN public.crop_cycle_client_links l ON l.id = p.link_id
      JOIN public.clients c ON c.id = l.client_id
      WHERE p.id = plan_executions.plan_id
        AND c.team_id = public.current_team_id()
    )
  )
  WITH CHECK (
    auth.uid() IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.supplementation_plans p
      JOIN public.crop_cycle_client_links l ON l.id = p.link_id
      JOIN public.clients c ON c.id = l.client_id
      WHERE p.id = plan_executions.plan_id
        AND c.team_id = public.current_team_id()
    )
  );

-- 8. Pin search_path on functions
ALTER FUNCTION public.generate_nutrition_alerts() SET search_path = public;
ALTER FUNCTION public.update_updated_at_column() SET search_path = public;
ALTER FUNCTION public.get_client_sales_totals() SET search_path = public;
ALTER FUNCTION public.calculate_client_health() SET search_path = public;
