
ALTER TABLE public.open_orders
  ADD CONSTRAINT open_orders_unique_order_product UNIQUE (order_number, product_code);

ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS import_source text;
ALTER TABLE public.sales ADD COLUMN IF NOT EXISTS import_source text;
ALTER TABLE public.open_orders ADD COLUMN IF NOT EXISTS import_source text;
