
DROP POLICY IF EXISTS "members can insert whatsapp_config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "members can update whatsapp_config" ON public.whatsapp_config;
DROP POLICY IF EXISTS "members can delete whatsapp_config" ON public.whatsapp_config;

CREATE POLICY "admins can insert whatsapp_config"
ON public.whatsapp_config FOR INSERT
TO authenticated
WITH CHECK (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid() AND tm.role IN ('admin','manager')
  )
);

CREATE POLICY "admins can update whatsapp_config"
ON public.whatsapp_config FOR UPDATE
TO authenticated
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid() AND tm.role IN ('admin','manager')
  )
)
WITH CHECK (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid() AND tm.role IN ('admin','manager')
  )
);

CREATE POLICY "admins can delete whatsapp_config"
ON public.whatsapp_config FOR DELETE
TO authenticated
USING (
  team_id IN (
    SELECT tm.team_id FROM public.team_members tm
    WHERE tm.user_id = auth.uid() AND tm.role IN ('admin','manager')
  )
);
