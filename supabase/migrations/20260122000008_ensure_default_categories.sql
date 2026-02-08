-- Migration: Ensure default categories exist
-- This ensures that essential categories like "Marcos" exist for product organization

-- Insert "Marcos" category if it doesn't exist
INSERT INTO public.categories (name, slug, description, is_active, sort_order)
VALUES ('Marcos', 'marcos', 'Armazones y marcos para lentes', true, 1)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true;

-- Insert other useful categories if they don't exist
INSERT INTO public.categories (name, slug, description, is_active, sort_order)
VALUES 
  ('Accesorios', 'accesorios', 'Accesorios para lentes', true, 3),
  ('Servicios', 'servicios', 'Servicios de óptica', true, 4)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true;

-- Update existing products with product_type='frame' to have category_id pointing to "Marcos"
UPDATE public.products
SET category_id = (SELECT id FROM public.categories WHERE slug = 'marcos' LIMIT 1)
WHERE product_type = 'frame' 
  AND category_id IS NULL;

-- Comments
COMMENT ON TABLE public.categories IS 'Categorías de productos. La categoría "Marcos" es la categoría por defecto para armazones.';
