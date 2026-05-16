-- 1. Fix search_path for SECURITY DEFINER functions to prevent hijacking
ALTER FUNCTION public.is_own_rep_data(target_rep_id UUID) SET search_path = public;
ALTER FUNCTION public.current_team_id() SET search_path = public;
ALTER FUNCTION public.current_team_role() SET search_path = public;
ALTER FUNCTION public.is_superadmin(user_id UUID) SET search_path = public;

-- 2. Revoke public execute and grant only to authenticated users (standard security practice)
REVOKE EXECUTE ON FUNCTION public.is_own_rep_data(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_own_rep_data(UUID) TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_team_id() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_team_id() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.current_team_role() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.current_team_role() TO authenticated;

REVOKE EXECUTE ON FUNCTION public.is_superadmin(UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_superadmin(UUID) TO authenticated;

-- 3. Ensure isolation policies are fully applied to all key tables
-- We already updated sales, clients, and opportunities in the previous step.
-- Let's double check 'quotes' as well.

DROP POLICY IF EXISTS "quotes_read" ON public.quotes;
CREATE POLICY "quotes_read" ON public.quotes
FOR SELECT USING (
  is_superadmin(auth.uid()) OR 
  (team_id = current_team_id() AND (
    current_team_role() IN ('admin', 'manager') OR
    rep_user_id = auth.uid()
  ))
);

-- 4. Final confirmation of column-level hiding in the secure view
-- The view 'sales_secure_view' already handles nulling out margin columns for reps.
-- We will now make sure the frontend uses this view for representatives.
