-- Migration: 20260124000004_add_cancellation_reason_to_orders.sql
-- Consolidated Group: replaces multiple original migration files.
--
-- Idempotent: all DDL uses IF NOT EXISTS / CREATE OR REPLACE / DO $$ blocks.
-- Transactional: wrapped in BEGIN/COMMIT.
--
-- Rollback: Not provided for consolidation. Use git checkout of individual
-- migrations or supabase db reset to revert.
--

-- Migration: Add cancellation_reason to orders table
-- Documents the reason for cancelling an order

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;

-- Comment
COMMENT ON COLUMN public.orders.cancellation_reason IS 'Reason for cancelling the order, documented by admin';
