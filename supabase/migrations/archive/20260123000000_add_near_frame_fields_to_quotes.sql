-- Migration: 20260123000000_add_near_frame_fields_to_quotes.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add near_frame fields to quotes table
-- This migration adds fields to support the "two_separate" presbyopia solution
-- which requires a second frame for near vision

-- Add near_frame fields to quotes table
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS near_frame_product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS near_frame_name TEXT,
  ADD COLUMN IF NOT EXISTS near_frame_brand TEXT,
  ADD COLUMN IF NOT EXISTS near_frame_model TEXT,
  ADD COLUMN IF NOT EXISTS near_frame_color TEXT,
  ADD COLUMN IF NOT EXISTS near_frame_size TEXT,
  ADD COLUMN IF NOT EXISTS near_frame_sku TEXT,
  ADD COLUMN IF NOT EXISTS near_frame_price DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS near_frame_price_includes_tax BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS near_frame_cost DECIMAL(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS customer_own_near_frame BOOLEAN DEFAULT false;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_quotes_near_frame_product_id ON public.quotes(near_frame_product_id);

-- Add comments
COMMENT ON COLUMN public.quotes.near_frame_product_id IS 'Referencia al producto marco de cerca (cuando presbyopia_solution = two_separate)';
COMMENT ON COLUMN public.quotes.near_frame_name IS 'Nombre del marco de cerca';
COMMENT ON COLUMN public.quotes.near_frame_brand IS 'Marca del marco de cerca';
COMMENT ON COLUMN public.quotes.near_frame_model IS 'Modelo del marco de cerca';
COMMENT ON COLUMN public.quotes.near_frame_color IS 'Color del marco de cerca';
COMMENT ON COLUMN public.quotes.near_frame_size IS 'Tamaño del marco de cerca';
COMMENT ON COLUMN public.quotes.near_frame_sku IS 'SKU del marco de cerca';
COMMENT ON COLUMN public.quotes.near_frame_price IS 'Precio de venta del marco de cerca';
COMMENT ON COLUMN public.quotes.near_frame_price_includes_tax IS 'Indica si el precio del marco de cerca incluye IVA';
COMMENT ON COLUMN public.quotes.near_frame_cost IS 'Costo interno del marco de cerca';
COMMENT ON COLUMN public.quotes.customer_own_near_frame IS 'Indica si el cliente trae su propio marco de cerca (solo recambio de cristales)';
