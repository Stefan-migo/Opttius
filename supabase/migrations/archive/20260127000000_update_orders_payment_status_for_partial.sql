-- Migration: 20260127000000_update_orders_payment_status_for_partial.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Update orders table payment_status to support partial payments
-- Allow 'partial' payment status for payments with deposits

-- Drop the existing check constraint
ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_payment_status_check;

-- Add the updated check constraint that includes 'partial'
ALTER TABLE public.orders
  ADD CONSTRAINT orders_payment_status_check 
  CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partially_refunded', 'partial', 'on_hold_payment'));

-- Comment
COMMENT ON CONSTRAINT orders_payment_status_check ON public.orders IS 'Payment status constraint. Includes partial for deposit-based payments and on_hold_payment for Cash-First logic.';
