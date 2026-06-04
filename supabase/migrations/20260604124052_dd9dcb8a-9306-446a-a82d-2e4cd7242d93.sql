-- Create crop_cycles table
CREATE TABLE public.crop_cycles (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    culture TEXT NOT NULL, -- e.g., 'Soja', 'Milho'
    region_id UUID REFERENCES public.regions(id),
    phase TEXT NOT NULL, -- 'Plantio', 'Desenvolvimento', 'Colheita'
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    recommended_products JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add health_score to clients
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS health_score INTEGER DEFAULT 100;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS health_status TEXT DEFAULT 'Saudável'; -- 'Saudável', 'Atenção', 'Crítico'

-- Create customer_health_logs table
CREATE TABLE public.customer_health_logs (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    client_id UUID NOT NULL REFERENCES public.clients(id) ON DELETE CASCADE,
    old_score INTEGER,
    new_score INTEGER,
    reason TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Function to calculate health score based on last purchase
CREATE OR REPLACE FUNCTION public.calculate_client_health() RETURNS TRIGGER AS $$
DECLARE
    last_purchase TIMESTAMP;
    days_since_purchase INTEGER;
    new_health_score INTEGER := 100;
    new_health_status TEXT := 'Saudável';
BEGIN
    -- Get last purchase date for this client
    SELECT MAX(sale_date) INTO last_purchase FROM public.sales WHERE client_id = NEW.client_id;
    
    IF last_purchase IS NOT NULL THEN
        days_since_purchase := EXTRACT(DAY FROM (now() - last_purchase));
        
        -- Decay logic: 
        -- 0-90 days: 100 score
        -- 91-180 days: 70 score (Atenção)
        -- > 180 days: 30 score (Crítico)
        IF days_since_purchase > 180 THEN
            new_health_score := 30;
            new_health_status := 'Crítico';
        ELSIF days_since_purchase > 90 THEN
            new_health_score := 70;
            new_health_status := 'Atenção';
        END IF;
    ELSE
        -- No purchases ever
        new_health_score := 50;
        new_health_status := 'Atenção';
    END IF;

    UPDATE public.clients 
    SET health_score = new_health_score, 
        health_status = new_health_status,
        updated_at = now()
    WHERE id = NEW.client_id;

    -- Log health change
    INSERT INTO public.customer_health_logs (client_id, old_score, new_score, reason)
    VALUES (NEW.client_id, (SELECT health_score FROM public.clients WHERE id = NEW.client_id), new_health_score, 'Venda registrada ou atualizada');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on sales to update client health
CREATE TRIGGER tr_update_client_health_on_sale
AFTER INSERT OR UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.calculate_client_health();

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON public.crop_cycles TO authenticated;
GRANT ALL ON public.crop_cycles TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_health_logs TO authenticated;
GRANT ALL ON public.customer_health_logs TO service_role;

ALTER TABLE public.crop_cycles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage crop_cycles" ON public.crop_cycles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Users can manage customer_health_logs" ON public.customer_health_logs FOR ALL USING (true) WITH CHECK (true);
