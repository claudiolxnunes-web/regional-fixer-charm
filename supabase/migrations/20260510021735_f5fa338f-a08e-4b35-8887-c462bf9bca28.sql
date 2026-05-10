-- Tabelas principais
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL,
  seat_limit integer NOT NULL DEFAULT 20,
  plan text NOT NULL DEFAULT 'mensal',
  subscription_status text NOT NULL DEFAULT 'pending',
  current_period_end timestamptz,
  stripe_customer_id text,
  stripe_subscription_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_teams_owner ON public.teams(owner_id);
CREATE TRIGGER teams_set_updated BEFORE UPDATE ON public.teams
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'rep',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (team_id, user_id),
  UNIQUE (user_id)
);
CREATE INDEX idx_team_members_team ON public.team_members(team_id);

CREATE TABLE public.invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(24), 'hex'),
  email text,
  role text NOT NULL DEFAULT 'rep',
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  used_at timestamptz,
  used_by uuid,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_invites_team ON public.invites(team_id);
CREATE INDEX idx_invites_token ON public.invites(token);

CREATE TABLE public.subscriptions_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  stripe_event_id text UNIQUE,
  payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- team_id em todas tabelas operacionais
ALTER TABLE public.representatives ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.clients          ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.sales            ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.opportunities    ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.quotes           ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.activities       ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.alerts           ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.daily_reports    ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.goals            ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.goal_targets     ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.open_orders      ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.products         ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.regions          ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;
ALTER TABLE public.alert_settings   ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE;

-- Funções helper
CREATE OR REPLACE FUNCTION public.is_superadmin(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'superadmin')
$$;

CREATE OR REPLACE FUNCTION public.current_team_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT team_id FROM public.team_members WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.current_team_role()
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT role FROM public.team_members WHERE user_id = auth.uid() LIMIT 1
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role IN ('admin','manager','superadmin')
  )
$$;

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscriptions_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY teams_read ON public.teams FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR id = public.current_team_id());
CREATE POLICY teams_update ON public.teams FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (id = public.current_team_id() AND public.current_team_role() = 'admin'))
  WITH CHECK (public.is_superadmin(auth.uid()) OR (id = public.current_team_id() AND public.current_team_role() = 'admin'));
CREATE POLICY teams_insert ON public.teams FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()));
CREATE POLICY teams_delete ON public.teams FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()));

CREATE POLICY tm_read ON public.team_members FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR team_id = public.current_team_id() OR user_id = auth.uid());
CREATE POLICY tm_insert ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'));
CREATE POLICY tm_delete ON public.team_members FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin' AND user_id <> auth.uid()));
CREATE POLICY tm_update ON public.team_members FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'))
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'));

CREATE POLICY inv_read ON public.invites FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR team_id = public.current_team_id());
CREATE POLICY inv_insert ON public.invites FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'));
CREATE POLICY inv_update ON public.invites FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'))
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'));
CREATE POLICY inv_delete ON public.invites FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'));

CREATE POLICY sl_read ON public.subscriptions_log FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'));

-- Drop old policies on operational tables
DO $$ DECLARE t text; pol text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'representatives','clients','sales','opportunities','quotes','activities',
    'alerts','daily_reports','goals','goal_targets','open_orders','products','regions','alert_settings'
  ]) LOOP
    FOR pol IN SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename=t LOOP
      EXECUTE format('DROP POLICY %I ON public.%I', pol, t);
    END LOOP;
  END LOOP;
END $$;

-- Simples: superadmin OU mesma equipe (read); admin do team escreve
DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'representatives','clients','sales','opportunities','goals','goal_targets',
    'open_orders','products','regions','alert_settings'
  ]) LOOP
    EXECUTE format($f$
      CREATE POLICY %1$I_read ON public.%1$I FOR SELECT TO authenticated
        USING (public.is_superadmin(auth.uid()) OR team_id = public.current_team_id());
      CREATE POLICY %1$I_ins ON public.%1$I FOR INSERT TO authenticated
        WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'));
      CREATE POLICY %1$I_upd ON public.%1$I FOR UPDATE TO authenticated
        USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'))
        WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'));
      CREATE POLICY %1$I_del ON public.%1$I FOR DELETE TO authenticated
        USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'));
    $f$, t);
  END LOOP;
END $$;

-- Tabelas com escrita do rep
CREATE POLICY activities_read ON public.activities FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR team_id = public.current_team_id());
CREATE POLICY activities_ins ON public.activities FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR representative_id = public.current_rep_id())));
CREATE POLICY activities_upd ON public.activities FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR representative_id = public.current_rep_id())))
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR representative_id = public.current_rep_id())));
CREATE POLICY activities_del ON public.activities FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'));

CREATE POLICY quotes_read ON public.quotes FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR rep_user_id = auth.uid())));
CREATE POLICY quotes_ins ON public.quotes FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR rep_user_id = auth.uid())));
CREATE POLICY quotes_upd ON public.quotes FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR rep_user_id = auth.uid())))
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR rep_user_id = auth.uid())));
CREATE POLICY quotes_del ON public.quotes FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR rep_user_id = auth.uid())));

CREATE POLICY alerts_read ON public.alerts FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR rep_user_id = auth.uid() OR representative_id = public.current_rep_id())));
CREATE POLICY alerts_ins ON public.alerts FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'));
CREATE POLICY alerts_upd ON public.alerts FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR rep_user_id = auth.uid() OR representative_id = public.current_rep_id())))
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR rep_user_id = auth.uid() OR representative_id = public.current_rep_id())));
CREATE POLICY alerts_del ON public.alerts FOR DELETE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND public.current_team_role() = 'admin'));

CREATE POLICY dr_read ON public.daily_reports FOR SELECT TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR rep_user_id = auth.uid())));
CREATE POLICY dr_ins ON public.daily_reports FOR INSERT TO authenticated
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR rep_user_id = auth.uid())));
CREATE POLICY dr_upd ON public.daily_reports FOR UPDATE TO authenticated
  USING (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR rep_user_id = auth.uid())))
  WITH CHECK (public.is_superadmin(auth.uid()) OR (team_id = public.current_team_id() AND (public.current_team_role() = 'admin' OR rep_user_id = auth.uid())));

-- Auto-set team_id em INSERTs
CREATE OR REPLACE FUNCTION public.set_team_id_from_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.team_id IS NULL THEN
    NEW.team_id := public.current_team_id();
  END IF;
  RETURN NEW;
END $$;

DO $$ DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY[
    'representatives','clients','sales','opportunities','quotes','activities',
    'alerts','daily_reports','goals','goal_targets','open_orders','products','regions','alert_settings'
  ]) LOOP
    EXECUTE format('CREATE TRIGGER trg_set_team_id BEFORE INSERT ON public.%I
      FOR EACH ROW EXECUTE FUNCTION public.set_team_id_from_user()', t);
  END LOOP;
END $$;