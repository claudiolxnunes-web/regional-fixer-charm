
DROP POLICY IF EXISTS "Team can insert nutrition alerts" ON public.nutrition_alerts;
DROP POLICY IF EXISTS "Team can update nutrition alerts" ON public.nutrition_alerts;
DROP POLICY IF EXISTS "Team can delete nutrition alerts" ON public.nutrition_alerts;

CREATE POLICY "Team can insert nutrition alerts" ON public.nutrition_alerts
FOR INSERT TO authenticated
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = nutrition_alerts.client_id AND c.team_id = public.current_team_id()
  )
);

CREATE POLICY "Team can update nutrition alerts" ON public.nutrition_alerts
FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = nutrition_alerts.client_id AND c.team_id = public.current_team_id()
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = nutrition_alerts.client_id AND c.team_id = public.current_team_id()
  )
);

CREATE POLICY "Team can delete nutrition alerts" ON public.nutrition_alerts
FOR DELETE TO authenticated
USING (
  auth.uid() IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = nutrition_alerts.client_id AND c.team_id = public.current_team_id()
  )
);
