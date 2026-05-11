ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.alerts ADD COLUMN IF NOT EXISTS whatsapp_sent_at timestamptz;
CREATE INDEX IF NOT EXISTS idx_alerts_whatsapp_dispatch ON public.alerts (severity, whatsapp_sent_at) WHERE severity = 'high' AND whatsapp_sent_at IS NULL;