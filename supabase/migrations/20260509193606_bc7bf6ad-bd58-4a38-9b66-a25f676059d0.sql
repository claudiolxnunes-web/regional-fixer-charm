
CREATE TABLE public.goal_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  representative_code text,
  representative_name text,
  representative_id uuid,
  year integer NOT NULL,
  month integer NOT NULL,
  line text,
  solution text,
  subsolution text,
  line_code text,
  solution_code text,
  subsolution_code text,
  revenue_target numeric DEFAULT 0,
  volume_target numeric DEFAULT 0,
  pct numeric,
  total_year numeric,
  import_source text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_goal_targets_rep ON public.goal_targets(representative_code, year, month);
CREATE INDEX idx_goal_targets_ym ON public.goal_targets(year, month);

ALTER TABLE public.goal_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "goal_targets_read" ON public.goal_targets FOR SELECT TO authenticated USING (true);
CREATE POLICY "goal_targets_insert" ON public.goal_targets FOR INSERT TO authenticated WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "goal_targets_update" ON public.goal_targets FOR UPDATE TO authenticated USING (is_staff(auth.uid())) WITH CHECK (is_staff(auth.uid()));
CREATE POLICY "goal_targets_delete" ON public.goal_targets FOR DELETE TO authenticated USING (is_staff(auth.uid()));

CREATE TRIGGER goal_targets_set_updated_at BEFORE UPDATE ON public.goal_targets FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
