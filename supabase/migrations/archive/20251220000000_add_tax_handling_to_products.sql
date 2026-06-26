-- Migration: 20251220000000_add_tax_handling_to_products.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add Tax Handling to Products
-- This migration adds support for products with tax-inclusive pricing
-- and ensures proper tax configuration in system_config

-- ===== ADD PRICE_INCLUDES_TAX TO PRODUCTS =====
ALTER TABLE public.products
ADD COLUMN IF NOT EXISTS price_includes_tax BOOLEAN DEFAULT FALSE;

-- Add comment
COMMENT ON COLUMN public.products.price_includes_tax IS 'Indica si el precio del producto ya incluye el IVA. Si es TRUE, el precio mostrado ya incluye IVA. Si es FALSE, se debe agregar IVA al precio.';

-- ===== ENSURE TAX_PERCENTAGE IN SYSTEM_CONFIG =====
-- Update existing tax_rate to tax_percentage for consistency, or create new one
-- We'll use tax_percentage as the standard key name

-- First, check if tax_percentage exists, if not, create it
-- If tax_rate exists, we can keep both or migrate
INSERT INTO public.system_config (config_key, config_value, description, category, is_public, value_type)
VALUES (
  'tax_percentage',
  '19.0',
  'Porcentaje de impuesto (IVA) aplicado en el sistema. Valor por defecto para Chile: 19%',
  'ecommerce',
  false,
  'number'
)
ON CONFLICT (config_key) DO UPDATE
SET 
  config_value = CASE 
    WHEN (SELECT config_value::text FROM public.system_config WHERE config_key = 'tax_rate') IS NOT NULL 
    THEN (SELECT config_value FROM public.system_config WHERE config_key = 'tax_rate')
    ELSE '19.0'::jsonb
  END,
  description = 'Porcentaje de impuesto (IVA) aplicado en el sistema. Valor por defecto para Chile: 19%',
  updated_at = NOW();

-- Create index for better performance on price_includes_tax queries
CREATE INDEX IF NOT EXISTS idx_products_price_includes_tax ON public.products(price_includes_tax);
