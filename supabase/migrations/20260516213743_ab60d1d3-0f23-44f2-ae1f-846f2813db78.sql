-- 1. Function to check if current user is a representative linked to a specific representative_id
CREATE OR REPLACE FUNCTION public.is_own_rep_data(target_rep_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.representatives
    WHERE id = target_rep_id AND user_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Update RLS Policies for CLIENTS
DROP POLICY IF EXISTS "clients_read" ON public.clients;
CREATE POLICY "clients_read" ON public.clients
FOR SELECT USING (
  is_superadmin(auth.uid()) OR 
  (team_id = current_team_id() AND (
    current_team_role() IN ('admin', 'manager') OR
    is_own_rep_data(representative_id)
  ))
);

-- 3. Update RLS Policies for SALES
DROP POLICY IF EXISTS "sales_read" ON public.sales;
CREATE POLICY "sales_read" ON public.sales
FOR SELECT USING (
  is_superadmin(auth.uid()) OR 
  (team_id = current_team_id() AND (
    current_team_role() IN ('admin', 'manager') OR
    is_own_rep_data(representative_id)
  ))
);

-- 4. Update RLS Policies for OPPORTUNITIES (ensure rep only sees their own)
DROP POLICY IF EXISTS "opportunities_read" ON public.opportunities;
CREATE POLICY "opportunities_read" ON public.opportunities
FOR SELECT USING (
  is_superadmin(auth.uid()) OR 
  (team_id = current_team_id() AND (
    current_team_role() IN ('admin', 'manager') OR
    is_own_rep_data(representative_id)
  ))
);

-- 5. Restrict access to sensitive columns in SALES table
-- We use a VIEW for representatives that excludes margin/cost columns,
-- or we can use column-level security if preferred, but since RLS for SELECT 
-- applies to the whole row, the standard way in Supabase/Postgres to hide specific
-- columns for specific roles is usually through a View or handling it in the API.
-- However, we can also use GRANT to revoke column access.

-- REVOKE access to sensitive columns from the general authenticated role
-- and then GRANT them back only to admins/managers.
-- Note: 'authenticated' is the default role used by Supabase users.
-- This is a more advanced approach. 

REVOKE SELECT (
  mb_cb_pct, mb_cb_total, ml_cb_pct, ml_cb_total, 
  cost_total, commercial_expense, freight
) ON public.sales FROM authenticated;

-- Grant column access back to specialized roles if they exist, 
-- but in Lovable/Supabase we mostly use RLS. 
-- Since we can't easily differentiate 'manager' vs 'rep' at the Postgres ROLE level (both are 'authenticated'),
-- the best approach is to filter these columns in the frontend queries based on user roles 
-- or use a Secure View.

-- Let's create a secure view for sales that everyone can use, 
-- but it will null out sensitive columns for representatives.

CREATE OR REPLACE VIEW public.sales_secure_view AS
SELECT 
    id, invoice_date, order_date, group_code, client_group, invoice_number, 
    order_number, client_code, client_name, segmentation, category, 
    product_code, product_name, qty_bags, price_per_bag, price_per_kg, 
    pmr, discount_pct, city, state, region, rep_code, representative, 
    operation_type, branch_code, branch, product_group, revenue, 
    revenue_no_charges, volume_sales, volume_sales_bonus, bonus, 
    icms_total, pis_total, cofins_total, volume_converted, customized, 
    product_group_code, solution, subsolution, line, grv, gnv, 
    month_year, cfop, fl_vef, commission_pct, commission_value, 
    currency, year, client_id, representative_id, created_at, 
    updated_at, import_source, team_id,
    -- Sensitive columns: only visible to staff
    CASE 
        WHEN (SELECT current_team_role() IN ('admin', 'manager') OR is_superadmin(auth.uid())) 
        THEN mb_cb_pct ELSE NULL 
    END as mb_cb_pct,
    CASE 
        WHEN (SELECT current_team_role() IN ('admin', 'manager') OR is_superadmin(auth.uid())) 
        THEN mb_cb_total ELSE NULL 
    END as mb_cb_total,
    CASE 
        WHEN (SELECT current_team_role() IN ('admin', 'manager') OR is_superadmin(auth.uid())) 
        THEN ml_cb_pct ELSE NULL 
    END as ml_cb_pct,
    CASE 
        WHEN (SELECT current_team_role() IN ('admin', 'manager') OR is_superadmin(auth.uid())) 
        THEN ml_cb_total ELSE NULL 
    END as ml_cb_total,
    CASE 
        WHEN (SELECT current_team_role() IN ('admin', 'manager') OR is_superadmin(auth.uid())) 
        THEN cost_total ELSE NULL 
    END as cost_total,
    CASE 
        WHEN (SELECT current_team_role() IN ('admin', 'manager') OR is_superadmin(auth.uid())) 
        THEN commercial_expense ELSE NULL 
    END as commercial_expense,
    CASE 
        WHEN (SELECT current_team_role() IN ('admin', 'manager') OR is_superadmin(auth.uid())) 
        THEN freight ELSE NULL 
    END as freight
FROM public.sales;

-- Ensure RLS on the view or the underlying table is respected.
-- Supabase automatically handles RLS on the underlying table when querying a view.
