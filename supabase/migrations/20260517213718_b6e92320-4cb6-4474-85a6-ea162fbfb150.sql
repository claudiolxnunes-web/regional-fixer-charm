-- Update RLS policies to allow managers to invite and manage
-- invites
DROP POLICY IF EXISTS inv_insert ON public.invites;
CREATE POLICY inv_insert ON public.invites FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager')));

DROP POLICY IF EXISTS inv_update ON public.invites;
CREATE POLICY inv_update ON public.invites FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager')))
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager')));

DROP POLICY IF EXISTS inv_delete ON public.invites;
CREATE POLICY inv_delete ON public.invites FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager')));

-- team_members
DROP POLICY IF EXISTS tm_insert ON public.team_members;
CREATE POLICY tm_insert ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager')));

DROP POLICY IF EXISTS tm_delete ON public.team_members;
CREATE POLICY tm_delete ON public.team_members FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager') AND user_id <> auth.uid()));

DROP POLICY IF EXISTS tm_update ON public.team_members;
CREATE POLICY tm_update ON public.team_members FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager')))
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager')));

-- Operational tables (re-run the loop for updated roles)
DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'representatives','clients','sales','opportunities','goals','goal_targets',
    'open_orders','products','regions','alert_settings'
  ]) LOOP
    EXECUTE format($f$
      DROP POLICY IF EXISTS %1$I_ins ON public.%1$I;
      CREATE POLICY %1$I_ins ON public.%1$I FOR INSERT TO authenticated
        WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager')));
      
      DROP POLICY IF EXISTS %1$I_upd ON public.%1$I;
      CREATE POLICY %1$I_upd ON public.%1$I FOR UPDATE TO authenticated
        USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager')))
        WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager')));
      
      DROP POLICY IF EXISTS %1$I_del ON public.%1$I;
      CREATE POLICY %1$I_del ON public.%1$I FOR DELETE TO authenticated
        USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager')));
    $f$, t);
  END LOOP;
END $$;

-- Specifically for quotes/activities/alerts/daily_reports which also allow 'manager'
DROP POLICY IF EXISTS activities_ins ON public.activities;
CREATE POLICY activities_ins ON public.activities FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() IN ('admin', 'manager') OR representative_id = public.current_rep_id())));

DROP POLICY IF EXISTS activities_upd ON public.activities;
CREATE POLICY activities_upd ON public.activities FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() IN ('admin', 'manager') OR representative_id = public.current_rep_id())))
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() IN ('admin', 'manager') OR representative_id = public.current_rep_id())));

DROP POLICY IF EXISTS activities_del ON public.activities;
CREATE POLICY activities_del ON public.activities FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() IN ('admin', 'manager')));

DROP POLICY IF EXISTS quotes_read ON public.quotes;
CREATE POLICY quotes_read ON public.quotes FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() IN ('admin', 'manager') OR rep_user_id = auth.uid())));

DROP POLICY IF EXISTS quotes_ins ON public.quotes;
CREATE POLICY quotes_ins ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() IN ('admin', 'manager') OR rep_user_id = auth.uid())));

DROP POLICY IF EXISTS quotes_upd ON public.quotes;
CREATE POLICY quotes_upd ON public.quotes FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() IN ('admin', 'manager') OR rep_user_id = auth.uid())))
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() IN ('admin', 'manager') OR rep_user_id = auth.uid())));

DROP POLICY IF EXISTS quotes_del ON public.quotes;
CREATE POLICY quotes_del ON public.quotes FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() IN ('admin', 'manager') OR rep_user_id = auth.uid())));
