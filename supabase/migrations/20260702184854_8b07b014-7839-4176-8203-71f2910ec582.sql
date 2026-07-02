
DROP POLICY IF EXISTS "teams_read" ON public.teams;
CREATE POLICY "teams_read" ON public.teams FOR SELECT TO authenticated
USING (
  is_superadmin(auth.uid())
  OR (id = current_team_id() AND current_team_role() = ANY (ARRAY['admin','manager']))
);

DROP POLICY IF EXISTS "members can view whatsapp_config" ON public.whatsapp_config;
CREATE POLICY "admins can view whatsapp_config" ON public.whatsapp_config FOR SELECT TO authenticated
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid()
      AND tm.role = ANY (ARRAY['admin','manager'])
  )
);
