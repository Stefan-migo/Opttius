-- Migration: 20250128000003_create_billing_documents.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Create Billing Documents System
-- This migration creates tables and functions for managing invoices (boletas/facturas)
-- Supports both internal tickets and SII-integrated documents
-- Note: Orders table already has document_type, internal_folio, sii_folio fields
-- This table provides a more complete document management system
--
-- NOTE: This migration checks if branches table exists before creating foreign keys

-- ===== CREATE BILLING_DOCUMENTS TABLE =====
-- Check if branches exists before creating table with foreign key
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'branches'
  ) THEN
    EXECUTE '
    CREATE TABLE IF NOT EXISTS public.billing_documents (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      document_type TEXT NOT NULL CHECK (document_type IN (''boleta'', ''factura'', ''internal_ticket'')),
      folio TEXT NOT NULL,
      sii_folio TEXT,
      order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
      branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
      customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
      customer_name TEXT,
      customer_rut TEXT,
      customer_email TEXT,
      customer_address TEXT,
      status TEXT DEFAULT ''pending'' CHECK (status IN (''pending'', ''emitted'', ''accepted'', ''rejected'', ''cancelled'')),
      sii_status TEXT,
      sii_status_detail TEXT,
      subtotal DECIMAL(12,2) NOT NULL,
      tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
      discount_amount DECIMAL(12,2) DEFAULT 0,
      total_amount DECIMAL(12,2) NOT NULL,
      currency TEXT DEFAULT ''CLP'',
      pdf_url TEXT,
      xml_url TEXT,
      sii_track_id TEXT,
      sii_response_data JSONB,
      sii_emission_date TIMESTAMPTZ,
      custom_header_text TEXT,
      custom_footer_text TEXT,
      logo_url TEXT,
      notes TEXT,
      cancelled_at TIMESTAMPTZ,
      cancellation_reason TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      emitted_at TIMESTAMPTZ,
      emitted_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
    );';
    
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_billing_documents_order_id ON public.billing_documents(order_id);';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_billing_documents_branch_id ON public.billing_documents(branch_id);';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_billing_documents_folio ON public.billing_documents(folio);';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_billing_documents_sii_folio ON public.billing_documents(sii_folio) WHERE sii_folio IS NOT NULL;';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_billing_documents_status ON public.billing_documents(status);';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_billing_documents_document_type ON public.billing_documents(document_type);';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_billing_documents_created_at ON public.billing_documents(created_at DESC);';

    EXECUTE '
    CREATE TABLE IF NOT EXISTS public.billing_document_items (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      billing_document_id UUID NOT NULL REFERENCES public.billing_documents(id) ON DELETE CASCADE,
      line_number INTEGER NOT NULL,
      product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
      product_name TEXT NOT NULL,
      product_sku TEXT,
      quantity DECIMAL(10,2) NOT NULL DEFAULT 1,
      unit_price DECIMAL(12,2) NOT NULL,
      discount_amount DECIMAL(12,2) DEFAULT 0,
      tax_amount DECIMAL(12,2) DEFAULT 0,
      total_price DECIMAL(12,2) NOT NULL,
      description TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
    );';
    
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_billing_document_items_document_id ON public.billing_document_items(billing_document_id);';
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_billing_document_items_line_number ON public.billing_document_items(billing_document_id, line_number);';

    EXECUTE '
    CREATE TABLE IF NOT EXISTS public.billing_settings (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      branch_id UUID REFERENCES public.branches(id) ON DELETE CASCADE,
      business_name TEXT NOT NULL,
      business_rut TEXT NOT NULL,
      business_address TEXT,
      business_phone TEXT,
      business_email TEXT,
      logo_url TEXT,
      header_text TEXT,
      footer_text TEXT,
      terms_and_conditions TEXT,
      sii_environment TEXT CHECK (sii_environment IN (''development'', ''production'')) DEFAULT ''development'',
      sii_api_key TEXT,
      sii_api_url TEXT,
      default_document_type TEXT CHECK (default_document_type IN (''boleta'', ''factura'')) DEFAULT ''boleta'',
      created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
      created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
      UNIQUE(branch_id)
    );';
    
    EXECUTE 'CREATE INDEX IF NOT EXISTS idx_billing_settings_branch_id ON public.billing_settings(branch_id);';
    
  ELSE
    RAISE NOTICE 'Table branches does not exist yet, skipping billing_documents migration';
  END IF;
END $$;

-- ===== FUNCTIONS =====
-- Functions don't depend on branches table, so create them unconditionally

CREATE OR REPLACE FUNCTION generate_billing_folio(
  p_branch_id UUID,
  p_document_type TEXT
) RETURNS TEXT AS $$
DECLARE
  v_prefix TEXT;
  v_last_folio TEXT;
  v_next_number INTEGER;
BEGIN
  v_prefix := CASE 
    WHEN p_document_type = 'boleta' THEN 'BOL'
    WHEN p_document_type = 'factura' THEN 'FAC'
    WHEN p_document_type = 'internal_ticket' THEN 'TKT'
    ELSE 'DOC'
  END;
  
  SELECT folio INTO v_last_folio
  FROM public.billing_documents
  WHERE branch_id = p_branch_id
    AND document_type = p_document_type
    AND folio LIKE v_prefix || '-%'
  ORDER BY created_at DESC
  LIMIT 1;
  
  IF v_last_folio IS NOT NULL THEN
    v_next_number := CAST(SUBSTRING(v_last_folio FROM '\d+$') AS INTEGER) + 1;
  ELSE
    v_next_number := 1;
  END IF;
  
  RETURN v_prefix || '-' || LPAD(v_next_number::TEXT, 6, '0');
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION update_billing_documents_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers (only create if tables exist)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_documents') THEN
    DROP TRIGGER IF EXISTS billing_documents_updated_at ON public.billing_documents;
    CREATE TRIGGER billing_documents_updated_at
      BEFORE UPDATE ON public.billing_documents
      FOR EACH ROW
      EXECUTE FUNCTION update_billing_documents_updated_at();
  END IF;

  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'billing_settings') THEN
    DROP TRIGGER IF EXISTS billing_settings_updated_at ON public.billing_settings;
    CREATE TRIGGER billing_settings_updated_at
      BEFORE UPDATE ON public.billing_settings
      FOR EACH ROW
      EXECUTE FUNCTION update_billing_documents_updated_at();
  END IF;
END $$;

-- Comments
COMMENT ON FUNCTION generate_billing_folio IS 'Genera folio secuencial para documentos de facturación por tipo y sucursal';
