
REVOKE EXECUTE ON FUNCTION public.generate_inactive_client_alerts() FROM PUBLIC, authenticated, anon;
GRANT EXECUTE ON FUNCTION public.generate_inactive_client_alerts() TO service_role;
