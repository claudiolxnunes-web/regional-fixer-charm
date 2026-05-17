-- Função para pegar o team_id do usuário atual de forma performática
CREATE OR REPLACE FUNCTION public.get_my_team_id()
RETURNS uuid AS $$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid() LIMIT 1;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Habilitar RLS em tabelas fundamentais
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.representatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

-- Políticas para teams (ver o próprio time)
CREATE POLICY "Users can view their own team" ON public.teams
  FOR SELECT USING (id = public.get_my_team_id());

-- Políticas para team_members
CREATE POLICY "Users can view members of their team" ON public.team_members
  FOR SELECT USING (team_id = public.get_my_team_id());

-- Políticas para clients (isolamento por equipe)
CREATE POLICY "Team isolation for clients" ON public.clients
  FOR ALL USING (team_id = public.get_my_team_id())
  WITH CHECK (team_id = public.get_my_team_id());

-- Políticas para sales
CREATE POLICY "Team isolation for sales" ON public.sales
  FOR ALL USING (team_id = public.get_my_team_id())
  WITH CHECK (team_id = public.get_my_team_id());

-- Políticas para representatives
CREATE POLICY "Team isolation for representatives" ON public.representatives
  FOR ALL USING (team_id = public.get_my_team_id())
  WITH CHECK (team_id = public.get_my_team_id());

-- Políticas para activities
CREATE POLICY "Team isolation for activities" ON public.activities
  FOR ALL USING (team_id = public.get_my_team_id())
  WITH CHECK (team_id = public.get_my_team_id());

-- Políticas para opportunities
CREATE POLICY "Team isolation for opportunities" ON public.opportunities
  FOR ALL USING (team_id = public.get_my_team_id())
  WITH CHECK (team_id = public.get_my_team_id());

-- Políticas para goals
CREATE POLICY "Team isolation for goals" ON public.goals
  FOR ALL USING (team_id = public.get_my_team_id())
  WITH CHECK (team_id = public.get_my_team_id());
