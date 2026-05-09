
CREATE OR REPLACE FUNCTION public.current_rep_code()
RETURNS text
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT rep_code FROM public.representatives WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_rep_id()
RETURNS uuid
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public
AS $$
  SELECT id FROM public.representatives WHERE user_id = auth.uid() LIMIT 1
$$;

REVOKE EXECUTE ON FUNCTION public.current_rep_code() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.current_rep_id() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.current_rep_code() TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_rep_id() TO authenticated;
