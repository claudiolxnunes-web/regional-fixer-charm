-- Linhas de negócio por cliente
CREATE TABLE public.client_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
  line text NOT NULL CHECK (line IN ('nutricao_ruminantes','revenda_ruminantes','aditivos','indefinido')),
  line_code text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (line_code)
);

CREATE INDEX idx_client_lines_client ON public.client_lines(client_id);
CREATE INDEX idx_client_lines_line ON public.client_lines(line);

ALTER TABLE public.client_lines ENABLE ROW LEVEL SECURITY;

CREATE POLICY client_lines_read ON public.client_lines FOR SELECT TO authenticated USING (true);
CREATE POLICY client_lines_insert ON public.client_lines FOR INSERT TO authenticated WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY client_lines_update ON public.client_lines FOR UPDATE TO authenticated USING (public.is_staff(auth.uid())) WITH CHECK (public.is_staff(auth.uid()));
CREATE POLICY client_lines_delete ON public.client_lines FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER trg_client_lines_updated BEFORE UPDATE ON public.client_lines FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();