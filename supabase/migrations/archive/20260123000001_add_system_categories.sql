-- Migration: 20260123000001_add_system_categories.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add system categories with protection
-- This migration adds a field to mark system categories and creates default categories
-- "Marcos" is locked and cannot be deleted, while other default categories can be modified/deleted

-- Step 1: Add is_system field to categories table
ALTER TABLE public.categories
ADD COLUMN IF NOT EXISTS is_system BOOLEAN DEFAULT FALSE NOT NULL;

-- Step 2: Add comment
COMMENT ON COLUMN public.categories.is_system IS 'Indica si la categoría es del sistema. Las categorías del sistema (is_system=true) no pueden ser eliminadas. Solo "Marcos" tiene is_system=true.';

-- Step 3: Create index for performance
CREATE INDEX IF NOT EXISTS idx_categories_is_system ON public.categories(is_system);

-- Step 4: Insert or update default categories
-- "Marcos" - locked system category
INSERT INTO public.categories (name, slug, description, is_active, sort_order, is_system)
VALUES ('Marcos', 'marcos', 'Armazones y marcos para lentes', true, 1, true)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true,
  is_system = true; -- Ensure it's always marked as system

-- "Lentes de sol" - default but editable/deletable
INSERT INTO public.categories (name, slug, description, is_active, sort_order, is_system)
VALUES ('Lentes de sol', 'lentes-de-sol', 'Lentes de sol y gafas de sol', true, 2, false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true,
  is_system = false; -- Ensure it's not marked as system

-- "Accesorios" - default but editable/deletable
INSERT INTO public.categories (name, slug, description, is_active, sort_order, is_system)
VALUES ('Accesorios', 'accesorios', 'Accesorios para lentes y cuidado', true, 3, false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true,
  is_system = false; -- Ensure it's not marked as system

-- "Servicios" - default but editable/deletable
INSERT INTO public.categories (name, slug, description, is_active, sort_order, is_system)
VALUES ('Servicios', 'servicios', 'Servicios de óptica y reparación', true, 4, false)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true,
  is_system = false; -- Ensure it's not marked as system

-- Step 5: Create function to prevent deletion of system categories
CREATE OR REPLACE FUNCTION prevent_system_category_deletion()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.is_system = true THEN
    RAISE EXCEPTION 'No se puede eliminar la categoría del sistema: %', OLD.name;
  END IF;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Step 6: Create trigger to prevent deletion
DROP TRIGGER IF EXISTS check_system_category_deletion ON public.categories;
CREATE TRIGGER check_system_category_deletion
  BEFORE DELETE ON public.categories
  FOR EACH ROW
  EXECUTE FUNCTION prevent_system_category_deletion();

-- Step 7: Update existing products with product_type='frame' to have category_id pointing to "Marcos"
UPDATE public.products
SET category_id = (SELECT id FROM public.categories WHERE slug = 'marcos' AND is_system = true LIMIT 1)
WHERE product_type = 'frame' 
  AND category_id IS NULL;

-- Step 8: Comments
COMMENT ON FUNCTION prevent_system_category_deletion() IS 'Previene la eliminación de categorías del sistema (is_system=true). Solo "Marcos" está protegida.';
COMMENT ON TRIGGER check_system_category_deletion ON public.categories IS 'Trigger que previene la eliminación de categorías del sistema.';
