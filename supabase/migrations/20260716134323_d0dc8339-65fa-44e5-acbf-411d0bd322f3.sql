
-- 1. job_runs
CREATE TABLE IF NOT EXISTS public.job_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('success','error')),
  duration_ms integer,
  result jsonb,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.job_runs TO authenticated;
GRANT ALL ON public.job_runs TO service_role;
ALTER TABLE public.job_runs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view job runs" ON public.job_runs
  FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin') OR public.has_role(auth.uid(),'superadmin'));
CREATE INDEX IF NOT EXISTS idx_job_runs_name_time ON public.job_runs (job_name, created_at DESC);

-- 2. Indices RLS
CREATE INDEX IF NOT EXISTS idx_sales_team_rep ON public.sales (team_id, representative_id);
CREATE INDEX IF NOT EXISTS idx_sales_invoice_date ON public.sales (invoice_date DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_team_sev_wa ON public.alerts (team_id, severity, whatsapp_sent_at);
CREATE INDEX IF NOT EXISTS idx_alerts_created ON public.alerts (created_at DESC);
