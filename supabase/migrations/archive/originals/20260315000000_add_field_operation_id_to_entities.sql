-- Migration: 20260315000000_add_field_operation_id_to_entities.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add field_operation_id to customers, quotes, orders
-- Enables operativo context for CRM, quotes, and POS sales

-- ===== customers =====
ALTER TABLE public.customers
  ADD COLUMN IF NOT EXISTS field_operation_id UUID REFERENCES public.field_operations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customers_field_operation ON public.customers(field_operation_id) WHERE field_operation_id IS NOT NULL;

-- ===== quotes =====
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS field_operation_id UUID REFERENCES public.field_operations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_quotes_field_operation ON public.quotes(field_operation_id) WHERE field_operation_id IS NOT NULL;

-- ===== orders =====
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS field_operation_id UUID REFERENCES public.field_operations(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_field_operation ON public.orders(field_operation_id) WHERE field_operation_id IS NOT NULL;
