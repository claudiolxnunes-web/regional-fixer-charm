
-- ========= Strategic Plans (SMART) =========
CREATE TABLE public.strategic_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID,
  owner_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  period_type TEXT NOT NULL DEFAULT 'monthly', -- 'weekly' | 'monthly'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'active', -- active | archived
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.strategic_plans ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_sp_updated BEFORE UPDATE ON public.strategic_plans FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_sp_team BEFORE INSERT ON public.strategic_plans FOR EACH ROW EXECUTE FUNCTION public.set_team_id_from_user();

CREATE POLICY sp_read ON public.strategic_plans FOR SELECT TO authenticated
  USING (is_superadmin(auth.uid()) OR team_id = current_team_id());
CREATE POLICY sp_ins ON public.strategic_plans FOR INSERT TO authenticated
  WITH CHECK (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND current_team_role() = 'admin'));
CREATE POLICY sp_upd ON public.strategic_plans FOR UPDATE TO authenticated
  USING (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND current_team_role() = 'admin'))
  WITH CHECK (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND current_team_role() = 'admin'));
CREATE POLICY sp_del ON public.strategic_plans FOR DELETE TO authenticated
  USING (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND current_team_role() = 'admin'));

CREATE TABLE public.strategic_objectives (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID,
  plan_id UUID NOT NULL REFERENCES public.strategic_plans(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  metric TEXT, -- ex: "Receita", "Visitas", "Novos clientes"
  target_value NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  due_date DATE,
  assigned_rep_id UUID, -- representative.id
  status TEXT NOT NULL DEFAULT 'planned', -- planned | in_progress | done | overdue
  -- SMART data
  specific TEXT,
  measurable TEXT,
  achievable TEXT,
  relevant TEXT,
  time_bound TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.strategic_objectives ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_so_updated BEFORE UPDATE ON public.strategic_objectives FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_so_team BEFORE INSERT ON public.strategic_objectives FOR EACH ROW EXECUTE FUNCTION public.set_team_id_from_user();

CREATE POLICY so_read ON public.strategic_objectives FOR SELECT TO authenticated
  USING (is_superadmin(auth.uid()) OR team_id = current_team_id());
CREATE POLICY so_ins ON public.strategic_objectives FOR INSERT TO authenticated
  WITH CHECK (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND current_team_role() = 'admin'));
CREATE POLICY so_upd ON public.strategic_objectives FOR UPDATE TO authenticated
  USING (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND current_team_role() = 'admin'))
  WITH CHECK (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND current_team_role() = 'admin'));
CREATE POLICY so_del ON public.strategic_objectives FOR DELETE TO authenticated
  USING (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND current_team_role() = 'admin'));

CREATE TABLE public.strategic_actions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID,
  objective_id UUID NOT NULL REFERENCES public.strategic_objectives(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  done BOOLEAN NOT NULL DEFAULT false,
  done_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.strategic_actions ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_sa_team BEFORE INSERT ON public.strategic_actions FOR EACH ROW EXECUTE FUNCTION public.set_team_id_from_user();

CREATE POLICY sa_read ON public.strategic_actions FOR SELECT TO authenticated
  USING (is_superadmin(auth.uid()) OR team_id = current_team_id());
CREATE POLICY sa_ins ON public.strategic_actions FOR INSERT TO authenticated
  WITH CHECK (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND current_team_role() = 'admin'));
CREATE POLICY sa_upd ON public.strategic_actions FOR UPDATE TO authenticated
  USING (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND current_team_role() = 'admin'))
  WITH CHECK (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND current_team_role() = 'admin'));
CREATE POLICY sa_del ON public.strategic_actions FOR DELETE TO authenticated
  USING (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND current_team_role() = 'admin'));

-- ========= SPIN notes (Representante) =========
CREATE TABLE public.spin_notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID,
  activity_id UUID REFERENCES public.activities(id) ON DELETE CASCADE,
  client_id UUID,
  rep_user_id UUID NOT NULL DEFAULT auth.uid(),
  representative_id UUID,
  -- SPIN
  situation TEXT,
  problem TEXT,
  implication TEXT,
  need_payoff TEXT,
  -- Pós visita
  outcome TEXT,
  next_steps TEXT,
  opportunity_id UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.spin_notes ENABLE ROW LEVEL SECURITY;
CREATE TRIGGER trg_spin_updated BEFORE UPDATE ON public.spin_notes FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_spin_team BEFORE INSERT ON public.spin_notes FOR EACH ROW EXECUTE FUNCTION public.set_team_id_from_user();

CREATE POLICY spin_read ON public.spin_notes FOR SELECT TO authenticated
  USING (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND (current_team_role() = 'admin' OR rep_user_id = auth.uid() OR representative_id = current_rep_id())));
CREATE POLICY spin_ins ON public.spin_notes FOR INSERT TO authenticated
  WITH CHECK (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND (current_team_role() = 'admin' OR rep_user_id = auth.uid())));
CREATE POLICY spin_upd ON public.spin_notes FOR UPDATE TO authenticated
  USING (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND (current_team_role() = 'admin' OR rep_user_id = auth.uid())))
  WITH CHECK (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND (current_team_role() = 'admin' OR rep_user_id = auth.uid())));
CREATE POLICY spin_del ON public.spin_notes FOR DELETE TO authenticated
  USING (is_superadmin(auth.uid()) OR (team_id = current_team_id() AND (current_team_role() = 'admin' OR rep_user_id = auth.uid())));

CREATE INDEX idx_spin_activity ON public.spin_notes(activity_id);
CREATE INDEX idx_so_plan ON public.strategic_objectives(plan_id);
CREATE INDEX idx_sa_obj ON public.strategic_actions(objective_id);
