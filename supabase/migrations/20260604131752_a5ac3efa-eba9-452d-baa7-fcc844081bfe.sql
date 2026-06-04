CREATE TABLE public.plan_executions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    plan_id UUID NOT NULL REFERENCES public.supplementation_plans(id) ON DELETE CASCADE,
    execution_date DATE NOT NULL DEFAULT CURRENT_DATE,
    consumption JSONB DEFAULT '[]'::jsonb, -- e.g. [{"product": "X", "amount": "150g"}]
    actual_metrics JSONB DEFAULT '[]'::jsonb, -- e.g. [{"title": "Ganho de Peso", "value": "1.0kg/dia"}]
    application_notes TEXT,
    observations TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.plan_executions TO authenticated;
GRANT ALL ON public.plan_executions TO service_role;

ALTER TABLE public.plan_executions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage executions for their plans" ON public.plan_executions
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.supplementation_plans p
            JOIN public.crop_cycle_client_links l ON l.id = p.link_id
            WHERE p.id = plan_executions.plan_id
        )
    );

CREATE TRIGGER update_plan_executions_updated_at BEFORE UPDATE ON public.plan_executions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();