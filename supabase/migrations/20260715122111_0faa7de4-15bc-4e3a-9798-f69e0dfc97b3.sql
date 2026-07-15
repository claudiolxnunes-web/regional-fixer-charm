
-- 1. Make current_rep_id SECURITY DEFINER with fixed search_path (consistency with siblings)
CREATE OR REPLACE FUNCTION public.current_rep_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT id FROM public.representatives WHERE user_id = auth.uid() LIMIT 1
$function$;

CREATE OR REPLACE FUNCTION public.current_rep_code()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT rep_code FROM public.representatives WHERE user_id = auth.uid() LIMIT 1
$function$;

-- 2. team_members already has UNIQUE(user_id), so each user belongs to at most one team.
-- Simplify current_team_id / current_team_role to reflect and enforce that invariant,
-- removing the ORDER BY that implied ambiguous multi-team fallback.
CREATE OR REPLACE FUNCTION public.current_team_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.current_team_role()
RETURNS text
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT role FROM public.team_members WHERE user_id = auth.uid()
$function$;

CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS uuid
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
$function$;

-- 3. Add missing write policies on nutrition_alerts, scoped by client -> team.
CREATE POLICY "Team can insert nutrition alerts"
ON public.nutrition_alerts
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = nutrition_alerts.client_id
      AND c.team_id = public.current_team_id()
  )
);

CREATE POLICY "Team can update nutrition alerts"
ON public.nutrition_alerts
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = nutrition_alerts.client_id
      AND c.team_id = public.current_team_id()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = nutrition_alerts.client_id
      AND c.team_id = public.current_team_id()
  )
);

CREATE POLICY "Team can delete nutrition alerts"
ON public.nutrition_alerts
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.clients c
    WHERE c.id = nutrition_alerts.client_id
      AND c.team_id = public.current_team_id()
  )
);
