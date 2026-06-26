-- Migration: 20260204163000_add_auto_print_receipt_to_settings.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add auto_print_receipt column to settings
-- This enables the automated printing feature in the POS

DO $$ 
BEGIN 
    -- 1. Add to pos_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'pos_settings' AND column_name = 'auto_print_receipt') THEN
        ALTER TABLE public.pos_settings ADD COLUMN auto_print_receipt BOOLEAN DEFAULT true;
    END IF;
    
    -- 2. Add to organization_settings
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organization_settings' AND column_name = 'auto_print_receipt') THEN
        ALTER TABLE public.organization_settings ADD COLUMN auto_print_receipt BOOLEAN DEFAULT true;
    END IF;
END $$;

COMMENT ON COLUMN public.pos_settings.auto_print_receipt IS 'Indica si se debe imprimir el comprobante automáticamente después de cada venta';
COMMENT ON COLUMN public.organization_settings.auto_print_receipt IS 'Configuración global: indica si se debe imprimir comprobantes automáticamente';
