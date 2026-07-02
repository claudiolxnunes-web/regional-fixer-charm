CREATE OR REPLACE FUNCTION public.calculate_client_health() RETURNS TRIGGER AS $$
DECLARE
    last_purchase TIMESTAMP;
    days_since_purchase INTEGER;
    new_health_score INTEGER := 100;
    new_health_status TEXT := 'Saudável';
BEGIN
    IF NEW.client_id IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT MAX(invoice_date)::timestamp INTO last_purchase FROM public.sales WHERE client_id = NEW.client_id;

    IF last_purchase IS NOT NULL THEN
        days_since_purchase := EXTRACT(DAY FROM (now() - last_purchase));
        IF days_since_purchase > 180 THEN
            new_health_score := 30;
            new_health_status := 'Crítico';
        ELSIF days_since_purchase > 90 THEN
            new_health_score := 70;
            new_health_status := 'Atenção';
        END IF;
    ELSE
        new_health_score := 50;
        new_health_status := 'Atenção';
    END IF;

    UPDATE public.clients
    SET health_score = new_health_score,
        health_status = new_health_status,
        updated_at = now()
    WHERE id = NEW.client_id;

    INSERT INTO public.customer_health_logs (client_id, old_score, new_score, reason)
    VALUES (NEW.client_id, (SELECT health_score FROM public.clients WHERE id = NEW.client_id), new_health_score, 'Venda registrada ou atualizada');

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;