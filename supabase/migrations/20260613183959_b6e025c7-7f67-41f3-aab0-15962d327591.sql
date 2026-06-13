
-- 1) Deterministic team/role resolution
CREATE OR REPLACE FUNCTION public.current_team_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT team_id FROM public.team_members
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC, team_id ASC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_team_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT role FROM public.team_members
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC, team_id ASC
  LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
  SELECT team_id FROM public.team_members
  WHERE user_id = auth.uid()
  ORDER BY created_at ASC, team_id ASC
  LIMIT 1
$$;

-- 2) Restrict invites read policy to authenticated users only
DROP POLICY IF EXISTS inv_read ON public.invites;
CREATE POLICY inv_read ON public.invites
  FOR SELECT TO authenticated
  USING (
    is_superadmin(auth.uid())
    OR (team_id = current_team_id() AND current_team_role() = ANY (ARRAY['admin','manager']))
  );

-- 3) Prevent cross-tenant privilege escalation via user_roles
DROP POLICY IF EXISTS roles_admin_manage_non_super ON public.user_roles;
CREATE POLICY roles_admin_manage_non_super ON public.user_roles
  FOR ALL TO authenticated
  USING (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'superadmin'::app_role
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = user_roles.user_id
        AND tm.team_id = public.current_team_id()
    )
  )
  WITH CHECK (
    has_role(auth.uid(), 'admin'::app_role)
    AND role <> 'superadmin'::app_role
    AND EXISTS (
      SELECT 1 FROM public.team_members tm
      WHERE tm.user_id = user_roles.user_id
        AND tm.team_id = public.current_team_id()
    )
  );

-- Also restrict the superadmin-all policy to authenticated role for clarity
DROP POLICY IF EXISTS roles_superadmin_all ON public.user_roles;
CREATE POLICY roles_superadmin_all ON public.user_roles
  FOR ALL TO authenticated
  USING (is_superadmin(auth.uid()))
  WITH CHECK (is_superadmin(auth.uid()));
