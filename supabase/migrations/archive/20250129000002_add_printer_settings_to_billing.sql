-- Migration: 20250129000002_add_printer_settings_to_billing.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add printer settings to billing_settings table
-- Adds configuration for different printer types and paper sizes
-- Note: This migration only applies if billing_settings table exists

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_settings') THEN
    ALTER TABLE public.billing_settings
      ADD COLUMN IF NOT EXISTS printer_type TEXT CHECK (printer_type IN ('thermal', 'a4', 'letter', 'custom')) DEFAULT 'thermal',
      ADD COLUMN IF NOT EXISTS printer_width_mm INTEGER DEFAULT 80,
      ADD COLUMN IF NOT EXISTS printer_height_mm INTEGER DEFAULT 297;
    
    COMMENT ON COLUMN public.billing_settings.printer_type IS 'Tipo de impresora: térmica (80mm), A4, Letter, o personalizado';
    COMMENT ON COLUMN public.billing_settings.printer_width_mm IS 'Ancho del papel en milímetros';
    COMMENT ON COLUMN public.billing_settings.printer_height_mm IS 'Alto del papel en milímetros';
  END IF;
END $$;
