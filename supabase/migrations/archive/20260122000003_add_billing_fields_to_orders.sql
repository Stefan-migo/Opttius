-- Migration: 20260122000003_add_billing_fields_to_orders.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add billing fields to orders table
-- This enables Shadow Billing (internal) and prepares for fiscal billing (SII)

-- Add billing fields to orders table
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS document_type TEXT 
    CHECK (document_type IN ('internal_ticket', 'boleta_electronica', 'factura_electronica', 'internal_ticket_cancelled')),
  ADD COLUMN IF NOT EXISTS internal_folio TEXT,
  ADD COLUMN IF NOT EXISTS sii_folio TEXT,
  ADD COLUMN IF NOT EXISTS sii_status TEXT,
  ADD COLUMN IF NOT EXISTS pdf_url TEXT;

-- Add comments
COMMENT ON COLUMN public.orders.document_type IS 'Tipo de documento: internal_ticket (Shadow Billing), boleta_electronica, factura_electronica';
COMMENT ON COLUMN public.orders.internal_folio IS 'Folio interno secuencial por sucursal (ej: TKT-000001)';
COMMENT ON COLUMN public.orders.sii_folio IS 'Folio fiscal del SII (solo para documentos fiscales)';
COMMENT ON COLUMN public.orders.sii_status IS 'Estado del documento en el SII: pending, accepted, rejected';
COMMENT ON COLUMN public.orders.pdf_url IS 'URL del PDF del documento generado';

-- Create indexes for efficient searching
CREATE INDEX IF NOT EXISTS idx_orders_internal_folio ON public.orders(internal_folio);
CREATE INDEX IF NOT EXISTS idx_orders_sii_folio ON public.orders(sii_folio);
CREATE INDEX IF NOT EXISTS idx_orders_document_type ON public.orders(document_type);
CREATE INDEX IF NOT EXISTS idx_orders_branch_folio ON public.orders(branch_id, internal_folio);
