-- Table for Rebanhos (Herds)
CREATE TABLE public.rebanhos (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    name TEXT NOT NULL, -- e.g., "Lote de Engorda 01", "Vacas em Lactação"
    type TEXT NOT NULL, -- Bovinos, Aves, Suínos
    category TEXT, -- Corte, Leite, Postura, etc.
    quantity INTEGER DEFAULT 0,
    location TEXT, -- Piquete/Galpão
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.rebanhos TO authenticated;
GRANT ALL ON public.rebanhos TO service_role;

ALTER TABLE public.rebanhos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage rebanhos of their clients" ON public.rebanhos
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = rebanhos.client_id
        )
    );

-- Table to link Clients/Rebanhos to Nutritional Cycles
CREATE TABLE public.crop_cycle_client_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    cycle_id UUID NOT NULL REFERENCES public.crop_cycles(id) ON DELETE CASCADE,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    rebanho_id UUID REFERENCES public.rebanhos(id) ON DELETE CASCADE,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_cycle_client_links TO authenticated;
GRANT ALL ON public.crop_cycle_client_links TO service_role;

ALTER TABLE public.crop_cycle_client_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage cycle links for their clients" ON public.crop_cycle_client_links
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = crop_cycle_client_links.client_id
        )
    );

-- Table for Nutrition Alerts
CREATE TABLE public.nutrition_alerts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    rebanho_id UUID REFERENCES public.rebanhos(id) ON DELETE CASCADE,
    cycle_id UUID NOT NULL REFERENCES public.crop_cycles(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'start_approaching', 'phase_change', 'end_approaching', 'action_required'
    title TEXT NOT NULL,
    description TEXT,
    is_read BOOLEAN DEFAULT false,
    alert_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.nutrition_alerts TO authenticated;
GRANT ALL ON public.nutrition_alerts TO service_role;

ALTER TABLE public.nutrition_alerts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can see nutrition alerts for their clients" ON public.nutrition_alerts
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM public.clients c
            WHERE c.id = nutrition_alerts.client_id
        )
    );

-- Function to automatically create alerts when a cycle is linked
CREATE OR REPLACE FUNCTION public.generate_nutrition_alerts()
RETURNS TRIGGER AS $$
DECLARE
    cycle_rec RECORD;
    client_name TEXT;
    rebanho_name TEXT;
BEGIN
    SELECT * INTO cycle_rec FROM public.crop_cycles WHERE id = NEW.cycle_id;
    SELECT name INTO client_name FROM public.clients WHERE id = NEW.client_id;
    
    IF NEW.rebanho_id IS NOT NULL THEN
        SELECT name INTO rebanho_name FROM public.rebanhos WHERE id = NEW.rebanho_id;
    ELSE
        rebanho_name := 'Geral';
    END IF;

    -- Alert 7 days before cycle start
    INSERT INTO public.nutrition_alerts (client_id, rebanho_id, cycle_id, type, title, description, alert_date)
    VALUES (
        NEW.client_id, NEW.rebanho_id, NEW.cycle_id, 'start_approaching',
        'Início de Ciclo Nutricional',
        format('O ciclo %s para o rebanho %s do cliente %s inicia em breve (7 dias). Prepare a suplementação recomendada: %s.', cycle_rec.name, rebanho_name, client_name, cycle_rec.recommended_products::text),
        (cycle_rec.start_date - INTERVAL '7 days')::date
    );

    -- Alert on cycle start
    INSERT INTO public.nutrition_alerts (client_id, rebanho_id, cycle_id, type, title, description, alert_date)
    VALUES (
        NEW.client_id, NEW.rebanho_id, NEW.cycle_id, 'phase_change',
        'Ciclo Nutricional Iniciado',
        format('Hoje inicia o ciclo %s para %s (%s). Verifique o estoque de produtos.', cycle_rec.name, rebanho_name, client_name),
        cycle_rec.start_date
    );

    -- Alert 15 days before cycle end
    INSERT INTO public.nutrition_alerts (client_id, rebanho_id, cycle_id, type, title, description, alert_date)
    VALUES (
        NEW.client_id, NEW.rebanho_id, NEW.cycle_id, 'end_approaching',
        'Fim de Ciclo Nutricional',
        format('O ciclo %s para %s finaliza em 15 dias. Agende a visita para planejar a próxima fase.', cycle_rec.name, rebanho_name),
        (cycle_rec.end_date - INTERVAL '15 days')::date
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER trigger_generate_nutrition_alerts
AFTER INSERT ON public.crop_cycle_client_links
FOR EACH ROW EXECUTE FUNCTION public.generate_nutrition_alerts();

-- Seed some rebanhos for testing
INSERT INTO public.rebanhos (client_id, name, type, category, quantity)
SELECT id, 'Lote de Engorda Pasto 1', 'Bovinos', 'Corte', 150 
FROM public.clients LIMIT 1;

INSERT INTO public.rebanhos (client_id, name, type, category, quantity)
SELECT id, 'Vacas Holandesas A1', 'Bovinos', 'Leite', 80 
FROM public.clients OFFSET 1 LIMIT 1;

-- Link them to some existing animal cycles
INSERT INTO public.crop_cycle_client_links (cycle_id, client_id, rebanho_id)
SELECT cy.id, r.client_id, r.id
FROM public.crop_cycles cy, public.rebanhos r
WHERE cy.type = 'Animal' AND cy.name = 'Safra das Águas'
LIMIT 1;
