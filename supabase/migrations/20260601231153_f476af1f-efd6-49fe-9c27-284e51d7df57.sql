-- Add unique constraint to products.product_code if it doesn't exist
ALTER TABLE public.products ADD CONSTRAINT products_product_code_key UNIQUE (product_code);
