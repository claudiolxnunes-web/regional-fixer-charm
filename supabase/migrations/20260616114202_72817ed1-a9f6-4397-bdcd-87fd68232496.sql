-- 1) Restrict sensitive SELECT policies to authenticated role
DROP POLICY IF EXISTS clients_read ON public.clients;
CREATE POLICY clients_read ON public.clients
  FOR SELECT TO authenticated
  USING (
    is_superadmin(auth.uid())
    OR (
      team_id = current_team_id()
      AND (
        current_team_role() = ANY (ARRAY['admin'::text, 'manager'::text])
        OR is_own_rep_data(representative_id)
      )
    )
  );

DROP POLICY IF EXISTS sales_read ON public.sales;
CREATE POLICY sales_read ON public.sales
  FOR SELECT TO authenticated
  USING (
    is_superadmin(auth.uid())
    OR (
      team_id = current_team_id()
      AND (
        current_team_role() = ANY (ARRAY['admin'::text, 'manager'::text])
        OR is_own_rep_data(representative_id)
      )
    )
  );

DROP POLICY IF EXISTS opportunities_read ON public.opportunities;
CREATE POLICY opportunities_read ON public.opportunities
  FOR SELECT TO authenticated
  USING (
    is_superadmin(auth.uid())
    OR (
      team_id = current_team_id()
      AND (
        current_team_role() = ANY (ARRAY['admin'::text, 'manager'::text])
        OR is_own_rep_data(representative_id)
      )
    )
  );

DROP POLICY IF EXISTS "Users can view members of their team" ON public.team_members;
CREATE POLICY "Users can view members of their team" ON public.team_members
  FOR SELECT TO authenticated
  USING (team_id = get_my_team_id());

-- 2) Scope admin role-reads to admins of the same team
DROP POLICY IF EXISTS roles_select_own ON public.user_roles;
CREATE POLICY roles_select_own ON public.user_roles
  FOR SELECT TO authenticated
  USING (
    auth.uid() = user_id
    OR is_superadmin(auth.uid())
    OR (
      has_role(auth.uid(), 'admin'::app_role)
      AND EXISTS (
        SELECT 1 FROM public.team_members tm
        WHERE tm.user_id = user_roles.user_id
          AND tm.team_id = current_team_id()
      )
    )
  );