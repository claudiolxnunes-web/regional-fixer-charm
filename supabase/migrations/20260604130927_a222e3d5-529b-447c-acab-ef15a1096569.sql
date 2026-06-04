-- Ensure the update function exists
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE public.supplementation_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    link_id UUID NOT NULL REFERENCES public.crop_cycle_client_links(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'draft',
    goals JSONB DEFAULT '[]'::jsonb, -- e.g. [{"title": "Ganho de Peso", "target": "1.2kg/dia"}]
    inputs JSONB DEFAULT '[]'::jsonb, -- e.g. [{"product": "Suplemento Mineral", "dosage": "100g/dia", "period": "Diário"}]
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.supplementation_plans TO authenticated;
GRANT ALL ON public.supplementation_plans TO service_role;

ALTER TABLE public.supplementation_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage supplementation plans for their links" ON public.supplementation_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.crop_cycle_client_links l
            JOIN public.clients c ON c.id = l.client_id
            WHERE l.id = supplementation_plans.link_id
        )
    );

-- Trigger to update updated_at
CREATE TRIGGER update_supplementation_plans_updated_at BEFORE UPDATE ON public.supplementation_plans FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();