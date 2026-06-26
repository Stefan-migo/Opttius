-- Migration: 20260330000001_add_contact_lens_product_type.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- ============================================================================
-- Migration: Add contact_lens to product_type
-- Phase: Inventory Refactor - Fase 1
-- Description: Agregar 'contact_lens' como tipo de producto válido
-- ============================================================================

-- Agregar 'contact_lens' al CHECK constraint de product_type
ALTER TABLE products 
DROP CONSTRAINT IF EXISTS products_product_type_check,
ADD CONSTRAINT products_product_type_check 
CHECK (product_type IN ('frame', 'lens', 'accessory', 'service', 'contact_lens'));

-- Verificar que el cambio fue exitoso
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_product_type_check'
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%contact_lens%'
  ) THEN
    RAISE NOTICE 'Successfully added contact_lens to product_type';
  ELSE
    RAISE EXCEPTION 'Failed to add contact_lens to product_type';
  END IF;
END $$;

-- Verificar optical_category ya tiene contact_lenses
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'products_optical_category_check'
    AND contype = 'c'
    AND pg_get_constraintdef(oid) LIKE '%contact_lenses%'
  ) THEN
    -- Si no existe, agregarlo
    ALTER TABLE products
    DROP CONSTRAINT IF EXISTS products_optical_category_check,
    ADD CONSTRAINT products_optical_category_check
    CHECK (optical_category IN ('sunglasses', 'prescription_glasses', 'reading_glasses', 'safety_glasses', 'contact_lenses', 'accessories', 'services'));
  END IF;
END $$;

-- Agregar índice para búsqueda rápida de lentes de contacto
CREATE INDEX IF NOT EXISTS idx_products_contact_lens_type 
ON products(product_type, optical_category) 
WHERE product_type = 'contact_lens';

COMMENT ON CONSTRAINT products_product_type_check ON products 
IS 'Type of optical product: frame, lens, accessory, service, or contact_lens';
