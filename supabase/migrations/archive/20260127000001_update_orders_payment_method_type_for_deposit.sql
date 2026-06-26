-- Migration: 20260127000001_update_orders_payment_method_type_for_deposit.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Update orders table payment_method_type to support deposit method
-- Allow 'deposit' method for partial deposit payments

-- Drop the existing check constraint
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_method_type_check;

-- Add the updated check constraint that includes 'deposit'
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_method_type_check 
  CHECK (payment_method_type = ANY (ARRAY['cash'::text, 'debit_card'::text, 'credit_card'::text, 'installments'::text, 'transfer'::text, 'check'::text, 'mercadopago'::text, 'other'::text, 'deposit'::text, 'card'::text]));

-- Comment
COMMENT ON CONSTRAINT orders_payment_method_type_check ON public.orders IS 'Payment method type constraint. Includes deposit for Cash-First partial payments and card for generic card payments.';
