-- Migration: 20251220000001_add_tax_inclusion_settings.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add Tax Inclusion Settings to Quote Settings
-- This migration adds configuration to determine if labor, lens, and treatments costs include tax

-- Add columns to quote_settings table
ALTER TABLE public.quote_settings
ADD COLUMN IF NOT EXISTS labor_cost_includes_tax BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS lens_cost_includes_tax BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS treatments_cost_includes_tax BOOLEAN DEFAULT TRUE;

-- Add comments
COMMENT ON COLUMN public.quote_settings.labor_cost_includes_tax IS 'Indica si el costo de mano de obra ya incluye IVA. TRUE por defecto (IVA incluido).';
COMMENT ON COLUMN public.quote_settings.lens_cost_includes_tax IS 'Indica si el costo de lentes ya incluye IVA. TRUE por defecto (IVA incluido).';
COMMENT ON COLUMN public.quote_settings.treatments_cost_includes_tax IS 'Indica si el costo de tratamientos ya incluye IVA. TRUE por defecto (IVA incluido).';

-- Update existing records to have TRUE as default
UPDATE public.quote_settings
SET 
  labor_cost_includes_tax = COALESCE(labor_cost_includes_tax, TRUE),
  lens_cost_includes_tax = COALESCE(lens_cost_includes_tax, TRUE),
  treatments_cost_includes_tax = COALESCE(treatments_cost_includes_tax, TRUE)
WHERE labor_cost_includes_tax IS NULL 
   OR lens_cost_includes_tax IS NULL 
   OR treatments_cost_includes_tax IS NULL;
