-- Add type column to crop_cycles
ALTER TABLE public.crop_cycles ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'Vegetal' CHECK (type IN ('Vegetal', 'Animal'));

-- Update comments/metadata if needed (culture can now be 'Bovinos', 'Aves', etc.)
COMMENT ON COLUMN public.crop_cycles.culture IS 'Culture type: e.g. Soja, Milho for Vegetal; Bovinos, Aves, Suínos for Animal';

-- Seed some animal nutrition cycles
INSERT INTO public.crop_cycles (name, culture, type, phase, start_date, end_date, recommended_products)
VALUES 
('Safra das Águas', 'Bovinos de Corte', 'Animal', 'Desenvolvimento', '2026-10-01', '2027-03-31', '["Mineralização", "Suplemento Proteico"]'),
('Entresafra (Seca)', 'Bovinos de Corte', 'Animal', 'Desenvolvimento', '2026-04-01', '2026-09-30', '["Proteico Energético", "Ureia", "Feno/Silagem"]'),
('Período de Transição', 'Bovinos de Leite', 'Animal', 'Plantio', '2026-03-01', '2026-05-31', '["Ração Pré-Parto", "Aniônico"]');

-- Update the calculate_client_health function to potentially handle nutrition logic
-- For now, we'll just ensure it keeps working, but we could add weighting based on cycle type in the future.
