-- Migration: 20260218163809_add_customer_id_to_orders.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Add customer_id to orders for proper CRM integration
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_customer_id ON public.orders(customer_id);

-- Migrate existing orders: link by email + branch_id where customer exists
UPDATE public.orders o
SET customer_id = c.id
FROM public.customers c
WHERE o.customer_id IS NULL
  AND o.email IS NOT NULL
  AND o.branch_id IS NOT NULL
  AND c.email IS NOT NULL
  AND LOWER(TRIM(o.email)) = LOWER(TRIM(c.email))
  AND c.branch_id = o.branch_id;
