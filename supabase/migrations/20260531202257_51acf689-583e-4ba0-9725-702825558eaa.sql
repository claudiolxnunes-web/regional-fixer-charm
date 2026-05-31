
-- 1) invites: restrict read to admins/managers/superadmins
DROP POLICY IF EXISTS inv_read ON public.invites;
CREATE POLICY inv_read ON public.invites
  FOR SELECT
  USING (
    public.is_superadmin(auth.uid())
    OR (
      team_id = public.current_team_id()
      AND public.current_team_role() = ANY (ARRAY['admin','manager'])
    )
  );

-- 2) teams: restrict read (contains stripe billing ids) to admins/superadmins
DROP POLICY IF EXISTS teams_read ON public.teams;
DROP POLICY IF EXISTS "Users can view their own team" ON public.teams;
CREATE POLICY teams_read ON public.teams
  FOR SELECT
  USING (
    public.is_superadmin(auth.uid())
    OR (
      id = public.current_team_id()
      AND public.current_team_role() = 'admin'
    )
  );

-- 3) user_roles: prevent privilege escalation to superadmin by app-admins
DROP POLICY IF EXISTS roles_admin_all ON public.user_roles;

CREATE POLICY roles_superadmin_all ON public.user_roles
  FOR ALL
  USING (public.is_superadmin(auth.uid()))
  WITH CHECK (public.is_superadmin(auth.uid()));

CREATE POLICY roles_admin_manage_non_super ON public.user_roles
  FOR ALL
  USING (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND role <> 'superadmin'::public.app_role
  )
  WITH CHECK (
    public.has_role(auth.uid(), 'admin'::public.app_role)
    AND role <> 'superadmin'::public.app_role
  );

-- 4) Convert sales_secure_view to security_invoker
ALTER VIEW public.sales_secure_view SET (security_invoker = true);
