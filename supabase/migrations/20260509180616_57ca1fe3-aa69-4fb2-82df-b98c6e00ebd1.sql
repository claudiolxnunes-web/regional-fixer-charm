CREATE UNIQUE INDEX IF NOT EXISTS representatives_rep_code_unique
  ON public.representatives (rep_code) WHERE rep_code IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS clients_client_code_unique
  ON public.clients (client_code) WHERE client_code IS NOT NULL;