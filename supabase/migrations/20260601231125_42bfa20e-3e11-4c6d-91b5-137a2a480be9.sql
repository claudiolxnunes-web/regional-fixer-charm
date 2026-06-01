-- Migration to sync related entities and update totals automatically
CREATE OR REPLACE FUNCTION public.handle_import_sync()
RETURNS TRIGGER AS $$
DECLARE
    target_rep_id UUID;
    target_client_id UUID;
    target_product_id UUID;
    v_team_id UUID;
BEGIN
    -- Obter o team_id do registro que está sendo inserido
    v_team_id := NEW.team_id;

    -- 1. Sync Representative
    IF NEW.rep_code IS NOT NULL AND NEW.rep_code <> '' THEN
        INSERT INTO public.representatives (rep_code, name, team_id, status)
        VALUES (NEW.rep_code, COALESCE(NEW.representative, 'Rep ' || NEW.rep_code), v_team_id, 'active')
        ON CONFLICT (rep_code) DO UPDATE 
        SET name = EXCLUDED.name, 
            team_id = EXCLUDED.team_id
        RETURNING id INTO target_rep_id;
        
        NEW.representative_id = target_rep_id;
    END IF;

    -- 2. Sync Client
    IF NEW.client_code IS NOT NULL AND NEW.client_code <> '' THEN
        INSERT INTO public.clients (client_code, name, team_id, type, representative_id)
        VALUES (NEW.client_code, COALESCE(NEW.client_name, 'Cliente ' || NEW.client_code), v_team_id, 'fazenda_ruminantes', target_rep_id)
        ON CONFLICT (client_code) DO UPDATE 
        SET name = EXCLUDED.name,
            team_id = EXCLUDED.team_id,
            representative_id = COALESCE(public.clients.representative_id, EXCLUDED.representative_id)
        RETURNING id INTO target_client_id;
        
        NEW.client_id = target_client_id;
    END IF;

    -- 3. Sync Product
    IF NEW.product_code IS NOT NULL AND NEW.product_code <> '' THEN
        INSERT INTO public.products (product_code, name, team_id)
        VALUES (NEW.product_code, COALESCE(NEW.product_name, 'Produto ' || NEW.product_code), v_team_id)
        ON CONFLICT (product_code) DO UPDATE 
        SET name = EXCLUDED.name,
            team_id = EXCLUDED.team_id
        RETURNING id INTO target_product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for Sales
DROP TRIGGER IF EXISTS trg_sync_sales_entities ON public.sales;
CREATE TRIGGER trg_sync_sales_entities
BEFORE INSERT OR UPDATE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.handle_import_sync();

-- Trigger for Open Orders
CREATE OR REPLACE FUNCTION public.handle_orders_import_sync()
RETURNS TRIGGER AS $$
DECLARE
    target_rep_id UUID;
    target_client_id UUID;
    target_product_id UUID;
    v_team_id UUID;
BEGIN
    -- Obter o team_id do registro que está sendo inserido
    v_team_id := NEW.team_id;

    -- 1. Sync Representative (ERC)
    IF NEW.erc_code IS NOT NULL AND NEW.erc_code <> '' THEN
        INSERT INTO public.representatives (rep_code, name, team_id, status)
        VALUES (NEW.erc_code, COALESCE(NEW.erc, 'Rep ' || NEW.erc_code), v_team_id, 'active')
        ON CONFLICT (rep_code) DO UPDATE 
        SET name = EXCLUDED.name,
            team_id = EXCLUDED.team_id
        RETURNING id INTO target_rep_id;
        
        NEW.representative_id = target_rep_id;
    END IF;

    -- 2. Sync Client
    IF NEW.client_code IS NOT NULL AND NEW.client_code <> '' THEN
        INSERT INTO public.clients (client_code, name, team_id, type, representative_id)
        VALUES (NEW.client_code, COALESCE(NEW.client_name, 'Cliente ' || NEW.client_code), v_team_id, 'fazenda_ruminantes', target_rep_id)
        ON CONFLICT (client_code) DO UPDATE 
        SET name = EXCLUDED.name,
            team_id = EXCLUDED.team_id,
            representative_id = COALESCE(public.clients.representative_id, EXCLUDED.representative_id)
        RETURNING id INTO target_client_id;
        
        NEW.client_id = target_client_id;
    END IF;

    -- 3. Sync Product
    IF NEW.product_code IS NOT NULL AND NEW.product_code <> '' THEN
        INSERT INTO public.products (product_code, name, team_id)
        VALUES (NEW.product_code, COALESCE(NEW.product_name, 'Produto ' || NEW.product_code), v_team_id)
        ON CONFLICT (product_code) DO UPDATE 
        SET name = EXCLUDED.name,
            team_id = EXCLUDED.team_id
        RETURNING id INTO target_product_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_sync_orders_entities ON public.open_orders;
CREATE TRIGGER trg_sync_orders_entities
BEFORE INSERT OR UPDATE ON public.open_orders
FOR EACH ROW EXECUTE FUNCTION public.handle_orders_import_sync();

-- Function to update representative totals
CREATE OR REPLACE FUNCTION public.refresh_rep_totals()
RETURNS TRIGGER AS $$
DECLARE
    v_team_id UUID;
BEGIN
    -- Tentar pegar o team_id de NEW (Insert/Update) ou OLD (Delete)
    IF TG_OP = 'DELETE' THEN
        v_team_id := OLD.team_id;
    ELSE
        v_team_id := NEW.team_id;
    END IF;

    IF v_team_id IS NULL THEN
        RETURN NULL;
    END IF;

    -- Update representative totals based on all sales
    UPDATE public.representatives r
    SET 
        total_sales = (SELECT COALESCE(SUM(revenue), 0) FROM public.sales s WHERE s.representative_id = r.id),
        total_clients = (SELECT COUNT(DISTINCT client_id) FROM public.sales s WHERE s.representative_id = r.id)
    WHERE r.team_id = v_team_id;

    -- Update client totals
    UPDATE public.clients c
    SET 
        total_purchases = (SELECT COALESCE(SUM(revenue), 0) FROM public.sales s WHERE s.client_id = c.id),
        last_purchase_date = (SELECT MAX(invoice_date) FROM public.sales s WHERE s.client_id = c.id)
    WHERE c.team_id = v_team_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to refresh totals after sales change
DROP TRIGGER IF EXISTS trg_refresh_totals_after_sales ON public.sales;
CREATE TRIGGER trg_refresh_totals_after_sales
AFTER INSERT OR UPDATE OR DELETE ON public.sales
FOR EACH ROW EXECUTE FUNCTION public.refresh_rep_totals();
