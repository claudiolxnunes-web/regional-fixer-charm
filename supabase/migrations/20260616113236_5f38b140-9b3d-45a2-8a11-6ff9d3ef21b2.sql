CREATE TABLE IF NOT EXISTS public.whatsapp_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  api_url text NOT NULL DEFAULT 'https://evolution.bpfconsult.com.br',
  api_key text NOT NULL,
  instance_name text NOT NULL,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.whatsapp_config TO authenticated;
GRANT ALL ON public.whatsapp_config TO service_role;

ALTER TABLE public.whatsapp_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "members can view whatsapp_config"
  ON public.whatsapp_config FOR SELECT TO authenticated
  USING (team_id IN (SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = auth.uid()));

CREATE POLICY "members can insert whatsapp_config"
  ON public.whatsapp_config FOR INSERT TO authenticated
  WITH CHECK (team_id IN (SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = auth.uid()));

CREATE POLICY "members can update whatsapp_config"
  ON public.whatsapp_config FOR UPDATE TO authenticated
  USING (team_id IN (SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = auth.uid()))
  WITH CHECK (team_id IN (SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = auth.uid()));

CREATE POLICY "members can delete whatsapp_config"
  ON public.whatsapp_config FOR DELETE TO authenticated
  USING (team_id IN (SELECT tm.team_id FROM public.team_members tm WHERE tm.user_id = auth.uid()));

CREATE TRIGGER trg_whatsapp_config_updated
  BEFORE UPDATE ON public.whatsapp_config
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();